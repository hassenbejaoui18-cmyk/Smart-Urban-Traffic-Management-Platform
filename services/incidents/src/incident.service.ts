import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from './common/role.enum';
import { IncidentType } from './entities/incident-type.enum';
import { IncidentStatus } from './entities/incident-status.enum';
import { NotificationClientService } from './providers/notification-client.service';
import { PrismaService } from './providers/prisma.service';

/**
 * Service: IncidentService
 * ------------------------
 * Implements incident domain logic: creating incidents, listing
 * with role-based scoping, status transitions (REPORTED →
 * IN_PROGRESS → RESOLVED), and automatic notification dispatch
 * via NotificationClientService.
 */
@Injectable()
export class IncidentService {
  private readonly validTransitions: Record<IncidentStatus, IncidentStatus[]> =
    {
      [IncidentStatus.REPORTED]: [IncidentStatus.IN_PROGRESS],
      [IncidentStatus.IN_PROGRESS]: [IncidentStatus.RESOLVED],
      [IncidentStatus.RESOLVED]: [],
    };

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationClient: NotificationClientService,
  ) {}

  async create(
    input: {
      type: IncidentType;
      description: string;
      latitude?: number;
      longitude?: number;
      zoneId?: string;
    },
    reportedBy: string,
  ) {
    const incident = await this.prisma.incident.create({
      data: {
        type: input.type,
        description: input.description,
        latitude: input.latitude,
        longitude: input.longitude,
        zoneId: input.zoneId,
        reportedBy,
      },
    });

    await this.notificationClient.notifyIncidentCreated(
      reportedBy,
      incident.id,
      input.type,
      input.description,
    );

    return incident;
  }

  async findAll(
    filter: {
      status?: IncidentStatus;
      type?: IncidentType;
      zoneId?: string;
    } | null,
    currentUserId: string,
    currentUserRole: Role,
  ) {
    const where: Record<string, unknown> = {};
    if (filter?.status) where.status = filter.status;
    if (filter?.type) where.type = filter.type;
    if (filter?.zoneId) where.zoneId = filter.zoneId;
    if (currentUserRole !== Role.ADMIN) where.reportedBy = currentUserId;

    return this.prisma.incident.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, currentUserId: string, currentUserRole: Role) {
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found');

    if (
      currentUserRole !== Role.ADMIN &&
      incident.reportedBy !== currentUserId
    ) {
      throw new NotFoundException('Incident not found');
    }

    return incident;
  }

  async updateStatus(
    id: string,
    newStatus: IncidentStatus,
    currentUserId: string,
    currentUserRole: Role,
  ) {
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found');

    if (
      currentUserRole !== Role.ADMIN &&
      incident.reportedBy !== currentUserId
    ) {
      throw new NotFoundException('Incident not found');
    }

    const allowed = this.validTransitions[incident.status];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${incident.status} to ${newStatus}. Allowed transitions: ${incident.status} → ${allowed.join(' → ') || 'none'}`,
      );
    }

    const updated = await this.prisma.incident.update({
      where: { id },
      data: { status: newStatus },
    });

    await this.notificationClient.notifyIncidentStatusChanged(
      incident.reportedBy,
      id,
      newStatus,
    );

    return updated;
  }
}

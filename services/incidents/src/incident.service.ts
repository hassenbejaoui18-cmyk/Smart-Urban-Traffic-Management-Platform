import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from './common/role.enum';
import { IncidentType } from './entities/incident-type.enum';
import { IncidentStatus } from './entities/incident-status.enum';
import { PrismaService } from './providers/prisma.service';

@Injectable()
export class IncidentService {
  private readonly validTransitions: Record<IncidentStatus, IncidentStatus[]> =
    {
      [IncidentStatus.REPORTED]: [IncidentStatus.IN_PROGRESS],
      [IncidentStatus.IN_PROGRESS]: [IncidentStatus.RESOLVED],
      [IncidentStatus.RESOLVED]: [],
    };

  constructor(private readonly prisma: PrismaService) {}

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
    return this.prisma.incident.create({
      data: {
        type: input.type,
        description: input.description,
        latitude: input.latitude,
        longitude: input.longitude,
        zoneId: input.zoneId,
        reportedBy,
      },
    });
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

    return this.prisma.incident.update({
      where: { id },
      data: { status: newStatus },
    });
  }
}

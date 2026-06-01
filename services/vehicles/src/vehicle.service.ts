import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from './common/role.enum';
import { CreateVehicleInput } from './dto/create-vehicle.input';
import { PaginationInput } from './dto/pagination.input';
import { RecordGpsPositionInput } from './dto/record-gps-position.input';
import { VehicleFilterInput } from './dto/vehicle-filter.input';
import { PrismaService } from './providers/prisma.service';

/**
 * Service: VehicleService
 * -----------------------
 * Implements vehicle domain logic: creating vehicles, listing
 * them with optional filters (zone, type), retrieving movement
 * history with pagination, and recording GPS positions.
 */
@Injectable()
export class VehicleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateVehicleInput, ownerId: string) {
    return this.prisma.vehicle.create({
      data: {
        licensePlate: input.licensePlate,
        type: input.type,
        zoneId: input.zoneId ?? null,
        ownerId,
      },
    });
  }

  async findAll(
    filter: VehicleFilterInput | null,
    currentUserId: string,
    currentUserRole: Role,
  ) {
    const where: Record<string, unknown> = {};
    if (filter?.zoneId) where.zoneId = filter.zoneId;
    if (filter?.type) where.type = filter.type;
    if (currentUserRole !== Role.ADMIN) where.ownerId = currentUserId;

    return this.prisma.vehicle.findMany({ where });
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async recordPosition(vehicleId: string, input: RecordGpsPositionInput) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    return this.prisma.gpsPosition.create({
      data: {
        vehicleId,
        latitude: input.latitude,
        longitude: input.longitude,
        recordedAt: input.recordedAt ?? new Date(),
      },
    });
  }

  async getMovementHistory(
    vehicleId: string,
    pagination: PaginationInput,
    currentUserId: string,
    currentUserRole: Role,
  ) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    if (currentUserRole !== Role.ADMIN && vehicle.ownerId !== currentUserId) {
      throw new NotFoundException('Vehicle not found');
    }

    const [items, total] = await Promise.all([
      this.prisma.gpsPosition.findMany({
        where: { vehicleId },
        orderBy: { recordedAt: 'desc' },
        skip: pagination.skip ?? 0,
        take: pagination.take ?? 20,
      }),
      this.prisma.gpsPosition.count({ where: { vehicleId } }),
    ]);

    return { items, total };
  }
}

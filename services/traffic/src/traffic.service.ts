/**
 * File: traffic.service.ts
 * -------------------------
 * Domain logic for zone management, density computation,
 * and congestion classification.
 *
 * @returns {TrafficService}
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CongestionLevel } from './entities/congestion-level.enum';
import { VehicleClientService } from './providers/vehicle-client.service';
import { PrismaService } from './providers/prisma.service';

@Injectable()
export class TrafficService {
  private readonly logger = new Logger(TrafficService.name);
  private readonly lowMax: number;
  private readonly mediumMax: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly vehicleClient: VehicleClientService,
    config: ConfigService,
  ) {
    this.lowMax = config.get<number>('TRAFFIC_DENSITY_LOW_MAX') ?? 5;
    this.mediumMax = config.get<number>('TRAFFIC_DENSITY_MEDIUM_MAX') ?? 20;
  }

  /**
   * classify
   * --------
   * Classifies a vehicle count into a congestion level based on thresholds.
   *
   * @param {number} vehicleCount - The number of vehicles in a zone.
   * @returns {CongestionLevel} - LOW, MEDIUM, or HIGH.
   */
  classify(vehicleCount: number): CongestionLevel {
    // ++++++++++ Step 1: Check against LOW threshold +++++++++++
    if (vehicleCount <= this.lowMax) return CongestionLevel.LOW;
    // ++++++++++ Step 2: Check against MEDIUM threshold +++++++++++
    if (vehicleCount <= this.mediumMax) return CongestionLevel.MEDIUM;
    // ++++++++++ Step 3: Above both thresholds — HIGH +++++++++++
    return CongestionLevel.HIGH;
  }

  /**
   * createZone
   * -----------
   * Creates a new traffic zone with the given name and optional boundary data.
   *
   * @param {object} input - Object containing name and optional boundary.
   * @returns {Promise<Zone>} - The created zone.
   */
  async createZone(input: { name: string; boundary?: string }) {
    // ++++++++++ Step 1: Insert zone into database +++++++++++
    return this.prisma.zone.create({ data: input });
  }

  /**
   * findAllZones
   * -------------
   * Returns all zones ordered alphabetically by name.
   *
   * @returns {Promise<Zone[]>} - List of all zones.
   */
  async findAllZones() {
    // ++++++++++ Step 1: Query all zones ordered by name +++++++++++
    return this.prisma.zone.findMany({ orderBy: { name: 'asc' } });
  }

  /**
   * findZone
   * ---------
   * Finds a single zone by ID. Throws NotFoundException if not found.
   *
   * @param {string} id - The zone ID.
   * @returns {Promise<Zone>} - The found zone.
   * @throws {NotFoundException} - If no zone matches the ID.
   */
  async findZone(id: string) {
    // ++++++++++ Step 1: Find zone by ID +++++++++++
    const zone = await this.prisma.zone.findUnique({ where: { id } });
    // ++++++++++ Step 2: Throw if zone not found +++++++++++
    if (!zone) throw new NotFoundException('Zone not found');
    return zone;
  }

  /**
   * computeDensity
   * ---------------
   * Computes density for one or all zones. If vehicleCount is provided,
   * uses it directly. Otherwise queries the Vehicle service for counts.
   *
   * @param {object} [input] - Optional zoneId and/or vehicleCount.
   * @param {string} [input.zoneId] - Compute for a single zone.
   * @param {number} [input.vehicleCount] - Explicit count (bypasses Vehicle service).
   * @returns {Promise<DensitySnapshot[]>} - The created snapshot(s).
   */
  async computeDensity(
    input?: { zoneId?: string; vehicleCount?: number },
    token?: string,
  ) {
    // ++++++++++ Step 1: Single zone with explicit vehicle count +++++++++++
    if (input?.zoneId && input.vehicleCount !== undefined) {
      const zone = await this.findZone(input.zoneId);
      const classification = this.classify(input.vehicleCount);
      return [
        await this.prisma.densitySnapshot.create({
          data: { zoneId: zone.id, vehicleCount: input.vehicleCount, classification },
        }),
      ];
    }

    // ++++++++++ Step 2: Single zone — query Vehicle service for count +++++++++++
    if (input?.zoneId) {
      const zone = await this.findZone(input.zoneId);
      const count = await this.vehicleClient.countVehiclesByZone(zone.id, token);
      const classification = this.classify(count);
      return [
        await this.prisma.densitySnapshot.create({
          data: { zoneId: zone.id, vehicleCount: count, classification },
        }),
      ];
    }

    // ++++++++++ Step 3: All zones — compute and store density snapshots +++++++++++
    const zones = await this.prisma.zone.findMany();
    if (zones.length === 0) return [];

    const counts = await this.vehicleClient.countAllVehiclesByZone(token);

    const snapshots = zones.map((zone) => ({
      zoneId: zone.id,
      vehicleCount: counts[zone.id] ?? 0,
      classification: this.classify(counts[zone.id] ?? 0),
    }));

    await this.prisma.densitySnapshot.createMany({ data: snapshots });

    return this.prisma.densitySnapshot.findMany({
      where: { zoneId: { in: zones.map((z) => z.id) } },
      orderBy: { computedAt: 'desc' },
      take: zones.length,
    });
  }

  /**
   * getDensitySnapshots
   * --------------------
   * Returns recent density snapshots, optionally filtered by zone.
   *
   * @param {string} [zoneId] - Optional zone ID filter.
   * @returns {Promise<DensitySnapshot[]>} - List of snapshots (max 100).
   */
  async getDensitySnapshots(zoneId?: string) {
    // ++++++++++ Step 1: Build filter and query snapshots +++++++++++
    const where = zoneId ? { zoneId } : {};
    return this.prisma.densitySnapshot.findMany({
      where,
      orderBy: { computedAt: 'desc' },
      take: 100,
    });
  }

  /**
   * getCurrentDensity
   * ------------------
   * Returns the latest density classification per zone.
   *
   * @param {string} [zoneId] - Optional zone ID filter.
   * @returns {Promise<ZoneDensity | ZoneDensity[]>} - Latest density per zone.
   */
  async getCurrentDensity(zoneId?: string) {
    // ++++++++++ Step 1: Resolve target zones +++++++++++
    const zones = zoneId
      ? [await this.findZone(zoneId)]
      : await this.prisma.zone.findMany();

    // ++++++++++ Step 2: Fetch latest snapshot per zone +++++++++++
    const results = await Promise.all(
      zones.map(async (zone) => {
        const latest = await this.prisma.densitySnapshot.findFirst({
          where: { zoneId: zone.id },
          orderBy: { computedAt: 'desc' },
        });
        return {
          zoneId: zone.id,
          zoneName: zone.name,
          vehicleCount: latest?.vehicleCount ?? 0,
          classification: latest?.classification ?? CongestionLevel.LOW,
          computedAt: latest?.computedAt ?? new Date(),
        };
      }),
    );

    // ++++++++++ Step 3: Return single or list depending on input +++++++++++
    return zoneId ? results[0] : results;
  }

  /**
   * handleScheduledDensityComputation
   * ----------------------------------
   * Cron job that runs every 5 minutes to auto-compute density for all zones.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleScheduledDensityComputation() {
    // ++++++++++ Step 1: Log and run density computation +++++++++++
    this.logger.log('Scheduled density computation started');
    await this.computeDensity({});
    this.logger.log('Scheduled density computation completed');
  }
}


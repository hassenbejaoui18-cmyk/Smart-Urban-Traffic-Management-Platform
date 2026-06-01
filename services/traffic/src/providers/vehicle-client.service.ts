/**
 * File: vehicle-client.service.ts
 * --------------------------------
 * HTTP GraphQL client that queries the Vehicles service to count
 * vehicles per zone. Used by TrafficService for density computation.
 *
 * @returns {VehicleClientService}
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VehicleClientService {
  private readonly logger = new Logger(VehicleClientService.name);
  private readonly vehicleServiceUrl: string;

  constructor(config: ConfigService) {
    this.vehicleServiceUrl =
      config.get<string>('VEHICLE_SERVICE_URL') ?? 'http://localhost:4002/graphql';
  }

  /**
   * countVehiclesByZone
   * --------------------
   * Counts vehicles assigned to a specific zone via the Vehicles service.
   *
   * @param {string} zoneId - The zone ID to count vehicles for.
   * @returns {Promise<number>} - The number of vehicles in the zone.
   */
  async countVehiclesByZone(zoneId: string): Promise<number> {
    try {
      const query = `
        query ($filter: VehicleFilterInput) {
          vehicles(filter: $filter) { id }
        }
      `;
      const response = await fetch(this.vehicleServiceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { filter: { zoneId } } }),
      });

      const data = (await response.json()) as {
        data?: { vehicles?: unknown[] };
      };
      return data?.data?.vehicles?.length ?? 0;
    } catch (error) {
      this.logger.error(`Failed to count vehicles for zone ${zoneId}`, error);
      return 0;
    }
  }

  /**
   * countAllVehiclesByZone
   * -----------------------
   * Fetches all vehicles and groups them by zone ID.
   *
   * @returns {Promise<Record<string, number>>} - Map of zoneId to vehicle count.
   */
  async countAllVehiclesByZone(): Promise<Record<string, number>> {
    try {
      const query = `
        query {
          vehicles { id zoneId }
        }
      `;
      const response = await fetch(this.vehicleServiceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = (await response.json()) as {
        data?: { vehicles?: { id: string; zoneId?: string | null }[] };
      };
      const vehicles = data?.data?.vehicles ?? [];
      const counts: Record<string, number> = {};
      for (const v of vehicles) {
        if (v.zoneId) {
          counts[v.zoneId] = (counts[v.zoneId] ?? 0) + 1;
        }
      }
      return counts;
    } catch (error) {
      this.logger.error('Failed to count vehicles by zone', error);
      return {};
    }
  }
}

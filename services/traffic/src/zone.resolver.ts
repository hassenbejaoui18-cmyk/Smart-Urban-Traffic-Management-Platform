
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Role } from './common/role.enum';
import { CreateZoneInput } from './dto/create-zone.input';
import { Zone } from './entities/zone.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { TrafficService } from './traffic.service';

/**
 * File: zone.resolver.ts
 * ----------------------
 * GraphQL resolver for zone CRUD operations. Thin layer that
 * delegates all business logic to TrafficService.
 *
 * @returns {ZoneResolver}
 */

@Resolver(() => Zone)
@UseGuards(JwtAuthGuard, RolesGuard)
export class ZoneResolver {
  constructor(private readonly trafficService: TrafficService) {}

  // ─── POST /graphql (mutation createZone) ────────────────────────────
  @Mutation(() => Zone)
  @Roles(Role.ADMIN)
  async createZone(@Args('input') input: CreateZoneInput) {
    // ++++++++++ Delegate zone creation to TrafficService +++++++++++
    return this.trafficService.createZone(input);
  }

  // ─── POST /graphql (query zones) ──────────────────────────────────
  @Query(() => [Zone])
  @Roles(Role.ADMIN, Role.OPERATOR)
  async zones() {
    // ++++++++++ Delegate zone listing to TrafficService +++++++++++
    return this.trafficService.findAllZones();
  }

  // ─── POST /graphql (query zone) ───────────────────────────────────
  @Query(() => Zone)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async zone(@Args('id') id: string) {
    // ++++++++++ Delegate zone lookup to TrafficService +++++++++++
    return this.trafficService.findZone(id);
  }
}

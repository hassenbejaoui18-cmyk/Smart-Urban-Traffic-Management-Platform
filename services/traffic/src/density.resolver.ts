
import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Role } from './common/role.enum';
import { ComputeDensityInput } from './dto/compute-density.input';
import { DensitySnapshot, ZoneDensity } from './entities/density-snapshot.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { TrafficService } from './traffic.service';

/**
 * File: density.resolver.ts
 * --------------------------
 * GraphQL resolver for density computation and queries. Thin layer
 * that delegates all business logic to TrafficService.
 *
 * @returns {DensityResolver}
 */

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DensityResolver {
  constructor(private readonly trafficService: TrafficService) {}

  // ─── POST /graphql (mutation computeDensity) ──────────────────────
  @Mutation(() => [DensitySnapshot])
  @Roles(Role.ADMIN, Role.OPERATOR)
  async computeDensity(
    @Args('input', { nullable: true }) input?: ComputeDensityInput,
    @Context() context?: any,
  ) {
    // ++++++++++ Step 1: Delegate density computation to TrafficService +++++++++++
    return this.trafficService.computeDensity(input, context?.req?.headers?.authorization);
  }

  // ─── POST /graphql (query densitySnapshots) ───────────────────────
  @Query(() => [DensitySnapshot])
  @Roles(Role.ADMIN, Role.OPERATOR)
  async densitySnapshots(
    @Args('zoneId', { nullable: true }) zoneId?: string,
  ) {
    // ++++++++++ Step 1: Delegate snapshot query to TrafficService +++++++++++
    return this.trafficService.getDensitySnapshots(zoneId);
  }

  // ─── POST /graphql (query currentDensity) ─────────────────────────
  @Query(() => [ZoneDensity])
  @Roles(Role.ADMIN, Role.OPERATOR)
  async currentDensity(
    @Args('zoneId', { nullable: true }) zoneId?: string,
  ) {
    // ++++++++++ Step 1: Delegate current density query to TrafficService +++++++++++
    return this.trafficService.getCurrentDensity(zoneId);
  }
}

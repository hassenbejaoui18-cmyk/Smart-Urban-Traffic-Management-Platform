import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Role } from './common/role.enum';
import { CurrentUser } from './decorators/current-user.decorator';
import { PaginationInput } from './dto/pagination.input';
import { RecordGpsPositionInput } from './dto/record-gps-position.input';
import { GpsPosition } from './entities/gps-position.entity';
import { MovementHistoryPagination } from './entities/movement-history-pagination.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtPayload } from './strategies/jwt.strategy';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { VehicleService } from './vehicle.service';

/**
 * Resolver: GpsPositionResolver
 * -----------------------------
 * GraphQL resolver for GPS position recording and movement
 * history queries. Delegates all logic to VehicleService.
 */
@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
export class GpsPositionResolver {
  constructor(private readonly vehicleService: VehicleService) {}

  @Mutation(() => GpsPosition)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async recordGpsPosition(
    @Args('vehicleId') vehicleId: string,
    @Args('input') input: RecordGpsPositionInput,
  ) {
    return this.vehicleService.recordPosition(vehicleId, input);
  }

  @Query(() => MovementHistoryPagination)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async movementHistory(
    @Args('vehicleId') vehicleId: string,
    @Args('pagination', { nullable: true }) pagination: PaginationInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vehicleService.getMovementHistory(
      vehicleId,
      pagination ?? {},
      user.sub,
      user.role,
    );
  }
}

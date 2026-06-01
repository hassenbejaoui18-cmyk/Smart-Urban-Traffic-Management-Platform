import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Role } from './common/role.enum';
import { CurrentUser } from './current-user.decorator';
import { PaginationInput } from './dto/pagination.input';
import { RecordGpsPositionInput } from './dto/record-gps-position.input';
import { GpsPosition } from './entities/gps-position.entity';
import { MovementHistoryPagination } from './entities/movement-history-pagination.entity';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtPayload } from './jwt.strategy';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { VehicleService } from './vehicle.service';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
export class GpsPositionResolver {
  constructor(private readonly vehicleService: VehicleService) {}

  @Mutation(() => GpsPosition)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async recordGpsPosition(
    @Args('vehicleId') vehicleId: string,
    @Args('input') input: RecordGpsPositionInput,
    @CurrentUser() user: JwtPayload,
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

import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Role } from './common/role.enum';
import { CurrentUser } from './decorators/current-user.decorator';
import { CreateVehicleInput } from './dto/create-vehicle.input';
import { VehicleFilterInput } from './dto/vehicle-filter.input';
import { Vehicle } from './entities/vehicle.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtPayload } from './strategies/jwt.strategy';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { VehicleService } from './vehicle.service';

/**
 * Resolver: VehicleResolver
 * -------------------------
 * GraphQL resolver for vehicle CRUD operations.
 * Exposes createVehicle, vehicles, and vehicle queries/mutations.
 */
@Resolver(() => Vehicle)
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehicleResolver {
  constructor(private readonly vehicleService: VehicleService) {}

  @Mutation(() => Vehicle)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async createVehicle(
    @Args('input') input: CreateVehicleInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vehicleService.create(input, user.sub);
  }

  @Query(() => [Vehicle])
  @Roles(Role.ADMIN, Role.OPERATOR)
  async vehicles(
    @Args('filter', { nullable: true }) filter: VehicleFilterInput | null,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vehicleService.findAll(filter, user.sub, user.role);
  }

  @Query(() => Vehicle)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async vehicle(@Args('id') id: string) {
    return this.vehicleService.findOne(id);
  }
}

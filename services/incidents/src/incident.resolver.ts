import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Role } from './common/role.enum';
import { CurrentUser } from './decorators/current-user.decorator';
import { CreateIncidentInput } from './dto/create-incident.input';
import { IncidentFilterInput } from './dto/incident-filter.input';
import { UpdateIncidentStatusInput } from './dto/update-incident-status.input';
import { Incident } from './entities/incident.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { IncidentService } from './incident.service';
import { JwtPayload } from './strategies/jwt.strategy';

@Resolver(() => Incident)
@UseGuards(JwtAuthGuard, RolesGuard)
export class IncidentResolver {
  constructor(private readonly incidentService: IncidentService) {}

  @Mutation(() => Incident)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async createIncident(
    @Args('input') input: CreateIncidentInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.incidentService.create(input, user.sub);
  }

  @Mutation(() => Incident)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async updateIncidentStatus(
    @Args('id') id: string,
    @Args('input') input: UpdateIncidentStatusInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.incidentService.updateStatus(
      id,
      input.status,
      user.sub,
      user.role as Role,
    );
  }

  @Query(() => [Incident])
  @Roles(Role.ADMIN, Role.OPERATOR)
  async incidents(
    @Args('filter', { nullable: true }) filter: IncidentFilterInput | null,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.incidentService.findAll(filter, user.sub, user.role as Role);
  }

  @Query(() => Incident)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async incident(
    @Args('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.incidentService.findOne(id, user.sub, user.role as Role);
  }
}

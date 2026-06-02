import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Role } from './common/role.enum';
import { CurrentUser } from './decorators/current-user.decorator';
import { CreateNotificationInput } from './dto/create-notification.input';
import { NotificationFilterInput } from './dto/notification-filter.input';
import { Notification } from './entities/notification.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { NotificationService } from './notification.service';
import { JwtPayload } from './strategies/jwt.strategy';

/**
 * File: notification.resolver.ts
 * -------------------------------
 * GraphQL resolver for notification operations.
 * Exposes create, list, mark-as-read, and mark-all-as-read
 * mutations/queries. Delegates all business logic to
 * NotificationService.
 */

@Resolver(() => Notification)
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationResolver {
  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  // ─── POST /graphql (mutation createNotification) ──────────────────
  @Mutation(() => Notification)
  @Roles(Role.ADMIN)
  async createNotification(
    @Args('input') input: CreateNotificationInput,
  ) {
    // ++++++++++ Step 1: Delegate creation to NotificationService +++++++++++
    return this.notificationService.create(input);
  }

  // ─── POST /graphql (query notifications) ──────────────────────────
  @Query(() => [Notification])
  @Roles(Role.ADMIN, Role.OPERATOR)
  async notifications(
    @Args('filter', { nullable: true, type: () => NotificationFilterInput }) filter: NotificationFilterInput | null,
    @CurrentUser() user: JwtPayload,
  ) {
    // ++++++++++ Step 1: Delegate filtered listing to NotificationService +++++++++++
    return this.notificationService.findAll(
      filter,
      user.sub,
      user.role as Role,
    );
  }

  // ─── POST /graphql (mutation markNotificationAsRead) ──────────────
  @Mutation(() => Notification)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async markNotificationAsRead(
    @Args('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    // ++++++++++ Step 1: Delegate mark-as-read to NotificationService +++++++++++
    return this.notificationService.markAsRead(id, user.sub, user.role as Role);
  }

  // ─── POST /graphql (mutation markAllNotificationsAsRead) ──────────
  @Mutation(() => [Notification])
  @Roles(Role.ADMIN, Role.OPERATOR)
  async markAllNotificationsAsRead(
    @CurrentUser() user: JwtPayload,
  ) {
    // ++++++++++ Step 1: Delegate bulk mark-as-read to NotificationService +++++++++++
    return this.notificationService.markAllAsRead(user.sub);
  }
}

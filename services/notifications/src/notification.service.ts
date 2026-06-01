import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from './common/role.enum';
import { TriggerType } from './entities/trigger-type.enum';
import { PrismaService } from './providers/prisma.service';

/**
 * File: notification.service.ts
 * -----------------------------
 * Service that implements notification domain logic:
 * creating notifications for incidents/zone alerts, listing
 * notifications scoped to the current user, and toggling
 * read status (single or bulk).
 */

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create Service
   * --------------
   * Persists a new notification for the given user with the
   * provided title, message, trigger type, and trigger reference.
   *
   * @param {Object} input - Notification creation payload.
   * @param {string} input.userId - Recipient user ID.
   * @param {string} input.title - Short notification title.
   * @param {string} input.message - Full notification body.
   * @param {TriggerType} input.triggerType - What triggered this (INCIDENT | ZONE_ALERT).
   * @param {string} input.triggerId - ID of the triggering entity.
   * @returns {Promise<Notification>} The newly created Notification record.
   */
  async create(input: {
    userId: string;
    title: string;
    message: string;
    triggerType: TriggerType;
    triggerId: string;
  }) {
    // ++++++++++ Step 1: Persist the notification with isRead defaulting to false +++++++++++
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        message: input.message,
        triggerType: input.triggerType,
        triggerId: input.triggerId,
      },
    });
  }

  /**
   * Find All Service
   * ----------------
   * Retrieves notifications for the authenticated user.
   * ADMIN sees all; OPERATOR sees only their own.
   * Optionally filters by read/unread status.
   *
   * @param {Object|null} filter - Optional isRead filter.
   * @param {boolean} [filter.isRead] - Filter by read status.
   * @param {string} currentUserId - JWT sub of the requesting user.
   * @param {Role} currentUserRole - Role of the requesting user.
   * @returns {Promise<Notification[]>} Ordered list of notifications (newest first).
   */
  async findAll(
    filter: { isRead?: boolean } | null,
    currentUserId: string,
    currentUserRole: Role,
  ) {
    // ++++++++++ Step 1: Build the where clause based on role and filter +++++++++++
    const where: Record<string, unknown> = {};

    if (currentUserRole === Role.ADMIN) {
      if (filter?.isRead !== undefined) where.isRead = filter.isRead;
    } else {
      where.userId = currentUserId;
      if (filter?.isRead !== undefined) where.isRead = filter.isRead;
    }

    // ++++++++++ Step 2: Fetch notifications ordered by newest first +++++++++++
    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Mark As Read Service
   * --------------------
   * Marks a single notification as read. Ownership check:
   * ADMIN can mark any; OPERATOR can only mark their own.
   *
   * @param {string} id - Notification ID.
   * @param {string} currentUserId - JWT sub of the requesting user.
   * @param {Role} currentUserRole - Role of the requesting user.
   * @returns {Promise<Notification>} The updated notification.
   * @throws {NotFoundException} If not found or not owned by OPERATOR.
   */
  async markAsRead(id: string, currentUserId: string, currentUserRole: Role) {
    // ++++++++++ Step 1: Look up the notification +++++++++++
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    // ++++++++++ Step 2: Enforce ownership for non-ADMIN users +++++++++++
    if (
      currentUserRole !== Role.ADMIN &&
      notification.userId !== currentUserId
    ) {
      throw new NotFoundException('Notification not found');
    }

    // ++++++++++ Step 3: Toggle isRead to true +++++++++++
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /**
   * Mark All As Read Service
   * ------------------------
   * Bulk-updates all unread notifications for the given user
   * and returns the full current list.
   *
   * @param {string} currentUserId - JWT sub of the requesting user.
   * @returns {Promise<Notification[]>} All notifications for the user (newest first).
   */
  async markAllAsRead(currentUserId: string) {
    // ++++++++++ Step 1: Mark all unread notifications as read +++++++++++
    await this.prisma.notification.updateMany({
      where: { userId: currentUserId, isRead: false },
      data: { isRead: true },
    });

    // ++++++++++ Step 2: Return the updated notification list +++++++++++
    return this.prisma.notification.findMany({
      where: { userId: currentUserId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

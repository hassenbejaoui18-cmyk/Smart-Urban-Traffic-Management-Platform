import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/notification-client';

/**
 * File: prisma.service.ts
 * ------------------------
 * Wraps the PrismaClient and connects to the database when the
 * module initialises. Used by all services to interact with the
 * notification database via the generated Prisma client.
 *
 * @returns {PrismaService} - Injectable Prisma client instance.
 */

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}

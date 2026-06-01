import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/auth-client';

/**
 * Service: PrismaService
 * ----------------------
 * Wraps the Prisma ORM client and connects to the database
 * when the module initializes. Used as the data access layer
 * for all Auth service database operations.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}

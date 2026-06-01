import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/vehicle-client';

/**
 * Service: PrismaService
 * ----------------------
 * Wraps PrismaClient with lifecycle hooks so the database
 * connection is established when the module initializes.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}

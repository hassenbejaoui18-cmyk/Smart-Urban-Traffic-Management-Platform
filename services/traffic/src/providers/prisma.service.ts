/**
 * File: prisma.service.ts
 * ------------------------
 * Prisma client wrapper that connects to PostgreSQL on module init.
 * Provides type-safe database access for the Traffic service.
 *
 * @returns {PrismaService}
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/traffic-client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}

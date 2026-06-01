import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * File: prisma.module.ts
 * -----------------------
 * Global Prisma module that exports PrismaService so that it
 * can be injected into any module without re-importing.
 *
 * @returns {DynamicModule} - A global module with PrismaService
 *   as both a provider and an export.
 */

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

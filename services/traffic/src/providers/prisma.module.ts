/**
 * File: prisma.module.ts
 * -----------------------
 * Global module that provides PrismaService across the entire
 * Traffic service without requiring re-imports.
 *
 * @returns {PrismaModule}
 */
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

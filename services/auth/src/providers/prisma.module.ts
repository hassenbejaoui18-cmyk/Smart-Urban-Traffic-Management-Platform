import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Module: PrismaModule
 * --------------------
 * Global module that provides and exports PrismaService.
 * Marked @Global so that PrismaService is available in all
 * feature modules without explicit re-import.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

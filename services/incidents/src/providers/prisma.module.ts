import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Module: PrismaModule
 * --------------------
 * Global module that provides PrismaService to all consumers
 * in the Incident service, ensuring a single database client.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

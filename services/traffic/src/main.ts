/**
 * File: main.ts
 * -------------
 * Bootstrap entry point for the Traffic service.
 * Configures global ValidationPipe and starts the server on TRAFFIC_PORT (default 4003).
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { TrafficModule } from './traffic.module';

async function bootstrap() {
  const app = await NestFactory.create(TrafficModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.TRAFFIC_PORT ?? 4003);
}
void bootstrap();

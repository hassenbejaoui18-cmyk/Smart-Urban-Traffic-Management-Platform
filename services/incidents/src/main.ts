import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { IncidentModule } from './incident.module';

/**
 * Bootstrap
 * ---------
 * Creates the NestJS application for the Incident service on
 * port 4004 with global validation pipes (whitelist, transform).
 */
async function bootstrap() {
  const app = await NestFactory.create(IncidentModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.INCIDENT_PORT ?? 4004);
}
void bootstrap();

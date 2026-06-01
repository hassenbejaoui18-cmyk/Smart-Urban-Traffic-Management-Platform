import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { VehicleModule } from './vehicle.module';

/**
 * Bootstrap
 * ---------
 * Creates the NestJS application for the Vehicle service on
 * port 4002 with global validation pipes (whitelist, transform).
 */
async function bootstrap() {
  const app = await NestFactory.create(VehicleModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.VEHICLE_PORT ?? 4002);
}
void bootstrap();

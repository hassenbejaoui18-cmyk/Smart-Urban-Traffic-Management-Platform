import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { VehicleModule } from './vehicle.module';

const PORT = process.env.VEHICLE_PORT ?? 4002;

async function bootstrap() {
  const app = await NestFactory.create(VehicleModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(PORT);
}

async function startWithRetry(maxRetries = 10, delayMs = 1000) {
  for (let i = 1; i <= maxRetries; i++) {
    try {
      await bootstrap();
      console.log(`Vehicles running on port ${PORT}`);
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('EADDRINUSE') && i < maxRetries) {
        console.log(`Vehicles: port ${PORT} busy (attempt ${i}/${maxRetries}), retrying in ${delayMs}ms...`);
        await new Promise((r) => setTimeout(r, delayMs));
      } else if (i < maxRetries) {
        console.log(`Vehicles: attempt ${i}/${maxRetries} failed: ${message}. Retrying...`);
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        console.error(`Vehicles failed after ${maxRetries} attempts: ${message}`);
        process.exit(1);
      }
    }
  }
}

void startWithRetry();

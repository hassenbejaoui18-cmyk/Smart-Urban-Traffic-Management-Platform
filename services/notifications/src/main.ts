import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NotificationModule } from './notification.module';

/**
 * File: main.ts
 * -------------
 * Bootstrap the Notification microservice on the configured port
 * (default 4005). Applies a global ValidationPipe with strict
 * whitelist and transform behaviour.
 */

async function bootstrap() {
  const app = await NestFactory.create(NotificationModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.NOTIFICATION_PORT ?? 4005);
}
void bootstrap();

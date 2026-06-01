import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AuthModule } from './auth.module';

/**
 * Bootstrap
 * ---------
 * Initializes the Auth microservice on the configured port.
 * Registers a global ValidationPipe with whitelist, forbidNonWhitelisted,
 * and transform options enabled.
 */
async function bootstrap() {
  const app = await NestFactory.create(AuthModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.AUTH_PORT ?? 4001);
}
void bootstrap();

import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);
  app.enableCors({
    origin: ['http://localhost:4000', 'https://studio.apollographql.com', 'http://localhost:3000'],
    credentials: true,
  });
  await app.listen(process.env.GATEWAY_PORT ?? 4000);
}

async function startWithRetry(maxRetries = 15, delayMs = 3000) {
  // Give subgraphs a head start before first attempt
  await new Promise((resolve) => setTimeout(resolve, 3000));

  for (let i = 1; i <= maxRetries; i++) {
    try {
      await bootstrap();
      console.log(`Gateway running on port ${process.env.GATEWAY_PORT ?? 4000}`);
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const errWithStack = err instanceof Error ? `${err.message}\n${err.stack?.split('\n').slice(0, 6).join('\n')}` : String(err);
      if (i < maxRetries) {
        console.log(`Gateway startup attempt ${i}/${maxRetries} failed: ${message}. Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        console.error(`Gateway failed after ${maxRetries} attempts: ${errWithStack}`);
        process.exit(1);
      }
    }
  }
}

void startWithRetry();

import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);
  await app.listen(process.env.GATEWAY_PORT ?? 4000);
}

async function startWithRetry(maxRetries = 15, delayMs = 3000) {
  for (let i = 1; i <= maxRetries; i++) {
    try {
      await bootstrap();
      console.log(`Gateway running on port ${process.env.GATEWAY_PORT ?? 4000}`);
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (i < maxRetries) {
        console.log(`Gateway startup attempt ${i}/${maxRetries} failed: ${message}. Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        console.error(`Gateway failed after ${maxRetries} attempts: ${message}`);
        process.exit(1);
      }
    }
  }
}

void startWithRetry();

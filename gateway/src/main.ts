import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';

/**
 * Bootstrap
 * ---------
 * Creates the NestJS app for the Gateway module and listens
 * on the port configured via GATEWAY_PORT (default 4000).
 */
async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);
  await app.listen(process.env.GATEWAY_PORT ?? 4000);
}
void bootstrap();

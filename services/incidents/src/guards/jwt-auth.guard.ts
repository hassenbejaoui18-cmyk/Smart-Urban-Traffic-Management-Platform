import { AuthGuard } from '@nestjs/passport';

/**
 * Guard: JwtAuthGuard
 * -------------------
 * Standard Passport JWT guard for the Incident service,
 * validates Bearer tokens on every protected resolver.
 */
export class JwtAuthGuard extends AuthGuard('jwt') {}

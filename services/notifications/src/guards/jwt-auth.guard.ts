import { AuthGuard } from '@nestjs/passport';

/**
 * File: jwt-auth.guard.ts
 * ------------------------
 * Guard that extends Passport's built-in JWT authentication guard.
 * Requires a valid bearer token in the Authorization header for
 * every resolver method it decorates.
 *
 * @returns {boolean|never} - Passes through to the route handler
 *   on success, or throws an UnauthorizedException.
 */

export class JwtAuthGuard extends AuthGuard('jwt') {}

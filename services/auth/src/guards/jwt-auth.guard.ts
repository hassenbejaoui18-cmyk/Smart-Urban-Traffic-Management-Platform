import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard: JwtAuthGuard
 * -------------------
 * Extends Passport's built-in JWT auth guard.
 * Extracts the Bearer token from the Authorization header,
 * verifies the signature and expiry, and attaches the decoded
 * user payload to the request context.
 *
 * Apply with @UseGuards(JwtAuthGuard) on any resolver method.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

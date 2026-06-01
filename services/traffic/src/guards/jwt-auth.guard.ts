/**
 * File: jwt-auth.guard.ts
 * ------------------------
 * Passport JWT auth guard. Extracts and verifies the bearer token
 * using the JwtStrategy. Returns 401 if the token is missing,
 * expired, or invalid.
 *
 * @returns {JwtAuthGuard}
 */
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

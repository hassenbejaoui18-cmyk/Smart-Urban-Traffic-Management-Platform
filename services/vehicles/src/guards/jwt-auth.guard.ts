import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard: JwtAuthGuard
 * -------------------
 * Standard Passport JWT guard for the Vehicle service,
 * validates Bearer tokens on every protected resolver.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

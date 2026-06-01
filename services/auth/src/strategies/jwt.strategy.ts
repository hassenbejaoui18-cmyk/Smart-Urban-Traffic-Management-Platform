import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '@prisma/auth-client';
import { User } from '../entities/user.entity';

/**
 * Strategy: JwtStrategy
 * ---------------------
 * Passport strategy that extracts a JWT from the Authorization header,
 * verifies the signature against the configured secret, checks expiry,
 * and returns the decoded user payload.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('AUTH_JWT_SECRET')!,
    });
  }

  /**
   * Validate
   * --------
   * Returns a partial User object from the verified JWT payload.
   *
   * @param {{ sub: string; role: Role }} payload - Decoded JWT payload.
   * @returns {User} - User object with id and role populated.
   */
  validate(payload: { sub: string; role: Role }): User {
    return { id: payload.sub, role: payload.role } as User;
  }
}

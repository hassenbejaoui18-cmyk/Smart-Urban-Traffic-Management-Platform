import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * File: jwt.strategy.ts
 * ----------------------
 * Passport JWT strategy that reads the NOTIFICATION_JWT_SECRET
 * environment variable to verify incoming bearer tokens.
 * Extracts the sub and role claims and returns them as the
 * user payload attached to the request context.
 *
 * @returns {JwtPayload} - Object with sub (user ID) and role.
 */

export interface JwtPayload {
  sub: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('NOTIFICATION_JWT_SECRET')!,
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return { sub: payload.sub, role: payload.role };
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * Interface: JwtPayload
 * ---------------------
 * Shape of the decoded JWT payload containing subject (user ID)
 * and role for authorization checks in the Incident service.
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
      secretOrKey: config.get<string>('INCIDENT_JWT_SECRET')!,
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return { sub: payload.sub, role: payload.role };
  }
}

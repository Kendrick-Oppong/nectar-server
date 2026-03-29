import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AUTH_CONSTANTS } from 'src/constants/auth.constants';
import { JwtPayload } from 'types/auth';

@Injectable()
export class JwtStrategy extends PassportStrategy(
  Strategy,
  AUTH_CONSTANTS.STRATEGY_JWT,
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>(AUTH_CONSTANTS.CONFIG_JWT_ACCESS_SECRET)!,
    });
  }

  validate(payload: JwtPayload) {
    return { id: payload.sub, email: payload.email };
  }
}

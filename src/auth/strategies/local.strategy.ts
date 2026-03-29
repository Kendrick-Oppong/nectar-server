import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { AUTH_CONSTANTS } from 'src/constants/auth.constants';
import type { UserType } from 'types/auth';

@Injectable()
export class LocalStrategy extends PassportStrategy(
  Strategy,
  AUTH_CONSTANTS.STRATEGY_LOCAL,
) {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<UserType> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }
}

import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { AUTH_CONSTANTS } from 'src/constants/auth.constants';

@Injectable()
export class JwtAuthGuard extends AuthGuard(AUTH_CONSTANTS.STRATEGY_JWT) {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if the endpoint is flagged as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      AUTH_CONSTANTS.IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true; // Bypass JWT check explicitly
    }

    // Default to strict JWT validation
    return super.canActivate(context);
  }
}

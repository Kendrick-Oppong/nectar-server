import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from '../common/guards/local-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ApiTags } from '@nestjs/swagger';
import type { RequestWithUser } from 'types/auth';
import {
  RegisterDocs,
  LoginDocs,
  ForgotPasswordDocs,
  ResetPasswordDocs,
  LogoutDocs,
  RefreshTokensDocs,
} from '../docs/swagger/auth.swagger';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @RegisterDocs()
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @UseGuards(LocalAuthGuard)
  @LoginDocs()
  @HttpCode(HttpStatus.OK)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async login(@Req() req: RequestWithUser, @Body() _loginDto: LoginDto) {
    return this.authService.login(req.user);
  }

  @Public()
  @Post('forgot-password')
  @ForgotPasswordDocs()
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Public()
  @Post('reset-password')
  @ResetPasswordDocs()
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.password,
    );
  }

  @Public()
  @Post('logout')
  @LogoutDocs()
  @HttpCode(HttpStatus.OK)
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.logout(refreshTokenDto.refreshToken);
  }

  @Public()
  @Post('refresh')
  @RefreshTokensDocs()
  @HttpCode(HttpStatus.OK)
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }
}

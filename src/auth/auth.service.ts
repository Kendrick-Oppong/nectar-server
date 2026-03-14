import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';
import { PasswordResetToken, RefreshToken } from 'generated/prisma/client';
import { ConfigService } from '@nestjs/config';
import type { UserType } from 'types/auth';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Register a new user with standard credentials
   */
  async register(dto: { email: string; password: string; name?: string }) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already registered.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
      },
    });

    const tokens = await this.generateTokens(user.id);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, failedLoginAttempts, lockedUntil, ...safeUser } = user;

    return {
      user: safeUser,
      tokens,
    };
  }

  /**
   * Validate user credentials (used by LocalStrategy)
   */
  async validateUser(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) return null;

    // 1. Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        'Account temporarily locked due to many failed login attempts. Please try again later.',
      );
    }

    // 2. Validate password
    const isPasswordValid = await bcrypt.compare(pass, user.password);

    if (!isPasswordValid) {
      const newAttempts: number = Number(user.failedLoginAttempts) + 1;

      const updateData: { failedLoginAttempts: number; lockedUntil?: Date } = {
        failedLoginAttempts: newAttempts,
      };

      if (newAttempts >= 5) {
        const lockTime = new Date();
        lockTime.setMinutes(lockTime.getMinutes() + 15);
        updateData.lockedUntil = lockTime;
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      return null;
    }

    // 3. Password valid — clear any previous failures
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, failedLoginAttempts, lockedUntil, ...result } = user;
    return result;
  }

  /**
   * Login a user and issue tokens (called by AuthController after LocalAuthGuard passes)
   */
  async login(user: UserType) {
    const tokens = await this.generateTokens(user.id);
    return {
      user,
      tokens,
    };
  }

  /**
   * Initiate forgot password flow — generate a trackable token and email it out
   */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Do not reveal whether the user exists — always return the same response
      return {
        success: true,
        message: 'If an account exists, a reset link was sent.',
      };
    }

    // Invalidate any existing active tokens for this user
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    const code = crypto.randomInt(100000, 999999).toString();
    const hashedToken = await bcrypt.hash(code, 10);

    // 15-minute expiration
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt,
      },
    });

    const emailSent = await this.emailService.sendPasswordResetEmail(
      email,
      code,
    );

    if (!emailSent) {
      this.logger.error(`Password reset email failed to send to ${email}`);
      throw new InternalServerErrorException(
        'Failed to send reset email. Please try again later.',
      );
    }

    return {
      success: true,
      message: 'If an account exists, a reset link was sent.',
    };
  }

  /**
   * Complete forgot password flow — validate token and update password
   */
  async resetPassword(token: string, newPassword: string) {
    // Performance note: searching all active tokens and bcrypt-comparing is intentional
    // for this low-traffic use case. In high-traffic scenarios, include a token ID
    // in the reset link and query by ID directly (e.g. ?id=TOKEN_ID&token=RAW_TOKEN).
    const activeTokens: PasswordResetToken[] =
      await this.prisma.passwordResetToken.findMany({
        where: { used: false, expiresAt: { gt: new Date() } },
      });

    let matchedTokenRecord: PasswordResetToken | null = null;
    for (const record of activeTokens) {
      if (await bcrypt.compare(token, record.token)) {
        matchedTokenRecord = record;
        break;
      }
    }

    if (!matchedTokenRecord) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: matchedTokenRecord.userId },
        data: { password: hashedPassword },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: matchedTokenRecord.id },
        data: { used: true },
      }),
    ]);

    return {
      success: true,
      message: 'Password reset successfully. You can now login.',
    };
  }

  /**
   * Logout a user — revoke their active refresh token
   */
  async logout(refreshToken: string) {
    const activeTokens: RefreshToken[] =
      await this.prisma.refreshToken.findMany();

    let matchedTokenRecord: RefreshToken | null = null;
    for (const record of activeTokens) {
      if (await bcrypt.compare(refreshToken, record.token)) {
        matchedTokenRecord = record;
        break;
      }
    }

    if (matchedTokenRecord) {
      await this.prisma.refreshToken.delete({
        where: { id: matchedTokenRecord.id },
      });
    }

    // Always return success to prevent timing attacks / token scanning
    return { success: true, message: 'Logged out successfully.' };
  }

  /**
   * Generate a new JWT access + refresh token pair
   */
  async generateTokens(userId: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId },
        {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: '15m',
        },
      ),
      this.jwtService.signAsync(
        { sub: userId },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: '30d',
        },
      ),
    ]);

    const hashedToken = await bcrypt.hash(refreshToken, 10);
    const family = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: hashedToken,
        family,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Validate a refresh token and issue a new token pair (token rotation)
   */
  async refreshTokens(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: string }>(
        refreshToken,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    const userId: string = payload.sub;

    const tokens: RefreshToken[] = await this.prisma.refreshToken.findMany({
      where: { userId },
    });

    let matchedTokenRecord: RefreshToken | null = null;
    for (const record of tokens) {
      if (await bcrypt.compare(refreshToken, record.token)) {
        matchedTokenRecord = record;
        break;
      }
    }

    if (!matchedTokenRecord) {
      throw new UnauthorizedException(
        'Refresh token not recognized or tampered with.',
      );
    }

    if (new Date() > matchedTokenRecord.expiresAt) {
      await this.prisma.refreshToken.delete({
        where: { id: matchedTokenRecord.id },
      });
      throw new UnauthorizedException('Refresh token expired.');
    }

    // Token rotation: delete the used token and issue a fresh pair
    await this.prisma.refreshToken.delete({
      where: { id: matchedTokenRecord.id },
    });

    return this.generateTokens(userId);
  }
}

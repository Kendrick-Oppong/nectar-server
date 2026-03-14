import {
  BadRequestException,
  Injectable,
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

    // Explicitly exclude passwords and internal fields for React Native client
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

    // 1. Check if Account is Locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        'Account temporarily locked due to many failed login attempts. Please try again later.',
      );
    }

    // 2. Validate Password
    const isPasswordValid = await bcrypt.compare(pass, user.password);

    if (!isPasswordValid) {
      // Increment failed attempts
      const newAttempts: number = Number(user.failedLoginAttempts) + 1;

      const updateData: { failedLoginAttempts: number; lockedUntil?: Date } = {
        failedLoginAttempts: newAttempts,
      };

      if (newAttempts >= 5) {
        // Lock out for 15 minutes
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

    // 3. Password valid, clear any previous failures
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
   * Initiate Forgot Password flow - generate trackable token and email it out
   */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Do not reveal whether user exists for security, just return success
      return {
        success: true,
        message: 'If an account exists, a reset link was sent.',
      };
    }

    // Invalidate old tokens
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(token, 10);

    // 15 min expiration
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt,
      },
    });

    await this.emailService.sendPasswordResetEmail(email, token);

    return {
      success: true,
      message: 'If an account exists, a reset link was sent.',
    };
  }

  /**
   * Complete Forgot Password flow - swap out the old password securely
   */
  async resetPassword(token: string, newPassword: string) {
    // We expect the raw hex token to be passed from the email link
    // We must find the record by comparing hashes (though normally one would pass an ID query param too. For simplicity, we search active tokens and compare).

    // Performance Note: Searching through all active tokens and bcrypt.comparing is slow and theoretically susceptible to timing attacks.
    // Usually a reset link is `?id=TOKEN_ID&token=RAW_TOKEN`.
    // Assuming low traffic for grocery app reset passwords, we will search active ones.
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
   * Logout a user - revoke their active refresh token
   */
  async logout(refreshToken: string) {
    // To find the exact refresh token to revoke, we need to compare hashes
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

    // Always return success even if not found to prevent timing attacks / token scanning
    return { success: true, message: 'Logged out successfully.' };
  }

  /**
   * Generates a new pair of JWT Access and Refresh tokens.
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

    // Save refresh token to DB with family for rotation handling
    const hashedToken = await bcrypt.hash(refreshToken, 10);
    const family = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

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
   * Validates a refresh token and issues a new pair if valid (Token Rotation).
   */
  async refreshTokens(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: string }>(
        refreshToken,
        {
          secret: process.env.JWT_REFRESH_SECRET,
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    const userId: string = payload.sub;

    // Retrieve active tokens for user
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

    // Successful match. Token rotation: revoke old token (or whole family if we were strictly enforcing 1 active), issue new.
    await this.prisma.refreshToken.delete({
      where: { id: matchedTokenRecord.id },
    });

    return this.generateTokens(userId);
  }
}

import { Request } from 'express';
import { User } from 'generated/prisma/client';

export interface OAuthUser {
  provider: 'facebook' | 'google';
  providerId: string;

  email: string | null;

  displayName: string | null;
  firstName: string | null;
  lastName: string | null;

  picture: string | null;

  profileUrl: string | null;
  username: string | null;

  locale?: string;
  gender?: string;
}

export type UserType = Omit<
  User,
  'password' | 'failedLoginAttempts' | 'lockedUntil'
>;

export interface RequestWithUser extends Request {
  user: UserType;
}

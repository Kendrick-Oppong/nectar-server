import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiTags,
  // ApiBearerAuth,
} from '@nestjs/swagger';
import { LoginDto } from 'src/auth/dto/login.dto';
import { RegisterDto } from 'src/auth/dto/register.dto';

export const AuthApiTags = ApiTags('Authentication');
export function RegisterDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Register a new user' }),
    ApiBody({ type: RegisterDto }),
    ApiResponse({
      status: 201,
      description: 'User registered successfully, tokens issued.',
      schema: {
        example: {
          user: { id: 'cuid', email: 'user@example.com', name: 'John' },
          tokens: { accessToken: '...', refreshToken: '...' },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Email already exists or invalid data.',
    }),
  );
}

export function LoginDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Login with email and password' }),
    ApiBody({ type: LoginDto }),
    ApiResponse({
      status: 200,
      description: 'Login successful.',
      schema: {
        example: {
          user: { id: 'cuid', email: 'user@example.com', name: 'John' },
          tokens: { accessToken: '...', refreshToken: '...' },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Invalid credentials or account locked.',
    }),
  );
}

export function ForgotPasswordDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Request password reset token' }),
    ApiResponse({
      status: 200,
      description: 'If account exists, email sent.',
    }),
  );
}

export function ResetPasswordDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Reset password using token' }),
    ApiResponse({ status: 200, description: 'Password changed successfully.' }),
    ApiResponse({ status: 400, description: 'Invalid or expired token.' }),
  );
}

export function LogoutDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Logout (revoke refresh token)' }),
    ApiResponse({ status: 200, description: 'Logout successful.' }),
  );
}

export function RefreshTokensDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Rotate JWT tokens using refresh token' }),
    ApiResponse({
      status: 200,
      description: 'New tokens issued.',
      schema: {
        example: { accessToken: '...', refreshToken: '...' },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Invalid or expired refresh token.',
    }),
  );
}

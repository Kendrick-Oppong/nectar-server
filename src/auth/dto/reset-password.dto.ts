import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: '123456',
    description: 'The 6-digit reset code received via email',
  })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: 'NewStrongPassword123!',
    description: 'The new password for the account (min 6 characters)',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long.' })
  @IsNotEmpty()
  password: string;
}

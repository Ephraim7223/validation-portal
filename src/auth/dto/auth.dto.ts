import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignInDto {
  @ApiProperty({ example: 'supadmin@mail.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPassword123!', writeOnly: true })
  @IsNotEmpty()
  @IsString()
  password: string;
}

export class SignUpDto {
  @ApiProperty({ example: 'Jane Admin' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'admin@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ writeOnly: true })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty({ writeOnly: true })
  @IsNotEmpty()
  @IsString()
  confirmPassword: string;

  @ApiProperty({ example: '+2347012345678' })
  @IsNotEmpty()
  @IsString()
  phone: string;
}

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'hub@example.com',
    description: 'Registered hub email address',
  })
  @IsString()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: '482913', description: '6-digit OTP sent by email' })
  @IsNotEmpty()
  @IsString()
  otp: string;

  @ApiProperty({ writeOnly: true })
  @IsNotEmpty()
  @IsString()
  newPassword: string;

  @ApiProperty({ writeOnly: true })
  @IsNotEmpty()
  @IsString()
  confirmPassword: string;
}

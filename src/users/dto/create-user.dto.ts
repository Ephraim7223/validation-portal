import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsApproved, IsCalledForInterview } from '../schema/enums';

export class CreateUserDto {
  @ApiProperty({ example: 'Ada' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Okafor' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'ada@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '08012345678' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ example: '12345678901' })
  @IsString()
  @IsNotEmpty()
  NIN: string;

  @ApiProperty({
    example: '664f1a2b3c4d5e6f7a8b9c0d',
    description: 'MongoDB ObjectId of the target hub',
  })
  @IsString()
  @IsNotEmpty()
  hub: string;

  @ApiProperty({ example: '1998-05-20' })
  @IsString()
  @IsNotEmpty()
  D_O_B: string;

  @ApiProperty({ example: 'female' })
  @IsString()
  @IsNotEmpty()
  gender: string;

  @ApiProperty({ example: 'Frontend' })
  @IsString()
  @IsNotEmpty()
  Stack: string;

  @ApiProperty({ example: 'intern' })
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Profile picture (jpg, png, jpeg, svg)',
  })
  profilePic: Express.Multer.File;
}

export class ApproveUserDto {
  @ApiProperty({ example: 'Ada' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Okafor' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'ada@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '08012345678' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ example: '12345678901' })
  @IsString()
  @IsNotEmpty()
  NIN: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  @IsNotEmpty()
  start_date: Date;

  @ApiProperty({ example: '2026-06-01' })
  @IsDateString()
  @IsNotEmpty()
  end_date: Date;

  @ApiProperty({ example: '1998-05-20' })
  @IsString()
  @IsNotEmpty()
  D_O_B: string;

  @ApiProperty({ example: 'female' })
  @IsString()
  @IsNotEmpty()
  gender: string;

  @ApiProperty({ example: 'Frontend' })
  @IsString()
  @IsNotEmpty()
  Stack: string;

  @ApiProperty({ example: 'intern' })
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiProperty({ type: 'string', format: 'binary' })
  profilePic: Express.Multer.File;
}

export class ScheduleInterviewDto {
  @ApiPropertyOptional({ example: '2026-04-15' })
  @ValidateIf((o) => o.interviewTime)
  @IsDateString()
  @IsNotEmpty()
  interviewDate: Date;

  @ApiPropertyOptional({ example: '10:00 AM' })
  @ValidateIf((o) => o.interviewDate)
  @IsString()
  @IsNotEmpty()
  interviewTime: string;

  @ApiPropertyOptional({ example: 'Hub conference room' })
  @IsString()
  @IsOptional()
  interview_location: string;

  @ApiPropertyOptional({ enum: IsCalledForInterview })
  @IsEnum(IsCalledForInterview)
  @ValidateIf((o) => o.interviewTime && o.interviewDate)
  @IsNotEmpty()
  isCalledForInterview: string;

  @ApiPropertyOptional({ enum: IsApproved })
  @IsEnum(IsApproved)
  @IsOptional()
  isApproved: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isStarted: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isFinished: boolean;
}

export class SuspensionDto {
  @ApiProperty({ example: 'Policy violation' })
  @IsString()
  @IsNotEmpty()
  suspensionReason: string;
}

export class ApproveApplicationDto {
  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  @IsNotEmpty()
  start_date: Date;

  @ApiProperty({ example: '2026-06-01' })
  @IsDateString()
  @IsNotEmpty()
  end_date: Date;
}

export class SearchUsersDto {
  @ApiProperty({ example: 'Ada', description: 'Free-text search query' })
  @IsString()
  @IsNotEmpty()
  query: string;
}

export class OrganisationUsersDto {
  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @IsNotEmpty()
  organisation: string;
}

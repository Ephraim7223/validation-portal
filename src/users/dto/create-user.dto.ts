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
import { IsApproved, IsCalledForInterview } from '../schema/enums';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  NIN: string;

  // @IsDateString()
  // @IsNotEmpty()
  // start_date: Date;

  // @IsDateString()
  // @IsNotEmpty()
  // end_date: Date;

  @IsString()
  @IsNotEmpty()
  hub: string;

  @IsString()
  @IsNotEmpty()
  D_O_B: string;

  @IsString()
  @IsNotEmpty()
  gender: string;

  @IsString()
  @IsNotEmpty()
  Stack: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  profilePic: Express.Multer.File;
}

export class ApproveUserDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  NIN: string;

  @IsDateString()
  @IsNotEmpty()
  start_date: Date;

  @IsDateString()
  @IsNotEmpty()
  end_date: Date;

  @IsString()
  @IsNotEmpty()
  D_O_B: string;

  @IsString()
  @IsNotEmpty()
  gender: string;

  @IsString()
  @IsNotEmpty()
  Stack: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  profilePic: Express.Multer.File;
}

export class ScheduleInterviewDto {
  @ValidateIf((o) => o.interviewTime)
  @IsDateString()
  @IsNotEmpty()
  interviewDate: Date;

  @ValidateIf((o) => o.interviewDate)
  @IsString()
  @IsNotEmpty()
  interviewTime: string;

  @IsString()
  @IsOptional()
  interview_location: string;

  @IsEnum(IsCalledForInterview)
  @ValidateIf((o) => o.interviewTime && o.interviewDate)
  @IsNotEmpty()
  isCalledForInterview: string;

  @IsEnum(IsApproved)
  @IsOptional()
  isApproved: string;

  @IsBoolean()
  @IsOptional()
  isStarted: boolean;

  @IsBoolean()
  @IsOptional()
  isFinished: boolean;
}

export class SuspensionDto {
  @IsString()
  @IsNotEmpty()
  suspensionReason: string;
}

export class ApproveApplicationDto {
  @IsDateString()
  @IsNotEmpty()
  start_date: Date;

  @IsDateString()
  @IsNotEmpty()
  end_date: Date;
}

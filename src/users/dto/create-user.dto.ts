import { IsDateString, IsEmail, IsNotEmpty, IsString } from 'class-validator';

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

  @IsDateString()
  @IsNotEmpty()
  start_date: Date;

  @IsDateString()
  @IsNotEmpty()
  end_date: Date;

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
  @IsString()
  @IsNotEmpty()
  interviewDate: string;

  @IsString()
  @IsNotEmpty()
  interviewTime: string;

  @IsString()
  @IsNotEmpty()
  interviewLocation: string;
}

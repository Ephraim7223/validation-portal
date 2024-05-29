import { IsBoolean, IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateHubDto {
  @IsString()
  @IsNotEmpty()
  hubName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  logo: Express.Multer.File;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  TIN: string;

  CAC: Express.Multer.File;
}

export class SignInDto {
  @IsNotEmpty()
  @IsString()
  hubId: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}

export class UpdatePaidStatusDto {
  @IsBoolean()
  @IsNotEmpty()
  isPaid: boolean;
}

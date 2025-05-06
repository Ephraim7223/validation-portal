import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
} from 'class-validator';
import { categoryEnum } from 'src/users/schema';

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

  @IsNotEmpty()
  @IsEnum(categoryEnum)
  category: categoryEnum;

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

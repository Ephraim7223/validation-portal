import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { categoryEnum } from 'src/users/schema';

export class CreateHubDto {
  @ApiProperty({ example: 'Lagos Tech Hub', description: 'Display name of the hub' })
  @IsString()
  @IsNotEmpty()
  hubName: string;

  @ApiProperty({ example: 'hub@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '08012345678' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'StrongPassword123!', writeOnly: true })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Hub logo image (jpg, png, jpeg, svg)',
  })
  logo: Express.Multer.File;

  @ApiProperty({ example: '12 Admiralty Way, Lagos' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ enum: categoryEnum })
  @IsNotEmpty()
  @IsEnum(categoryEnum)
  category: categoryEnum;

  @ApiProperty({ example: '12345678-0001' })
  @IsString()
  @IsNotEmpty()
  TIN: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'CAC document (pdf, jpg, png, jpeg)',
  })
  CAC: Express.Multer.File;
}

export class SignInDto {
  @ApiProperty({
    example: 'HUB-LAG-1234',
    description: 'Hub ID issued after verification',
  })
  @IsNotEmpty()
  @IsString()
  hubId: string;

  @ApiProperty({ example: 'StrongPassword123!', writeOnly: true })
  @IsNotEmpty()
  @IsString()
  password: string;
}

export class UpdatePaidStatusDto {
  @ApiProperty({ example: true, description: 'Whether the hub subscription is paid' })
  @IsBoolean()
  @IsNotEmpty()
  isPaid: boolean;
}

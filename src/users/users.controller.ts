import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './users.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CreateUserDto } from './dto/create-user.dto';
import { FileValidationPipe } from 'src/file-validation/file-validation.pipe';
import { responseFormatter } from 'src/utils/response.formatter';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @HttpCode(HttpStatus.OK)
  @Post('register')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'profilePic', maxCount: 1 }]))
  async register(
    @UploadedFiles(new FileValidationPipe())
    file: {
      profilePic: Express.Multer.File;
    },
    @Body() createUserDto: CreateUserDto,
  ) {
    console.log('Received files:', file);
    if (!file.profilePic) {
      return {
        statusCode: 400,
        message: 'Profile pic is required',
        data: null,
        error: null,
      };
    }

    const newUser = await this.userService.register({
      ...createUserDto,
      ...file,
    });
    if (!newUser || !newUser.statusCode) {
      return {
        statusCode: 500,
        message: 'Internal server error',
        data: null,
        error: null,
      };
    }

    return responseFormatter(newUser);
  }
}

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { HubService } from './hubs.service';
import { CreateHubDto } from './dto/create-hub.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from 'src/file-validation/file-validation.pipe';
import { responseFormatter } from 'src/utils/response.formatter';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { GetUser } from 'src/decorator';
// import { User } from 'src/users/schema';
import { JwtGuard } from 'src/guards';
import { Hub } from './schema/hubs.schema';

@Controller('hubs')
export class HubsController {
  constructor(private readonly hubsService: HubService) {}

  @HttpCode(HttpStatus.OK)
  @Post('register')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'CAC', maxCount: 1 },
      { name: 'logo', maxCount: 1 },
    ]),
  )
  async register(
    @UploadedFiles(new FileValidationPipe())
    file: {
      CAC: Express.Multer.File;
      logo: Express.Multer.File;
    },
    @Body() createHubDto: CreateHubDto,
  ) {
    console.log('Received files:', file);
    if (!file.CAC && !file.logo) {
      return {
        statusCode: 400,
        message: 'CAC and Logo fields are required',
        data: null,
        error: null,
      };
    }

    const newHub = await this.hubsService.register({
      ...createHubDto,
      ...file,
    });
    if (!newHub || !newHub.statusCode) {
      return {
        statusCode: 500,
        message: 'Internal server error',
        data: null,
        error: null,
      };
    }

    return responseFormatter(newHub);
  }

//   @HttpCode(HttpStatus.OK)
//   @UseGuards(JwtGuard)
//   @Post('register')
//   @UseInterceptors(FileFieldsInterceptor([{ name: 'profilePic', maxCount: 1 }]))
//   async addUser(
//     @UploadedFiles(new FileValidationPipe())
//     file: {
//       profilePic: Express.Multer.File;
//     },
//     @Body() createUserDto: CreateUserDto,
//     @GetUser() hub: Hub,
//   ) {
//     console.log('Received files:', file);
//     if (!file.profilePic) {
//       return {
//         statusCode: 400,
//         message: 'Profile pic is required',
//         data: null,
//         error: null,
//       };
//     }

//     const hubId = hub._id; // Assuming the JWT guard attaches the user/hub ID to the request object.
//     const newUser = await this.hubsService.createUser(
//       {
//         ...createUserDto,
//         profilePic: file.profilePic,
//       },
//       hubId,
//     );

//     if (!newUser || !newUser.statusCode) {
//       return {
//         statusCode: 500,
//         message: 'Internal server error',
//         data: null,
//         error: null,
//       };
//     }

//     return responseFormatter(newUser);
//   }
}

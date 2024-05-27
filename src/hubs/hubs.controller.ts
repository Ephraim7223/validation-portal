import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
  Req,
  Get,
} from '@nestjs/common';
import { HubService } from './hubs.service';
import { CreateHubDto, SignInDto } from './dto/create-hub.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from 'src/file-validation/file-validation.pipe';
import { responseFormatter } from 'src/utils/response.formatter';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
// import { User } from 'src/users/schema';
import { JwtGuard } from 'src/guards';

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

  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtGuard) // Protect the route with JWT authentication
  @Post('register')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'profilePic', maxCount: 1 }]))
  async addUser(
    @UploadedFiles(new FileValidationPipe())
    file: {
      profilePic: Express.Multer.File;
    },
    @Body() createUserDto: CreateUserDto,
    @Req() req: any, // Inject the request object to access the JWT token
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

    const token = req.headers.authorization.split(' ')[1]; // Extract the JWT token
    const newUser = await this.hubsService.createUser(
      {
        ...createUserDto,
        profilePic: file.profilePic,
      },
      token,
    );

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

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() signInDto: SignInDto) {
    return this.hubsService.login(signInDto);
  }

  @HttpCode(HttpStatus.OK)
  @Get()
  async getAllHubs() {
    return this.hubsService.getAllHubs();
  }
}

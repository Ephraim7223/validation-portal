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
  BadRequestException,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { HubService } from './hubs.service';
import { CreateHubDto, SignInDto } from './dto/create-hub.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from 'src/file-validation/file-validation.pipe';
import { responseFormatter } from 'src/utils/response.formatter';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { JwtGuard } from 'src/guards';
// import { AllowedRoles, Role } from 'src/decorator';
// import { User } from 'src/users/schema';
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
  @UseGuards(new JwtGuard(['hub'])) // Protect the route with JWT authentication
  @Post('register-user')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'profilePic', maxCount: 1 }]))
  async addUser(
    @UploadedFiles() file: { profilePic: Express.Multer.File },
    @Body() createUserDto: CreateUserDto,
    @Req() req,
  ) {
    const hubId = req.hub._id;
    if (!file.profilePic) {
      return {
        statusCode: 400,
        message: 'Profile pic is required',
        data: null,
        error: null,
      };
    }

    const newUser = await this.hubsService.createUser(createUserDto, hubId);

    if (!newUser || !newUser.statusCode) {
      return {
        statusCode: 500,
        message: 'Internal server error',
        data: null,
        error: null,
      };
    }

    return {
      statusCode: newUser.statusCode,
      message: newUser.message,
      data: newUser.data,
      error: newUser.error,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() signInDto: SignInDto) {
    return this.hubsService.login(signInDto);
  }

  @HttpCode(HttpStatus.OK)
  // @AllowedRoles(Role.superAdmin)
  // @UseGuards(new JwtGuard(['Super-admin']), RolesGuard)
  @Get()
  async getAllHubs() {
    return this.hubsService.getAllHubs();
  }

  @HttpCode(HttpStatus.OK)
  @Patch('verify/:id')
  async verifyHub(@Param('id') id: string) {
    try {
      const result = await this.hubsService.verifyHub(id);
      return result;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get(':id')
  async getSingleHub(@Param('id') id: string) {
    return this.hubsService.getSingleHub(id);
  }

  @Delete(':id')
  async deleteHub(@Param('id') id: string) {
    return this.hubsService.deleteHub(id);
  }
}

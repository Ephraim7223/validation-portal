import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './users.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CreateUserDto, SuspensionDto } from './dto/create-user.dto';
import { FileValidationPipe } from 'src/file-validation/file-validation.pipe';
import { responseFormatter } from 'src/utils/response.formatter';
// import { JwtGuard } from 'src/guards';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('check-unique')
  async checkUnique(
    @Query('email') email: string,
    @Query('phoneNumber') phoneNumber: string,
    @Query('NIN') NIN: string,
  ) {
    const result = await this.userService.checkUniqueFields(
      email,
      phoneNumber,
      NIN,
    );
    return result;
  }

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

  @HttpCode(HttpStatus.OK)
  @Get()
  async getAllUsers() {
    try {
      const result = await this.userService.getAllUsers();
      return result;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @HttpCode(HttpStatus.OK)
  @Get(':id')
  async getUserById(@Param('id') id: string) {
    try {
      const result = await this.userService.getUserById(id);
      return result;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    try {
      const result = await this.userService.deleteUser(id);
      return result;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @HttpCode(HttpStatus.OK)
  @Delete()
  async deleteAllUsers() {
    try {
      const result = await this.userService.deleteAllUsers();
      return result;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @HttpCode(HttpStatus.OK)
  @Get('hub/:hubId')
  async getUsersByHub(@Param('hubId') hubId: string) {
    try {
      const result = await this.userService.getUsersByHub(hubId);
      return result;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @HttpCode(HttpStatus.OK)
  @Get('role/:role')
  async getUsersByRole(@Param('role') role: string) {
    try {
      const result = await this.userService.getUsersByRole(role);
      return result;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch('suspend/:id')
  async requestSuspension(
    @Param('id') id: string,
    @Body() suspensionDto: SuspensionDto,
  ): Promise<any> {
    try {
      // Check user role (hub or admin) and call the appropriate method
      const result = await this.userService.suspendUser(id, suspensionDto);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Patch('unsuspend/:id')
  async unSuspendUser(@Param('id') id: string) {
    return await this.userService.unSuspendUser(id);
  }

  @Get('stacks/count')
  async getStacksCount() {
    return await this.userService.getStacksCount();
  }

  @Get('users/count-by-role-and-month')
  async getUsersCountByRoleAndMonth() {
    return await this.userService.getUsersCountByRoleAndMonth();
  }

  @Post('search')
  async search(@Body() body: { query: string }) {
    const { query } = body;
    if (!query || query.trim() === '') {
      throw new BadRequestException('Search query is required');
    }
    return await this.userService.search(query);
  }

  @Post('getUsersByOrganisation')
  async getUsersByOrganisation(@Body() body: { organisation: string }) {
    const { organisation } = body;
    if (!organisation || organisation.trim() === '') {
      throw new BadRequestException('Organisation field is required');
    }

    return await this.userService.getUsersByOrganisation(organisation);
  }
}

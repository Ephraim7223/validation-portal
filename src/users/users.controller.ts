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
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './users.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  CreateUserDto,
  OrganisationUsersDto,
  SearchUsersDto,
  SuspensionDto,
} from './dto/create-user.dto';
import { FileValidationPipe } from 'src/file-validation/file-validation.pipe';
import { responseFormatter } from 'src/utils/response.formatter';
import { JwtGuard } from 'src/guards';
import { IResponse } from 'src/interfaces';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('check-unique')
  @ApiOperation({
    summary: 'Check uniqueness of user fields',
    description: 'Checks email, phoneNumber, and/or NIN against existing users.',
  })
  @ApiQuery({ name: 'email', required: false })
  @ApiQuery({ name: 'phoneNumber', required: false })
  @ApiQuery({
    name: 'phone',
    required: false,
    description: 'Alias for phoneNumber',
  })
  @ApiQuery({ name: 'NIN', required: false })
  async checkUnique(
    @Query('email') email: string,
    @Query('phoneNumber') phoneNumber: string,
    @Query('phone') phone: string,
    @Query('NIN') NIN: string,
  ) {
    return this.userService.checkUniqueFields(
      email,
      phoneNumber || phone,
      NIN,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('register')
  @ApiOperation({
    summary: 'Register an applicant',
    description: 'Public registration with required profile picture upload.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 200, description: 'User registered' })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'profilePic', maxCount: 1 }]))
  async register(
    @UploadedFiles(new FileValidationPipe())
    file: {
      profilePic: Express.Multer.File;
    },
    @Body() createUserDto: CreateUserDto,
  ) {
    if (!file?.profilePic) {
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
  @UseGuards(new JwtGuard(['admin']))
  @ApiBearerAuth('JWT')
  @Get()
  @ApiOperation({ summary: 'List all users' })
  async getAllUsers() {
    try {
      return await this.userService.getAllUsers();
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Could not retrieve users',
      );
    }
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(new JwtGuard(['admin']))
  @ApiBearerAuth('JWT')
  @Delete()
  @ApiOperation({
    summary: 'Delete all users',
    description: 'Destructive operation — removes every user document. Admin only.',
  })
  async deleteAllUsers() {
    try {
      return await this.userService.deleteAllUsers();
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Could not delete users',
      );
    }
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(new JwtGuard(['admin']))
  @ApiBearerAuth('JWT')
  @Get('hub/:hubId')
  @ApiOperation({ summary: 'List users belonging to a hub' })
  @ApiParam({ name: 'hubId' })
  async getUsersByHub(@Param('hubId') hubId: string) {
    try {
      return await this.userService.getUsersByHub(hubId);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Could not retrieve users',
      );
    }
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(new JwtGuard(['admin']))
  @ApiBearerAuth('JWT')
  @Get('role/:role')
  @ApiOperation({ summary: 'List users by role' })
  @ApiParam({ name: 'role', example: 'intern' })
  async getUsersByRole(@Param('role') role: string) {
    try {
      return await this.userService.getUsersByRole(role);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Could not retrieve users',
      );
    }
  }

  @UseGuards(new JwtGuard(['admin', 'hub']))
  @ApiBearerAuth('JWT')
  @Patch('suspend/:id')
  @ApiOperation({ summary: 'Suspend a user' })
  @ApiParam({ name: 'id' })
  async requestSuspension(
    @Param('id') id: string,
    @Body() suspensionDto: SuspensionDto,
    @Req() req,
  ): Promise<any> {
    return this.userService.suspendUser(id, suspensionDto, req.user);
  }

  @UseGuards(new JwtGuard(['admin', 'hub']))
  @ApiBearerAuth('JWT')
  @Patch('unsuspend/:id')
  @ApiOperation({ summary: 'Unsuspend a user' })
  @ApiParam({ name: 'id' })
  async unSuspendUser(@Param('id') id: string, @Req() req) {
    return await this.userService.unSuspendUser(id, req.user);
  }

  @UseGuards(new JwtGuard(['admin']))
  @ApiBearerAuth('JWT')
  @Get('stacks/count')
  @ApiOperation({ summary: 'Count users per stack (global)' })
  async getStacksCount() {
    return await this.userService.getStacksCount();
  }

  @UseGuards(new JwtGuard(['admin']))
  @ApiBearerAuth('JWT')
  @Get('users/count-by-role-and-month')
  @ApiOperation({ summary: 'Aggregate user counts by role and month' })
  async getUsersCountByRoleAndMonth() {
    return await this.userService.getUsersCountByRoleAndMonth();
  }

  @Post('search')
  @ApiOperation({ summary: 'Search users by free-text query' })
  @ApiBody({ type: SearchUsersDto })
  async search(@Body() body: SearchUsersDto) {
    const { query } = body;
    if (!query || query.trim() === '') {
      throw new BadRequestException('Search query is required');
    }
    return await this.userService.search(query);
  }

  @UseGuards(new JwtGuard(['admin']))
  @ApiBearerAuth('JWT')
  @Post('getUsersByOrganisation')
  @ApiOperation({ summary: 'List users by organisation name' })
  @ApiBody({ type: OrganisationUsersDto })
  async getUsersByOrganisation(@Body() body: OrganisationUsersDto) {
    const { organisation } = body;
    if (!organisation || organisation.trim() === '') {
      throw new BadRequestException('Organisation field is required');
    }

    return await this.userService.getUsersByOrganisation(organisation);
  }

  @UseGuards(new JwtGuard(['admin']))
  @ApiBearerAuth('JWT')
  @Get('pending')
  @ApiOperation({
    summary: 'List pending applicants across all hubs',
    description: 'Admin overview. Hub accounts should use GET /hubs/users/pending-users.',
  })
  async getPendingUsers() {
    return this.userService.getPendingUsers();
  }

  @Post('admin/me')
  @UseGuards(new JwtGuard(['admin']))
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Get authenticated admin profile',
    description: 'Returns admin details and managed hubs (sensitive fields excluded).',
  })
  async getMe(@Req() req): Promise<IResponse> {
    const adminId = req.user._id;
    return this.userService.getMe(adminId);
  }

  // Parametric routes last
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiParam({ name: 'id' })
  async getUserById(@Param('id') id: string) {
    try {
      return await this.userService.getUserById(id);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Could not retrieve user',
      );
    }
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(new JwtGuard(['admin']))
  @ApiBearerAuth('JWT')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user by id' })
  @ApiParam({ name: 'id' })
  async deleteUser(@Param('id') id: string) {
    try {
      return await this.userService.deleteUser(id);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Could not delete user',
      );
    }
  }
}

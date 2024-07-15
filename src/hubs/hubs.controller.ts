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
  NotFoundException,
  UnauthorizedException,
  Put,
  UsePipes,
  ValidationPipe,
  Query,
} from '@nestjs/common';
import { HubService } from './hubs.service';
import {
  CreateHubDto,
  SignInDto,
  UpdatePaidStatusDto,
} from './dto/create-hub.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from 'src/file-validation/file-validation.pipe';
import { responseFormatter } from 'src/utils/response.formatter';
import {
  ApproveApplicationDto,
  ApproveUserDto,
  ScheduleInterviewDto,
} from 'src/users/dto/create-user.dto';
import { JwtGuard } from 'src/guards';
import { ForgotPasswordDto, ResetPasswordDto } from 'src/auth/dto';
import { IResponse } from 'src/interfaces';
@Controller('hubs')
export class HubsController {
  logger: any;
  constructor(private readonly hubsService: HubService) {}

  @Get('check-unique')
  async checkUnique(
    @Query('email') email: string,
    @Query('phoneNumber') phoneNumber: string,
    @Query('NIN') NIN: string,
  ) {
    const result = await this.hubsService.checkUniqueFields(
      email,
      phoneNumber,
      NIN,
    );
    return result;
  }

  @Get('check-unique')
  async checkUniques(
    @Query('email') email: string,
    @Query('phone') phone: string,
  ) {
    const result = await this.hubsService.checkUniqueField(email, phone);
    return result;
  }

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
  @UseGuards(JwtGuard)
  @Post('register-user')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'profilePic', maxCount: 1 }]))
  async addUser(
    @UploadedFiles(new FileValidationPipe())
    file: { profilePic: Express.Multer.File },
    @Body() createUserDto: ApproveUserDto,
    @Req() req,
  ) {
    const hubId = req.user._id;
    if (!file.profilePic) {
      return {
        statusCode: 400,
        message: 'Profile pic is required',
        data: null,
        error: null,
      };
    }

    const newUser = await this.hubsService.createUser(
      {
        ...createUserDto,
        profilePic: file.profilePic,
      },
      hubId,
    );

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

  @Patch('suspend/:id')
  async suspendHub(@Param('id') id: string) {
    try {
      const result = await this.hubsService.suspendHub(id);
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException('Hub not found');
      } else if (error instanceof BadRequestException) {
        throw new BadRequestException('Hub is already suspended');
      } else {
        throw new UnauthorizedException('Could not suspend hub');
      }
    }
  }

  @Patch('unsuspend/:id')
  async unsuspendHub(@Param('id') id: string) {
    try {
      const result = await this.hubsService.unsuspendHub(id);
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException('Hub not found');
      } else if (error instanceof BadRequestException) {
        throw new BadRequestException('Hub is not suspended');
      } else {
        throw new UnauthorizedException('Could not unsuspend hub');
      }
    }
  }

  @UseGuards(new JwtGuard(['hub']))
  @Get('users/users')
  async getUsersUnderHub(@Req() req) {
    const hubId = req.user._id;
    return this.hubsService.getUsersUnderHub(hubId);
  }

  @UseGuards(new JwtGuard(['hub']))
  @Get('users/users/:userId')
  async getSingleUser(@Req() req, @Param('userId') userId: string) {
    const hubId = req.user._id;
    return this.hubsService.getSingleUser(hubId, userId);
  }

  @UseGuards(new JwtGuard(['hub']))
  @Put('approve/:userId')
  @UsePipes(new ValidationPipe({ transform: true }))
  async approveUser(
    @Param('userId') userId: string,
    @Req() req,
    @Body() approveApplicationDto: ApproveApplicationDto,
  ) {
    const hubId = req.user._id;
    const response = await this.hubsService.approveUser(
      approveApplicationDto,
      userId,
      hubId,
    );
    return response;
  }

  @UseGuards(new JwtGuard(['hub']))
  @Post('users/schedule/:id')
  async scheduleInterview(
    @Req() req,
    @Param('id') id: string,
    @Body() interviewDto: ScheduleInterviewDto,
  ) {
    const hubId = req.user._id;
    try {
      const result = await this.hubsService.scheduleInterview(
        id,
        hubId,
        interviewDto,
      );
      return {
        statusCode: result.statusCode,
        message: result.message,
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      this.logger.error(`Error scheduling interview: ${error.message}`);
      throw new BadRequestException('Could not schedule interview');
    }
  }

  @UseGuards(JwtGuard)
  // @Get('users/pending-interview')
  @Get('users/pending-interview')
  async getUsersPendingInterview(@Req() req) {
    const hubId = req.user._id;
    return this.hubsService.getUsersPendingInterview(hubId);
  }

  @UseGuards(JwtGuard)
  @Get('users/role/:role')
  async getUsersByRole(@Param('role') role: string, @Req() req) {
    const hubId = req.user._id;
    return this.hubsService.getUsersByRole(role, hubId);
  }

  @UseGuards(JwtGuard)
  @Get('stacks/count')
  async getStacksCount(@Req() req) {
    const hubId = req.user._id;
    return this.hubsService.getStacksCount(hubId);
  }

  @UseGuards(new JwtGuard(['hub']))
  @Get('users/pending-users')
  async getPendingUsers(@Req() req) {
    const hubId = req.user._id;
    return await this.hubsService.getPendingUsers(hubId);
  }

  @UseGuards(new JwtGuard(['hub']))
  @Get('users/users-count-by-role-and-month')
  async getUsersCountByRoleAndMonth(@Req() req) {
    const hubId = req.user._id;
    return await this.hubsService.getUsersCountByRoleAndMonth(hubId);
  }

  @Patch('payment/:id')
  async updatePaidStatus(
    @Param('id') id: string,
    @Body() updatePaidStatusDto: UpdatePaidStatusDto,
  ) {
    return this.hubsService.updatePaidStatus(id, updatePaidStatusDto);
  }

  @Patch('forgot-password')
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<IResponse> {
    return this.hubsService.forgotPassword(forgotPasswordDto);
  }

  @Patch('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.hubsService.resetPassword(resetPasswordDto);
  }
}

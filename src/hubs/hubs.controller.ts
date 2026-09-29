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
  Put,
  UsePipes,
  ValidationPipe,
  Query,
  Logger,
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

@ApiTags('Hubs')
@Controller('hubs')
export class HubsController {
  private readonly logger = new Logger(HubsController.name);

  constructor(private readonly hubsService: HubService) {}

  @Get('check-unique')
  @ApiOperation({
    summary: 'Check uniqueness of hub email / phone',
    description:
      'Checks whether a hub email and/or phone already exist. Accepts `phone` or `phoneNumber` query params. At least one field is required.',
  })
  @ApiQuery({ name: 'email', required: false })
  @ApiQuery({ name: 'phone', required: false, description: 'Hub phone number' })
  @ApiQuery({
    name: 'phoneNumber',
    required: false,
    description: 'Alias for phone (frontend compatibility)',
  })
  @ApiResponse({ status: 200, description: 'Fields are unique' })
  @ApiResponse({ status: 409, description: 'Email and/or phone already exist' })
  async checkUnique(
    @Query('email') email: string,
    @Query('phone') phone: string,
    @Query('phoneNumber') phoneNumber: string,
  ) {
    return this.hubsService.checkUniqueField(email, phone || phoneNumber);
  }

  @HttpCode(HttpStatus.OK)
  @Post('register')
  @ApiOperation({
    summary: 'Register a new hub',
    description:
      'Creates a hub application with CAC and logo uploads. Password is hashed at rest and never returned in responses.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateHubDto })
  @ApiResponse({ status: 201, description: 'Hub created successfully' })
  @ApiResponse({ status: 400, description: 'Missing files or validation error' })
  @ApiResponse({ status: 409, description: 'Hub email/phone already exists' })
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
    if (!file?.CAC && !file?.logo) {
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
  @ApiBearerAuth('JWT')
  @Post('register-user')
  @ApiOperation({
    summary: 'Register a user under the authenticated hub',
    description: 'Requires a hub JWT. Uploads a profile picture and creates the applicant under the hub.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ApproveUserDto })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'profilePic', maxCount: 1 }]))
  async addUser(
    @UploadedFiles(new FileValidationPipe())
    file: { profilePic: Express.Multer.File },
    @Body() createUserDto: ApproveUserDto,
    @Req() req,
  ) {
    const hubId = req.user._id;
    if (!file?.profilePic) {
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
  @ApiOperation({
    summary: 'Hub login',
    description:
      'Authenticates with hubId + password. Returns JWT and hub profile (without password/OTP).',
  })
  @ApiBody({ type: SignInDto })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials / suspended / unverified' })
  async login(@Body() signInDto: SignInDto) {
    return this.hubsService.login(signInDto);
  }

  @HttpCode(HttpStatus.OK)
  @Get()
  @ApiOperation({
    summary: 'List all hubs',
    description: 'Returns all hubs with nested users. Sensitive fields are excluded.',
  })
  async getAllHubs() {
    return this.hubsService.getAllHubs();
  }

  @HttpCode(HttpStatus.OK)
  @Patch('verify/:id')
  @ApiOperation({ summary: 'Verify a hub account' })
  @ApiParam({ name: 'id', description: 'Hub MongoDB ObjectId' })
  async verifyHub(@Param('id') id: string) {
    return this.hubsService.verifyHub(id);
  }

  @Patch('suspend/:id')
  @ApiOperation({ summary: 'Suspend a hub' })
  @ApiParam({ name: 'id', description: 'Hub MongoDB ObjectId' })
  async suspendHub(@Param('id') id: string) {
    return this.hubsService.suspendHub(id);
  }

  @Patch('unsuspend/:id')
  @ApiOperation({ summary: 'Unsuspend a hub' })
  @ApiParam({ name: 'id', description: 'Hub MongoDB ObjectId' })
  async unsuspendHub(@Param('id') id: string) {
    return this.hubsService.unsuspendHub(id);
  }

  @UseGuards(new JwtGuard(['hub']))
  @ApiBearerAuth('JWT')
  @Get('users/users')
  @ApiOperation({ summary: 'List users under the authenticated hub' })
  async getUsersUnderHub(@Req() req) {
    const hubId = req.user._id;
    return this.hubsService.getUsersUnderHub(hubId);
  }

  @UseGuards(new JwtGuard(['hub']))
  @ApiBearerAuth('JWT')
  @Get('users/users/:userId')
  @ApiOperation({ summary: 'Get a single user under the authenticated hub' })
  @ApiParam({ name: 'userId' })
  async getSingleUser(@Req() req, @Param('userId') userId: string) {
    const hubId = req.user._id;
    return this.hubsService.getSingleUser(hubId, userId);
  }

  @UseGuards(new JwtGuard(['hub']))
  @ApiBearerAuth('JWT')
  @Put('approve/:userId')
  @ApiOperation({ summary: 'Approve a user application' })
  @ApiParam({ name: 'userId' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async approveUser(
    @Param('userId') userId: string,
    @Req() req,
    @Body() approveApplicationDto: ApproveApplicationDto,
  ) {
    const hubId = req.user._id;
    return this.hubsService.approveUser(
      approveApplicationDto,
      userId,
      hubId,
    );
  }

  @UseGuards(new JwtGuard(['hub']))
  @ApiBearerAuth('JWT')
  @Post('users/schedule/:id')
  @ApiOperation({ summary: 'Schedule an interview for a user' })
  @ApiParam({ name: 'id', description: 'User MongoDB ObjectId' })
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
      this.logger.error(
        `Error scheduling interview: ${error instanceof Error ? error.message : error}`,
      );
      throw new BadRequestException('Could not schedule interview');
    }
  }

  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT')
  @Get('users/pending-interview')
  @ApiOperation({ summary: 'List users pending interview for the hub' })
  async getUsersPendingInterview(@Req() req) {
    const hubId = req.user._id;
    return this.hubsService.getUsersPendingInterview(hubId);
  }

  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT')
  @Get('users/role/:role')
  @ApiOperation({ summary: 'List hub users filtered by role' })
  @ApiParam({ name: 'role', example: 'intern' })
  async getUsersByRole(@Param('role') role: string, @Req() req) {
    const hubId = req.user._id;
    return this.hubsService.getUsersByRole(role, hubId);
  }

  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT')
  @Get('stacks/count')
  @ApiOperation({ summary: 'Count users per stack for the authenticated hub' })
  async getStacksCount(@Req() req) {
    const hubId = req.user._id;
    return this.hubsService.getStacksCount(hubId);
  }

  @UseGuards(new JwtGuard(['hub']))
  @ApiBearerAuth('JWT')
  @Get('users/pending-users')
  @ApiOperation({ summary: 'List pending (unapproved) users for the hub' })
  async getPendingUsers(@Req() req) {
    const hubId = req.user._id;
    return await this.hubsService.getPendingUsers(hubId);
  }

  @UseGuards(new JwtGuard(['hub']))
  @ApiBearerAuth('JWT')
  @Get('users/users-count-by-role-and-month')
  @ApiOperation({
    summary: 'Aggregate hub user counts by role and month',
  })
  async getUsersCountByRoleAndMonth(@Req() req) {
    const hubId = req.user._id;
    return await this.hubsService.getUsersCountByRoleAndMonth(hubId);
  }

  @Patch('payment/:id')
  @ApiOperation({ summary: 'Update hub paid / subscription status' })
  @ApiParam({ name: 'id', description: 'Hub MongoDB ObjectId' })
  async updatePaidStatus(
    @Param('id') id: string,
    @Body() updatePaidStatusDto: UpdatePaidStatusDto,
  ) {
    return this.hubsService.updatePaidStatus(id, updatePaidStatusDto);
  }

  @Patch('forgot-password')
  @ApiOperation({
    summary: 'Request password reset OTP',
    description: 'Sends a 6-digit OTP to the hub email if the account exists.',
  })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<IResponse> {
    return this.hubsService.forgotPassword(forgotPasswordDto);
  }

  @Patch('reset-password')
  @ApiOperation({ summary: 'Reset hub password with OTP' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.hubsService.resetPassword(resetPasswordDto);
  }

  @Post('me')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Get authenticated hub profile',
    description: 'Returns hub details and related users (sensitive fields excluded).',
  })
  async getMe(@Req() req): Promise<IResponse> {
    const hubId = req.user._id;
    return this.hubsService.getMe(hubId);
  }

  // Parametric routes last so they do not shadow static paths above
  @Get(':id')
  @ApiOperation({ summary: 'Get a single hub by id' })
  @ApiParam({ name: 'id', description: 'Hub MongoDB ObjectId' })
  async getSingleHub(@Param('id') id: string) {
    return this.hubsService.getSingleHub(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a hub by id' })
  @ApiParam({ name: 'id', description: 'Hub MongoDB ObjectId' })
  async deleteHub(@Param('id') id: string) {
    return this.hubsService.deleteHub(id);
  }
}

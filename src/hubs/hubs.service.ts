import * as QRCode from 'qrcode';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateHubDto, SignInDto } from './dto/create-hub.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as argon from 'argon2';
import { Hub } from './schema/hubs.schema';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { User } from 'src/users/schema';
import { SuccessMail } from 'src/templates/success';
import {
  ApproveApplicationDto,
  ApproveUserDto,
  ScheduleInterviewDto,
} from 'src/users/dto/create-user.dto';
import { JwtHelper } from 'src/common/helpers';
import {
  generateHubID,
  generateUserID,
} from 'src/functions/genrating-random-number';
import { VerifiedMail } from 'src/templates/verified';
import { SuspensionMail } from 'src/templates/suspensionMail';
import { UnSuspensionHubMail } from 'src/templates/unSuspendedHubMail';
import { AcceptanceMail } from 'src/templates/acceptanceMail';
import { InterviewMail } from 'src/templates/interviewMail';

@Injectable()
export class HubService {
  private readonly logger = new Logger(HubService.name);

  constructor(
    @InjectModel(Hub.name)
    private readonly hubModel: Model<Hub>,
    private readonly cloudinary: CloudinaryService,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    private readonly cloudinary1: CloudinaryService,
  ) {}

  private getPublicIdFromUrl(imageUrl: string): string {
    const parts = imageUrl.split('/');
    const fileName = parts[parts.length - 1];
    const publicId = fileName.split('.')[0];
    return publicId;
  }

  calculateDurationInMonths(startDate: Date, endDate: Date): number {
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();

    return (endYear - startYear) * 12 + (endMonth - startMonth);
  }

  isValidObjectId(id: string): boolean {
    // Add validation logic for ObjectId if needed
    return id.match(/^[0-9a-fA-F]{24}$/) != null;
  }

  async register(createHubDto: CreateHubDto) {
    let response: any;
    const { email, hubName, phone } = createHubDto;

    const phoneNumberAsNumber = parseInt(phone);
    if (isNaN(phoneNumberAsNumber)) {
      return { message: 'Invalid phone number format' };
    }

    this.logger.log('Looking for a hub with an existing email');
    const existingHub = await this.hubModel.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingHub) {
      response = {
        statusCode: 409,
        message: 'Hub with existing email or phonealready exists',
        data: null,
        error: {
          code: 'HUB_ALREADY_EXIST',
          message: 'Hub with existing email or phone already exists',
        },
      };
    } else {
      this.logger.log(`uploading CAC to cloud...`);
      const CAC = await this.cloudinary.upload(createHubDto.CAC[0]);

      this.logger.log(`uploading logo to cloud...`);
      const logo = await this.cloudinary.upload(createHubDto.logo[0]);

      delete createHubDto.CAC;
      delete createHubDto.logo;

      this.logger.log(`creating new application...`);
      const hashedPassword = await argon.hash(createHubDto.password);

      const hubId = generateHubID(hubName);
      const newHub = await this.hubModel.create({
        ...createHubDto,
        hubId,
        phone: phoneNumberAsNumber,
        password: hashedPassword,
        CAC: CAC.secure_url,
        logo: logo.secure_url,
      });

      this.logger.log(`sending success email`);
      await SuccessMail.mail(newHub.hubName, newHub.email);

      response = {
        statusCode: 201,
        message: 'hub created successfully',
        data: newHub,
        error: null,
      };
    }

    this.logger.log(response);
    return response;
  }

  async createUser(createUserDto: ApproveUserDto, hubId: string) {
    const { email, NIN, phoneNumber, D_O_B, start_date, end_date } =
      createUserDto;

    try {
      // Validate NIN
      const ninAsNumber = parseInt(NIN, 10);
      if (isNaN(ninAsNumber)) {
        return {
          statusCode: 400,
          message: 'Invalid NIN format',
          data: null,
          error: null,
        };
      }

      // Validate phone number
      const phoneNumberAsNumber = parseInt(phoneNumber, 10);
      if (isNaN(phoneNumberAsNumber)) {
        return {
          statusCode: 400,
          message: 'Invalid phone number format',
          data: null,
          error: null,
        };
      }

      // Validate date of birth
      const parsedDOB = new Date(D_O_B);
      if (isNaN(parsedDOB.getTime())) {
        return {
          statusCode: 400,
          message: 'Invalid date of birth format',
          data: null,
          error: null,
        };
      }

      // Calculate age
      const today = new Date();
      let age = today.getFullYear() - parsedDOB.getFullYear();
      const m = today.getMonth() - parsedDOB.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < parsedDOB.getDate())) {
        age--;
      }

      // Check if user with email already exists
      const existingUser = await this.userModel.findOne({
        $or: [
          { email },
          { phoneNumber: phoneNumberAsNumber },
          { NIN: ninAsNumber },
        ],
      });
      if (existingUser) {
        return {
          statusCode: 409,
          message:
            'User with existing email, phone number, or NIN already exists',
          data: null,
          error: {
            code: 'USER_ALREADY_EXIST',
            message:
              'User with existing email, phone number, or NIN already exists',
          },
        };
      }

      // Upload profile picture to cloud
      this.logger.log(`Uploading profile picture to cloud...`);
      const profilePic = await this.cloudinary.upload(
        createUserDto.profilePic[0],
      );
      delete createUserDto.profilePic;

      // Validate start_date and end_date
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return {
          statusCode: 400,
          message: 'Invalid start date or end date',
          data: null,
          error: null,
        };
      }

      // Calculate duration in months
      const duration = this.calculateDurationInMonths(startDate, endDate);

      // Create new user
      const newUser = new this.userModel({
        ...createUserDto,
        hub: hubId,
        NIN: ninAsNumber,
        phoneNumber: phoneNumberAsNumber,
        profilePic: profilePic.secure_url,
        age,
        isPaid: true,
        isActive: true,
        isApproved: 'approved',
        isCalledForInterview: 'done',
        userID: generateUserID(createUserDto.role),
        duration,
      });

      await newUser.save();

      // Update hubs_users field in Hub model
      const hub = await this.hubModel.findById(hubId);
      if (!hub) {
        throw new NotFoundException('Hub not found');
      }
      hub.hubs_users.push(newUser._id);
      await hub.save();

      // Generate QR code for user
      const userDetails = {
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        phoneNumber: newUser.phoneNumber,
        NIN: newUser.NIN,
        age: newUser.age,
        gender: newUser.gender,
        Stack: newUser.Stack,
        role: newUser.role,
        hub: hubId,
      };
      const qrCodeData = await QRCode.toDataURL(JSON.stringify(userDetails));
      newUser.qrcode = qrCodeData;
      await newUser.save();

      // Send acceptance email
      this.logger.log(`Sending successful application email`);
      await AcceptanceMail.mail(
        newUser.firstName,
        newUser.lastName,
        hub.hubName,
        newUser.userID,
        newUser.Stack,
        newUser.role,
        newUser.duration,
        newUser.email,
      );

      return {
        statusCode: 201,
        message: 'User saved successfully',
        data: newUser,
        error: null,
      };
    } catch (error) {
      this.logger.error('Error creating user', error);
      return {
        statusCode: 500,
        message: 'Internal server error',
        data: null,
        error,
      };
    }
  }

  async login(signInDto: SignInDto) {
    try {
      const hub = await this.hubModel.findOne({ hubId: signInDto.hubId });
      if (!hub) {
        throw new UnauthorizedException('Invalid hubId');
      }

      if (hub.isVerified === false) {
        throw new UnauthorizedException('Account not verified');
      }

      if (hub.isSuspended === true) {
        throw new UnauthorizedException('Account is suspended');
      }

      const passMatches = await argon.verify(hub.password, signInDto.password);
      if (!passMatches) {
        throw new UnauthorizedException('Invalid password');
      }

      const token = JwtHelper.signToken(hub._id, hub.role);

      return {
        statusCode: 200,
        message: 'Login successful',
        data: { token, hub: hub },
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error during sign-in: ${error.message}`);
      throw error;
    }
  }

  async getAllHubs() {
    try {
      const hubs = await this.hubModel.find().populate('hubs_users');
      return {
        statusCode: 200,
        message: 'Hubs retrieved successfully',
        data: hubs,
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error retrieving hubs: ${error.message}`);
      throw new BadRequestException('Could not retrieve hubs');
    }
  }

  async verifyHub(id: string) {
    try {
      const hubToUpdate = await this.hubModel.findById(id);
      if (!hubToUpdate) {
        throw new NotFoundException('Hub not found');
      }

      if (hubToUpdate.isVerified === true) {
        throw new BadRequestException('Hub is already verified');
      }

      hubToUpdate.isVerified = true;
      const updatedHub = await hubToUpdate.save();

      if (!updatedHub) {
        throw new BadRequestException('Error updating hub');
      }

      await VerifiedMail.mail(
        updatedHub.email,
        updatedHub.hubName,
        updatedHub.hubId,
      );

      return {
        statusCode: 200,
        message: 'Hub verification successful',
        data: updatedHub,
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error verifying hub: ${error.message}`);
      throw new BadRequestException('Internal Server Error');
    }
  }

  async getSingleHub(id: string) {
    try {
      const hub = await this.hubModel.findById(id).populate('hubs_users');
      if (!hub) {
        throw new NotFoundException('Hub not found');
      }
      return {
        statusCode: 200,
        message: 'Hub retrieved successfully',
        data: hub,
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error retrieving single hub: ${error.message}`);
      throw new BadRequestException('Could not retrieve hub');
    }
  }

  async deleteHub(id: string) {
    try {
      const hubToDelete = await this.hubModel.findById(id);
      if (!hubToDelete) {
        throw new NotFoundException('Hub not found');
      }

      // Delete hub
      await hubToDelete.deleteOne();

      return {
        statusCode: 200,
        message: 'Hub deleted successfully',
        data: null,
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error deleting hub: ${error.message}`);
      throw new BadRequestException('Could not delete hub');
    }
  }

  async suspendHub(id: string) {
    try {
      const hubToSuspend = await this.hubModel.findById(id);
      if (!hubToSuspend) {
        throw new NotFoundException('Hub not found');
      }

      if (hubToSuspend.isSuspended === true) {
        throw new BadRequestException('Hub is already suspended');
      }

      hubToSuspend.isSuspended = true;
      await hubToSuspend.save();
      await SuspensionMail.mail(hubToSuspend.hubName, hubToSuspend.email);

      return {
        statusCode: 200,
        message: 'Hub suspended successfully',
        data: hubToSuspend,
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error suspending hub: ${error.message}`);
      throw new BadRequestException('Could not suspend hub');
    }
  }

  async unsuspendHub(id: string) {
    try {
      const hubToUnsuspend = await this.hubModel.findById(id);
      if (!hubToUnsuspend) {
        throw new NotFoundException('Hub not found');
      }

      if (hubToUnsuspend.isSuspended === false) {
        throw new BadRequestException('Hub is not suspended');
      }

      hubToUnsuspend.isSuspended = false;
      await hubToUnsuspend.save();
      await UnSuspensionHubMail.mail(
        hubToUnsuspend.hubName,
        hubToUnsuspend.email,
      );

      return {
        statusCode: 200,
        message: 'Hub unsuspended successfully',
        data: hubToUnsuspend,
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error unsuspending hub: ${error.message}`);
      throw new BadRequestException('Could not unsuspend hub');
    }
  }

  async approveUser(
    approveApplicationDto: ApproveApplicationDto,
    userId: string,
    hubId: string,
  ) {
    const { start_date, end_date } = approveApplicationDto;

    const user = await this.userModel.findOne({ _id: userId, hub: hubId });

    if (!user) {
      return {
        statusCode: 404,
        message:
          'No user found with this id or the user does not belong to this hub',
        data: null,
        error: null,
      };
    }

    if (user.isDeleted) {
      return {
        statusCode: 400,
        message: 'Cannot approve a deleted user',
        data: null,
        error: null,
      };
    }
    if ((user.isApproved = 'approved')) {
      return {
        statusCode: 400,
        message: 'Cannot approve an approved user',
        data: null,
        error: null,
      };
    }

    try {
      const { email, firstName, lastName, Stack, role } = user;

      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return {
          statusCode: 400,
          message: 'Invalid start date or end date',
          data: null,
          error: null,
        };
      }

      const duration = this.calculateDurationInMonths(startDate, endDate);

      const userID = generateUserID(role);

      user.duration = duration;

      const hub = await this.hubModel.findById(hubId);
      if (!hub) {
        return {
          statusCode: 404,
          message: 'Hub not found',
          data: null,
          error: null,
        };
      }

      await AcceptanceMail.mail(
        firstName,
        lastName,
        hub.hubName,
        userID,
        Stack,
        role,
        duration,
        email,
      );

      user.isApproved = 'approved';
      user.isCalledForInterview = 'done';
      user.isPaid = true;
      user.isActive = true;
      await user.save();

      return {
        statusCode: 200,
        message: 'User approved successfully',
        data: null,
        error: null,
      };
    } catch (err) {
      this.logger.log(
        `Error updating user with id: [${userId}]: ` +
          JSON.stringify(err, null, 2),
      );
      return {
        statusCode: 400,
        message: 'An error occurred updating user',
        data: null,
        error: err,
      };
    }
  }

  async scheduleInterview(
    userId: string,
    hubId: string,
    interviewDto: ScheduleInterviewDto,
  ) {
    const user = await this.userModel.findOne({
      _id: userId,
      hub: hubId,
    });

    if (!user) {
      return {
        statusCode: 404,
        message:
          'No user found with this ID or the user does not belong to this hub',
        data: null,
        error: null,
      };
    }

    if (user.isCalledForInterview === 'done') {
      return {
        statusCode: 400,
        message: 'User is already scheduled for an interview',
        data: null,
        error: null,
      };
    }

    if (
      (interviewDto.interviewDate && !interviewDto.interviewTime) ||
      (!interviewDto.interviewDate && interviewDto.interviewTime)
    ) {
      return {
        statusCode: 400,
        message:
          'Both a valid date and time are required for an interview call',
        data: null,
        error: null,
      };
    }

    try {
      // Fetch hub details based on the user's chosen hub
      const hub = await this.hubModel.findById(hubId);
      if (!hub) {
        return {
          statusCode: 404,
          message: 'Hub not found',
          data: null,
          error: null,
        };
      }

      const interviewLocation = hub.address;

      // Update user with interview details
      user.isCalledForInterview = 'called';
      user.interviewDate = interviewDto.interviewDate;
      user.interviewTime = interviewDto.interviewTime;
      user.interview_location = interviewLocation;
      await user.save();

      // Send interview email to user
      await InterviewMail.mail(
        user.email,
        user.firstName,
        user.lastName,
        user.interviewDate,
        user.interviewTime,
        interviewLocation,
      );

      // Return success response
      return {
        statusCode: 200,
        message: 'Interview scheduled successfully',
        data: user,
        error: null,
      };
    } catch (error) {
      this.logger.error(
        `Error scheduling interview for user ${userId}: ${error.message}`,
      );
      return {
        statusCode: 400,
        message: 'An error occurred scheduling the interview',
        data: null,
        error: error,
      };
    }
  }

  async getUsersPendingInterview(hubId: string) {
    try {
      // Find the hub and populate its users
      const hub = await this.hubModel.findById(hubId).populate('hubs_users');
      // .exec();
      if (!hub) {
        throw new NotFoundException('Hub not found');
      }

      // Filter users pending interview
      const usersPendingInterview = hub.hubs_users.filter((user: any) => {
        return user.isCalledForInterview !== 'done';
      });

      return {
        statusCode: 200,
        message: 'Users pending interview retrieved successfully',
        data: usersPendingInterview,
        error: null,
      };
    } catch (error) {
      this.logger.error(
        `Error retrieving users pending interview for hub ${hubId}: ${error.message}`,
      );
      throw new BadRequestException(
        'Could not retrieve users pending interview',
      );
    }
  }

  async getUsersUnderHub(hubId: any) {
    try {
      const hub = await this.hubModel.findById(hubId).populate('hubs_users');
      if (!hub) {
        throw new NotFoundException('Hub not found');
      }

      const usersUnderHub = hub.hubs_users;

      return {
        statusCode: 200,
        message: 'Users retrieved successfully',
        data: usersUnderHub,
        error: null,
      };
    } catch (error) {
      this.logger.error(
        `Error retrieving users for hub ${hubId}: ${error.message}`,
      );
      throw new BadRequestException('Could not retrieve users');
    }
  }

  async getSingleUser(hubId: string, userId: string) {
    try {
      const user = await this.userModel.findOne({ _id: userId, hub: hubId });
      if (!user) {
        throw new NotFoundException(
          'User not found or does not belong to this hub',
        );
      }
      return {
        statusCode: 200,
        message: 'User retrieved successfully',
        data: user,
        error: null,
      };
    } catch (error) {
      this.logger.error(
        `Error retrieving user ${userId} for hub ${hubId}: ${error.message}`,
      );
      throw new BadRequestException('Could not retrieve user');
    }
  }

  async getUsersByRole(role: string, hubId: any) {
    try {
      const users = await this.userModel
        .find({ role, hub: hubId })
        .populate('hub');
      return {
        statusCode: 200,
        message: 'Users retrieved successfully',
        data: users,
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error retrieving users by role: ${error.message}`);
      throw new BadRequestException('Internal Server Error');
    }
  }

  // Get the count of stacks within a specific hub
  async getStacksCount(hubId: string) {
    try {
      const userStacks = await this.userModel
        .find({ hub: hubId })
        .select('Stack')
        .exec();
      const stackCounts = userStacks.reduce((counts, user) => {
        const stack = user.Stack;
        if (!counts[stack]) {
          counts[stack] = 0;
        }
        counts[stack]++;
        return counts;
      }, {});

      return {
        statusCode: 200,
        message: 'Stacks count retrieved successfully',
        data: stackCounts,
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error fetching stacks count: ${error.message}`);
      throw new BadRequestException('Internal Server Error');
    }
  }

  async getPendingUsers(hubId: string) {
    try {
      const pendingUsers = await this.userModel
        .find({ hub: hubId, isApproved: 'pending' })
        .exec();

      return {
        statusCode: 200,
        message: 'Pending users retrieved successfully',
        data: pendingUsers,
        error: null,
      };
    } catch (error) {
      throw new BadRequestException('Internal Server Error');
    }
  }

  async getUsersCountByRoleAndMonth(hubId: string) {
    try {
      const currentYear = new Date().getFullYear();
      const roles = ['Intern', 'Private', 'Freelancer'];
      const userCountsByRoleAndMonth = [];

      for (const role of roles) {
        const roleUsers = await this.userModel
          .find({
            hub: hubId,
            role,
            createdAt: {
              $gte: new Date(`${currentYear}-01-01`),
              $lt: new Date(`${currentYear + 1}-01-01`),
            },
          })
          .exec();

        const countsByMonth = Array.from({ length: 12 }, () => 0);

        for (const user of roleUsers) {
          const month = new Date(user.createdAt).getMonth();
          countsByMonth[month]++;
        }

        userCountsByRoleAndMonth.push({
          role,
          countsByMonth,
        });
      }

      return {
        statusCode: 200,
        message: 'User counts by role and month retrieved successfully',
        data: userCountsByRoleAndMonth,
        error: null,
      };
    } catch (error) {
      console.error('Error fetching user counts by role and month:', error);
      throw new BadRequestException('Internal Server Error');
    }
  }
}

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
import { ApproveUserDto } from 'src/users/dto/create-user.dto';
import { JwtHelper } from 'src/common/helpers';
import {
  generateHubID,
  generateUserID,
} from 'src/functions/genrating-random-number';
import { VerifiedMail } from 'src/templates/verified';
import { SuspensionMail } from 'src/templates/suspensionMail';
import { UnSuspensionHubMail } from 'src/templates/unSuspendedHubMail';
import { AcceptanceMail } from 'src/templates/acceptanceMail';

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

  async register(createHubDto: CreateHubDto) {
    let response: any;
    const { email, hubName } = createHubDto;

    this.logger.log('Looking for a hub with an existing email');
    const existingHub = await this.hubModel.findOne({ email });

    if (existingHub) {
      response = {
        statusCode: 409,
        message: 'Hub with existing email already exists',
        data: null,
        error: {
          code: 'HUB_ALREADY_EXIST',
          message: 'Hub with existing email already exists',
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
    let response: any;
    const { email, NIN, phoneNumber, D_O_B, profilePic } = createUserDto;

    const ninAsNumber = parseInt(NIN);
    if (isNaN(ninAsNumber)) {
      return { message: 'Invalid NIN format' };
    }

    const phoneNumberAsNumber = parseInt(phoneNumber);
    if (isNaN(phoneNumberAsNumber)) {
      return { message: 'Invalid phone number format' };
    }

    const parsedDOB = new Date(D_O_B);
    if (isNaN(parsedDOB.getTime())) {
      return { message: 'Invalid date of birth format' };
    }

    const today = new Date();
    let age = today.getFullYear() - parsedDOB.getFullYear();
    const m = today.getMonth() - parsedDOB.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < parsedDOB.getDate())) {
      age--;
    }

    // Check if user with email already exists
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      response = {
        statusCode: 409,
        message: 'User with existing email already exists',
        data: null,
        error: {
          code: 'USER_ALREADY_EXIST',
          message: 'User with existing email already exists',
        },
      };
    } else {
      try {
        if (
          !profilePic ||
          !Array.isArray(profilePic) ||
          profilePic.length === 0
        ) {
          return { message: 'Profile picture is required' };
        }

        // Upload profile picture to cloud
        const profilePicUrl = await this.cloudinary.upload(profilePic[0]);
        delete createUserDto.profilePic;

        // Create new user with Hub ID from JWT token
        const newUser = await this.userModel.create({
          ...createUserDto,
          hub: hubId,
          NIN: ninAsNumber,
          phoneNumber: phoneNumberAsNumber,
          profilePic: profilePicUrl.secure_url,
          age,
        });

        // Update user details
        const userDetails = {
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          phoneNumber: newUser.phoneNumber,
          NIN: newUser.NIN,
          D_O_B: newUser.D_O_B,
          gender: newUser.gender,
          Stack: newUser.Stack,
          role: newUser.role,
          // hub: hubRecord.hubName,
        };

        const qrCodeData = await QRCode.toDataURL(JSON.stringify(userDetails));
        newUser.qrcode = qrCodeData;
        await newUser.save();

        // Update hubs_users field in Hub model
        const hub = await this.hubModel.findById(hubId);
        if (!hub) {
          throw new UnauthorizedException('Hub not found');
        }
        hub.hubs_users.push(newUser._id);
        await hub.save();

        response = {
          statusCode: 201,
          message: 'User saved successfully',
          data: newUser,
          error: null,
        };
      } catch (error) {
        console.log(error);
        this.logger.error('Error creating user', error);
        response = {
          statusCode: 500,
          message: 'Internal server error',
          data: null,
          error,
        };
      }
    }

    return response;
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
        data: token,
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

  async getUsersUnderHub(hubId: string) {
    try {
      const hub = await this.hubModel.findById(hubId).populate('hubs_users');
      if (!hub) {
        throw new NotFoundException('Hub not found');
      }
      return {
        statusCode: 200,
        message: 'Users retrieved successfully',
        data: hub.hubs_users,
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
      // Find the user by ID and ensure it belongs to the requesting hub
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

  async approveUser(userId: string, hub: string) {
    let response: any;

    const user = await this.userModel.findOne({
      _id: userId,
      hubId: hub,
    });

    if (!user) {
      return (response = {
        statusCode: 404,
        message:
          'No user found with this id or the user does not belong to this hub',
        data: null,
        error: null,
      });
    }

    if (user.isDeleted) {
      return (response = {
        statusCode: 400,
        message: 'Cannot approve a deleted user',
        data: null,
        error: null,
      });
    }

    try {
      const {
        email,
        firstName,
        lastName,
        start_date,
        end_date,
        Stack,
        hub,
        role,
      } = user;

      // Validate start_date and end_date
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return (response = {
          statusCode: 400,
          message: 'Invalid start date or end date',
          data: null,
          error: null,
        });
      }

      // Calculate duration in days
      const duration = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Generate userID
      const userID = generateUserID(role); // Assuming there's a function to generate a userID

      // Update the document with the generated userID and duration
      user.userID = userID;
      user.duration = duration;

      // Send acceptance email
      await AcceptanceMail.mail(
        firstName,
        lastName,
        role,
        userID,
        email,
        hub,
        Stack,
        duration,
      );

      user.isApproved = 'approved';
      user.isCalledForInterview = 'done';
      await user.save();

      return (response = {
        statusCode: 200,
        message: `User approved successfully`,
        data: null,
        error: null,
      });
    } catch (err) {
      console.log(err);

      this.logger.log(
        `Error updating user with id: [${userId}]: ` +
          JSON.stringify(err, null, 2),
      );

      response = {
        statusCode: 400,
        message: 'An error occurred updating user',
        data: null,
        error: err,
      };
    }
    return response;
  }
}

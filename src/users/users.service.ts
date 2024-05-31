import * as QRCode from 'qrcode';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schema';
import { Model } from 'mongoose';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { Hub } from 'src/hubs/schema/hubs.schema';
import { CreateUserDto, SuspensionDto } from './dto/create-user.dto';
import { UserSuspensionMail } from 'src/templates/suspendedUserMail';
import { UserUnSuspensionMail } from 'src/templates/unsuspendedUserMail';
import { ApplicationMail } from 'src/templates/successfulApplicationMail';
import { generateUserID } from 'src/functions/genrating-random-number';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    private readonly cloudinary: CloudinaryService,
    @InjectModel(Hub.name)
    private readonly hubModel: Model<Hub>,
  ) {}

  private getPublicIdFromUrl(imageUrl: string): string {
    const parts = imageUrl.split('/');
    const fileName = parts[parts.length - 1];
    const publicId = fileName.split('.')[0];
    return publicId;
  }

  async register(createUserDto: CreateUserDto) {
    let response: any;
    const { email, hub, NIN, phoneNumber, D_O_B } = createUserDto;

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

    this.logger.log('Looking for a user with an existing email');
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
    } else {
      this.logger.log(`Checking if hub exists...`);
      const hubRecord = await this.hubModel.findOne({ hubName: hub });
      if (!hubRecord) {
        throw new BadRequestException('Hub does not exist.');
      }

      this.logger.log(`Uploading profile-picture to cloud...`);
      const profilePic = await this.cloudinary.upload(
        createUserDto.profilePic[0],
      );
      delete createUserDto.profilePic;

      const userCount = await this.userModel.countDocuments({
        hub: hubRecord._id,
      });
      await this.hubModel.updateOne({ _id: hubRecord._id }, { userCount });

      this.logger.log(`Creating new user...`);
      const newUser = await this.userModel.create({
        ...createUserDto,
        hub: hubRecord._id,
        NIN: ninAsNumber,
        phoneNumber: phoneNumberAsNumber,
        profilePic: profilePic.secure_url,
        age,
        userID: generateUserID(createUserDto.role),
      });

      // Generate QR code with user details
      // const userDetails = {
      //   email: newUser.email,
      //   firstName: newUser.firstName,
      //   lastName: newUser.lastName,
      //   phoneNumber: newUser.phoneNumber,
      //   NIN: newUser.NIN,
      //   age: newUser.age,
      //   // D_O_B: newUser.D_O_B,
      //   gender: newUser.gender,
      //   Stack: newUser.Stack,
      //   role: newUser.role,
      //   hub: hubRecord.hubName,
      // };

      const websiteUrl = 'https://pdcvp.netlify.app/';

      // Generate the QR code containing the URL
      const qrCodeData = await QRCode.toDataURL(websiteUrl);
      newUser.qrcode = qrCodeData;
      await newUser.save();

      // Update hubs_users field in hubRecord
      if (!hubRecord.hubs_users.includes(newUser._id)) {
        hubRecord.hubs_users.push(newUser._id);
        await hubRecord.save();
      }

      this.logger.log(`Sending successful application email`);
      await ApplicationMail.mail(
        newUser.firstName,
        newUser.lastName,
        newUser.email,
      );

      response = {
        statusCode: 201,
        message: 'User saved successfully',
        data: newUser,
        error: null,
      };
    }

    this.logger.log(response);
    return response;
  }

  async getAllUsers() {
    try {
      const users = await this.userModel.find().populate('hub');
      return {
        statusCode: 200,
        message: 'Users retrieved successfully',
        data: users,
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error retrieving users: ${error.message}`);
      throw new BadRequestException('Internal Server Error');
    }
  }

  async getUserById(id: string) {
    try {
      const user = await this.userModel.findById(id).populate('hub');
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return {
        statusCode: 200,
        message: 'User retrieved successfully',
        data: user,
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error retrieving user: ${error.message}`);
      throw new BadRequestException('Internal Server Error');
    }
  }

  async deleteUser(id: string) {
    try {
      // Find the user to get the related hub ID
      const user = await this.userModel.findById(id);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Delete the user
      await this.userModel.findByIdAndDelete(id);

      // Update the hub to remove the user ID from hubs_users
      await this.hubModel.updateOne(
        { _id: user.hub },
        { $pull: { hubs_users: user._id } },
      );

      return {
        statusCode: 200,
        message: 'User deleted successfully',
        data: user,
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error deleting user: ${error.message}`);
      throw new BadRequestException('Internal Server Error');
    }
  }

  async deleteAllUsers() {
    try {
      // Get all users to find the related hub IDs
      const users = await this.userModel.find({});
      const userIDs = users.map((user) => user._id);
      const hubIDs = users.map((user) => user.hub);

      // Delete all users
      const result = await this.userModel.deleteMany({});

      // Update all hubs to remove the user IDs from hubs_users
      await this.hubModel.updateMany(
        { _id: { $in: hubIDs } },
        { $pull: { hubs_users: { $in: userIDs } } },
        { multi: true },
      );

      return {
        statusCode: 200,
        message: 'All users deleted successfully',
        data: result,
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error deleting all users: ${error.message}`);
      throw new BadRequestException('Internal Server Error');
    }
  }

  async getUsersByHub(hubId: string) {
    try {
      const users = await this.userModel.find({ hub: hubId }).populate('hub');
      return {
        statusCode: 200,
        message: 'Users retrieved successfully',
        data: users,
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error retrieving users by hub: ${error.message}`);
      throw new BadRequestException('Internal Server Error');
    }
  }

  async getUsersByRole(role: string) {
    try {
      const users = await this.userModel.find({ role }).populate('hub');
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
  async getUsersCountByRoleAndMonth() {
    try {
      const currentYear = new Date().getFullYear();
      const roles = ['Intern', 'Private', 'Freelancer'];
      const userCountsByRoleAndMonth = [];

      for (const role of roles) {
        const roleUsers = await this.userModel
          .find({
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

  async search(query: string) {
    try {
      if (!query || query.trim() === '') {
        throw new BadRequestException('Search query is required');
      }

      const searchResults = await this.userModel.find({
        $or: [
          { email: { $regex: query, $options: 'i' } },
          // { phoneNumber: { $regex: query, $options: '' } },
          // { NIN: { $regex: query, $options: '' } },
          { role: { $regex: query, $options: 'i' } },
          { Stack: { $regex: query, $options: 'i' } },
          { userID: { $regex: query, $options: 'i' } },
          { organisation: { $regex: query, $options: 'i' } },
          { firstName: { $regex: query, $options: 'i' } },
          { lastName: { $regex: query, $options: 'i' } },
        ],
      });

      return {
        statusCode: 200,
        message: 'Search results retrieved successfully',
        data: searchResults,
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error searching users: ${error.message}`);
      throw new BadRequestException('Internal Server Error');
    }
  }

  async getStacksCount() {
    try {
      const userStacks = await this.userModel.find().select('Stack').exec();
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

  async getUsersByOrganisation(organisation: string) {
    try {
      const users = await this.userModel.find({ organisation });

      if (!users || users.length === 0) {
        throw new BadRequestException(
          'No users found for the specified organisation',
        );
      }

      return users;
    } catch (error) {
      throw new BadRequestException('Internal Server Error');
    }
  }

  async suspendUser(id: string, suspensionDto: SuspensionDto) {
    try {
      const userToSuspend = await this.userModel.findById(id).populate('hub');
      if (!userToSuspend) {
        throw new NotFoundException('User not found');
      }

      const { suspensionReason } = suspensionDto;

      if (!userToSuspend.isActive) {
        throw new BadRequestException('User is already suspended');
      }

      // Perform suspension
      userToSuspend.isActive = false;
      userToSuspend.isPendingSuspension = false;
      userToSuspend.suspensionReason = suspensionReason;
      const updatedUser = await userToSuspend.save();

      // Notify user about suspension
      await UserSuspensionMail.mail(
        updatedUser.firstName,
        updatedUser.lastName,
        updatedUser.hub.hubName,
        updatedUser.email,
        // suspensionReason,
      );

      return {
        statusCode: 200,
        message: 'User suspended successfully',
        data: updatedUser,
        error: null,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error; // Re-throw BadRequestException to propagate the error message
      }
      this.logger.error(`Error suspending user: ${error.message}`);
      throw new BadRequestException('Internal Server Error');
    }
  }

  async unSuspendUser(id: string) {
    try {
      const userToUnsuspend = await this.userModel.findById(id).populate('hub');
      if (!userToUnsuspend) {
        throw new NotFoundException('User not found');
      }

      if (userToUnsuspend.isActive) {
        throw new BadRequestException('User is not suspended');
      }

      // Perform unsuspension
      userToUnsuspend.isActive = true;
      const updatedUser = await userToUnsuspend.save();

      // Notify user about unsuspension
      await UserUnSuspensionMail.mail(
        updatedUser.firstName,
        updatedUser.lastName,
        updatedUser.hub.hubName,
        updatedUser.email,
      );

      return {
        statusCode: 200,
        message: 'User unsuspended successfully',
        data: updatedUser,
        error: null,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error; // Re-throw BadRequestException or NotFoundException to propagate the error message
      }
      this.logger.error(`Error unsuspending user: ${error.message}`);
      throw new BadRequestException('Internal Server Error');
    }
  }
}

import * as QRCode from 'qrcode';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schema';
import mongoose, { Model } from 'mongoose';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { Hub } from 'src/hubs/schema/hubs.schema';
import { CreateUserDto, SuspensionDto } from './dto/create-user.dto';
import { UserSuspensionMail } from 'src/templates/suspendedUserMail';
import { UserUnSuspensionMail } from 'src/templates/unsuspendedUserMail';
import { ApplicationMail } from 'src/templates/successfulApplicationMail';
import { generateUserID } from 'src/functions/genrating-random-number';
import { Admin } from 'src/auth/schema';
import { IResponse } from 'src/interfaces/response.interface';
import { sanitizeDocument, dispatchMail } from 'src/common/helpers';
import {
  digitsOnly,
  emailsMatch,
  isValidPhoneInput,
  phoneMatchVariants,
  phoneMatchesStored,
} from 'src/utils/phone.util';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    private readonly cloudinary: CloudinaryService,
    @InjectModel(Hub.name)
    private readonly hubModel: Model<Hub>,
    @InjectModel(Admin.name)
    private readonly adminModel: Model<Admin>,
  ) {}

  isValidObjectId(id: string): boolean {
    return mongoose.Types.ObjectId.isValid(id);
  }

  private getPublicIdFromUrl(imageUrl: string): string {
    const parts = imageUrl.split('/');
    const fileName = parts[parts.length - 1];
    const publicId = fileName.split('.')[0];
    return publicId;
  }

  async checkUniqueFields(email?: string, phoneNumber?: string, NIN?: string) {
    const or: Record<string, unknown>[] = [];

    if (email?.trim()) {
      or.push({ email: email.trim() }, { email: email.trim().toLowerCase() });
    }
    if (phoneNumber) {
      if (!isValidPhoneInput(phoneNumber)) {
        return {
          statusCode: 400,
          message: 'Invalid phone number format',
          data: null,
          error: {
            code: 'INVALID_PHONE',
            message: 'Invalid phone number format',
          },
        };
      }
      const variants = phoneMatchVariants(phoneNumber);
      if (variants.length) or.push({ phoneNumber: { $in: variants } });
    }
    if (NIN) {
      const ninDigits = digitsOnly(NIN);
      if (ninDigits) {
        or.push({ NIN: ninDigits }, { NIN: Number(ninDigits) });
      }
    }

    if (!or.length) {
      return {
        statusCode: 400,
        message: 'Provide at least one of email, phoneNumber, or NIN',
        data: null,
        error: {
          code: 'MISSING_QUERY',
          message: 'Provide at least one of email, phoneNumber, or NIN',
        },
      };
    }

    const existingUser = await this.userModel.findOne({ $or: or });

    if (existingUser) {
      const conflicts: string[] = [];
      if (email && emailsMatch(email, existingUser.email)) conflicts.push('email');
      if (
        phoneNumber &&
        phoneMatchesStored(phoneNumber, existingUser.phoneNumber)
      ) {
        conflicts.push('phoneNumber');
      }
      if (NIN && digitsOnly(NIN) === digitsOnly(existingUser.NIN)) {
        conflicts.push('NIN');
      }

      if (!conflicts.length) {
        if (email) conflicts.push('email');
        else if (phoneNumber) conflicts.push('phoneNumber');
        else if (NIN) conflicts.push('NIN');
      }

      const message =
        conflicts.length === 1 && conflicts[0] === 'phoneNumber'
          ? 'Phone number already exists, please use a different number'
          : conflicts.length === 1 && conflicts[0] === 'email'
            ? 'Email already exists, please use a different email'
            : conflicts.length === 1 && conflicts[0] === 'NIN'
              ? 'NIN already exists, please use a different NIN'
              : 'One or more fields already exist';

      return {
        statusCode: 409,
        message,
        data: { conflicts },
        error: {
          code: 'FIELD_ALREADY_EXIST',
          message,
        },
      };
    }

    return {
      statusCode: 200,
      message: 'Fields are unique',
      data: null,
      error: null,
    };
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
    const phoneVariants = phoneMatchVariants(phoneNumber);
    const existingUser = await this.userModel.findOne({
      $or: [
        { email },
        { email: email?.trim()?.toLowerCase() },
        { phoneNumber: { $in: phoneVariants } },
        { NIN: ninAsNumber },
        { NIN: digitsOnly(NIN) },
      ],
    });
    if (existingUser) {
      const emailTaken = emailsMatch(email, existingUser.email);
      const phoneTaken = phoneMatchesStored(
        phoneNumber,
        existingUser.phoneNumber,
      );
      const ninTaken = digitsOnly(NIN) === digitsOnly(existingUser.NIN);

      const message =
        [emailTaken, phoneTaken, ninTaken].filter(Boolean).length === 1
          ? emailTaken
            ? 'Email already exists, please use a different email'
            : phoneTaken
              ? 'Phone number already exists, please use a different number'
              : 'NIN already exists, please use a different NIN'
          : 'User with existing email, phone number, or NIN already exists';

      return {
        statusCode: 409,
        message,
        data: {
          conflicts: [
            ...(emailTaken ? ['email'] : []),
            ...(phoneTaken ? ['phoneNumber'] : []),
            ...(ninTaken ? ['NIN'] : []),
          ],
        },
        error: {
          code: 'USER_ALREADY_EXIST',
          message,
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
        phoneNumber: digitsOnly(phoneNumber) || phoneNumberAsNumber,
        profilePic: profilePic.secure_url,
        age,
        userID: generateUserID(createUserDto.role),
      });

      const websiteUrl = 'https://verifytech.netlify.app/';

      const qrCodeData = await QRCode.toDataURL(websiteUrl);
      newUser.qrcode = qrCodeData;
      newUser.isPaid = true;
      await newUser.save();

      if (!hubRecord.hubs_users.includes(newUser._id)) {
        hubRecord.hubs_users.push(newUser._id);
        await hubRecord.save();
      }

      this.logger.log(`Sending successful application email (background)`);
      dispatchMail('user-register', () =>
        ApplicationMail.mail(
          newUser.firstName,
          newUser.lastName,
          newUser.email,
        ),
      );

      response = {
        statusCode: 201,
        message: 'User saved successfully',
        data: sanitizeDocument(newUser),
        error: null,
      };
    }

    this.logger.log(response);
    return response;
  }

  async getAllUsers() {
    try {
      const users = await this.userModel.find().populate('hub').lean();
      return {
        statusCode: 200,
        message: 'Users retrieved successfully',
        data: sanitizeDocument(users),
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

      let hubExpiryDate = null;
      if (user.hub && user.hub.isPaid && user.hub.paidAt) {
        hubExpiryDate = new Date(user.hub.paidAt);
        hubExpiryDate.setFullYear(hubExpiryDate.getFullYear() + 1);
      }

      let userExpiryDate = null;
      if (user.expiryDate) {
        userExpiryDate = user.expiryDate;
      } else if (user.start_date && user.duration) {
        const startDate = new Date(user.start_date);
        userExpiryDate = new Date(startDate);
        userExpiryDate.setMonth(startDate.getMonth() + user.duration);
      }

      return {
        statusCode: 200,
        message: 'User retrieved successfully',
        data: {
          ...sanitizeDocument(user.toObject()),
          calculatedExpiryDate: userExpiryDate,
          hubExpiryDate: hubExpiryDate,
        },
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error retrieving user: ${error.message}`);
      throw new BadRequestException('Internal Server Error');
    }
  }

  async deleteUser(id: string) {
    try {
      const user = await this.userModel.findById(id);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      await this.userModel.findByIdAndDelete(id);

      await this.hubModel.updateOne(
        { _id: user.hub },
        { $pull: { hubs_users: user._id } },
      );

      return {
        statusCode: 200,
        message: 'User deleted successfully',
        data: sanitizeDocument(user),
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error deleting user: ${error.message}`);
      throw new BadRequestException('Internal Server Error');
    }
  }

  async deleteAllUsers() {
    try {
      const users = await this.userModel.find({});
      const userIDs = users.map((user) => user._id);
      const hubIDs = users.map((user) => user.hub);

      const result = await this.userModel.deleteMany({});

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
        data: sanitizeDocument(users),
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
        data: sanitizeDocument(users),
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

      userToSuspend.isActive = false;
      userToSuspend.isPendingSuspension = false;
      userToSuspend.suspensionReason = suspensionReason;
      const updatedUser = await userToSuspend.save();

      dispatchMail('user-suspend', () =>
        UserSuspensionMail.mail(
          updatedUser.firstName,
          updatedUser.lastName,
          updatedUser.hub.hubName,
          updatedUser.email,
        ),
      );

      return {
        statusCode: 200,
        message: 'User suspended successfully',
        data: sanitizeDocument(updatedUser),
        error: null,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
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

      userToUnsuspend.isActive = true;
      const updatedUser = await userToUnsuspend.save();

      dispatchMail('user-unsuspend', () =>
        UserUnSuspensionMail.mail(
          updatedUser.firstName,
          updatedUser.lastName,
          updatedUser.hub.hubName,
          updatedUser.email,
        ),
      );

      return {
        statusCode: 200,
        message: 'User unsuspended successfully',
        data: sanitizeDocument(updatedUser),
        error: null,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error(`Error unsuspending user: ${error.message}`);
      throw new BadRequestException('Internal Server Error');
    }
  }

  async getMe(adminId: string): Promise<IResponse> {
    if (!this.isValidObjectId(adminId)) {
      throw new BadRequestException('Invalid admin ID format');
    }

    const admin = await this.adminModel.findById(adminId).select({
      password: 0,
      otp: 0,
      otpCreatedAt: 0,
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const managedHubs = await this.hubModel.find({ admin: adminId }).select({
      password: 0,
      otp: 0,
      otpCreatedAt: 0,
    });

    return {
      statusCode: 200,
      message: 'Admin details retrieved successfully',
      data: {
        admin,
        hubs: managedHubs,
      },
      error: null,
    };
  }
}

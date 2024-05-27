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
import { CreateUserDto } from './dto/create-user.dto';

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
    const { email, hub, NIN, phoneNumber } = createUserDto;
    const ninAsNumber = parseInt(NIN);
    const phoneNumberAsNumber = parseInt(phoneNumber);

    this.logger.log('Looking for a user with an existing email');
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
      });
      // Update hubs_users field in hubRecord
      if (!hubRecord.hubs_users.includes(newUser._id)) {
        hubRecord.hubs_users.push(newUser._id);
        await hubRecord.save();
      }

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
      const user = await this.userModel.findByIdAndDelete(id);
      if (!user) {
        throw new NotFoundException('User not found');
      }
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
      const result = await this.userModel.deleteMany({});
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
}

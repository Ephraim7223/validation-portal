import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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
      const hubRecord = await this.hubModel.findOne({
        hubName: hub,
      });
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

      const newUser = await this.userModel.create({
        ...createUserDto,
        hub: hubRecord._id,
        NIN: ninAsNumber,
        phoneNumber: phoneNumberAsNumber,
        profilePic: profilePic.secure_url,
      });

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
}

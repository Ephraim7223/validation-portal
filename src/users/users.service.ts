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
    @InjectModel('User')
    private readonly userModel: Model<User>,
    private readonly cloudinary: CloudinaryService,
    @InjectModel('Hub')
    private readonly hubModel: Model<Hub>,
  ) {}

  private getPublicIdFromUrl(imageUrl: string): string {
    const parts = imageUrl.split('/');
    const fileName = parts[parts.length - 1];
    const publicId = fileName.split('.')[0];
    return publicId;
  }

  async register(
    createUserDto: CreateUserDto,
    profilePic: Express.Multer.File[],
  ) {
    let response: any;
    const { email, hub } = createUserDto;

    this.logger.log('Looking for a user with an existing email');
    const existingUser = await this.userModel.findOne({ email });

    if (existingUser) {
      response = {
        statusCode: 409,
        message: 'User with existing sku already exists',
        data: null,
        error: {
          code: 'USER_ALREADY_EXIST',
          message: 'User with existing sku already exists',
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
      const uploadedImages = [];
      for (const image of profilePic) {
        const uploadedImage = await this.cloudinary.upload(image);
        uploadedImages.push(uploadedImage.secure_url);
      }

      const userCount = await this.userModel.countDocuments({
        hub: hubRecord._id,
      });
      await this.hubModel.updateOne({ _id: hubRecord._id }, { userCount });

      const newUser = await this.userModel.create({
        ...createUserDto,
        hub: hubRecord._id,
        profilePic: uploadedImages,
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

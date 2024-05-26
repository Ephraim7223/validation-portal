import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { CreateHubDto } from './dto/create-hub.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Hub } from './schema/hubs.schema';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { User } from 'src/users/schema';
import { SuccessMail } from 'src/templates/success';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

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

  async register(
    createHubDto: CreateHubDto,
    // logo: Express.Multer.File,
    // CAC: Express.Multer.File,
  ) {
    let response: any;
    const { email } = createHubDto;

    this.logger.log('Looking for a user with an existing email');
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

      const newHub = await this.hubModel.create({
        ...createHubDto,
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

  async createUser(createUserDto: CreateUserDto, hubId: string) {
    let response: any;
    const { email } = createUserDto;

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
      const hub = await this.hubModel.findById(hubId);

      if (!hub) {
        throw new UnauthorizedException('Hub not found');
      }

      this.logger.log(`Uploading profile picture to cloud...`);
      const profilePic = await this.cloudinary.upload(
        createUserDto.profilePic[0],
      );

      delete createUserDto.profilePic;

      this.logger.log(`Creating new user...`);
      const newUser = new this.userModel({
        ...createUserDto,
        profilePic: profilePic.secure_url,
        hub: hub._id,
      });

      const savedUser = await newUser.save();
      hub.hubs_users.push(savedUser._id);
      await hub.save();

      response = {
        statusCode: 201,
        message: 'User saved successfully',
        data: savedUser,
        error: null,
      };
    }

    this.logger.log(response);
    return response;
  }
}

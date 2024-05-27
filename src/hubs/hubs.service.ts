import {
  BadRequestException,
  Injectable,
  Logger,
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
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtHelper } from 'src/common/helpers';
import { generateHubID } from 'src/functions/genrating-random-number';

@Injectable()
export class HubService {
  private readonly logger = new Logger(HubService.name);

  constructor(
    @InjectModel(Hub.name)
    private readonly hubModel: Model<Hub>,
    private readonly jwtService: JwtService,
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

  async createUser(createUserDto: CreateUserDto, token: string) {
    let response: any;
    const { email, NIN, phoneNumber } = createUserDto;
    const ninAsNumber = parseInt(NIN);
    const phoneNumberAsNumber = parseInt(phoneNumber);

    // Extract Hub ID from JWT token
    const decodedToken = this.jwtService.decode(token) as any;
    const hubId = decodedToken.hubId;

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
        // Upload profile picture to cloud
        const profilePic = await this.cloudinary.upload(
          createUserDto.profilePic[0],
        );
        delete createUserDto.profilePic;

        // Create new user with Hub ID from JWT token
        const newUser = await this.userModel.create({
          ...createUserDto,
          hub: hubId, // Assigning Hub ID from JWT token
          NIN: ninAsNumber,
          phoneNumber: phoneNumberAsNumber,
          profilePic: profilePic.secure_url,
        });

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
        throw new UnauthorizedException('Hub not found');
      }
    }

    this.logger.log(response);
    return response;
  }

  async login(signInDto: SignInDto) {
    try {
      const hub = await this.hubModel.findOne({ hubId: signInDto.hubId });
      if (!hub) {
        throw new UnauthorizedException('Invalid hubId');
      }

      if (hub.isVerified === 'false') {
        throw new UnauthorizedException('Account not verified');
      }

      if (hub.isSuspended) {
        throw new UnauthorizedException('Account is suspended');
      }

      const passMatches = await argon.verify(hub.password, signInDto.password);
      if (!passMatches) {
        throw new UnauthorizedException('Invalid password');
      }

      const token = JwtHelper.signToken(hub.id, null);

      return {
        statusCode: 200,
        message: 'Login successful',
        data: { token },
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
}

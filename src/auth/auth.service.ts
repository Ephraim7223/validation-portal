import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SignInDto } from './dto';
import { IResponse } from 'src/interfaces';
import * as argon from 'argon2';
import { JwtHelper } from 'src/common/helpers';
import { LoginDto, SignUpDto } from './dto';
import { Admin } from './schema/user.schema';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(@InjectModel('User') private readonly userModel: Model<Admin>) {}

  async createUser(signupDto: SignUpDto): Promise<IResponse> {
    if (signupDto.password !== signupDto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const existingUser = await this.userModel.findOne({
      email: signupDto.email,
    });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const hashedPassword = await argon.hash(signupDto.password);

    const newUser = new this.userModel({
      ...signupDto,
      password: hashedPassword,
    });

    try {
      const savedUser = await newUser.save();
      savedUser.password = undefined;

      const response: IResponse = {
        statusCode: 201,
        message: 'User created successfully',
        data: savedUser,
        error: null,
      };
      return response;
    } catch (error) {
      throw new BadRequestException('Failed to create user');
    }
  }
  async signIn(signInDto: SignInDto): Promise<IResponse> {
    try {
      const admin = await this.userModel.findOne({ email: signInDto.email });

      if (!admin) {
        throw new NotFoundException(
          `User with email ${signInDto.email} not found`,
        );
      }

      const passMatches = await argon.verify(
        admin.password,
        signInDto.password,
      );

      if (!passMatches) {
        throw new UnauthorizedException('Invalid login credentials');
      }

      if (admin.role !== 'admin') {
        throw new UnauthorizedException(
          'Unauthorized: User does not have admin role',
        );
      }

      const accessToken = JwtHelper.signToken(admin.id, 'admin');

      this.logger.log(`Admin signed in successfully`);
      return {
        statusCode: 200,
        message: 'Signed in successfully',
        data: accessToken,
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error during sign-in: ${error.message}`);
      throw error; // Let NestJS handle the exception
    }
  }

  async userLogIn(loginDto: LoginDto): Promise<IResponse> {
    try {
      const email = loginDto.email.trim().toLowerCase(); // Normalize the email
      const user = await this.userModel.findOne({ email: loginDto.email });

      if (!user) {
        throw new NotFoundException(`User with email ${email} not found`);
      }

      const passMatches = await argon.verify(user.password, loginDto.password);

      if (!passMatches) {
        throw new UnauthorizedException('Invalid login credentials');
      }

      const accessToken = JwtHelper.signToken(user.id, user.role); // Use user.role here

      this.logger.log(`User signed in successfully`);
      return {
        statusCode: 200,
        message: 'Signed in successfully',
        data: accessToken,
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error during sign-in: ${error.message}`);
      throw error;
    }
  }
}

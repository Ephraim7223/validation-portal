import {
  // BadRequestException,q
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
import { Admin } from './schema/user.schema';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(@InjectModel('Admin') private readonly userModel: Model<Admin>) {}
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

      const accessToken = JwtHelper.signToken(admin.id, admin.role);

      this.logger.log(`Admin signed in successfully`);
      return {
        statusCode: 200,
        message: 'Signed in successfully',
        data: { accessToken, role: admin.role },
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error during sign-in: ${error.message}`);
      throw error;
    }
  }
}

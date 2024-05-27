import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { PassportStrategy } from '@nestjs/passport';
import { Model } from 'mongoose';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Admin } from 'src/auth/schema';
import { Hub } from 'src/hubs/schema/hubs.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    @InjectModel(Admin.name) private readonly adminModel: Model<Admin>,
    @InjectModel(Hub.name) private readonly hubModel: Model<Hub>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: { sub: string; role: string }) {
    let user;

    if (payload.role === 'admin' || payload.role === 'Super-admin') {
      user = await this.adminModel.findById({ _id: payload.sub }).exec();
    } else if (payload.role === 'hub') {
      user = await this.hubModel.findById({ _id: payload.sub }).exec();
    }

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    delete user.password; // Remove sensitive data
    return user;
  }
}

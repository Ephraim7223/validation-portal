import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { PassportStrategy } from '@nestjs/passport';
import { Model } from 'mongoose';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Admin } from 'src/auth/schema';
import { Hub } from 'src/hubs/schema/hubs.schema';
import { isAdminRole, normalizeAccountRole } from 'src/common/helpers';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    @InjectModel(Admin.name) private readonly adminModel: Model<Admin>,
    @InjectModel(Hub.name) private readonly hubModel: Model<Hub>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: { sub: string; role: string }) {
    let user: Record<string, unknown> | null = null;
    const tokenRole = normalizeAccountRole(payload.role);

    if (isAdminRole(payload.role) || isAdminRole(tokenRole)) {
      user = await this.adminModel
        .findById(payload.sub)
        .select('-password -secretToken')
        .lean()
        .exec();
    } else if (tokenRole === 'hub' || normalizeAccountRole(payload.role) === 'hub') {
      user = await this.hubModel
        .findById(payload.sub)
        .select('-password -otp -otpCreatedAt -secretToken')
        .lean()
        .exec();
    }

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Prefer DB role, fall back to JWT claim — always keep a usable role for guards
    const resolvedRole = user.role || payload.role;
    const normalized =
      normalizeAccountRole(String(resolvedRole)) ||
      normalizeAccountRole(payload.role);

    if (!normalized) {
      throw new UnauthorizedException('Account role is invalid');
    }

    return {
      ...user,
      role: resolvedRole,
      // Canonical role used by JwtGuard / RolesGuard
      accountRole: normalized,
    };
  }
}

import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export class JwtHelper {
  static signToken(sub: any, role: string): { token: string } {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new UnauthorizedException('JWT secret is not configured');
    }

    const jwtService = new JwtService({
      secret,
    });

    const payload = {
      sub,
      role,
    };

    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const token = jwtService.sign(payload, {
      expiresIn: expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });

    return {
      token,
    };
  }

  static verifyToken(token: string) {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new UnauthorizedException('JWT secret is not configured');
    }

    const jwtService = new JwtService({
      secret,
    });

    try {
      return jwtService.verify(token);
    } catch {
      throw new UnauthorizedException(
        'This token is invalid or expired, request a new one',
      );
    }
  }
}

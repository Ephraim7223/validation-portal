import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export class JwtHelper {
  static signToken(sub: string, role: string): { token: string } {
    const jwtService = new JwtService({
      secret: process.env.JWT_ACCESS_SECRET,
    });

    const payload = {
      sub: sub,
      role: role,
    };
    const token = jwtService.sign(payload, { expiresIn: '7d' });

    return {
      token: token,
    };
  }

  static verifyToken(token: string) {
    const jwtService = new JwtService({
      secret: process.env.JWT_ACCESS_SECRET,
    });
    try {
      jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException(
        `This OTP is inavlid or expired, request for another one ${error}`,
      );
    }
  }
}

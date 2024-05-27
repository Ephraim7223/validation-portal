import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export class JwtHelper {
  static signToken(sub: any, role: string): { token: string } {
    const jwtService = new JwtService({
      secret: process.env.JWT_ACCESS_SECRET,
    });

    const payload = {
      sub,
      role,
    };

    const token = jwtService.sign(payload, { expiresIn: '7d' });

    return {
      token,
    };
  }

  static verifyToken(token: string) {
    const jwtService = new JwtService({
      secret: process.env.JWT_ACCESS_SECRET,
    });

    try {
      return jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException(
        `This token is invalid or expired, request a new one: ${error.message}`,
      );
    }
  }
}

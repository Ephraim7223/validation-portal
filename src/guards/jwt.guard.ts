import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

export class JwtGuard extends AuthGuard('jwt') {
  public handleRequest(err: unknown, user: any): any {
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException(
          'Invalid or expired token: login to access this resource',
        )
      );
    }
    return user;
  }

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const canActivate = await super.canActivate(context);
    if (!canActivate) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const { user } = request;

    if (!user) {
      throw new UnauthorizedException('No user found in request');
    }

    return true;
  }
}

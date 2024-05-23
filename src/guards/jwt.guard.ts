import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { User } from 'src/auth/schema';

export class JwtGuard extends AuthGuard('jwt') {
  public handleRequest(err: unknown, user: User): any {
    if (!user)
      throw new UnauthorizedException(
        'invalid or expired token: login to access this resource',
      );
    return user;
  }

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);

    const { user } = context.switchToHttp().getRequest();

    return user ? true : false;
  }
}

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

export class JwtGuard extends AuthGuard('jwt') {
  constructor(private roles: string[]) {
    super();
  }

  public handleRequest(err: unknown, user: any) {
    if (!user) {
      throw new UnauthorizedException(
        'Invalid or expired token: login to access this resource',
      );
    }

    if (this.roles && !this.roles.includes(user.role)) {
      throw new UnauthorizedException(
        'You do not have permission to access this resource',
      );
    }

    return user;
  }

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);

    const { user } = context.switchToHttp().getRequest();
    return user ? true : false;
  }
}

import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { roleAllowed } from 'src/common/helpers';

export class JwtGuard extends AuthGuard('jwt') {
  constructor(private roles: string[] = []) {
    super();
  }

  public handleRequest(err: unknown, user: any) {
    if (err || !user) {
      throw new UnauthorizedException(
        'Invalid or expired token: login to access this resource',
      );
    }

    if (this.roles.length > 0) {
      const candidateRole = user.accountRole || user.role;
      if (!roleAllowed(candidateRole, this.roles)) {
        throw new ForbiddenException(
          'You do not have permission to access this resource',
        );
      }
    }

    return user;
  }

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);

    const { user } = context.switchToHttp().getRequest();
    return user ? true : false;
  }
}

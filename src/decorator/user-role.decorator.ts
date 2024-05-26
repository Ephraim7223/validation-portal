import { SetMetadata } from '@nestjs/common';

export enum Role {
  admin = 'admin',
  user = 'user',
  hub = 'hub',
}

export const ROLES_KEY = 'roles';
export const AllowedRoles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

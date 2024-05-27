import { SetMetadata } from '@nestjs/common';

export enum Role {
  superAdmin = 'super-admin',
  admin = 'admin',
  user = 'user',
  hub = 'hub',
}

export const ROLES_KEY = 'roles';
export const AllowedRoles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

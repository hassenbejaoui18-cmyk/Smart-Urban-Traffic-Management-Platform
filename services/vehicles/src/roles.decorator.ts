import { SetMetadata } from '@nestjs/common';
import { Role } from './common/role.enum';

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

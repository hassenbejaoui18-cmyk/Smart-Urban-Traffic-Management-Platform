import { registerEnumType } from '@nestjs/graphql';
import { Role } from '@prisma/client';

/**
 * Enum: Role (GraphQL)
 * --------------------
 * Re-exports the Prisma Role enum (ADMIN, OPERATOR) as a
 * GraphQL enum type so it can be used in schema and resolvers.
 */
registerEnumType(Role, { name: 'Role' });

export { Role };

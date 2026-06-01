import { registerEnumType } from '@nestjs/graphql';
import { VehicleType } from '@prisma/vehicle-client';

/**
 * Enum: VehicleType
 * -----------------
 * Registers the Prisma VehicleType enum with GraphQL so it can
 * be used as a GraphQL enum type in queries and mutations.
 */
registerEnumType(VehicleType, { name: 'VehicleType' });

export { VehicleType };

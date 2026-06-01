/**
 * File: congestion-level.enum.ts
 * -------------------------------
 * Re-exports the Prisma CongestionLevel enum and registers it
 * with GraphQL so it can be used in @ObjectType and @Field decorators.
 *
 * @returns {CongestionLevel}
 */
import { registerEnumType } from '@nestjs/graphql';
import { CongestionLevel } from '@prisma/traffic-client';

registerEnumType(CongestionLevel, { name: 'CongestionLevel' });

export { CongestionLevel };

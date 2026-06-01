import { registerEnumType } from '@nestjs/graphql';
import { IncidentStatus } from '@prisma/incident-client';

/**
 * Enum: IncidentStatus
 * --------------------
 * Registers the Prisma IncidentStatus enum with GraphQL so it
 * can be used as a GraphQL enum type for status transitions.
 */
registerEnumType(IncidentStatus, { name: 'IncidentStatus' });

export { IncidentStatus };

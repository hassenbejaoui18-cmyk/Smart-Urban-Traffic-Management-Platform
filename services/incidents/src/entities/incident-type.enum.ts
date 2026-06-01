import { registerEnumType } from '@nestjs/graphql';
import { IncidentType } from '@prisma/incident-client';

/**
 * Enum: IncidentType
 * ------------------
 * Registers the Prisma IncidentType enum with GraphQL so it can
 * be used as a GraphQL enum type for incident categorization.
 */
registerEnumType(IncidentType, { name: 'IncidentType' });

export { IncidentType };

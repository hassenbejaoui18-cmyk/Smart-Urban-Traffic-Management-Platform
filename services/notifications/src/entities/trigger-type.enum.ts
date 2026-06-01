import { registerEnumType } from '@nestjs/graphql';
import { TriggerType } from '@prisma/client';

/**
 * File: trigger-type.enum.ts
 * ---------------------------
 * Re-exports the Prisma TriggerType enum registered as a
 * GraphQL enum type (INCIDENT | ZONE_ALERT) so it can be
 * used in @ObjectType and @InputType definitions.
 *
 * @returns {typeof TriggerType} - The Prisma-generated TriggerType enum.
 */

registerEnumType(TriggerType, { name: 'TriggerType' });

export { TriggerType };

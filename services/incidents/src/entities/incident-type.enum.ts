import { registerEnumType } from '@nestjs/graphql';
import { IncidentType } from '@prisma/client';

registerEnumType(IncidentType, { name: 'IncidentType' });

export { IncidentType };

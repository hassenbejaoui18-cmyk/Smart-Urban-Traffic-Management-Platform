import { registerEnumType } from '@nestjs/graphql';
import { IncidentStatus } from '@prisma/client';

registerEnumType(IncidentStatus, { name: 'IncidentStatus' });

export { IncidentStatus };

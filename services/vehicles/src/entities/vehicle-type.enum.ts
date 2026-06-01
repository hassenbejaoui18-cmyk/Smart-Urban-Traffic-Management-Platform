import { registerEnumType } from '@nestjs/graphql';
import { VehicleType } from '@prisma/client';

registerEnumType(VehicleType, { name: 'VehicleType' });

export { VehicleType };

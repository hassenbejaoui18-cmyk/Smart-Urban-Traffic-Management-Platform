import { Field, ObjectType } from '@nestjs/graphql';
import { VehicleType } from './vehicle-type.enum';

@ObjectType()
export class Vehicle {
  @Field()
  id!: string;

  @Field()
  licensePlate!: string;

  @Field(() => VehicleType)
  type!: VehicleType;

  @Field({ nullable: true })
  zoneId?: string;

  @Field()
  ownerId!: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

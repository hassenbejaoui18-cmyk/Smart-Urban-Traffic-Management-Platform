import { Directive, Field, ObjectType } from '@nestjs/graphql';
import { VehicleType } from './vehicle-type.enum';

/**
 * ObjectType: Vehicle
 * -------------------
 * GraphQL type representing a registered vehicle with its
 * license plate, type, zone assignment, and timestamps.
 * Federated entity with @key directive.
 */
@ObjectType()
@Directive('@key(fields: "id")')
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

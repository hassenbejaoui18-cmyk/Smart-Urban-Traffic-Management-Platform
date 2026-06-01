import { Field, ObjectType } from '@nestjs/graphql';

/**
 * ObjectType: GpsPosition
 * -----------------------
 * GraphQL type representing a recorded GPS position for a
 * vehicle, including latitude, longitude, and timestamp.
 */
@ObjectType()
export class GpsPosition {
  @Field()
  id!: string;

  @Field()
  vehicleId!: string;

  @Field()
  latitude!: number;

  @Field()
  longitude!: number;

  @Field()
  recordedAt!: Date;
}

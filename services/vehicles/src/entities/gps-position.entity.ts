import { Field, ObjectType } from '@nestjs/graphql';

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

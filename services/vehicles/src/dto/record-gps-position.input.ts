import { Field, InputType } from '@nestjs/graphql';
import { IsLatitude, IsLongitude, IsOptional } from 'class-validator';

/**
 * InputType: RecordGpsPositionInput
 * ---------------------------------
 * Input for recording a vehicle's GPS position with latitude
 * and longitude. recordedAt defaults to server time if omitted.
 */
@InputType()
export class RecordGpsPositionInput {
  @Field()
  @IsLatitude()
  latitude!: number;

  @Field()
  @IsLongitude()
  longitude!: number;

  @Field({ nullable: true })
  @IsOptional()
  recordedAt?: Date;
}

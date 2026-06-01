import { Field, InputType } from '@nestjs/graphql';
import { IsLatitude, IsLongitude, IsOptional } from 'class-validator';

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

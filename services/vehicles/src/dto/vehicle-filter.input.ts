import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { VehicleType } from '../entities/vehicle-type.enum';

@InputType()
export class VehicleFilterInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @Field(() => VehicleType, { nullable: true })
  @IsOptional()
  @IsEnum(VehicleType)
  type?: VehicleType;
}

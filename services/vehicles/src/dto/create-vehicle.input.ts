import { Field, InputType } from '@nestjs/graphql';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { VehicleType } from '../entities/vehicle-type.enum';

/**
 * InputType: CreateVehicleInput
 * -----------------------------
 * Input fields for creating a new vehicle: license plate,
 * type (enum), and optional zone assignment.
 */
@InputType()
export class CreateVehicleInput {
  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  licensePlate!: string;

  @Field(() => VehicleType)
  @IsEnum(VehicleType)
  type!: VehicleType;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  zoneId?: string;
}

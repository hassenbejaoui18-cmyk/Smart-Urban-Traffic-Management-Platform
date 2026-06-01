import { Field, Float, InputType } from '@nestjs/graphql';
import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IncidentType } from '../entities/incident-type.enum';

/**
 * InputType: CreateIncidentInput
 * ------------------------------
 * Input fields for reporting a new incident: type, description,
 * optional GPS coordinates, and optional zone assignment.
 */
@InputType()
export class CreateIncidentInput {
  @Field(() => IncidentType)
  @IsEnum(IncidentType)
  type!: IncidentType;

  @Field()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description!: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  zoneId?: string;
}

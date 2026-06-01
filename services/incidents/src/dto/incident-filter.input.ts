import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { IncidentStatus } from '../entities/incident-status.enum';
import { IncidentType } from '../entities/incident-type.enum';

/**
 * InputType: IncidentFilterInput
 * ------------------------------
 * Optional filters for the incidents query: status, type,
 * and zone ID.
 */
@InputType()
export class IncidentFilterInput {
  @Field(() => IncidentStatus, { nullable: true })
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @Field(() => IncidentType, { nullable: true })
  @IsOptional()
  @IsEnum(IncidentType)
  type?: IncidentType;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  zoneId?: string;
}

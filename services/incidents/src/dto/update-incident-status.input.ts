import { Field, InputType } from '@nestjs/graphql';
import { IsEnum } from 'class-validator';
import { IncidentStatus } from '../entities/incident-status.enum';

/**
 * InputType: UpdateIncidentStatusInput
 * ------------------------------------
 * Input with the target status for transitioning an incident
 * through its lifecycle (REPORTED → IN_PROGRESS → RESOLVED).
 */
@InputType()
export class UpdateIncidentStatusInput {
  @Field(() => IncidentStatus)
  @IsEnum(IncidentStatus)
  status!: IncidentStatus;
}

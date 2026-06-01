import { Field, InputType } from '@nestjs/graphql';
import { IsEnum } from 'class-validator';
import { IncidentStatus } from '../entities/incident-status.enum';

@InputType()
export class UpdateIncidentStatusInput {
  @Field(() => IncidentStatus)
  @IsEnum(IncidentStatus)
  status!: IncidentStatus;
}

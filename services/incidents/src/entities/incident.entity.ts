import { Field, Float, ObjectType } from '@nestjs/graphql';
import { IncidentType } from './incident-type.enum';
import { IncidentStatus } from './incident-status.enum';

@ObjectType()
export class Incident {
  @Field()
  id!: string;

  @Field(() => IncidentType)
  type!: IncidentType;

  @Field(() => IncidentStatus)
  status!: IncidentStatus;

  @Field()
  description!: string;

  @Field(() => Float, { nullable: true })
  latitude?: number;

  @Field(() => Float, { nullable: true })
  longitude?: number;

  @Field({ nullable: true })
  zoneId?: string;

  @Field()
  reportedBy!: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

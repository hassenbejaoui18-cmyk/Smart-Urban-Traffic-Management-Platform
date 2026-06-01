import { Directive, Field, Float, ObjectType } from '@nestjs/graphql';
import { IncidentType } from './incident-type.enum';
import { IncidentStatus } from './incident-status.enum';

/**
 * ObjectType: Incident
 * --------------------
 * GraphQL type representing a reported incident with its type,
 * status, description, optional GPS coordinates, zone reference,
 * reporter, and timestamps. Federated entity with @key directive.
 */
@ObjectType()
@Directive('@key(fields: "id")')
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

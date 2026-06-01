/**
 * File: zone.entity.ts
 * ---------------------
 * GraphQL object type representing a traffic zone.
 *
 * @returns {Zone}
 */
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Zone {
  @Field()
  id!: string;

  @Field()
  name!: string;

  @Field({ nullable: true })
  boundary?: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

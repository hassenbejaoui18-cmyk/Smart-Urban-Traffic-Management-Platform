import { Directive, Field, ObjectType } from '@nestjs/graphql';
import { TriggerType } from './trigger-type.enum';

/**
 * File: notification.entity.ts
 * ----------------------------
 * GraphQL ObjectType representing a notification record.
 * Includes the recipient user ID, title, message body, read
 * status, trigger metadata, and creation timestamp.
 *
 * @returns {Notification} - GraphQL type for notification queries/mutations.
 */

@ObjectType()
@Directive('@key(fields: "id")')
export class Notification {
  @Field()
  id!: string;

  @Field()
  userId!: string;

  @Field()
  title!: string;

  @Field()
  message!: string;

  @Field()
  isRead!: boolean;

  @Field(() => TriggerType)
  triggerType!: TriggerType;

  @Field()
  triggerId!: string;

  @Field()
  createdAt!: Date;
}

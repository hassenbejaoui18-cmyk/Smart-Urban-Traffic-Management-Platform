import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

/**
 * File: notification-filter.input.ts
 * -----------------------------------
 * Optional input type for filtering notifications by their
 * read status (isRead). Passed to the notifications query.
 *
 * @returns {NotificationFilterInput} - GraphQL input type for notification filtering.
 */

@InputType()
export class NotificationFilterInput {
  @Field({ nullable: true })
  @IsOptional()
  isRead?: boolean;
}

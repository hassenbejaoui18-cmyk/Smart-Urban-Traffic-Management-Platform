import { Field, InputType } from '@nestjs/graphql';
import {
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TriggerType } from '../entities/trigger-type.enum';

/**
 * File: create-notification.input.ts
 * -----------------------------------
 * Input type for the createNotification mutation.
 * Requires userId, title, message, triggerType, and triggerId
 * with validation constraints on string lengths.
 *
 * @returns {CreateNotificationInput} - GraphQL input type for notification creation.
 */

@InputType()
export class CreateNotificationInput {
  @Field()
  @IsString()
  userId!: string;

  @Field()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title!: string;

  @Field()
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  message!: string;

  @Field(() => TriggerType)
  @IsEnum(TriggerType)
  triggerType!: TriggerType;

  @Field()
  @IsString()
  triggerId!: string;
}

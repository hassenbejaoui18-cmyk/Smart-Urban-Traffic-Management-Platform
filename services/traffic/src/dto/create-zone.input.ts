/**
 * File: create-zone.input.ts
 * ---------------------------
 * GraphQL input type for creating a new traffic zone.
 * Validates name length and optional boundary string.
 *
 * @returns {CreateZoneInput}
 */
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

@InputType()
export class CreateZoneInput {
  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  boundary?: string;
}

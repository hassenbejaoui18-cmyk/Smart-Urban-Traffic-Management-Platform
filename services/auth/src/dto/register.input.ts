import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * InputType: RegisterInput
 * ------------------------
 * Validated input DTO for the register mutation.
 * Requires a valid email and a password between 8 and 128 characters.
 */
@InputType()
export class RegisterInput {
  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

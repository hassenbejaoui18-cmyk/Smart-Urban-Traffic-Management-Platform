import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsString } from 'class-validator';

/**
 * InputType: LoginInput
 * ---------------------
 * Validated input DTO for the login mutation.
 * Requires a valid email and a non-empty password string.
 */
@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @IsString()
  password!: string;
}

import { Field, ObjectType } from '@nestjs/graphql';
import { User } from './user.entity';

/**
 * ObjectType: AuthPayload
 * -----------------------
 * GraphQL return type for register and login mutations.
 * Contains the signed JWT token and the associated user object.
 */
@ObjectType()
export class AuthPayload {
  @Field()
  token!: string;

  @Field(() => User)
  user!: User;
}

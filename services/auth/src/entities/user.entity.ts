import { Field, ObjectType } from '@nestjs/graphql';
import { Role } from './role.enum';

/**
 * ObjectType: User
 * ----------------
 * GraphQL type representing a registered user.
 * Exposes id, email, role, and timestamps.
 * The password_hash field is never exposed.
 */
@ObjectType()
export class User {
  @Field()
  id!: string;

  @Field()
  email!: string;

  @Field(() => Role)
  role!: Role;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

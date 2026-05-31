import { Field, ObjectType } from '@nestjs/graphql';
import { Role } from './role.enum';

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

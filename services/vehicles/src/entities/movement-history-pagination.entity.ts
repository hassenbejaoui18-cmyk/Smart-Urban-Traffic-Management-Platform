import { Field, Int, ObjectType } from '@nestjs/graphql';
import { GpsPosition } from './gps-position.entity';

@ObjectType()
export class MovementHistoryPagination {
  @Field(() => [GpsPosition])
  items!: GpsPosition[];

  @Field(() => Int)
  total!: number;
}

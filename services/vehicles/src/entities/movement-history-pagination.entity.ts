import { Field, Int, ObjectType } from '@nestjs/graphql';
import { GpsPosition } from './gps-position.entity';

/**
 * ObjectType: MovementHistoryPagination
 * -------------------------------------
 * Paginated wrapper around GPS position entries, containing
 * the items array and a total count for client-side pagination.
 */
@ObjectType()
export class MovementHistoryPagination {
  @Field(() => [GpsPosition])
  items!: GpsPosition[];

  @Field(() => Int)
  total!: number;
}

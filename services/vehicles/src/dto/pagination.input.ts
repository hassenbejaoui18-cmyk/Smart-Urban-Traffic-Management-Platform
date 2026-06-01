import { Field, InputType, Int } from '@nestjs/graphql';
import { IsOptional, Min } from 'class-validator';

/**
 * InputType: PaginationInput
 * --------------------------
 * Pagination parameters with skip/take for list queries.
 * Defaults to skip=0, take=20.
 */
@InputType()
export class PaginationInput {
  @Field(() => Int, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @Min(0)
  skip?: number;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @Min(1)
  take?: number;
}

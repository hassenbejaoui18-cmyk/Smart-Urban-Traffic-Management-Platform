/**
 * File: compute-density.input.ts
 * -------------------------------
 * GraphQL input type for density computation.
 * Optionally specifies a zoneId and/or an explicit vehicle count.
 *
 * @returns {ComputeDensityInput}
 */
import { Field, InputType, Int } from '@nestjs/graphql';
import { IsOptional, Min } from 'class-validator';

@InputType()
export class ComputeDensityInput {
  @Field({ nullable: true })
  @IsOptional()
  zoneId?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Min(0)
  vehicleCount?: number;
}

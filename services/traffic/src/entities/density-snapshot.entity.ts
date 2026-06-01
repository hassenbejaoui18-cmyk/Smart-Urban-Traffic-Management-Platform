/**
 * File: density-snapshot.entity.ts
 * ---------------------------------
 * GraphQL object types for density snapshots and current zone density results.
 *
 * @returns {DensitySnapshot} and {ZoneDensity}
 */
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { CongestionLevel } from './congestion-level.enum';

@ObjectType()
export class DensitySnapshot {
  @Field()
  id!: string;

  @Field()
  zoneId!: string;

  @Field(() => Int)
  vehicleCount!: number;

  @Field(() => CongestionLevel)
  classification!: CongestionLevel;

  @Field()
  computedAt!: Date;
}

@ObjectType()
export class ZoneDensity {
  @Field()
  zoneId!: string;

  @Field()
  zoneName!: string;

  @Field(() => Int)
  vehicleCount!: number;

  @Field(() => CongestionLevel)
  classification!: CongestionLevel;

  @Field()
  computedAt!: Date;
}

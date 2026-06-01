-- CreateEnum
CREATE TYPE "CongestionLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "boundary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "density_snapshots" (
    "id" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "vehicle_count" INTEGER NOT NULL,
    "classification" "CongestionLevel" NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "density_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "zones_name_key" ON "zones"("name");

-- CreateIndex
CREATE INDEX "density_snapshots_zone_id_computed_at_idx" ON "density_snapshots"("zone_id", "computed_at");

-- AddForeignKey
ALTER TABLE "density_snapshots" ADD CONSTRAINT "density_snapshots_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "admin_users" ALTER COLUMN "created_at" SET DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "driver_id" TEXT,
ADD COLUMN     "vehicle_id" TEXT,
ALTER COLUMN "created_at" SET DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS');

-- AlterTable
ALTER TABLE "leads" ALTER COLUMN "quoted_at" SET DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS');

-- AlterTable
ALTER TABLE "saved_places" ALTER COLUMN "created_at" SET DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS');

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS');

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "clock_in_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clock_out_at" TIMESTAMP(3),
    "clock_in_odometer" DOUBLE PRECISION,
    "clock_out_odometer" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_structures" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "base_monthly" INTEGER NOT NULL,
    "outstation_allowance" INTEGER NOT NULL DEFAULT 0,
    "profit_share_rate_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "effective_from" TEXT NOT NULL,

    CONSTRAINT "salary_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_platform_earnings" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "platform" TEXT NOT NULL,
    "period_start" TEXT NOT NULL,
    "period_end" TEXT NOT NULL,
    "gross_amount" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_platform_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shifts_driver_id_idx" ON "shifts"("driver_id");

-- CreateIndex
CREATE INDEX "shifts_status_idx" ON "shifts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "salary_structures_driver_id_key" ON "salary_structures"("driver_id");

-- CreateIndex
CREATE INDEX "external_platform_earnings_driver_id_idx" ON "external_platform_earnings"("driver_id");

-- CreateIndex
CREATE INDEX "bookings_driver_id_idx" ON "bookings"("driver_id");

-- CreateIndex
CREATE INDEX "bookings_vehicle_id_idx" ON "bookings"("vehicle_id");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_structures" ADD CONSTRAINT "salary_structures_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_platform_earnings" ADD CONSTRAINT "external_platform_earnings_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


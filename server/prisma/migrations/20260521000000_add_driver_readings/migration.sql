-- CreateTable
CREATE TABLE "driver_readings" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "type" TEXT NOT NULL,
    "odometer" DOUBLE PRECISION,
    "soc" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_readings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "driver_readings" ADD CONSTRAINT "driver_readings_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

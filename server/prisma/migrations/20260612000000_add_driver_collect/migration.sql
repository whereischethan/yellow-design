-- Driver-collect flag: when true, the driver collects payment and may see the fare
ALTER TABLE "bookings" ADD COLUMN "driver_collect" BOOLEAN NOT NULL DEFAULT false;

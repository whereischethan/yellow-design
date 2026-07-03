ALTER TABLE "bookings" ADD COLUMN "driver_reported" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "drivers" ADD COLUMN "employment_status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "drivers" ADD COLUMN "exited_at" TEXT;
ALTER TABLE "drivers" ADD COLUMN "exit_note" TEXT;

-- Add stops JSON column to bookings and leads
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "stops_json" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "stops_json" TEXT;

-- Add Razorpay payment link fields to bookings table
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "razorpay_link_id" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "razorpay_link_url" TEXT;

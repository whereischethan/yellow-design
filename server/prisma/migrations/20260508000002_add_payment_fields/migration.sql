-- Sequential booking number sequence
CREATE SEQUENCE IF NOT EXISTS booking_seq START 1;

-- Payment columns on bookings
ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "razorpay_order_id"   TEXT,
  ADD COLUMN IF NOT EXISTS "razorpay_payment_id"  TEXT,
  ADD COLUMN IF NOT EXISTS "payment_status"       TEXT NOT NULL DEFAULT 'paid';

-- Unique index for idempotency check during payment verify
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_razorpay_order_id_key"
  ON "bookings"("razorpay_order_id")
  WHERE "razorpay_order_id" IS NOT NULL;

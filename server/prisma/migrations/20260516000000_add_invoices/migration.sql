-- Add customer GSTIN fields to bookings
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "customer_gstin" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "customer_gst_name" TEXT;

-- Create invoices table
CREATE TABLE IF NOT EXISTS "invoices" (
    "id" TEXT NOT NULL,
    "invoice_no" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_invoice_no_key" ON "invoices"("invoice_no");
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_booking_id_key" ON "invoices"("booking_id");

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create invoice counters table
CREATE TABLE IF NOT EXISTS "invoice_counters" (
    "fy" TEXT NOT NULL,
    "quarter" INTEGER NOT NULL,
    "last_seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_counters_pkey" PRIMARY KEY ("fy","quarter")
);

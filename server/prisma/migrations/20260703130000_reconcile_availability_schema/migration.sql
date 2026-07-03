-- Reconcile availability tables: prod recorded the original migration as applied
-- while the tables were created out-of-band without all columns. Idempotent.
CREATE TABLE IF NOT EXISTS "availability_blocks" (
    "id" SERIAL NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "availability_blocks_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "availability_notifications" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "availability_notifications_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "availability_blocks" ADD COLUMN IF NOT EXISTS "reason" TEXT;
ALTER TABLE "availability_blocks" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "availability_notifications" ADD COLUMN IF NOT EXISTS "user_id" TEXT;
ALTER TABLE "availability_notifications" ADD COLUMN IF NOT EXISTS "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "availability_notifications" ADD COLUMN IF NOT EXISTS "notified_at" TIMESTAMP(3);
ALTER TABLE "availability_notifications" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "availability_blocks_start_at_end_at_idx" ON "availability_blocks"("start_at", "end_at");
CREATE INDEX IF NOT EXISTS "availability_notifications_user_id_idx" ON "availability_notifications"("user_id");
CREATE INDEX IF NOT EXISTS "availability_notifications_created_at_idx" ON "availability_notifications"("created_at");

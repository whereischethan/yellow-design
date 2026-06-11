-- send_sms was applied to dev via `db push`; IF NOT EXISTS keeps this re-runnable everywhere
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "send_sms" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "bookings_status_idx" ON "bookings"("status");
CREATE INDEX IF NOT EXISTS "bookings_user_id_idx" ON "bookings"("user_id");
CREATE INDEX IF NOT EXISTS "bookings_created_at_idx" ON "bookings"("created_at");
CREATE INDEX IF NOT EXISTS "leads_status_idx" ON "leads"("status");
CREATE INDEX IF NOT EXISTS "users_referred_by_id_idx" ON "users"("referred_by_id");

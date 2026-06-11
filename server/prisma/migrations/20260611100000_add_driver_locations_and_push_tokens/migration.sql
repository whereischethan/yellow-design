CREATE TABLE IF NOT EXISTS "driver_locations" (
  "driver_id"  TEXT NOT NULL,
  "lat"        DOUBLE PRECISION NOT NULL,
  "lng"        DOUBLE PRECISION NOT NULL,
  "heading"    DOUBLE PRECISION,
  "speed"      DOUBLE PRECISION,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "driver_locations_pkey" PRIMARY KEY ("driver_id"),
  CONSTRAINT "driver_locations_driver_id_fkey" FOREIGN KEY ("driver_id")
    REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "push_tokens" (
  "token"      TEXT NOT NULL,
  "owner_type" TEXT NOT NULL,
  "owner_id"   TEXT NOT NULL,
  "platform"   TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("token")
);

CREATE INDEX IF NOT EXISTS "push_tokens_owner_type_owner_id_idx" ON "push_tokens"("owner_type", "owner_id");

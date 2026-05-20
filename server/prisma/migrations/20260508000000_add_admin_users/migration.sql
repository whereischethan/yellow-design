-- CreateTable
CREATE TABLE IF NOT EXISTS "admin_users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'ops',
    "created_at" TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_phone_key" ON "admin_users"("phone");

-- Seed the default admin user (phone from ADMIN_PHONES env not used here; insert via admin panel or manually)

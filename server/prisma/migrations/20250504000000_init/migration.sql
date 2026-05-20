-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'rider',
    "created_at" TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_sessions" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expires_at" BIGINT NOT NULL,
    "verified" INTEGER NOT NULL DEFAULT 0,
    "created_at" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "otp_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" BIGINT NOT NULL,
    "created_at" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "trip_code" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "trip_type" TEXT,
    "vehicle_type" TEXT DEFAULT 'yellowSky',
    "price" INTEGER DEFAULT 0,
    "passenger_count" INTEGER DEFAULT 1,
    "bags" INTEGER DEFAULT 0,
    "meet_and_greet" INTEGER DEFAULT 0,
    "pet_friendly" INTEGER DEFAULT 0,
    "pickup_json" TEXT,
    "drop_json" TEXT,
    "flight_json" TEXT,
    "pricing_json" TEXT,
    "guest_name" TEXT,
    "guest_phone" TEXT,
    "assigned_driver_json" TEXT,
    "assigned_vehicle_json" TEXT,
    "created_at" TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "plate" TEXT,
    "vehicle" TEXT,
    "joined" TEXT,
    "trips" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'Yellow',
    "type" TEXT NOT NULL DEFAULT 'yellowSky',
    "class_key" TEXT NOT NULL DEFAULT 'yellowSky',
    "year" INTEGER NOT NULL DEFAULT 2024,
    "status" TEXT NOT NULL DEFAULT 'available',
    "driver_id" TEXT,
    "trips" INTEGER NOT NULL DEFAULT 0,
    "is_ev" INTEGER NOT NULL DEFAULT 1,
    "soc" INTEGER NOT NULL DEFAULT 80,
    "odometer" INTEGER NOT NULL DEFAULT 0,
    "insurance_expiry" TEXT,
    "maintenance_note" TEXT,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "trip_type" TEXT,
    "pickup_json" TEXT,
    "drop_json" TEXT,
    "price" INTEGER DEFAULT 0,
    "pickup_time" TEXT,
    "flight" TEXT,
    "quoted_at" TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
    "caller_note" TEXT,
    "trip_code" TEXT,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_config" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "pricing_config_pkey" PRIMARY KEY ("key")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "bookings_trip_code_key" ON "bookings"("trip_code");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "drivers_phone_key" ON "drivers"("phone");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "vehicles_plate_key" ON "vehicles"("plate");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

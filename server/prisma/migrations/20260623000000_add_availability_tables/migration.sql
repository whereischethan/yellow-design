CREATE TABLE "availability_blocks" (
    "id" SERIAL NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_blocks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "availability_notifications" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT,
    "phone" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL,
    "notified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "availability_blocks_start_at_end_at_idx" ON "availability_blocks"("start_at", "end_at");
CREATE INDEX "availability_notifications_user_id_idx" ON "availability_notifications"("user_id");
CREATE INDEX "availability_notifications_created_at_idx" ON "availability_notifications"("created_at");

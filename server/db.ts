import prisma from './lib/prisma'

export async function seedPricingDefaults() {
  const defaults: [string, string][] = [
    ['airport_per_km', '32'],
    ['airport_trip_charge', '100'],
    ['airport_toll', '185'],
    ['airport_gst', '5'],
    ['airport_meet_greet', '100'],
    ['hourly_base_rate', '500'],
    ['outstation_per_km', '18'],
    ['outstation_driver_bata', '500'],
    ['outstation_night_halt', '1000'],
    ['outstation_gst', '5'],
    ['first_ride_discount_pct', '10'],
    ['first_ride_discount_threshold', '1000'],
  ]
  // upsert so new keys are always added even if DB already has rows
  // sequential, not Promise.all: this runs on every cold start and the DATABASE_URL
  // connection pool is capped at 5 — 12 concurrent upserts would exhaust it
  for (const [key, value] of defaults) {
    await prisma.pricingConfig.upsert({ where: { key }, update: {}, create: { key, value } })
  }
}

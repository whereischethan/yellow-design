import prisma from './lib/prisma'

export async function seedPricingDefaults() {
  const defaults: [string, string][] = [
    ['airport_per_km', '32'],
    ['airport_trip_charge', '100'],
    ['airport_toll', '185'],
    ['airport_gst', '5'],
    ['airport_meet_greet', '100'],
    ['hourly_base_rate', '500'],
    ['hourly_included_km', '0'],
    ['hourly_extra_rate', '500'],
    ['outstation_per_km', '18'],
    ['outstation_driver_bata', '500'],
    ['outstation_night_halt', '1000'],
    ['outstation_gst', '5'],
  ]
  // upsert so new keys are always added even if DB already has rows
  await Promise.all(
    defaults.map(([key, value]) =>
      prisma.pricingConfig.upsert({ where: { key }, update: {}, create: { key, value } })
    )
  )
}

/**
 * Calculate kWh consumed from SoC delta and battery capacity.
 * @param startSoc   Starting SoC (0–100)
 * @param endSoc     Ending SoC (0–100)
 * @param batteryKwh Usable battery capacity in kWh (Kia Carens EV = 42)
 */
export function calcKwh(startSoc: number, endSoc: number, batteryKwh = 42): number {
  const delta = Math.max(0, startSoc - endSoc)
  return parseFloat(((delta / 100) * batteryKwh).toFixed(2))
}

/**
 * Calculate CO₂ avoided vs an equivalent petrol car.
 * Baseline: 121 g CO₂/km for average petrol ICE (ARAI standard).
 * Returns grams.
 */
export function calcCo2Grams(distanceKm: number): number {
  return Math.round(distanceKm * 121)
}

/**
 * Efficiency in km/kWh. Returns 0 if kWh is 0 (avoid divide-by-zero).
 */
export function calcEfficiency(distanceKm: number, kwh: number): number {
  if (kwh <= 0) return 0
  return parseFloat((distanceKm / kwh).toFixed(2))
}

/**
 * Estimated range remaining given current SoC and fleet average efficiency.
 * @param soc        Current SoC (0–100)
 * @param batteryKwh Battery capacity in kWh
 * @param kmPerKwh   Efficiency (default 8 km/kWh for Carens EV in city)
 */
export function estimatedRangeKm(soc: number, batteryKwh = 42, kmPerKwh = 8): number {
  return Math.round((soc / 100) * batteryKwh * kmPerKwh)
}

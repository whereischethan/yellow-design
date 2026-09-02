import prisma from './prisma'

const KENGERI_LAT = 12.9105
const KENGERI_LNG = 77.5482

// In-memory counter reset each IST calendar day
let _specialRateViewDay = ''
let _specialRateViewCount = 0

function istDateStr(): string {
  return new Date(Date.now() + 5.5 * 60 * 60000).toISOString().slice(0, 10)
}

export function recordSpecialRateView(): void {
  const today = istDateStr()
  if (_specialRateViewDay !== today) { _specialRateViewDay = today; _specialRateViewCount = 0 }
  _specialRateViewCount++
}

function getSpecialRateViewsToday(): number {
  const today = istDateStr()
  if (_specialRateViewDay !== today) return 0
  return _specialRateViewCount
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function cfgNum(cfg: Record<string, number>, key: string, def: number): number {
  const v = cfg[key]
  return v != null && !isNaN(v) ? v : def
}

export interface SpecialRate {
  type: 'emptyLeg' | 'homeBase' | 'manualOverride'
  savedAmount: number
  newFareBeforeTax: number
  newTotal: number
  message: string
}

export function checkHomeBase(
  originLat: number,
  originLng: number,
  tripType: string,
  fareBeforeTax: number,
  gstRate: number,
  toll: number,
  cfg: Record<string, number>
): SpecialRate | null {
  if (tripType !== 'drop') return null
  const radius = cfgNum(cfg, 'home_base_radius_km', 10)
  if (haversineKm(originLat, originLng, KENGERI_LAT, KENGERI_LNG) > radius) return null

  const flatFare = cfgNum(cfg, 'home_base_fare', 999)
  const cfgToll  = cfgNum(cfg, 'airport_toll', 185)
  // home_base_fare is pre-toll; add toll before GST (consistent with calcAirportPrice)
  const flatFareWithToll = flatFare + cfgToll
  const newGst   = Math.round(flatFareWithToll * gstRate)
  const newTotal = flatFareWithToll + newGst
  const oldGst   = Math.round(fareBeforeTax * gstRate)
  const saved    = (fareBeforeTax + oldGst) - (flatFareWithToll + newGst)
  if (saved <= 0) return null   // home base is not cheaper

  return { type: 'homeBase', savedAmount: saved, newFareBeforeTax: flatFareWithToll, newTotal, message: 'Home base rate' }
}

// IST date string (YYYY-MM-DD) for same-day comparison
function toISTDateStr(ms: number): string {
  return new Date(ms + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0]
}

export async function checkEmptyLeg(params: {
  tripType: 'pickup' | 'drop'
  originLat: number
  originLng: number
  pickupDateTime: string
  fareBeforeTax: number
  gstRate: number
  toll: number
  cfg: Record<string, number>
}): Promise<SpecialRate | null> {
  const { tripType, originLat, originLng, pickupDateTime, fareBeforeTax, gstRate, toll, cfg } = params

  const preStartMin  = cfgNum(cfg, 'empty_leg_pre_start_min',  240)
  const preEndMin    = cfgNum(cfg, 'empty_leg_pre_end_min',     60)
  const postStartMin = cfgNum(cfg, 'empty_leg_post_start_min',  60)
  const postEndMin   = cfgNum(cfg, 'empty_leg_post_end_min',   240)
  const preRadius    = cfgNum(cfg, 'empty_leg_pre_radius_km',   30)
  const postRadius   = cfgNum(cfg, 'empty_leg_post_radius_km',  15)
  const discountPct  = cfgNum(cfg, 'empty_leg_discount_pct',    40) / 100

  const customerTime = new Date(pickupDateTime).getTime()
  if (isNaN(customerTime)) return null
  const customerDateIST = toISTDateStr(customerTime)

  const bookings = await prisma.booking.findMany({
    where: { status: { in: ['confirmed', 'assigned', 'arrived', 'in_progress'] }, tripType: { in: ['pickup', 'drop'] } },
    select: { id: true, tripCode: true, tripType: true, pickupJson: true, dropJson: true },
  })

  // Build a map of confirmed booking times by tripType for conflict checking
  const confirmedTimes: Record<string, number[]> = { pickup: [], drop: [] }
  for (const b of bookings) {
    if (!b.pickupJson || !b.tripType) continue
    try {
      const p = JSON.parse(b.pickupJson)
      const t = p?.dateTime ? new Date(p.dateTime).getTime() : NaN
      if (!isNaN(t)) confirmedTimes[b.tripType].push(t)
    } catch {}
  }

  for (const b of bookings) {
    if (!b.pickupJson) continue
    let pickup: any, drop: any
    try {
      pickup = JSON.parse(b.pickupJson)
      drop = b.dropJson ? JSON.parse(b.dropJson) : null
    } catch { continue }

    const bookingTime = pickup?.dateTime ? new Date(pickup.dateTime).getTime() : NaN
    if (isNaN(bookingTime)) continue

    // Same-day check: customer's pickup date must match the booking date (IST)
    if (toISTDateStr(bookingTime) !== customerDateIST) continue

    // PICKUP booking = car goes airport→city; we discount customer DROP (city→airport)
    // DROP booking   = car goes city→airport; we discount customer PICKUP (airport→city)
    const discountedDirection = b.tripType === 'pickup' ? 'drop' : 'pickup'
    if (tripType !== discountedDirection) continue

    const nonAirport = b.tripType === 'pickup' ? drop : pickup

    const preWindowStart  = bookingTime - preStartMin  * 60000
    const preWindowEnd    = bookingTime - preEndMin    * 60000
    const postWindowStart = bookingTime + postStartMin * 60000
    const postWindowEnd   = bookingTime + postEndMin   * 60000

    const inPre  = customerTime >= preWindowStart  && customerTime <= preWindowEnd
    const inPost = customerTime >= postWindowStart && customerTime <= postWindowEnd
    if (!inPre && !inPost) continue

    // Conflict check: if the empty leg is already filled by an existing confirmed booking, skip
    const [windowStart, windowEnd] = inPre
      ? [preWindowStart, preWindowEnd]
      : [postWindowStart, postWindowEnd]
    const legAlreadyFilled = (confirmedTimes[discountedDirection] ?? []).some(
      t => t >= windowStart && t <= windowEnd
    )
    if (legAlreadyFilled) continue

    let proximityOk = false
    if (inPre) {
      proximityOk = haversineKm(originLat, originLng, KENGERI_LAT, KENGERI_LNG) <= preRadius
    } else if (nonAirport?.lat != null && nonAirport?.lng != null) {
      proximityOk = haversineKm(originLat, originLng, nonAirport.lat, nonAirport.lng) <= postRadius
    }
    if (!proximityOk) continue

    const newFare  = Math.round(fareBeforeTax * (1 - discountPct))
    const oldGst   = Math.round(fareBeforeTax * gstRate)
    const newGst   = Math.round(newFare * gstRate)
    return {
      type: 'emptyLeg',
      savedAmount: (fareBeforeTax - newFare) + (oldGst - newGst),
      newFareBeforeTax: newFare,
      newTotal: newFare + newGst,
      message: 'Special rate · limited time',
    }
  }

  return null
}

export interface ActiveWindow {
  bookingId: string
  tripCode: string
  bookingTime: string
  nonAirportLocation: string
  windowType: 'pre' | 'post'
  windowStart: string
  windowEnd: string
  discountedTripType: 'drop' | 'pickup'
}

export interface EmptyLegStatus {
  dropOverride: boolean
  pickupOverride: boolean
  promoFlatActive: boolean
  config: Record<string, number>
  activeWindows: ActiveWindow[]
  upcomingWindows: ActiveWindow[]   // windows that open in the future today
  todaysBookings: any[]
  specialRateViewsToday: number
}

export async function getEmptyLegStatus(): Promise<EmptyLegStatus> {
  const rows = await prisma.pricingConfig.findMany()
  const cfg: Record<string, number> = rows.reduce(
    (acc, r) => ({ ...acc, [r.key]: parseFloat(r.value) }),
    {} as Record<string, number>
  )

  const dropOverride   = (cfg.empty_leg_drops_active   ?? 0) === 1
  const pickupOverride = (cfg.empty_leg_pickups_active ?? 0) === 1
  const promoFlatActive = (cfg.promo_flat_active ?? 0) === 1

  const preStartMin  = cfgNum(cfg, 'empty_leg_pre_start_min',  240)
  const preEndMin    = cfgNum(cfg, 'empty_leg_pre_end_min',     60)
  const postStartMin = cfgNum(cfg, 'empty_leg_post_start_min',  60)
  const postEndMin   = cfgNum(cfg, 'empty_leg_post_end_min',   240)

  const now = Date.now()

  const bookings = await prisma.booking.findMany({
    where: { status: { notIn: ['cancelled', 'completed'] }, tripType: { in: ['pickup', 'drop'] } },
    orderBy: { createdAt: 'desc' },
  })

  const activeWindows: ActiveWindow[]   = []
  const upcomingWindows: ActiveWindow[] = []
  const todaysBookings: any[]           = []

  for (const b of bookings) {
    if (!b.pickupJson) continue
    let pickup: any, drop: any
    try {
      pickup = JSON.parse(b.pickupJson)
      drop = b.dropJson ? JSON.parse(b.dropJson) : null
    } catch { continue }

    const bookingTime = pickup?.dateTime ? new Date(pickup.dateTime).getTime() : NaN
    if (isNaN(bookingTime)) continue

    if (bookingTime >= now) {
      const nonAirportLoc = b.tripType === 'pickup' ? drop : pickup
      todaysBookings.push({
        id: b.id,
        tripCode: b.tripCode || b.id.slice(0, 8),
        tripType: b.tripType,
        status: b.status,
        bookingTime: pickup.dateTime,
        nonAirportLocation: nonAirportLoc?.placeName || nonAirportLoc?.location || 'City',
      })
    }

    const discountedTripType = b.tripType === 'pickup' ? 'drop' as const : 'pickup' as const
    const nonAirport = b.tripType === 'pickup' ? drop : pickup
    const locationLabel = nonAirport?.placeName || nonAirport?.location || 'City'

    const preStart  = bookingTime - preStartMin  * 60000
    const preEnd    = bookingTime - preEndMin    * 60000
    const postStart = bookingTime + postStartMin * 60000
    const postEnd   = bookingTime + postEndMin   * 60000

    const makeWindow = (wType: 'pre' | 'post', start: number, end: number): ActiveWindow => ({
      bookingId: b.id,
      tripCode: b.tripCode || b.id.slice(0, 8),
      bookingTime: pickup.dateTime,
      nonAirportLocation: locationLabel,
      windowType: wType,
      windowStart: new Date(start).toISOString(),
      windowEnd: new Date(end).toISOString(),
      discountedTripType,
    })

    if (now >= preStart && now <= preEnd) {
      activeWindows.push(makeWindow('pre', preStart, preEnd))
    } else if (now < preStart) {
      upcomingWindows.push(makeWindow('pre', preStart, preEnd))
    }

    if (now >= postStart && now <= postEnd) {
      activeWindows.push(makeWindow('post', postStart, postEnd))
    } else if (now < postStart) {
      upcomingWindows.push(makeWindow('post', postStart, postEnd))
    }
  }

  return { dropOverride, pickupOverride, promoFlatActive, config: cfg, activeWindows, upcomingWindows, todaysBookings, specialRateViewsToday: getSpecialRateViewsToday() }
}

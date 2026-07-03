// Operational constants for the driver app — single place to tune.

export const OPS_WHATSAPP_NUMBER = '918628062808'
export const SOS_NUMBER = '112'

// Geofencing
export const ARRIVAL_RADIUS_KM = 2
export const GPS_TIMEOUT_MS = 60_000

// Polling
export const ROSTER_POLL_MS = 60_000
export const LOCATION_POST_MS = 10_000
// Mid-trip check so a booking cancelled by ops surfaces on the driver's screen
export const BOOKING_STATUS_POLL_MS = 30_000

// EV energy stats fallback (Kia Carens Clavis EV pack)
export const DEFAULT_BATTERY_KWH = 42

// No-show free wait before the driver can report (seconds)
export const NO_SHOW_WAIT_SECS = 300

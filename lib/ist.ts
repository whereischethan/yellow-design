// IST timezone utilities for the customer app
// Always use these instead of native Date local-timezone methods
// so display is correct even on non-IST devices (e.g. web).

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000 // UTC+5:30

const DAYS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface ISTComponents {
  y: number; mo: number; d: number   // mo is 0-based
  h: number; mi: number; dow: number // dow 0=Sun
}

export function getISTComponents(iso: string): ISTComponents | null {
  try {
    const ms = new Date(iso).getTime()
    if (isNaN(ms)) return null
    const ist = new Date(ms + IST_OFFSET_MS)
    return {
      y: ist.getUTCFullYear(),
      mo: ist.getUTCMonth(),
      d: ist.getUTCDate(),
      h: ist.getUTCHours(),
      mi: ist.getUTCMinutes(),
      dow: ist.getUTCDay(),
    }
  } catch { return null }
}

/** Format a UTC ISO string as "Mon, 2 Jun · 6:30 AM" in IST */
export function fmtDateTimeIST(iso: string): string {
  const c = getISTComponents(iso)
  if (!c) return ''
  const ampm = c.h >= 12 ? 'PM' : 'AM'
  const h12 = c.h % 12 || 12
  const m = String(c.mi).padStart(2, '0')
  return `${DAYS[c.dow]}, ${c.d} ${MONTHS[c.mo]} · ${h12}:${m} ${ampm}`
}

/** Format a UTC ISO string as "Today · 6:30 AM", "Tomorrow · …", or "02 Jun · 6:30 AM" in IST */
export function fmtRelativeDateTimeIST(iso: string): string {
  const c = getISTComponents(iso)
  if (!c) return iso
  const now = getISTComponents(new Date().toISOString())!
  const ampm = c.h >= 12 ? 'PM' : 'AM'
  const h12 = c.h % 12 || 12
  const m = String(c.mi).padStart(2, '0')
  const timeStr = `${h12}:${m} ${ampm}`
  const diffDays = Math.round(
    (new Date(c.y, c.mo, c.d).getTime() - new Date(now.y, now.mo, now.d).getTime()) / 86400000
  )
  if (diffDays === 0) return `Today · ${timeStr}`
  if (diffDays === 1) return `Tomorrow · ${timeStr}`
  const dd = String(c.d).padStart(2, '0')
  return `${dd} ${MONTHS[c.mo]} · ${timeStr}`
}

/** IST start-of-today as a UTC Date (for comparisons) */
export function istTodayStart(): Date {
  const c = getISTComponents(new Date().toISOString())!
  // Reconstruct midnight IST as UTC
  return new Date(Date.UTC(c.y, c.mo, c.d) - IST_OFFSET_MS)
}

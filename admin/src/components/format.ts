const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000 // UTC+5:30

// All datetimes are stored/displayed in IST.
// Naive ISO strings ("YYYY-MM-DDTHH:MM") are always interpreted as IST.
// UTC ISO strings (ending in Z or +offset) are converted to IST for display.

// Parse any ISO string → IST components. Handles both UTC (with Z) and naive (treat as IST).
export function getISTComponents(iso: string): { y: number; mo: number; d: number; h: number; mi: number } | null {
  if (!iso) return null
  const p = (n: number) => String(n).padStart(2, '0')
  if (iso.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(iso)) {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return null
    const ist = new Date(d.getTime() + IST_OFFSET_MS)
    return { y: ist.getUTCFullYear(), mo: ist.getUTCMonth(), d: ist.getUTCDate(), h: ist.getUTCHours(), mi: ist.getUTCMinutes() }
  }
  // Naive string — treat as IST (handles both "T" and space separators)
  const [datePart, timePart = '00:00'] = iso.split(/[T ]/)
  const [y, mo, day] = datePart.split('-').map(Number)
  const [h, mi] = timePart.split(':').map(Number)
  if (!y || !mo || !day) return null
  return { y, mo: mo - 1, d: day, h: h || 0, mi: mi || 0 }
  void p // suppress unused warning
}

// Format naive IST components → "YYYY-MM-DDTHH:MM" (for picker values)
export function fmtISTISO(y: number, mo: number, d: number, h: number, mi: number): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${y}-${p(mo+1)}-${p(d)}T${p(h)}:${p(mi)}`
}

// Format date-only naive ISO → "YYYY-MM-DD"
export function fmtDateISO(y: number, mo: number, d: number): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${y}-${p(mo+1)}-${p(d)}`
}
// Convert UTC Date → IST naive ISO "YYYY-MM-DDTHH:MM" (use when receiving UTC dates from server)
export function toISTISO(d: Date): string {
  const ist = new Date(d.getTime() + IST_OFFSET_MS)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${ist.getUTCFullYear()}-${p(ist.getUTCMonth()+1)}-${p(ist.getUTCDate())}T${p(ist.getUTCHours())}:${p(ist.getUTCMinutes())}`
}

// Keep old name as alias so existing callers compile
export const toLocalISO = toISTISO

// Convert IST naive ISO → UTC Date (use when sending to server)
export function fromISTISO(iso: string): Date {
  return new Date(iso.length === 16 ? iso + ':00+05:30' : iso + '+05:30')
}
// ─── Format helpers ───────────────────────────────────────────────────────

export const fmtTime = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const c = getISTComponents(iso)
  if (!c) return '—'
  const ampm = c.h >= 12 ? 'PM' : 'AM'
  return `${c.h % 12 || 12}:${String(c.mi).padStart(2, '0')} ${ampm}`
}

export const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const c = getISTComponents(iso)
  if (!c) return '—'
  const nowIST = getISTComponents(new Date().toISOString())!
  const diff = Math.round((new Date(c.y, c.mo, c.d).getTime() - new Date(nowIST.y, nowIST.mo, nowIST.d).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  const dd = String(c.d).padStart(2, '0')
  const mm = String(c.mo + 1).padStart(2, '0')
  const yyyy = c.y
  return `${dd}/${mm}/${yyyy}`
}

export const fmtINR = (n: number | null | undefined) =>
  n == null ? '—' : `₹${n.toLocaleString('en-IN')}`

// Known country code prefixes (longest first for greedy match)
const CC_FORMATS: [string, (rest: string) => string][] = [
  ['+971', r => `+971 ${r.slice(0,2)} ${r.slice(2,5)} ${r.slice(5)}`],  // UAE
  ['+44',  r => `+44 ${r.slice(0,4)} ${r.slice(4)}`],                   // UK
  ['+91',  r => `+91 ${r.slice(0,5)} ${r.slice(5)}`],                   // India
  ['+65',  r => `+65 ${r.slice(0,4)} ${r.slice(4)}`],                   // Singapore
  ['+61',  r => `+61 ${r.slice(0,3)} ${r.slice(3,6)} ${r.slice(6)}`],   // Australia
  ['+1',   r => `+1 ${r.slice(0,3)} ${r.slice(3,6)} ${r.slice(6)}`],    // US/Canada
]
const CC_DIGITS: [string, number][] = [
  ['971', 9], ['44', 10], ['91', 10], ['65', 8], ['61', 9], ['1', 10],
]

export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return '—'
  const digits = raw.replace(/\D/g, '')
  for (const [cc, len] of CC_DIGITS) {
    if (digits.startsWith(cc) && digits.length === cc.length + len) {
      const rest = digits.slice(cc.length)
      const fmt = CC_FORMATS.find(([p]) => p === `+${cc}`)
      return fmt ? fmt[1](rest) : `+${cc} ${rest}`
    }
  }
  // Bare 10-digit Indian mobile (starts with 6/7/8/9)
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  }
  return raw
}

// Returns E.164 with leading + for use in tel: and wa.me links
export function telPhone(raw: string | null | undefined): string {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  // already has recognised country code → ensure + prefix
  for (const [cc, len] of CC_DIGITS) {
    if (digits.startsWith(cc) && digits.length === cc.length + len) return `+${digits}`
  }
  // if raw already starts with + just strip spaces
  if (raw.startsWith('+')) return `+${digits}`
  return digits
}

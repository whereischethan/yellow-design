import React from 'react'
import { YL, Mono, Button, Stack, STATUS_STYLE } from '../components/ui'
import { getEmptyLegStatus, setEmptyLegToggle, saveEmptyLegConfig } from '../api'

interface ActiveWindow {
  bookingId: string
  tripCode: string
  bookingTime: string
  nonAirportLocation: string
  windowType: 'pre' | 'post'
  windowStart: string
  windowEnd: string
  discountedTripType: 'drop' | 'pickup'
}

interface TodayBooking {
  id: string
  tripCode: string
  tripType: string
  status: string
  bookingTime: string
  nonAirportLocation: string
}

interface Status {
  dropOverride: boolean
  pickupOverride: boolean
  config: Record<string, number>
  activeWindows: ActiveWindow[]
  upcomingWindows: ActiveWindow[]
  todaysBookings: TodayBooking[]
  specialRateViewsToday: number
}

const cfgNum = (cfg: Record<string, number>, key: string, def: number) => cfg[key] ?? def

const PARAM_FIELDS: { key: string; label: string; hint: string; prefix?: string; suffix?: string; group?: string }[] = [
  { key: 'empty_leg_discount_pct',   label: 'Discount %',       suffix: '%',         hint: 'Applied to fare before tax',            group: 'discount' },
  { key: 'empty_leg_pre_start_min',  label: 'Window opens',     suffix: 'min before', hint: 'Before pickup booking',                group: 'pre' },
  { key: 'empty_leg_pre_end_min',    label: 'Window closes',    suffix: 'min before', hint: 'Before pickup booking',                group: 'pre' },
  { key: 'empty_leg_post_start_min', label: 'Window opens',     suffix: 'min after',  hint: 'After drop booking',                   group: 'post' },
  { key: 'empty_leg_post_end_min',   label: 'Window closes',    suffix: 'min after',  hint: 'After drop booking',                   group: 'post' },
  { key: 'empty_leg_pre_radius_km',  label: 'Radius from Kengeri', suffix: 'km',      hint: 'Customer origin must be within',       group: 'pre' },
  { key: 'empty_leg_post_radius_km', label: 'Radius from endpoint', suffix: 'km',     hint: 'Customer origin must be within',       group: 'post' },
  { key: 'home_base_fare',           label: 'Home base fare',   prefix: '₹',          hint: 'Flat fare from Kengeri area (+ toll & GST)', group: 'home' },
  { key: 'home_base_radius_km',      label: 'Radius',           suffix: 'km',         hint: 'From Kengeri garage',                  group: 'home' },
]

const DEFAULTS: Record<string, number> = {
  empty_leg_discount_pct:   40,
  empty_leg_pre_start_min:  240,
  empty_leg_pre_end_min:    60,
  empty_leg_post_start_min: 60,
  empty_leg_post_end_min:   240,
  empty_leg_pre_radius_km:  30,
  empty_leg_post_radius_km: 15,
  home_base_fare:            999,
  home_base_radius_km:       10,
}

function fmtISTTime(iso: string): string {
  try {
    const ist = new Date(new Date(iso).getTime() + 5.5 * 60 * 60000)
    const h = ist.getUTCHours(), m = ist.getUTCMinutes()
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
  } catch { return iso }
}

function fmtISTDateTime(iso: string): string {
  try {
    const ist = new Date(new Date(iso).getTime() + 5.5 * 60 * 60000)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const day = days[ist.getUTCDay()]
    return `${day} ${fmtISTTime(iso)}`
  } catch { return iso }
}

function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      style={{
        width: 52, height: 28, borderRadius: 14, border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: on ? YL.ink : YL.line,
        position: 'relative', flexShrink: 0,
        transition: 'background 200ms',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 4, left: on ? 26 : 4,
        width: 20, height: 20, borderRadius: 10,
        background: on ? YL.yellow : YL.card,
        transition: 'left 200ms',
        boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
      }} />
    </button>
  )
}

function LivePill({ label }: { label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: '#16a34a', color: '#fff',
      fontSize: 10, fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
      padding: '3px 8px', borderRadius: 999, letterSpacing: 0.3,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: 3, background: '#fff',
        animation: 'yl-pulse 1.5s ease-in-out infinite',
      }} />
      {label}
    </span>
  )
}

function WindowCard({ w, now }: { w: ActiveWindow; now: number }) {
  const startMs = new Date(w.windowStart).getTime()
  const endMs   = new Date(w.windowEnd).getTime()
  const totalMs = endMs - startMs
  const elapsed = now - startMs
  const pct     = Math.max(0, Math.min(100, (elapsed / totalMs) * 100))
  const remaining = Math.max(0, Math.ceil((endMs - now) / 60000))
  const isActive = now >= startMs && now <= endMs

  const dirLabel = w.discountedTripType === 'drop' ? 'City → Airport' : 'Airport → City'
  const dirBg    = w.discountedTripType === 'drop' ? YL.gulmohar : YL.leaf

  return (
    <div style={{
      background: isActive ? '#FFFBEA' : YL.card,
      border: `1.5px solid ${isActive ? YL.yellowDeep : YL.line}`,
      borderRadius: 14, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Direction pill */}
        <div style={{
          background: dirBg, color: '#fff', borderRadius: 8,
          padding: '4px 10px', fontSize: 11, fontFamily: '"JetBrains Mono", monospace',
          fontWeight: 700, letterSpacing: 0.2, whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {dirLabel}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: YL.ink, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {w.nonAirportLocation}
            {isActive && <LivePill label="LIVE" />}
          </div>
          <div style={{ fontSize: 12, color: YL.ink2, marginTop: 2 }}>
            {fmtISTTime(w.windowStart)} – {fmtISTTime(w.windowEnd)}
            <span style={{ marginLeft: 8, color: YL.ink3 }}>·</span>
            <span style={{ marginLeft: 8, fontFamily: '"JetBrains Mono", monospace', fontSize: 11 }}>{w.tripCode}</span>
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {isActive ? (
            <>
              <Mono size={15} weight={700} color={YL.ink}>{remaining < 60 ? `${remaining}m` : `${Math.floor(remaining / 60)}h ${remaining % 60}m`}</Mono>
              <div style={{ fontSize: 10, color: YL.ink3, marginTop: 1 }}>remaining</div>
            </>
          ) : (
            <div style={{ fontSize: 11.5, color: YL.ink3 }}>
              opens {fmtISTTime(w.windowStart)}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar — only for active */}
      {isActive && (
        <div style={{ height: 3, background: YL.line, margin: '0 0 0 0' }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: YL.yellowDeep, transition: 'width 30s linear',
          }} />
        </div>
      )}

      {/* Upcoming state */}
      {!isActive && (
        <div style={{
          padding: '6px 16px 10px',
          fontSize: 11.5, color: YL.ink3,
          borderTop: `1px solid ${YL.line}`,
        }}>
          {w.windowType === 'pre' ? 'Pre-trip' : 'Post-trip'} window · booking at {fmtISTDateTime(w.bookingTime)}
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: YL.ink2, letterSpacing: 0.7,
      textTransform: 'uppercase', marginBottom: 10,
    }}>
      {children}
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: YL.card, border: `1.5px solid ${YL.line}`,
      borderRadius: 16, overflow: 'hidden', ...style,
    }}>
      {children}
    </div>
  )
}

export default function EmptyLegPage() {
  const [status, setStatus]       = React.useState<Status | null>(null)
  const [loading, setLoading]     = React.useState(true)
  const [toggling, setToggling]   = React.useState<string | null>(null)
  const [localCfg, setLocalCfg]   = React.useState<Record<string, string>>({})
  const [cfgSaving, setCfgSaving] = React.useState(false)
  const [cfgSaved, setCfgSaved]   = React.useState(false)
  const [now, setNow]             = React.useState(Date.now())

  const load = async () => {
    setLoading(true)
    try {
      const s = await getEmptyLegStatus() as Status
      setStatus(s)
      const init: Record<string, string> = {}
      for (const f of PARAM_FIELDS) init[f.key] = String(cfgNum(s.config, f.key, DEFAULTS[f.key]))
      setLocalCfg(init)
    } catch {}
    setLoading(false)
  }

  React.useEffect(() => { load() }, [])
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  const handleToggle = async (key: string, current: boolean) => {
    if (toggling) return
    setToggling(key)
    try {
      await setEmptyLegToggle(key, current ? 0 : 1)
      setStatus(s => s ? {
        ...s,
        [key === 'empty_leg_drops_active' ? 'dropOverride' : 'pickupOverride']: !current,
      } : s)
    } catch {}
    setToggling(null)
  }

  const handleSaveCfg = async () => {
    setCfgSaving(true)
    try {
      const payload: Record<string, number> = {}
      for (const f of PARAM_FIELDS) payload[f.key] = parseFloat(localCfg[f.key] || '0') || DEFAULTS[f.key]
      await saveEmptyLegConfig(payload)
      setCfgSaved(true)
      setTimeout(() => setCfgSaved(false), 2500)
    } catch {}
    setCfgSaving(false)
  }

  const discountPct     = parseFloat(localCfg.empty_leg_discount_pct ?? '') || status?.config?.empty_leg_discount_pct ?? 40
  const activeWindows   = status?.activeWindows   ?? []
  const upcomingWindows = status?.upcomingWindows ?? []
  const allWindows      = [...activeWindows, ...upcomingWindows]
  const bookings        = status?.todaysBookings ?? []

  const whatsappText = () => {
    const parts = []
    if (status?.dropOverride)   parts.push('airport drops (city → airport)')
    if (status?.pickupOverride) parts.push('airport pickups (airport → city)')
    const dir = parts.length ? parts.join(' & ') : 'select airport trips'
    return encodeURIComponent(`*Yellow — ${discountPct}% off ${dir}!*\n\nLimited time. Book now: ridewithyellow.com`)
  }

  const inp: React.CSSProperties = {
    height: 36, padding: '0 10px', borderRadius: 8,
    border: `1.5px solid ${YL.line}`, outline: 'none',
    fontFamily: '"JetBrains Mono", monospace', fontSize: 14, fontWeight: 600,
    color: YL.ink, background: '#fff', width: 80, boxSizing: 'border-box',
    textAlign: 'right',
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', background: YL.bg }}>
      <style>{`
        @keyframes yl-pulse {
          0%, 100% { opacity: 1 }
          50% { opacity: 0.3 }
        }
      `}</style>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div style={{
        padding: '20px 28px 16px',
        borderBottom: `1px solid ${YL.line}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        background: YL.card,
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: YL.ink, letterSpacing: -0.4 }}>Empty Leg</div>
          <div style={{ fontSize: 13, color: YL.ink2, marginTop: 2 }}>
            Fill dead legs with discounted fares · auto-detects from confirmed bookings
          </div>
        </div>
        <Button variant="secondary" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </Button>
      </div>

      <div style={{ padding: '24px 28px 48px', display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>

        {/* ═══ LEFT COLUMN — live status ═══════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Override toggles ─────────────────────────────────────── */}
        <div>
          <SectionLabel>Manual Override — Bangalore-wide</SectionLabel>
          <Card>
            {[
              {
                key: 'empty_leg_drops_active',
                on: status?.dropOverride ?? false,
                title: 'Airport DROPs',
                direction: 'City → Airport',
                desc: `Force ${discountPct}% off on all city-to-airport trips, no time window required`,
                color: YL.gulmohar,
              },
              {
                key: 'empty_leg_pickups_active',
                on: status?.pickupOverride ?? false,
                title: 'Airport PICKUPs',
                direction: 'Airport → City',
                desc: `Force ${discountPct}% off on all airport-to-city trips, no time window required`,
                color: YL.leaf,
              },
            ].map((row, i, arr) => (
              <div
                key={row.key}
                style={{
                  padding: '16px 20px',
                  display: 'flex', alignItems: 'center', gap: 16,
                  borderBottom: i < arr.length - 1 ? `1px solid ${YL.line}` : 'none',
                  background: row.on ? '#FAFFF8' : 'transparent',
                  transition: 'background 200ms',
                }}
              >
                {/* Direction badge */}
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: row.on ? row.color : YL.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 200ms',
                }}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={row.on ? '#fff' : YL.ink3} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    {row.key === 'empty_leg_drops_active'
                      ? <><path d="M17 8 12 3 7 8"/><path d="M12 3v13"/><path d="M5 21h14"/></>
                      : <><path d="M7 16l5 5 5-5"/><path d="M12 21V8"/><path d="M5 3h14"/></>
                    }
                  </svg>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: YL.ink }}>{row.title}</span>
                    <span style={{ fontSize: 11.5, color: YL.ink3, fontFamily: '"JetBrains Mono", monospace' }}>{row.direction}</span>
                    {row.on && <LivePill label={`${discountPct}% OFF · LIVE`} />}
                  </div>
                  <div style={{ fontSize: 12.5, color: YL.ink2, marginTop: 2 }}>{row.desc}</div>
                </div>

                <Toggle
                  on={row.on}
                  onToggle={() => handleToggle(row.key, row.on)}
                  disabled={toggling === row.key}
                />
              </div>
            ))}

            <div style={{
              padding: '10px 20px',
              fontSize: 12, color: YL.ink2,
              background: YL.yellowSoft,
              borderTop: `1px solid ${YL.line}`,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={YL.ink2} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>
              </svg>
              Auto-detection based on confirmed bookings always runs — these toggles add Bangalore-wide override on top.
            </div>
          </Card>
        </div>

        {/* ── Windows ──────────────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <SectionLabel>
              Auto-detected Windows
              {activeWindows.length > 0 && (
                <span style={{ marginLeft: 8, background: '#16a34a', color: '#fff', padding: '1px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: 0.3 }}>
                  {activeWindows.length} LIVE
                </span>
              )}
            </SectionLabel>
          </div>

          {allWindows.length === 0 ? (
            <div style={{
              background: YL.card, border: `1.5px solid ${YL.line}`, borderRadius: 14,
              padding: '20px 20px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: YL.ink, marginBottom: 4 }}>No windows open</div>
              <div style={{ fontSize: 12.5, color: YL.ink3, maxWidth: 360, margin: '0 auto' }}>
                Discount activates automatically when a confirmed booking creates a dead leg within the next 36 hours.
              </div>
            </div>
          ) : (
            <Stack gap={8}>
              {allWindows.map((w, i) => (
                <WindowCard key={i} w={w} now={now} />
              ))}
            </Stack>
          )}
        </div>

        {/* ── Upcoming bookings ────────────────────────────────────── */}
        <div>
          <SectionLabel>Upcoming Airport Bookings</SectionLabel>
          {bookings.length === 0 ? (
            <div style={{ background: YL.card, border: `1.5px solid ${YL.line}`, borderRadius: 14, padding: '16px 20px', fontSize: 13, color: YL.ink3 }}>
              No upcoming airport bookings.
            </div>
          ) : (
            <Card>
              {bookings.map((b, i) => {
                const isPickup = b.tripType === 'pickup'
                const st = STATUS_STYLE[b.status] ?? STATUS_STYLE.pending
                return (
                  <div
                    key={b.id}
                    style={{
                      padding: '12px 18px',
                      display: 'flex', alignItems: 'center', gap: 12,
                      borderBottom: i < bookings.length - 1 ? `1px solid ${YL.line}` : 'none',
                    }}
                  >
                    {/* Direction dot */}
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: isPickup ? YL.greenSoft : YL.yellowSoft,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={isPickup ? YL.greenInk : YL.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                        {isPickup
                          ? <><path d="M7 16l5 5 5-5"/><path d="M12 21V8"/><path d="M5 3h14"/></>
                          : <><path d="M17 8 12 3 7 8"/><path d="M12 3v13"/><path d="M5 21h14"/></>
                        }
                      </svg>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: YL.ink }}>
                        {isPickup
                          ? `Airport → ${b.nonAirportLocation}`
                          : `${b.nonAirportLocation} → Airport`}
                      </div>
                      <div style={{ fontSize: 12, color: YL.ink3, marginTop: 1 }}>{fmtISTDateTime(b.bookingTime)}</div>
                    </div>

                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      background: st.bg, color: st.fg,
                      padding: '3px 8px', borderRadius: 6,
                    }}>
                      {st.label}
                    </span>
                    <Mono size={11} color={YL.ink3}>{b.tripCode}</Mono>
                  </div>
                )
              })}
            </Card>
          )}
        </div>

        </div>{/* end left column */}

        {/* ═══ RIGHT COLUMN — configuration ════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Parameters ───────────────────────────────────────────── */}
        <div>
          <SectionLabel>Parameters</SectionLabel>
          <Card>
            {/* Discount */}
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${YL.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: YL.ink }}>Discount percentage</div>
                <div style={{ fontSize: 12, color: YL.ink3, marginTop: 1 }}>Applied to fare before tax — toll is unchanged</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input value={localCfg.empty_leg_discount_pct ?? '40'} onChange={e => setLocalCfg(p => ({ ...p, empty_leg_discount_pct: e.target.value }))} style={inp} type="number" min="0" max="100" />
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: YL.ink2 }}>%</span>
              </div>
            </div>

            {/* Pre-trip */}
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${YL.line}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: YL.gulmohar, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: YL.gulmohar, letterSpacing: 0.3, textTransform: 'uppercase' }}>Pre-trip (before airport pickup)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 16 }}>
                {PARAM_FIELDS.filter(f => f.group === 'pre').map(f => (
                  <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: YL.ink }}>{f.label}</span>
                      <span style={{ fontSize: 12, color: YL.ink3, marginLeft: 6 }}>{f.hint}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                      <input value={localCfg[f.key] ?? String(DEFAULTS[f.key])} onChange={e => setLocalCfg(p => ({ ...p, [f.key]: e.target.value }))} style={inp} type="number" min="0" />
                      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: YL.ink3, whiteSpace: 'nowrap' }}>{f.suffix}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Post-trip */}
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${YL.line}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: YL.leaf, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: YL.leaf, letterSpacing: 0.3, textTransform: 'uppercase' }}>Post-trip (after airport drop)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 16 }}>
                {PARAM_FIELDS.filter(f => f.group === 'post').map(f => (
                  <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: YL.ink }}>{f.label}</span>
                      <span style={{ fontSize: 12, color: YL.ink3, marginLeft: 6 }}>{f.hint}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                      <input value={localCfg[f.key] ?? String(DEFAULTS[f.key])} onChange={e => setLocalCfg(p => ({ ...p, [f.key]: e.target.value }))} style={inp} type="number" min="0" />
                      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: YL.ink3, whiteSpace: 'nowrap' }}>{f.suffix}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Home base */}
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${YL.line}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: YL.blueInk, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: YL.blueInk, letterSpacing: 0.3, textTransform: 'uppercase' }}>Home Base — Kengeri flat fare</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 16 }}>
                {PARAM_FIELDS.filter(f => f.group === 'home').map(f => (
                  <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: YL.ink }}>{f.label}</span>
                      <span style={{ fontSize: 12, color: YL.ink3, marginLeft: 6 }}>{f.hint}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                      {f.prefix && <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: YL.ink2 }}>{f.prefix}</span>}
                      <input value={localCfg[f.key] ?? String(DEFAULTS[f.key])} onChange={e => setLocalCfg(p => ({ ...p, [f.key]: e.target.value }))} style={inp} type="number" min="0" />
                      {f.suffix && <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: YL.ink3, whiteSpace: 'nowrap' }}>{f.suffix}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="primary" onClick={handleSaveCfg} disabled={cfgSaving}>
                {cfgSaved ? '✓ Saved' : cfgSaving ? 'Saving…' : 'Save parameters'}
              </Button>
            </div>
          </Card>
        </div>

        {/* ── Stats + Share ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: YL.ink2, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 }}>
              Special rates seen today
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: YL.ink, lineHeight: 1 }}>
              {status?.specialRateViewsToday ?? 0}
            </div>
            <div style={{ fontSize: 12, color: YL.ink3, marginTop: 6 }}>customers who saw the discounted price</div>
          </Card>

          <Card style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: YL.ink2, letterSpacing: 0.6, textTransform: 'uppercase' }}>Share the deal</div>
            <a
              href={`https://wa.me/?text=${whatsappText()}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <button style={{
                width: '100%', padding: '10px 16px',
                background: '#25D366', color: '#fff', border: 'none',
                borderRadius: 10, cursor: 'pointer',
                fontSize: 13.5, fontWeight: 600,
                fontFamily: '"Bricolage Grotesque", system-ui',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21l1.6-5A8 8 0 1 1 12 20a8 8 0 0 1-3.6-.9L3 21z"/>
                </svg>
                Share on WhatsApp
              </button>
            </a>
            <div style={{ fontSize: 11.5, color: YL.ink3 }}>
              Sends a pre-filled message with the active discount details
            </div>
          </Card>
        </div>

        </div>{/* end right column */}

      </div>
    </div>
  )
}

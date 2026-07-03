import React from 'react'
import { getFinanceSummary, getUnverifiedCollections, verifyPayment } from '../api'
import { YL, Icons, Mono, Stack, Card, PageHeader, Button, fmtINR, fmtDate, useIsMobile, getISTComponents, fromISTISO } from '../components/ui'
import type { Booking, BookingFilter } from '../types'

interface MonthRow  { month: string; revenue: number; collected: number; upcoming: number; gst: number; rides: number }
interface TypeRow   { type: string;  revenue: number; gst: number; rides: number }
interface Summary {
  totalRevenue: number; totalCollected: number; totalGst: number; totalRides: number
  outstandingAmount: number; outstandingCount: number; totalUpcoming: number
  monthly: MonthRow[]; byType: TypeRow[]; byMethod: Record<string, number>
  from: string; to: string
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function fmtMonth(m: string) {
  const [y, mo] = m.split('-').map(Number)
  return `${MONTHS_SHORT[mo - 1]} '${String(y).slice(2)}`
}

const TYPE_COLOR: Record<string, string> = {
  'Airport Pickup': YL.blueInk,
  'Airport Drop':   '#5b8ccc',
  'Outstation':     YL.leaf,
  'Hourly':         YL.gulmohar,
  'Other':          YL.ink3,
}

function StatCard({ label, value, hint, accent, onClick }: { label: string; value: string; hint?: string; accent?: string; onClick?: () => void }) {
  const [hovered, setHovered] = React.useState(false)
  const isClickable = !!onClick
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => isClickable && setHovered(true)}
      onMouseLeave={() => isClickable && setHovered(false)}
      style={{
        flex: 1, minWidth: 0, background: YL.card,
        border: `1px solid ${isClickable && hovered ? YL.yellowDeep : YL.line}`,
        borderRadius: 12, padding: '18px 18px 16px', position: 'relative', overflow: 'hidden',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'border-color 150ms',
        boxShadow: isClickable && hovered ? `0 2px 8px rgba(43,39,32,0.08)` : 'none',
      }}
    >
      {accent && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent }}/>}
      <div style={{ fontSize: 12, color: YL.ink2, fontWeight: 500 }}>{label}</div>
      <div style={{ marginTop: 10, fontSize: 28, fontWeight: 600, color: YL.ink, letterSpacing: -0.5, lineHeight: 1 }}>{value}</div>
      {hint && <div style={{ marginTop: 8, fontSize: 11.5, color: YL.ink2 }}>{hint}</div>}
      {isClickable && (
        <div style={{ position: 'absolute', bottom: 10, right: 12, fontSize: 10.5, color: hovered ? YL.ink2 : YL.ink3, fontWeight: 500, transition: 'color 150ms' }}>
          View bookings →
        </div>
      )}
    </div>
  )
}

function getMonthRange(month: string): { dateFrom: string; dateTo: string } {
  const [y, mo] = month.split('-').map(Number)
  const p2 = (n: number) => String(n).padStart(2, '0')
  const dateFrom = fromISTISO(`${y}-${p2(mo)}-01T00:00`).toISOString()
  const nextMo = mo === 12 ? 1 : mo + 1
  const nextY = mo === 12 ? y + 1 : y
  const dateTo = fromISTISO(`${nextY}-${p2(nextMo)}-01T00:00`).toISOString()
  return { dateFrom, dateTo }
}

function RevenueChart({ monthly, onNavigate }: { monthly: MonthRow[]; onNavigate?: (f: BookingFilter) => void }) {
  const maxRev = Math.max(...monthly.map(m => m.revenue), 1)
  const [hoveredRow, setHoveredRow] = React.useState<string | null>(null)
  const cols = [
    { h: 'Month',    align: 'left'  },
    { h: 'Rides',    align: 'right' },
    { h: 'Earned',   align: 'right', hint: 'completed rides' },
    { h: 'Collected', align: 'right', hint: 'paid' },
    { h: 'Upcoming', align: 'right', hint: 'confirmed / assigned' },
    { h: 'GST (5%)', align: 'right' },
  ]
  return (
    <Card padding={0}>
      <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${YL.line}` }}>
        <Stack gap={3}>
          <div style={{ fontSize: 14, fontWeight: 600, color: YL.ink }}>Monthly breakdown</div>
          <div style={{ fontSize: 12, color: YL.ink2 }}>
            Earned = completed · Collected = paid · Upcoming = confirmed / assigned
            {onNavigate && <span style={{ color: YL.ink3 }}> · Click a row to see those bookings</span>}
          </div>
        </Stack>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: YL.bg }}>
              {cols.map(c => (
                <th key={c.h} style={{ padding: '10px 18px', textAlign: c.align as any, fontSize: 11, fontWeight: 600, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }}>{c.h}</th>
              ))}
              <th style={{ padding: '10px 18px', width: 100 }}/>
            </tr>
          </thead>
          <tbody>
            {monthly.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '32px 18px', textAlign: 'center', color: YL.ink3, fontSize: 13 }}>No data for this period</td></tr>
            )}
            {monthly.map(m => {
              const barW = maxRev > 0 ? (m.revenue / maxRev) * 100 : 0
              const isHovered = hoveredRow === m.month
              return (
                <tr
                  key={m.month}
                  style={{ borderTop: `1px solid ${YL.line}`, cursor: onNavigate ? 'pointer' : 'default', background: isHovered ? '#FCF8EE' : 'transparent', transition: 'background 100ms' }}
                  onClick={() => {
                    if (!onNavigate) return
                    const { dateFrom, dateTo } = getMonthRange(m.month)
                    onNavigate({ dateFrom, dateTo, source: 'Finance', sourceLabel: `${fmtMonth(m.month)} rides` })
                  }}
                  onMouseEnter={() => onNavigate && setHoveredRow(m.month)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td style={{ padding: '11px 18px', fontWeight: 600, color: YL.ink, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {fmtMonth(m.month)}
                      {onNavigate && isHovered && <span style={{ fontSize: 10.5, color: YL.ink3, fontWeight: 400 }}>→</span>}
                    </div>
                  </td>
                  <td style={{ padding: '11px 18px', textAlign: 'right', fontFamily: '"JetBrains Mono", monospace', fontSize: 13 }}>{m.rides}</td>
                  <td style={{ padding: '11px 18px', textAlign: 'right', fontFamily: '"JetBrains Mono", monospace', fontSize: 13, fontWeight: 600, color: YL.ink }}>{fmtINR(m.revenue)}</td>
                  <td style={{ padding: '11px 18px', textAlign: 'right', fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: YL.greenInk }}>{fmtINR(m.collected)}</td>
                  <td style={{ padding: '11px 18px', textAlign: 'right', fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: YL.blueInk }}>
                    {m.upcoming > 0 ? fmtINR(m.upcoming) : <span style={{ color: YL.ink3 }}>—</span>}
                  </td>
                  <td style={{ padding: '11px 18px', textAlign: 'right', fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: YL.ink2 }}>{fmtINR(m.gst)}</td>
                  <td style={{ padding: '11px 18px' }}>
                    <div style={{ height: 6, background: YL.bg, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${barW}%`, height: '100%', background: YL.yellow, borderRadius: 3, transition: 'width 400ms ease' }}/>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          {monthly.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: `2px solid ${YL.line}`, background: YL.bg }}>
                <td style={{ padding: '11px 18px', fontWeight: 700, fontSize: 12, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.4 }}>Total</td>
                <td style={{ padding: '11px 18px', textAlign: 'right', fontFamily: '"JetBrains Mono", monospace', fontSize: 13, fontWeight: 600 }}>
                  {monthly.reduce((s, m) => s + m.rides, 0)}
                </td>
                <td style={{ padding: '11px 18px', textAlign: 'right', fontFamily: '"JetBrains Mono", monospace', fontSize: 13, fontWeight: 700, color: YL.ink }}>
                  {fmtINR(monthly.reduce((s, m) => s + m.revenue, 0))}
                </td>
                <td style={{ padding: '11px 18px', textAlign: 'right', fontFamily: '"JetBrains Mono", monospace', fontSize: 13, fontWeight: 700, color: YL.greenInk }}>
                  {fmtINR(monthly.reduce((s, m) => s + m.collected, 0))}
                </td>
                <td style={{ padding: '11px 18px', textAlign: 'right', fontFamily: '"JetBrains Mono", monospace', fontSize: 13, fontWeight: 700, color: YL.blueInk }}>
                  {fmtINR(monthly.reduce((s, m) => s + m.upcoming, 0))}
                </td>
                <td style={{ padding: '11px 18px', textAlign: 'right', fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: YL.ink2 }}>
                  {fmtINR(monthly.reduce((s, m) => s + m.gst, 0))}
                </td>
                <td/>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Card>
  )
}

function ByTypeCard({ byType, onNavigate }: { byType: TypeRow[]; onNavigate?: (f: BookingFilter) => void }) {
  const maxRev = Math.max(...byType.map(t => t.revenue), 1)
  const [hoveredType, setHoveredType] = React.useState<string | null>(null)
  return (
    <Card>
      <div style={{ fontSize: 14, fontWeight: 600, color: YL.ink, marginBottom: 4 }}>Revenue by ride type</div>
      <div style={{ fontSize: 12, color: YL.ink2, marginBottom: 18 }}>
        Completed rides · all time in range
        {onNavigate && <span style={{ color: YL.ink3 }}> · Click to drill down</span>}
      </div>
      <Stack gap={14}>
        {byType.length === 0 && <div style={{ fontSize: 13, color: YL.ink3 }}>No completed rides in this period</div>}
        {byType.map(t => {
          const color = TYPE_COLOR[t.type] || YL.ink3
          const barW = (t.revenue / maxRev) * 100
          const isHovered = hoveredType === t.type
          return (
            <div
              key={t.type}
              onClick={() => onNavigate?.({ tripType: t.type, statuses: ['completed'], source: 'Finance', sourceLabel: t.type })}
              onMouseEnter={() => onNavigate && setHoveredType(t.type)}
              onMouseLeave={() => setHoveredType(null)}
              style={{ cursor: onNavigate ? 'pointer' : 'default', padding: '6px 8px', margin: '-6px -8px', borderRadius: 8, background: isHovered ? YL.bg : 'transparent', transition: 'background 100ms' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: color, flexShrink: 0, display: 'inline-block' }}/>
                  <span style={{ fontSize: 13, fontWeight: 500, color: YL.ink }}>{t.type}</span>
                  <span style={{ fontSize: 12, color: YL.ink3 }}>{t.rides} ride{t.rides !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Mono size={13} weight={600}>{fmtINR(t.revenue)}</Mono>
                  {onNavigate && isHovered && <span style={{ fontSize: 10.5, color: YL.ink3 }}>→</span>}
                </div>
              </div>
              <div style={{ height: 5, background: YL.line, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${barW}%`, height: '100%', background: color, borderRadius: 3, opacity: 0.8, transition: 'width 400ms ease' }}/>
              </div>
            </div>
          )
        })}
      </Stack>
    </Card>
  )
}

function ByMethodCard({ byMethod }: { byMethod: Record<string, number> }) {
  const total = Object.values(byMethod).reduce((s, v) => s + v, 0)
  const methods = Object.entries(byMethod).sort(([, a], [, b]) => b - a)
  const labels: Record<string, string> = { cash: 'Direct', direct: 'Direct', upi: 'UPI', razorpay: 'Razorpay' }
  return (
    <Card>
      <div style={{ fontSize: 14, fontWeight: 600, color: YL.ink, marginBottom: 4 }}>Payment methods</div>
      <div style={{ fontSize: 12, color: YL.ink2, marginBottom: 18 }}>Paid + completed rides</div>
      {methods.length === 0 && <div style={{ fontSize: 13, color: YL.ink3 }}>No paid rides yet</div>}
      <Stack gap={12}>
        {methods.map(([method, amount]) => {
          const pct = total > 0 ? Math.round((amount / total) * 100) : 0
          return (
            <div key={method}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: YL.ink }}>{labels[method] || method}</span>
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 11.5, color: YL.ink3 }}>{pct}%</span>
                  <Mono size={13} weight={600}>{fmtINR(amount)}</Mono>
                </div>
              </div>
              <div style={{ height: 4, background: YL.bg, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: YL.ink, borderRadius: 3, opacity: 0.6, transition: 'width 400ms ease' }}/>
              </div>
            </div>
          )
        })}
      </Stack>
    </Card>
  )
}

// Driver-reported UPI/cash collections awaiting a match against the bank
// or GPay-for-Business statement.
function UnverifiedCard() {
  const [rows, setRows] = React.useState<Booking[]>([])
  const [loading, setLoading] = React.useState(true)
  const [busyId, setBusyId] = React.useState<string | null>(null)

  React.useEffect(() => {
    getUnverifiedCollections()
      .then((r: any) => setRows(r.bookings ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleVerify = async (id: string) => {
    setBusyId(id)
    try {
      await verifyPayment(id)
      setRows(prev => prev.filter(b => b.id !== id))
    } catch (e: any) {
      alert(e.message)
    } finally {
      setBusyId(null)
    }
  }

  if (loading || rows.length === 0) return null

  return (
    <Card padding={0}>
      <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${YL.line}` }}>
        <Stack gap={3}>
          <div style={{ fontSize: 14, fontWeight: 600, color: YL.ink }}>Unverified collections ({rows.length})</div>
          <div style={{ fontSize: 12, color: YL.ink2 }}>Marked paid by drivers (direct UPI / cash) — confirm against your bank or GPay statement</div>
        </Stack>
      </div>
      <div>
        {rows.map(b => (
          <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 18px', borderTop: `1px solid ${YL.line}` }}>
            <Mono size={12} weight={600}>{b.tripCode}</Mono>
            <span style={{ fontSize: 12, color: YL.ink2, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {b.assignedDriver?.name ?? 'Driver'} · {b.paymentMethod === 'cash' ? 'Cash' : 'UPI'} · {b.pickup?.dateTime ? fmtDate(b.pickup.dateTime) : ''}
            </span>
            <Mono size={13} weight={600}>{fmtINR(b.pricing?.totalPrice ?? 0)}</Mono>
            <Button size="sm" variant="secondary" onClick={() => handleVerify(b.id)} disabled={busyId === b.id}>
              {busyId === b.id ? 'Verifying…' : 'Verify ✓'}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  )
}

const RANGES = [
  { label: 'This month',   months: 0 },
  { label: 'Last 3 months', months: 3 },
  { label: 'Last 6 months', months: 6 },
  { label: 'Last 12 months', months: 12 },
]

interface FinancePageProps {
  onNavigateToBookings?: (f: BookingFilter) => void
}

export default function FinancePage({ onNavigateToBookings }: FinancePageProps) {
  const isMobile = useIsMobile()
  const [summary, setSummary] = React.useState<Summary | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError]     = React.useState<string | null>(null)
  const [range, setRange]     = React.useState(12)

  const load = React.useCallback(async (months: number) => {
    setLoading(true)
    setError(null)
    try {
      const istNow = getISTComponents(new Date().toISOString())!
      const p2 = (n: number) => String(n).padStart(2, '0')
      let from: Date
      if (months === 0) {
        from = fromISTISO(`${istNow.y}-${p2(istNow.mo+1)}-01T00:00`)
      } else {
        const fromDate = new Date(istNow.y, istNow.mo - months + 1, 1)
        from = fromISTISO(`${fromDate.getFullYear()}-${p2(fromDate.getMonth()+1)}-01T00:00`)
      }
      const toDate = new Date(istNow.y, istNow.mo + 1, 1)
      const to = fromISTISO(`${toDate.getFullYear()}-${p2(toDate.getMonth()+1)}-01T00:00`)
      const data = await getFinanceSummary(from.toISOString(), to.toISOString())
      setSummary(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load(range) }, [load, range])

  const mobileRanges = [
    { label: '1M', months: 0 },
    { label: '3M', months: 3 },
    { label: '6M', months: 6 },
    { label: '12M', months: 12 },
  ]

  const collectionRate = summary && summary.totalRevenue > 0
    ? Math.round((summary.totalCollected / summary.totalRevenue) * 100)
    : null

  return (
    <div style={{ flex: 1, overflow: 'auto', background: YL.bg, display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Finance"
        subtitle="Revenue, GST, and receivables"
        actions={
          <div style={{ display: 'flex', gap: isMobile ? 4 : 6 }}>
            {(isMobile ? mobileRanges : RANGES).map(r => (
              <Button
                key={r.months}
                variant={range === r.months ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setRange(r.months)}
              >
                {r.label}
              </Button>
            ))}
          </div>
        }
      />

      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '14px 12px' : '24px 28px' }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: YL.ink3, fontSize: 13 }}>
            Loading…
          </div>
        )}

        {error && (
          <div style={{ padding: '12px 16px', background: YL.redSoft, borderRadius: 10, color: YL.redInk, fontSize: 13 }}>
            {error}
          </div>
        )}

        {!loading && summary && (
          <Stack gap={isMobile ? 14 : 20}>
            {/* Stat cards row */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: isMobile ? 10 : 14 }}>
              <StatCard
                label="Collected"
                value={fmtINR(summary.totalCollected) ?? '—'}
                hint={collectionRate != null
                  ? `${collectionRate}% of ${fmtINR(summary.totalRevenue)} earned · ${summary.totalRides} rides`
                  : `of ${fmtINR(summary.totalRevenue)} earned · ${summary.totalRides} rides`}
                accent={YL.leaf}
                onClick={onNavigateToBookings
                  ? () => onNavigateToBookings({ statuses: ['completed'], paymentStatus: 'paid', source: 'Finance', sourceLabel: 'Collected rides' })
                  : undefined}
              />
              <StatCard
                label="GST (5%)"
                value={fmtINR(summary.totalGst) ?? '—'}
                hint={`Base: ${fmtINR(summary.totalRevenue - summary.totalGst)}`}
                accent={YL.yellow}
              />
              <StatCard
                label="Outstanding"
                value={fmtINR(summary.outstandingAmount) ?? '—'}
                hint={summary.outstandingCount > 0
                  ? `${summary.outstandingCount} ride${summary.outstandingCount !== 1 ? 's' : ''} completed but unpaid`
                  : 'All paid up'}
                accent={summary.outstandingAmount > 0 ? YL.gulmohar : YL.leaf}
                onClick={onNavigateToBookings && summary.outstandingCount > 0
                  ? () => onNavigateToBookings({ statuses: ['completed'], paymentStatus: 'unpaid', source: 'Finance', sourceLabel: 'Outstanding rides' })
                  : undefined}
              />
              <StatCard
                label="Upcoming pipeline"
                value={fmtINR(summary.totalUpcoming) ?? '—'}
                hint="Confirmed + assigned bookings"
                accent={YL.blueInk}
                onClick={onNavigateToBookings
                  ? () => onNavigateToBookings({ statuses: ['pending', 'confirmed', 'assigned'], source: 'Finance', sourceLabel: 'Upcoming pipeline' })
                  : undefined}
              />
            </div>

            {/* Driver-reported collections awaiting verification */}
            <UnverifiedCard />

            {/* Monthly revenue table */}
            <RevenueChart monthly={summary.monthly} onNavigate={onNavigateToBookings} />

            {/* Type + method row */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 14 : 20 }}>
              <ByTypeCard byType={summary.byType} onNavigate={onNavigateToBookings} />
              <ByMethodCard byMethod={summary.byMethod} />
            </div>

            {/* Outstanding note */}
            {summary.outstandingCount > 0 && (
              <div
                onClick={onNavigateToBookings
                  ? () => onNavigateToBookings({ statuses: ['completed'], paymentStatus: 'unpaid', source: 'Finance', sourceLabel: 'Outstanding rides' })
                  : undefined}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#FFF8E6', border: `1px solid ${YL.yellowDeep}`, borderRadius: 10, fontSize: 13, cursor: onNavigateToBookings ? 'pointer' : 'default' }}
              >
                <span style={{ display: 'flex', color: YL.gulmohar }}>{Icons.alert}</span>
                <span style={{ color: YL.ink, flex: 1 }}>
                  <strong>{summary.outstandingCount} completed booking{summary.outstandingCount !== 1 ? 's' : ''}</strong> still show unpaid ({fmtINR(summary.outstandingAmount)}). Mark them paid in Bookings or send a payment link.
                </span>
                {onNavigateToBookings && <span style={{ fontSize: 12, color: YL.ink2, whiteSpace: 'nowrap' }}>View all →</span>}
              </div>
            )}
          </Stack>
        )}
      </div>
    </div>
  )
}

import React from 'react'
import { PageHeader, YL, Button, Stack, Mono, DateTimePicker, fromISTISO, toISTISO, getISTComponents } from '../components/ui'
import { getAvailabilityBlocks, createAvailabilityBlock, deleteAvailabilityBlock, getAvailabilityNotifications, markNotificationNotified } from '../api'
import type { Booking } from '../types'

interface Block {
  id: number
  startAt: string
  endAt: string
  reason: string | null
  createdAt: string
}

interface Notification {
  id: number
  userId: string | null
  phone: string
  requestedAt: string
  notifiedAt: string | null
  createdAt: string
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtDt(iso: string) {
  const c = getISTComponents(iso)
  if (!c) return iso
  const ap = c.h >= 12 ? 'PM' : 'AM'
  return `${c.d} ${MONTHS[c.mo]} ${c.y}, ${c.h % 12 || 12}:${String(c.mi).padStart(2, '0')} ${ap}`
}

function defaultStartIST() {
  const now = new Date()
  now.setMinutes(0, 0, 0)
  now.setHours(now.getHours() + 1)
  return toISTISO(now)
}
function defaultEndIST() {
  const now = new Date()
  now.setMinutes(0, 0, 0)
  now.setHours(now.getHours() + 2)
  return toISTISO(now)
}

// A unified slot: either a manual block or a live booking
interface Slot {
  kind: 'block' | 'booking'
  sortKey: string // ISO for sorting
  block?: Block
  booking?: Booking
}

function buildSlots(blocks: Block[], bookings: Booking[], nowISO: string): { active: Slot[]; past: Slot[] } {
  const active: Slot[] = []
  const past: Slot[] = []

  for (const b of blocks) {
    const slot: Slot = { kind: 'block', sortKey: b.startAt, block: b }
    if (b.endAt > nowISO) active.push(slot)
    else past.push(slot)
  }

  const ACTIVE_STATUSES = new Set(['pending', 'confirmed', 'assigned', 'arrived', 'in_progress'])
  for (const bk of bookings) {
    if (!ACTIVE_STATUSES.has(bk.status)) continue
    const dt = bk.pickup?.dateTime
    if (!dt) continue
    const slot: Slot = { kind: 'booking', sortKey: dt, booking: bk }
    if (dt > nowISO) active.push(slot)
    else past.push(slot)
  }

  const byTime = (a: Slot, b: Slot) => a.sortKey < b.sortKey ? -1 : 1
  active.sort(byTime)
  past.sort(byTime)
  return { active, past }
}

export default function AvailabilityPage({ bookings }: { bookings: Booking[] }) {
  const [blocks, setBlocks]               = React.useState<Block[]>([])
  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [loading, setLoading]             = React.useState(true)
  const [saving, setSaving]               = React.useState(false)
  const [error, setError]                 = React.useState('')
  const [success, setSuccess]             = React.useState('')
  const [affectedBookings, setAffectedBookings] = React.useState<{ id: string; tripCode: string; pickup: { dateTime: string } }[]>([])

  const [startAt, setStartAt] = React.useState(defaultStartIST)
  const [endAt,   setEndAt]   = React.useState(defaultEndIST)
  const [reason,  setReason]  = React.useState('')
  // 'slot' = specific from/to datetimes; 'days' = whole-day range (start date → end date inclusive)
  const [mode, setMode]           = React.useState<'slot' | 'days'>('slot')
  const todayIST = toISTISO(new Date()).slice(0, 10)
  const [startDate, setStartDate] = React.useState(todayIST)
  const [endDate,   setEndDate]   = React.useState(todayIST)

  React.useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [b, n] = await Promise.all([getAvailabilityBlocks(), getAvailabilityNotifications()])
      setBlocks(b.blocks || [])
      setNotifications(n.notifications || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    let blockStart: Date, blockEnd: Date
    if (mode === 'days') {
      if (!startDate || !endDate) return
      if (endDate < startDate) { setError('End date must be on or after the start date'); return }
      blockStart = fromISTISO(`${startDate}T00:00`)
      blockEnd   = fromISTISO(`${endDate}T23:59`)
    } else {
      if (!startAt || !endAt) return
      blockStart = fromISTISO(startAt)
      blockEnd   = fromISTISO(endAt)
    }
    setSaving(true)
    setError('')
    setSuccess('')
    setAffectedBookings([])
    try {
      const res = await createAvailabilityBlock({
        startAt: blockStart.toISOString(),
        endAt:   blockEnd.toISOString(),
        reason:  reason.trim() || null,
      })
      setReason('')
      setStartAt(defaultStartIST())
      setEndAt(defaultEndIST())
      const affected = res.affectedBookings ?? []
      setAffectedBookings(affected)
      setSuccess(affected.length > 0
        ? `Block saved — but ${affected.length} existing booking${affected.length > 1 ? 's' : ''} fall inside this window.`
        : 'Block saved.')
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Remove this block?')) return
    try {
      await deleteAvailabilityBlock(id)
      setBlocks(prev => prev.filter(b => b.id !== id))
    } catch (e: any) {
      setError(e.message)
    }
  }

  const nowISO = new Date().toISOString()
  const { active, past } = buildSlots(blocks, bookings, nowISO)

  const inp: React.CSSProperties = {
    height: 36, padding: '0 12px', border: `1.5px solid ${YL.line}`,
    borderRadius: 8, fontFamily: '"Bricolage Grotesque", system-ui',
    fontSize: 13.5, color: YL.ink, background: YL.card, outline: 'none',
    boxSizing: 'border-box', width: '100%',
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 40px' }}>
      <PageHeader
        title="Availability"
        subtitle="Block time slots and see customers who want to be notified"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 420px) 1fr', gap: 24, padding: '20px 28px', alignItems: 'start' }}>

        {/* ── Add block form (left column) ── */}
        <div style={{ background: YL.card, border: `1px solid ${YL.line}`, borderRadius: 14, padding: 20, position: 'sticky', top: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: YL.ink2, letterSpacing: 0.5 }}>BLOCK AVAILABILITY</div>
            <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1.5px solid ${YL.line}` }}>
              {([['slot', 'Time slot'], ['days', 'Full days']] as const).map(([m, l]) => (
                <button key={m} type="button" onClick={() => setMode(m)} style={{
                  padding: '5px 12px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: mode === m ? YL.ink : YL.bg, color: mode === m ? YL.yellow : YL.ink2,
                  fontFamily: '"Bricolage Grotesque", system-ui',
                }}>{l}</button>
              ))}
            </div>
          </div>
          <form onSubmit={handleCreate}>
            <Stack gap={16}>
              {mode === 'slot' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <DateTimePicker label="From (IST)" value={startAt} onChange={setStartAt} required />
                  <DateTimePicker label="To (IST)"   value={endAt}   onChange={setEndAt}   required />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: YL.ink2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>Start date</div>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required style={inp} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: YL.ink2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>End date (inclusive)</div>
                    <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} required style={inp} />
                  </div>
                  <div style={{ gridColumn: '1 / -1', fontSize: 11.5, color: YL.ink3, marginTop: -6 }}>
                    Blocks whole days, midnight to midnight IST.
                  </div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: YL.ink2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>Reason (optional)</div>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Holiday, Maintenance, Full day trip"
                  style={inp}
                />
              </div>
              {error   && <div style={{ padding: '9px 13px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 13, color: '#DC2626' }}>{error}</div>}
              {success && <div style={{ padding: '9px 13px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, fontSize: 13, color: '#15803D' }}>{success}</div>}
              {affectedBookings.length > 0 && (
                <div style={{ padding: '9px 13px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, fontSize: 13, color: '#92400E' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Affected bookings — consider contacting customers:</div>
                  {affectedBookings.map(b => (
                    <div key={b.id} style={{ marginTop: 3 }}>
                      <Mono size={12}>{b.tripCode}</Mono>{' '}· pickup {fmtDt(b.pickup.dateTime)}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="primary" disabled={saving} type="submit">
                  {saving ? 'Saving…' : mode === 'days' ? 'Block these days' : 'Block this time'}
                </Button>
              </div>
            </Stack>
          </form>
        </div>

        {/* ── Right column: blocks + requests ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>

        {/* ── Active blocks ── */}
        <Section title={`ACTIVE (${active.length})`}>
          {loading ? (
            <div style={{ padding: '20px 0', color: YL.ink3, fontSize: 13, textAlign: 'center' }}>Loading…</div>
          ) : active.length === 0 ? (
            <EmptyRow text="No active blocks — all slots are open." />
          ) : (
            active.map((slot, i) =>
              slot.kind === 'block'
                ? <BlockRow key={`b-${slot.block!.id}`} block={slot.block!} onDelete={handleDelete} last={i === active.length - 1} />
                : <AvailabilityBookingRow key={`bk-${slot.booking!.id}`} booking={slot.booking!} last={i === active.length - 1} />
            )
          )}
        </Section>

        {/* ── Notify requests ── */}
        <Section title={`NOTIFY REQUESTS (${notifications.length})`}>
          {loading ? (
            <div style={{ padding: '20px 0', color: YL.ink3, fontSize: 13, textAlign: 'center' }}>Loading…</div>
          ) : notifications.length === 0 ? (
            <EmptyRow text="No notification requests yet." />
          ) : (
            notifications.map((n, i) => (
              <NotifyRow
                key={n.id}
                n={n}
                last={i === notifications.length - 1}
                onMarkNotified={async () => {
                  await markNotificationNotified(n.id)
                  setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, notifiedAt: new Date().toISOString() } : x))
                }}
              />
            ))
          )}
        </Section>

        {/* ── Past blocks ── */}
        {past.length > 0 && (
          <Section title={`PAST (${past.length})`} style={{ opacity: 0.55 }}>
            {past.map((slot, i) =>
              slot.kind === 'block'
                ? <BlockRow key={`b-${slot.block!.id}`} block={slot.block!} onDelete={handleDelete} last={i === past.length - 1} />
                : <AvailabilityBookingRow key={`bk-${slot.booking!.id}`} booking={slot.booking!} last={i === past.length - 1} />
            )}
          </Section>
        )}
        </div>{/* end right column */}
      </div>
    </div>
  )
}

function Section({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <div style={{ fontSize: 11, fontWeight: 700, color: YL.ink3, letterSpacing: 0.6, marginBottom: 10 }}>{title}</div>
      <div style={{ background: YL.card, border: `1px solid ${YL.line}`, borderRadius: 12, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div style={{ padding: '20px', fontSize: 13, color: YL.ink3, textAlign: 'center' }}>{text}</div>
  )
}

function rowBorder(last: boolean) {
  return last ? 'none' : `1px solid ${YL.line}`
}

function BlockRow({ block, onDelete, last }: { block: Block; onDelete: (id: number) => void; last: boolean }) {
  const nowISO = new Date().toISOString()
  const active = block.endAt > nowISO
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderBottom: rowBorder(last) }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: active ? '#F59E0B' : YL.ink3, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: YL.ink }}>
          {fmtDt(block.startAt)} → {fmtDt(block.endAt)}
        </div>
        <div style={{ fontSize: 12, color: YL.ink2, marginTop: 2 }}>
          {block.reason || 'Manual block'}
        </div>
      </div>
      {active && (
        <button
          onClick={() => onDelete(block.id)}
          style={{ padding: '5px 11px', fontSize: 12, fontWeight: 500, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 7, cursor: 'pointer', fontFamily: '"Bricolage Grotesque", system-ui', whiteSpace: 'nowrap' }}
        >
          Remove
        </button>
      )}
    </div>
  )
}

function AvailabilityBookingRow({ booking, last }: { booking: Booking; last: boolean }) {
  const pickupName = booking.pickup?.placeName || booking.pickup?.location || '—'
  const dropName   = booking.drop?.placeName   || booking.drop?.location   || '—'
  const dt = new Date(booking.pickup.dateTime)
  const blockFrom = new Date(dt.getTime() - 2 * 3600_000)
  const blockTo   = new Date(dt.getTime() + 2 * 3600_000)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderBottom: rowBorder(last) }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: YL.leaf, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: YL.ink }}>
            {fmtDt(blockFrom.toISOString())} → {fmtDt(blockTo.toISOString())}
          </span>
          <Mono size={11.5} color={YL.ink3}>{booking.tripCode}</Mono>
        </div>
        <div style={{ fontSize: 12, color: YL.ink2, marginTop: 2 }}>
          Pickup {fmtDt(booking.pickup.dateTime)} · {pickupName} → {dropName}
        </div>
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: YL.ink2, background: YL.bg, border: `1px solid ${YL.line}`, borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap' }}>
        {booking.status}
      </span>
    </div>
  )
}

function NotifyRow({ n, last, onMarkNotified }: { n: Notification; last: boolean; onMarkNotified: () => Promise<void> }) {
  const [marking, setMarking] = React.useState(false)
  const phone = n.phone.replace(/\D/g, '')
  const msg = encodeURIComponent(`Hi! You asked to be notified when Yellow is available around ${fmtDt(n.requestedAt)}. We're now available — book at book.ridewithyellow.com`)
  const whatsapp = `https://wa.me/${phone}?text=${msg}`

  async function handleMark() {
    setMarking(true)
    try { await onMarkNotified() } finally { setMarking(false) }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderBottom: rowBorder(last), opacity: n.notifiedAt ? 0.5 : 1 }}>
      <div style={{ flex: 1 }}>
        <Mono size={13} weight={600}>{n.phone}</Mono>
        <div style={{ fontSize: 12, color: YL.ink2, marginTop: 3 }}>
          Wanted: {fmtDt(n.requestedAt)}
          {n.notifiedAt && <span style={{ marginLeft: 8, color: '#15803D' }}>· Notified {fmtDt(n.notifiedAt)}</span>}
        </div>
      </div>
      <a
        href={whatsapp}
        target="_blank"
        rel="noreferrer"
        style={{ padding: '5px 11px', fontSize: 12, fontWeight: 500, color: '#15803D', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 7, cursor: 'pointer', fontFamily: '"Bricolage Grotesque", system-ui', textDecoration: 'none', whiteSpace: 'nowrap' }}
      >
        WhatsApp
      </a>
      {!n.notifiedAt && (
        <button
          onClick={handleMark}
          disabled={marking}
          style={{ padding: '5px 11px', fontSize: 12, fontWeight: 500, color: YL.ink2, background: YL.bg, border: `1px solid ${YL.line}`, borderRadius: 7, cursor: 'pointer', fontFamily: '"Bricolage Grotesque", system-ui', whiteSpace: 'nowrap' }}
        >
          {marking ? '…' : 'Mark notified'}
        </button>
      )}
    </div>
  )
}

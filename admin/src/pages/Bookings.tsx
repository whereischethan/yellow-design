import React from 'react'
import type { Booking, Driver, Vehicle } from '../types'
import { patchBooking, generatePaymentLink, lookupFlight, getBooking } from '../api'
import {
  YL, STATUS_STYLE, Icons, Mono, Stack, Button, Input, Chip, Card,
  PageHeader, StatusBadge, Avatar, fmtDate, fmtTime, fmtINR, formatPhone, useIsMobile,
} from '../components/ui'

function FilterBar({ statusFilter, setStatusFilter, search, setSearch, tripType, setTripType, counts }: any) {
  const isMobile = useIsMobile()
  const statuses = ['pending', 'confirmed', 'assigned', 'arrived', 'in_progress', 'completed', 'cancelled']

  if (isMobile) {
    return (
      <div style={{ padding: '10px 12px', background: YL.bg, borderBottom: `1px solid ${YL.line}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Input value={search} onChange={(e: any) => setSearch(e.target.value)} placeholder="Search code, name, flight…" icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.search}</span>}/>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 } as any}>
          <Chip active={statusFilter.length === 0} onClick={() => setStatusFilter([])}>All <Mono size={11} color={statusFilter.length === 0 ? YL.yellow : YL.ink2}>{counts.total}</Mono></Chip>
          {statuses.map(s => (
            <Chip key={s} active={statusFilter.includes(s)} onClick={() => setStatusFilter((p: string[]) => p.includes(s) ? p.filter((x: string) => x !== s) : [...p, s])}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: STATUS_STYLE[s].fg, opacity: 0.7, flexShrink: 0 }}/>
              {STATUS_STYLE[s].label}
            </Chip>
          ))}
          <div style={{ width: 1, flexShrink: 0 }}/>
          {(['all', 'pickup', 'drop'] as const).map(t => (
            <Chip key={t} active={tripType === t} onClick={() => setTripType(t)}>
              {t === 'all' ? 'Both' : t === 'pickup' ? '← Pick' : 'Drop →'}
            </Chip>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '14px 28px', background: YL.bg, borderBottom: `1px solid ${YL.line}`, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <Input value={search} onChange={(e: any) => setSearch(e.target.value)} placeholder="Search code, name, flight…" icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.search}</span>} style={{ width: 280 }}/>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Chip active={statusFilter.length === 0} onClick={() => setStatusFilter([])}>All <Mono size={11} color={statusFilter.length === 0 ? YL.yellow : YL.ink2}>{counts.total}</Mono></Chip>
        {statuses.map(s => (
          <Chip key={s} active={statusFilter.includes(s)} onClick={() => setStatusFilter((p: string[]) => p.includes(s) ? p.filter((x: string) => x !== s) : [...p, s])}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: STATUS_STYLE[s].fg, opacity: 0.7 }}/>
            {STATUS_STYLE[s].label}
            <Mono size={11} color={statusFilter.includes(s) ? YL.yellow : YL.ink2}>{counts[s] || 0}</Mono>
          </Chip>
        ))}
      </div>
      <div style={{ flex: 1 }}/>
      <div style={{ display: 'flex', gap: 6 }}>
        {(['all', 'pickup', 'drop'] as const).map(t => (
          <Chip key={t} active={tripType === t} onClick={() => setTripType(t)}>
            {t === 'all' ? 'Both' : t === 'pickup' ? 'Pickup ←' : 'Drop →'}
          </Chip>
        ))}
      </div>
    </div>
  )
}

function BookingCard({ b, onClick }: { b: Booking; onClick: (b: Booking) => void }) {
  const route = b.tripType === 'pickup'
    ? `BLR ${b.pickup?.terminal} → ${b.drop?.placeName}`
    : `${b.pickup?.placeName} → BLR ${b.drop?.terminal}`
  return (
    <div onClick={() => onClick(b)} style={{ padding: '14px 16px', borderBottom: `1px solid ${YL.line}`, cursor: 'pointer', background: YL.card, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Mono size={12.5} weight={600}>{b.tripCode}</Mono>
        <StatusBadge status={b.status} size="sm"/>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', background: b.tripType === 'pickup' ? YL.greenSoft : YL.yellowSoft, color: b.tripType === 'pickup' ? YL.greenInk : YL.ink, padding: '2px 6px', borderRadius: 3, marginLeft: 2 }}>
          {b.tripType === 'pickup' ? '← Pickup' : 'Drop →'}
        </span>
        <Mono size={12} weight={500} style={{ marginLeft: 'auto' }}>{fmtINR(b.pricing?.totalPrice ?? 0)}</Mono>
      </div>
      <div style={{ fontSize: 13, color: YL.ink, lineHeight: 1.4, display: 'flex', alignItems: 'flex-start', gap: 7 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: b.tripType === 'pickup' ? YL.leaf : YL.gulmohar, flexShrink: 0, marginTop: 4 }}/>
        <span>{route}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Mono size={11.5} color={YL.ink2}>{b.pickup?.dateTime ? `${fmtDate(b.pickup.dateTime)} ${fmtTime(b.pickup.dateTime)}` : '—'}</Mono>
          {b.flight && <Mono size={11} color={YL.ink3}>· {b.flight.flightNumber}</Mono>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {b.assignedDriver ? (
            <>
              <Avatar name={b.assignedDriver.name} size={20}/>
              <span style={{ fontSize: 12, color: YL.ink2 }}>{b.assignedDriver.name.split(' ')[0]}</span>
            </>
          ) : (
            <span style={{ fontSize: 11.5, color: YL.ink3, fontStyle: 'italic' }}>Unassigned</span>
          )}
        </div>
      </div>
    </div>
  )
}

function BookingRow({ b, onClick }: { b: Booking; onClick: (b: Booking) => void }) {
  const route = b.tripType === 'pickup'
    ? `BLR ${b.pickup?.terminal} → ${b.drop?.placeName}`
    : `${b.pickup?.placeName} → BLR ${b.drop?.terminal}`
  return (
    <div onClick={() => onClick(b)} style={{ display: 'grid', gridTemplateColumns: '110px 110px 95px 1fr 165px 145px 90px 28px', gap: 16, padding: '12px 28px', alignItems: 'center', borderBottom: `1px solid ${YL.line}`, cursor: 'pointer', transition: 'background 100ms', background: YL.card }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#FCF8EE')}
      onMouseLeave={(e) => (e.currentTarget.style.background = YL.card)}>
      <Mono size={12.5}>{b.tripCode}</Mono>
      <StatusBadge status={b.status} size="sm"/>
      <Stack gap={2}>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: YL.ink }}>{b.pickup?.dateTime ? fmtDate(b.pickup.dateTime) : '—'}</div>
        <Mono size={11.5} color={YL.ink2}>{b.pickup?.dateTime ? fmtTime(b.pickup.dateTime) : '—'}</Mono>
      </Stack>
      <Stack gap={3}>
        <div style={{ fontSize: 13, color: YL.ink, lineHeight: 1.3, display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: b.tripType === 'pickup' ? YL.leaf : YL.gulmohar, flexShrink: 0 }}/>
          {route}
        </div>
        {b.flight && <Mono size={11} color={YL.ink2}>{b.flight.flightNumber} · {b.flight.airline}</Mono>}
      </Stack>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <Avatar name={b.userName || b.guestName || b.userPhone || '?'} size={24}/>
        <Stack gap={2} style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color: YL.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {b.userName || b.userPhone || b.guestName || `User ${b.userId?.slice(0, 6)}`}
          </div>
          {b.userPhone && <Mono size={10.5} color={YL.ink2}>{formatPhone(b.userPhone)}</Mono>}
        </Stack>
      </div>
      <div>
        {b.assignedDriver ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar name={b.assignedDriver.name} size={22}/>
            <Stack gap={2}>
              <div style={{ fontSize: 12.5, color: YL.ink }}>{b.assignedDriver.name}</div>
              <Mono size={10.5} color={YL.ink2}>{(b.assignedDriver.rating ?? 0).toFixed(2)}★</Mono>
            </Stack>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: YL.ink3, fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: YL.ink3 }}/>
            Unassigned
          </div>
        )}
      </div>
      <Mono size={12.5} weight={500} style={{ textAlign: 'right' }}>{fmtINR(b.pricing?.totalPrice ?? 0)}</Mono>
      <span style={{ width: 14, height: 14, color: YL.ink3, display: 'flex' }}>{Icons.chevRight}</span>
    </div>
  )
}

interface BookingsListProps {
  bookings: Booking[]
  onOpen: (b: Booking) => void
  onNewBooking?: () => void
}

export function BookingsList({ bookings, onOpen, onNewBooking }: BookingsListProps) {
  const isMobile = useIsMobile()
  const [statusFilter, setStatusFilter] = React.useState<string[]>([])
  const [search, setSearch] = React.useState('')
  const [tripType, setTripType] = React.useState('all')

  const counts: Record<string, number> = React.useMemo(() => {
    const c: Record<string, number> = { total: bookings.length }
    bookings.forEach(b => { c[b.status] = (c[b.status] || 0) + 1 })
    return c
  }, [bookings])

  const STATUS_ORDER: Record<string, number> = { pending: 0, confirmed: 1, assigned: 2, arrived: 3, in_progress: 4, completed: 5, cancelled: 6 }

  const filtered = bookings.filter(b => {
    if (statusFilter.length && !statusFilter.includes(b.status)) return false
    if (tripType !== 'all' && b.tripType !== tripType) return false
    if (search) {
      const q = search.toLowerCase()
      const hay = [b.tripCode, b.guestName, b.guestPhone, b.assignedDriver?.name, b.flight?.flightNumber].filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  }).sort((a, b) => {
    const pa = STATUS_ORDER[a.status] ?? 5
    const pb = STATUS_ORDER[b.status] ?? 5
    if (pa !== pb) return pa - pb
    if (pa >= 5) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    return new Date(a.pickup?.dateTime ?? 0).getTime() - new Date(b.pickup?.dateTime ?? 0).getTime()
  })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: YL.bg }}>
      <PageHeader title="Bookings" subtitle={`${filtered.length} of ${bookings.length}`}
        actions={<Button variant="primary" onClick={onNewBooking} icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.plus}</span>}>{isMobile ? '+' : 'New booking'}</Button>}/>
      <FilterBar statusFilter={statusFilter} setStatusFilter={setStatusFilter} search={search} setSearch={setSearch} tripType={tripType} setTripType={setTripType} counts={counts}/>
      {!isMobile && (
        <div style={{ display: 'grid', gridTemplateColumns: '110px 110px 95px 1fr 165px 145px 90px 28px', gap: 16, padding: '10px 28px', background: YL.bg, borderBottom: `1px solid ${YL.line}`, fontSize: 11, color: YL.ink2, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>
          <div>Trip code</div><div>Status</div><div>Pickup</div><div>Route</div><div>Passenger</div><div>Driver</div><div style={{ textAlign: 'right' }}>Price</div><div/>
        </div>
      )}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '60px 28px', textAlign: 'center', color: YL.ink2, fontSize: 14 }}>No bookings match the current filters.</div>
        ) : filtered.map(b => isMobile
          ? <BookingCard key={b.id} b={b} onClick={onOpen}/>
          : <BookingRow key={b.id} b={b} onClick={onOpen}/>
        )}
      </div>
    </div>
  )
}

// ─── Booking Drawer ────────────────────────────────────────────────────────

function StatusFlow({ status, onChange }: { status: string; onChange: (s: string) => void }) {
  const flow = ['pending', 'confirmed', 'assigned', 'arrived', 'in_progress', 'completed']
  const idx = flow.indexOf(status)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 12 }}>
        {flow.map((s, i) => {
          const done = i < idx, current = i === idx, upcoming = i > idx
          return (
            <React.Fragment key={s}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: 1 }}>
                <div style={{ width: 22, height: 22, borderRadius: 999, background: done ? YL.leaf : current ? YL.yellow : YL.bg, border: `1.5px solid ${done ? YL.leaf : current ? YL.yellowDeep : YL.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: done ? '#fff' : YL.ink }}>
                  {done && <span style={{ width: 10, height: 10, display: 'flex' }}>{Icons.check}</span>}
                  {current && <span style={{ width: 7, height: 7, borderRadius: 999, background: YL.ink }}/>}
                </div>
                <div style={{ fontSize: 9.5, color: upcoming ? YL.ink3 : current ? YL.ink : YL.ink2, fontWeight: current ? 600 : 400, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {STATUS_STYLE[s]?.label.split(' ')[0]}
                </div>
              </div>
              {i < flow.length - 1 && <div style={{ height: 1.5, flex: 1, background: i < idx ? YL.leaf : YL.line, marginTop: -16, marginLeft: -8, marginRight: -8 }}/>}
            </React.Fragment>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
        {idx >= 0 && idx < flow.length - 1 && (
          <Button size="sm" variant="primary" onClick={() => onChange(flow[idx + 1])}>
            Mark as {STATUS_STYLE[flow[idx + 1]]?.label.toLowerCase()}
            <span style={{ width: 12, height: 12, display: 'flex' }}>{Icons.arrowRight}</span>
          </Button>
        )}
        {status !== 'cancelled' && status !== 'completed' && (
          <Button size="sm" variant="danger" onClick={() => onChange('cancelled')}>Cancel</Button>
        )}
      </div>
    </div>
  )
}

function DriverPicker({ booking, drivers, onAssign }: { booking: Booking; drivers: Driver[]; onAssign: (d: Driver | null) => void }) {
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState('')
  const sorted = [...drivers]
    .filter(d => d.name.toLowerCase().includes(q.toLowerCase()) || d.phone.includes(q))
    .sort((a, b) => ({ available: 0, 'on-trip': 1, offline: 2 }[a.status]! - ({ available: 0, 'on-trip': 1, offline: 2 }[b.status]!)))

  if (booking.assignedDriver) {
    const d = booking.assignedDriver
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 12, background: YL.bg, borderRadius: 10, border: `1px solid ${YL.line}` }}>
        <Avatar name={d.name} size={36}/>
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: YL.ink }}>{d.name}</div>
          <Mono size={11} color={YL.ink2}>{formatPhone(d.phone)} · {(d.rating ?? 0).toFixed(2)}★</Mono>
        </Stack>
        <Button size="sm" variant="ghost" onClick={() => onAssign(null)}>Reassign</Button>
      </div>
    )
  }

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)} style={{ width: '100%', padding: '14px 16px', background: YL.yellow, border: `1px solid ${YL.yellowDeep}`, borderRadius: 10, fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 13, fontWeight: 500, color: YL.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.plus}</span>
          Assign driver
        </button>
      ) : (
        <Card padding={0}>
          <div style={{ padding: '10px 12px', borderBottom: `1px solid ${YL.line}` }}>
            <Input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="Search drivers…" icon={<span style={{ width: 13, height: 13, display: 'flex' }}>{Icons.search}</span>} style={{ height: 30 }}/>
          </div>
          <div style={{ maxHeight: 240, overflow: 'auto' }}>
            {sorted.map(d => {
              const isAvail = d.status === 'available'
              return (
                <button key={d.id} onClick={() => { onAssign(d); setOpen(false) }} disabled={!isAvail} style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: `1px solid ${YL.line}`, display: 'flex', alignItems: 'center', gap: 10, cursor: isAvail ? 'pointer' : 'not-allowed', textAlign: 'left', opacity: isAvail ? 1 : 0.45 }}>
                  <Avatar name={d.name} size={28}/>
                  <Stack gap={2} style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, color: YL.ink, fontWeight: 500 }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: YL.ink2, display: 'flex', gap: 8 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 5, height: 5, borderRadius: 999, background: isAvail ? YL.leaf : d.status === 'on-trip' ? YL.yellowDeep : YL.ink3 }}/>
                        {isAvail ? 'Available' : d.status === 'on-trip' ? 'On trip' : 'Offline'}
                      </span>
                      <Mono size={10.5} color={YL.ink2}>{(d.rating ?? 0).toFixed(2)}★ · {d.trips} trips</Mono>
                    </div>
                  </Stack>
                </button>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

function VehiclePicker({ booking, vehicles, onAssign }: { booking: Booking; vehicles: Vehicle[]; onAssign: (v: Vehicle | null) => void }) {
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState('')
  const filtered = vehicles.filter(v =>
    v.plate.toLowerCase().includes(q.toLowerCase()) ||
    `${v.make} ${v.model}`.toLowerCase().includes(q.toLowerCase())
  )

  if (booking.assignedVehicle) {
    const v = booking.assignedVehicle
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', background: YL.bg, borderRadius: 10, border: `1px solid ${YL.line}` }}>
        <span style={{ width: 14, height: 14, color: YL.ink2, display: 'flex' }}>{Icons.car}</span>
        <Stack gap={2} style={{ flex: 1 }}>
          <Mono size={12}>{v.licensePlate}</Mono>
          <span style={{ fontSize: 11, color: YL.ink2 }}>{v.make} {v.model}</span>
        </Stack>
        <Button size="sm" variant="ghost" onClick={() => onAssign(null)}>Change</Button>
      </div>
    )
  }

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)} style={{ width: '100%', padding: '12px 16px', background: YL.bg, border: `1.5px dashed ${YL.line}`, borderRadius: 10, fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 13, color: YL.ink2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.plus}</span>
          Assign vehicle
        </button>
      ) : (
        <Card padding={0}>
          <div style={{ padding: '10px 12px', borderBottom: `1px solid ${YL.line}` }}>
            <Input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="Search plate or model…" icon={<span style={{ width: 13, height: 13, display: 'flex' }}>{Icons.search}</span>} style={{ height: 30 }}/>
          </div>
          <div style={{ maxHeight: 200, overflow: 'auto' }}>
            {filtered.length === 0 && <div style={{ padding: '14px', fontSize: 12.5, color: YL.ink2, textAlign: 'center' }}>No vehicles found</div>}
            {filtered.map(v => (
              <button key={v.id} onClick={() => { onAssign(v); setOpen(false) }} style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: `1px solid ${YL.line}`, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ width: 14, height: 14, color: YL.ink2, display: 'flex' }}>{Icons.car}</span>
                <Stack gap={2} style={{ flex: 1 }}>
                  <Mono size={12}>{v.plate}</Mono>
                  <span style={{ fontSize: 11, color: YL.ink2 }}>{v.make} {v.model} · {v.color}</span>
                </Stack>
                {v.is_ev === 1 && <span style={{ background: YL.greenSoft, color: YL.greenInk, fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 3 }}>EV</span>}
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

interface DrawerProps {
  booking: Booking | null
  drivers: Driver[]
  vehicles: Vehicle[]
  onClose: () => void
  onUpdate: (b: Booking) => void
}

export function BookingDrawer({ booking, drivers, vehicles, onClose, onUpdate }: DrawerProps) {
  const isMobile = useIsMobile()
  const [saving, setSaving] = React.useState(false)
  const [linkUrl, setLinkUrl] = React.useState<string | null>(null)
  const [generatingLink, setGeneratingLink] = React.useState(false)
  const [linkError, setLinkError] = React.useState('')
  const [copied, setCopied] = React.useState(false)
  const [flightData, setFlightData] = React.useState<any>(null)
  const [flightLoading, setFlightLoading] = React.useState(false)
  const [flightError, setFlightError] = React.useState('')
  const [refreshingBooking, setRefreshingBooking] = React.useState(false)

  React.useEffect(() => {
    setLinkUrl(booking?.razorpayLinkUrl ?? null)
    setLinkError('')
    setCopied(false)
    setFlightData(null)
    setFlightError('')
    // Auto-fetch flight if flightNumber exists but departure is missing
    if (booking?.flight?.flightNumber && !booking.flight.departure) {
      const date = booking.pickup?.dateTime ? booking.pickup.dateTime.split('T')[0] : undefined
      setFlightLoading(true)
      lookupFlight(booking.flight.flightNumber, date)
        .then(setFlightData)
        .catch((e: any) => setFlightError(e.message || 'Flight lookup failed'))
        .finally(() => setFlightLoading(false))
    }
  }, [booking?.id])

  const handleRefreshBooking = async () => {
    if (!booking) return
    setRefreshingBooking(true)
    try {
      const r: any = await getBooking(booking.id)
      onUpdate(r.booking)
    } catch {}
    finally { setRefreshingBooking(false) }
  }

  if (!booking) return null

  const handleGenerateLink = async () => {
    setGeneratingLink(true)
    setLinkError('')
    try {
      const r: any = await generatePaymentLink(booking.id)
      setLinkUrl(r.linkUrl)
    } catch (e: any) {
      setLinkError(e.message)
    } finally {
      setGeneratingLink(false)
    }
  }

  const handleCopy = () => {
    if (!linkUrl) return
    navigator.clipboard.writeText(linkUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true)
    try {
      const res = await patchBooking(booking.id, { status: newStatus })
      onUpdate(res.booking)
    } finally {
      setSaving(false)
    }
  }

  const handleAssignDriver = async (driver: Driver | null) => {
    setSaving(true)
    try {
      const newStatus = driver && booking.status === 'confirmed' ? 'assigned' : booking.status
      const res = await patchBooking(booking.id, { assignedDriver: driver, status: newStatus })
      onUpdate(res.booking)
    } finally {
      setSaving(false)
    }
  }

  const handleAssignVehicle = async (vehicle: Vehicle | null) => {
    setSaving(true)
    try {
      const assignedVehicle = vehicle ? { make: vehicle.make, model: vehicle.model, licensePlate: vehicle.plate, color: vehicle.color } : null
      const res = await patchBooking(booking.id, { assignedVehicle })
      onUpdate(res.booking)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(43,39,32,0.4)', animation: 'yl-fade-in 200ms ease-out', zIndex: 50 }}/>
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: isMobile ? 60 : 0, width: isMobile ? '100%' : 520, background: YL.card, boxShadow: '-12px 0 40px rgba(43,39,32,0.18)', animation: isMobile ? 'yl-slide-up 240ms cubic-bezier(0.32,0.72,0,1)' : 'yl-slide-in 240ms cubic-bezier(0.32,0.72,0,1)', zIndex: 51, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${YL.line}`, display: 'flex', alignItems: 'flex-start', gap: 12, background: YL.bg, flexShrink: 0 }}>
          <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Mono size={15} weight={600}>{booking.tripCode}</Mono>
              <StatusBadge status={booking.status} size="sm"/>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', background: booking.tripType === 'pickup' ? YL.greenSoft : YL.yellowSoft, color: booking.tripType === 'pickup' ? YL.greenInk : YL.ink, padding: '2px 7px', borderRadius: 3 }}>
                {booking.tripType === 'pickup' ? '← Pickup' : 'Drop →'}
              </span>
            </div>
            <div style={{ fontSize: 13, color: YL.ink2 }}>
              {booking.pickup?.dateTime ? fmtDate(booking.pickup.dateTime) : '—'} at {booking.pickup?.dateTime ? <Mono size={12}>{fmtTime(booking.pickup.dateTime)}</Mono> : '—'} · {booking.passengers} pax · {booking.luggage} bags
            </div>
          </Stack>
          <button onClick={onClose} style={{ width: 30, height: 30, background: 'transparent', border: `1px solid ${YL.line}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: YL.ink }}>
            <span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.close}</span>
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* Status */}
          <div style={{ padding: '18px 24px', borderBottom: `1px solid ${YL.line}` }}>
            <div style={{ fontSize: 11, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.7, fontWeight: 600, marginBottom: 14 }}>Status</div>
            <StatusFlow status={booking.status} onChange={handleStatusChange}/>
          </div>

          {/* Route */}
          <div style={{ padding: '18px 24px', borderBottom: `1px solid ${YL.line}` }}>
            <div style={{ fontSize: 11, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.7, fontWeight: 600, marginBottom: 14 }}>Route</div>
            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 999, background: YL.leaf, boxShadow: `0 0 0 1.5px ${YL.leaf}` }}/>
                {booking.stops?.length ? (
                  <>
                    <div style={{ width: 1.5, flex: 1, background: YL.line, minHeight: 24, margin: '4px 0' }}/>
                    {booking.stops.map((_, si) => (
                      <React.Fragment key={si}>
                        <div style={{ width: 8, height: 8, borderRadius: 999, border: `1.5px solid ${YL.ink2}`, background: '#fff' }}/>
                        <div style={{ width: 1.5, flex: 1, background: YL.line, minHeight: 24, margin: '4px 0' }}/>
                      </React.Fragment>
                    ))}
                  </>
                ) : (
                  <div style={{ width: 1.5, flex: 1, background: YL.line, minHeight: 36, margin: '4px 0' }}/>
                )}
                <div style={{ width: 10, height: 10, background: YL.gulmohar, boxShadow: `0 0 0 1.5px ${YL.gulmohar}` }}/>
              </div>
              <Stack gap={20} style={{ flex: 1 }}>
                <Stack gap={3}>
                  <div style={{ fontSize: 11, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>Pickup · {booking.pickup?.dateTime ? <Mono size={11}>{fmtTime(booking.pickup.dateTime)}</Mono> : '—'}</div>
                  <div style={{ fontSize: 13.5, color: YL.ink, fontWeight: 500 }}>{booking.pickup?.placeName}</div>
                  {booking.pickup?.location && (
                    <a
                      href={booking.pickup.lat && booking.pickup.lng
                        ? `https://www.google.com/maps?q=${booking.pickup.lat},${booking.pickup.lng}`
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.pickup.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, color: YL.blueInk, textDecoration: 'underline', cursor: 'pointer' }}
                    >
                      {booking.pickup.location}
                    </a>
                  )}
                </Stack>
                {booking.stops?.map((stop, si) => (
                  <Stack key={si} gap={3}>
                    <div style={{ fontSize: 11, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>Stop {si + 1}</div>
                    <div style={{ fontSize: 13.5, color: YL.ink, fontWeight: 500 }}>{stop.placeName || stop.location}</div>
                    {stop.location && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 12, color: YL.blueInk, textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        {stop.placeName && stop.placeName !== stop.location ? stop.location : 'Open in Maps'}
                      </a>
                    )}
                  </Stack>
                ))}
                <Stack gap={3}>
                  <div style={{ fontSize: 11, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>Drop</div>
                  <div style={{ fontSize: 13.5, color: YL.ink, fontWeight: 500 }}>{booking.drop?.placeName}</div>
                  {booking.drop?.location && (
                    <a
                      href={booking.drop.lat && booking.drop.lng
                        ? `https://www.google.com/maps?q=${booking.drop.lat},${booking.drop.lng}`
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.drop.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, color: YL.blueInk, textDecoration: 'underline', cursor: 'pointer' }}
                    >
                      {booking.drop.location}
                    </a>
                  )}
                </Stack>
                {booking.pricing && (
                  <div style={{ display: 'flex', gap: 14, paddingTop: 4, borderTop: `1px dashed ${YL.line}` }}>
                    <Stack gap={4} style={{ flex: 1 }}>
                      <div style={{ fontSize: 10.5, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>Distance</div>
                      <Mono size={13}>{booking.pricing.distanceKm} km</Mono>
                    </Stack>
                    <Stack gap={4} style={{ flex: 1 }}>
                      <div style={{ fontSize: 10.5, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>Pax</div>
                      <Mono size={13}>{booking.passengers}</Mono>
                    </Stack>
                    <Stack gap={4} style={{ flex: 1 }}>
                      <div style={{ fontSize: 10.5, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>Bags</div>
                      <Mono size={13}>{booking.luggage}</Mono>
                    </Stack>
                  </div>
                )}
              </Stack>
            </div>
          </div>

          {/* Driver */}
          <div style={{ padding: '18px 24px', borderBottom: `1px solid ${YL.line}` }}>
            <div style={{ fontSize: 11, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.7, fontWeight: 600, marginBottom: 14 }}>Driver</div>
            <DriverPicker booking={booking} drivers={drivers} onAssign={handleAssignDriver}/>
          </div>

          {/* Vehicle */}
          <div style={{ padding: '18px 24px', borderBottom: `1px solid ${YL.line}` }}>
            <div style={{ fontSize: 11, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.7, fontWeight: 600, marginBottom: 14 }}>Vehicle</div>
            <VehiclePicker booking={booking} vehicles={vehicles} onAssign={handleAssignVehicle}/>
          </div>

          {/* Flight */}
          {booking.flight && (
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${YL.line}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.7, fontWeight: 600 }}>Flight</div>
                <button onClick={() => {
                  if (!booking.flight?.flightNumber) return
                  const date = booking.pickup?.dateTime ? booking.pickup.dateTime.split('T')[0] : undefined
                  setFlightLoading(true); setFlightError('')
                  lookupFlight(booking.flight.flightNumber, date)
                    .then(setFlightData)
                    .catch((e: any) => setFlightError(e.message || 'Flight lookup failed'))
                    .finally(() => setFlightLoading(false))
                }} style={{ background: 'none', border: `1px solid ${YL.line}`, borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 11, color: YL.ink2, fontFamily: 'inherit' }}>
                  {flightLoading ? 'Loading…' : '↻ Refresh'}
                </button>
              </div>
              {(() => {
                const f = flightData || booking.flight
                const dep = f.departure ? new Date(f.departure) : null
                const arr = f.arrival ? new Date(f.arrival) : null
                const fmtHM = (d: Date) => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2,'0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center', padding: '12px 14px', background: YL.bg, borderRadius: 10, border: `1px solid ${YL.line}` }}>
                    <Stack gap={3}>
                      <Mono size={18} weight={700}>{dep ? fmtHM(dep) : '—'}</Mono>
                      <span style={{ fontSize: 11, color: YL.ink2 }}>Departure</span>
                      {dep && <span style={{ fontSize: 10.5, color: YL.ink3 }}>{dep.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                    </Stack>
                    <Stack gap={4} style={{ alignItems: 'center' }}>
                      <span style={{ width: 16, height: 16, color: YL.ink2, display: 'flex' }}>{Icons.flight}</span>
                      <Mono size={12} color={YL.ink}>{f.flightNumber}</Mono>
                      {f.airline && <span style={{ fontSize: 10, color: YL.ink3 }}>{f.airline}</span>}
                    </Stack>
                    <Stack gap={3} style={{ textAlign: 'right' }}>
                      <Mono size={18} weight={700} style={{ display: 'block' }}>{arr ? fmtHM(arr) : '—'}</Mono>
                      <span style={{ fontSize: 11, color: YL.ink2 }}>Arrival</span>
                      {arr && <span style={{ fontSize: 10.5, color: YL.ink3 }}>{arr.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                    </Stack>
                    {f.status && (
                      <div style={{ gridColumn: '1 / -1', borderTop: `1px dashed ${YL.line}`, paddingTop: 8, fontSize: 11.5, color: YL.ink2 }}>
                        Status: <span style={{ color: YL.greenInk, fontWeight: 500, textTransform: 'capitalize' }}>{f.status}</span>
                      </div>
                    )}
                  </div>
                )
              })()}
              {flightError && <div style={{ marginTop: 8, fontSize: 11.5, color: YL.gulmohar }}>{flightError}</div>}
            </div>
          )}

          {/* Pricing */}
          {booking.pricing && (
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${YL.line}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.7, fontWeight: 600 }}>Pricing</div>
                <button onClick={handleRefreshBooking} style={{ background: 'none', border: `1px solid ${YL.line}`, borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 11, color: YL.ink2, fontFamily: 'inherit' }}>
                  {refreshingBooking ? 'Loading…' : '↻ Refresh'}
                </button>
              </div>
              <Stack gap={9}>
                {(() => {
                  const p = booking.pricing
                  // Use explicit breakdown if present; otherwise try to reconstruct from basePrice + totalPrice
                  const fareBeforeTax = p.fareBeforeTax ?? p.basePrice ?? 0
                  const gst = p.gst ?? (p.fareBeforeTax == null ? Math.round(fareBeforeTax * 0.05) : 0)
                  const toll = p.toll ?? (p.fareBeforeTax == null ? Math.max(0, (p.totalPrice ?? 0) - fareBeforeTax - gst) : 0)
                  return (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12.5, color: YL.ink2 }}>Fare ({p.distanceKm} km)</span><Mono size={12.5}>{fmtINR(fareBeforeTax)}</Mono></div>
                      {gst > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12.5, color: YL.ink2 }}>GST (5%)</span><Mono size={12.5}>{fmtINR(gst)}</Mono></div>}
                      {toll > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12.5, color: YL.ink2 }}>Airport toll</span><Mono size={12.5}>{fmtINR(toll)}</Mono></div>}
                    </>
                  )
                })()}
                <div style={{ height: 1, background: YL.line }}/>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: YL.ink, fontWeight: 600 }}>Total</span>
                  <Mono size={18} weight={600}>{fmtINR(booking.pricing.totalPrice)}</Mono>
                </div>
                <div>
                  <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', background: booking.paymentStatus === 'paid' ? YL.greenSoft : YL.yellowSoft, color: booking.paymentStatus === 'paid' ? YL.greenInk : YL.ink, padding: '3px 7px', borderRadius: 4 }}>
                    {booking.paymentStatus || 'paid'}
                  </span>
                  {booking.razorpayPaymentId && (
                    <div style={{ marginTop: 5, fontSize: 10.5, color: YL.ink3, fontFamily: '"JetBrains Mono", monospace' }}>
                      Ref: {booking.razorpayPaymentId}
                    </div>
                  )}
                </div>

                {/* UPI payment link — show when no confirmed Razorpay payment ID (covers legacy "paid" admin bookings) */}
                {!booking.razorpayPaymentId && (
                  <div style={{ paddingTop: 4 }}>
                    {linkUrl ? (
                      <div>
                        <div style={{ fontSize: 11, color: YL.ink2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>UPI Payment Link</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: YL.bg, border: `1px solid ${YL.line}`, borderRadius: 8 }}>
                          <span style={{ flex: 1, fontSize: 11.5, color: YL.blueInk, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: '"JetBrains Mono", monospace' }}>{linkUrl}</span>
                          <button onClick={handleCopy} style={{ flexShrink: 0, padding: '4px 10px', background: copied ? YL.greenSoft : YL.yellow, color: copied ? YL.greenInk : YL.ink, border: `1px solid ${copied ? YL.leaf : YL.yellowDeep}`, borderRadius: 6, cursor: 'pointer', fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit' }}>
                            {copied ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <button
                          onClick={handleGenerateLink}
                          disabled={generatingLink}
                          style={{ width: '100%', padding: '9px 14px', background: generatingLink ? YL.bg : YL.ink, color: generatingLink ? YL.ink2 : YL.yellow, border: `1px solid ${YL.line}`, borderRadius: 8, cursor: generatingLink ? 'not-allowed' : 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: '"Bricolage Grotesque", system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        >
                          {generatingLink ? 'Generating…' : 'Generate UPI payment link'}
                        </button>
                        {linkError && <div style={{ marginTop: 6, fontSize: 11.5, color: YL.redInk }}>{linkError}</div>}
                      </div>
                    )}
                  </div>
                )}
              </Stack>
            </div>
          )}
        </div>
        {saving && <div style={{ padding: '10px 24px', background: YL.yellowSoft, fontSize: 12, color: YL.ink, textAlign: 'center' }}>Saving…</div>}
      </div>
    </>
  )
}

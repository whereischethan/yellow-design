import React from 'react'
import type { Booking, Driver, Vehicle, Customer } from '../types'
import { patchBooking, deleteBooking, generatePaymentLink, lookupFlight, getBooking, syncPaymentStatus, downloadCSV, lookupGstin, openInvoice, emailInvoice, createCustomInvoice, updateCustomInvoice, listCustomInvoices, openCustomInvoice, calcPricing } from '../api'
import type { CustomInvoice } from '../types'
import { PlacesInput } from './Modals'
import {
  YL, STATUS_STYLE, Icons, Mono, Stack, Button, Input, Chip, Card,
  PageHeader, StatusBadge, Avatar, fmtDate, fmtTime, fmtINR, formatPhone, useIsMobile,
  DateTimePicker, toISTISO, fromISTISO, getISTComponents,
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
              <Mono size={10.5} color={YL.ink2}>{formatPhone(b.assignedDriver.phone)}</Mono>
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
        actions={<>
          {!isMobile && <Button variant="secondary" icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.download}</span>} onClick={() => downloadCSV(filtered.map(b => ({
            trip_code: b.tripCode, status: b.status, trip_type: b.tripType, vehicle: b.vehicleType,
            pickup_time: b.pickup?.dateTime ?? '', pickup: b.pickup?.location ?? '',
            drop: b.drop?.location ?? '', passengers: b.passengers,
            flight: b.flight?.flightNumber ?? '', driver: b.assignedDriver?.name ?? '',
            guest_name: b.guestName ?? '', guest_phone: b.guestPhone ?? '',
            price: b.pricing?.totalPrice ?? '', payment_status: b.paymentStatus ?? '',
            created_at: b.createdAt,
          })), `bookings-${new Date().toISOString().slice(0,10)}.csv`)}>Export CSV</Button>}
          <Button variant="primary" onClick={onNewBooking} icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.plus}</span>}>{isMobile ? '+' : 'New booking'}</Button>
        </>}/>
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
        {idx > 0 && status !== 'completed' && (
          <Button size="sm" variant="secondary" onClick={() => onChange(flow[idx - 1])}>
            ← Back to {STATUS_STYLE[flow[idx - 1]]?.label.toLowerCase()}
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
          <Mono size={11} color={YL.ink2}>{formatPhone(d.phone)}</Mono>
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
                      <Mono size={10.5} color={YL.ink2}>{d.trips} trips</Mono>
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
  customers: Customer[]
  onClose: () => void
  onUpdate: (b: Booking) => void
  onDelete?: (id: string) => void
  isSuperAdmin?: boolean
}

export function BookingDrawer({ booking, drivers, vehicles, customers, onClose, onUpdate, onDelete, isSuperAdmin }: DrawerProps) {
  const isMobile = useIsMobile()
  const [editMode, setEditMode] = React.useState(false)
  const [editError, setEditError] = React.useState('')
  // Edit field state
  const [ePickup, setEPickup] = React.useState('')
  const [ePickupPlaceId, setEPickupPlaceId] = React.useState('')
  const [eDateTime, setEDateTime] = React.useState('')
  const [eTerminal, setETerminal] = React.useState('T2')
  const [eStops, setEStops] = React.useState<string[]>([])
  const [eDrop, setEDrop] = React.useState('')
  const [eDropPlaceId, setEDropPlaceId] = React.useState('')
  const [eFlight, setEFlight] = React.useState('')
  const [ePax, setEPax] = React.useState('1')

  const [eHours, setEHours] = React.useState('')
  const [eFare, setEFare] = React.useState('')
  const [eDiscount, setEDiscount] = React.useState('')
  const [eTotal, setETotal] = React.useState('')
  const [sendSms, setSendSms] = React.useState(true)
  const [smsToggling, setSmsToggling] = React.useState(false)
  const [eGuestName, setEGuestName] = React.useState('')
  const [eGuestPhone, setEGuestPhone] = React.useState('')
  const [eGstin, setEGstin] = React.useState('')
  const [eGstName, setEGstName] = React.useState('')
  const [gstinLookupLoading, setGstinLookupLoading] = React.useState(false)
  const [gstinLookupError, setGstinLookupError] = React.useState('')

  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [confirmHourlyComplete, setConfirmHourlyComplete] = React.useState(false)
  const [hourlyCompletePreview, setHourlyCompletePreview] = React.useState<{ actualHours: number; newTotal: number; endTime: Date } | null>(null)
  const [hourlyEndTimeStr, setHourlyEndTimeStr] = React.useState('') // HH:MM for editing
  const [hourlyPreviewLoading, setHourlyPreviewLoading] = React.useState(false)
  const [linkUrl, setLinkUrl] = React.useState<string | null>(null)
  const [generatingLink, setGeneratingLink] = React.useState(false)
  const [linkType, setLinkType] = React.useState<'upi' | 'standard'>('upi')
  const [linkError, setLinkError] = React.useState('')
  const [copied, setCopied] = React.useState(false)
  const [copiedWA, setCopiedWA] = React.useState(false)
  const [copiedWADriver, setCopiedWADriver] = React.useState(false)
  const [showEmailPanel, setShowEmailPanel] = React.useState(false)
  const [emailTo, setEmailTo] = React.useState('')
  const [emailSending, setEmailSending] = React.useState(false)
  const [emailResult, setEmailResult] = React.useState<{ ok: boolean; msg: string } | null>(null)
  const [flightData, setFlightData] = React.useState<any>(null)
  const [flightLoading, setFlightLoading] = React.useState(false)
  const [flightError, setFlightError] = React.useState('')
  const [refreshingBooking, setRefreshingBooking] = React.useState(false)
  const [markingPaid, setMarkingPaid] = React.useState(false)
  const [togglingCollect, setTogglingCollect] = React.useState(false)
  const [showCustomInvoice, setShowCustomInvoice] = React.useState(false)
  const [customInvoices, setCustomInvoices] = React.useState<CustomInvoice[]>([])
  const [ciAmount, setCiAmount] = React.useState('')
  const [ciDriverName, setCiDriverName] = React.useState('')
  const [ciVehiclePlate, setCiVehiclePlate] = React.useState('')
  const [ciCustomerName, setCiCustomerName] = React.useState('')
  const [ciPickup, setCiPickup] = React.useState('')
  const [ciDrop, setCiDrop] = React.useState('')
  const [ciDateTime, setCiDateTime] = React.useState('')
  const [ciDistance, setCiDistance] = React.useState('')
  const [ciToll, setCiToll] = React.useState('')
  const [ciDiscount, setCiDiscount] = React.useState('')
  const [ciStops, setCiStops] = React.useState<string[]>([])
  const [ciNote, setCiNote] = React.useState('')
  const [ciEditingId, setCiEditingId] = React.useState<string | null>(null)
  const [ciSaving, setCiSaving] = React.useState(false)
  const [ciError, setCiError] = React.useState('')

  React.useEffect(() => {
    setEditMode(false)
    setSendSms(booking?.sendSms ?? true)
    setLinkUrl(booking?.razorpayLinkUrl ?? null)
    setLinkError('')
    setCopied(false)
    setLinkType('upi')
    setFlightData(null)
    setFlightError('')
    setShowEmailPanel(false)
    setEmailTo('')
    setEmailResult(null)
    setShowCustomInvoice(false)
    setCiAmount(booking?.pricing?.totalPrice ? String(booking.pricing.totalPrice) : '')
    setCiDriverName(booking?.assignedDriver?.name ?? '')
    setCiVehiclePlate(booking?.assignedVehicle?.licensePlate ?? '')
    setCiCustomerName(booking?.guestName ?? '')
    setCiPickup(booking?.pickup?.placeName ?? booking?.pickup?.location ?? '')
    setCiDrop(booking?.drop?.placeName ?? booking?.drop?.location ?? '')
    setCiDateTime(booking?.pickup?.dateTime ? toISTISO(new Date(booking.pickup.dateTime)) : '')
    setCiDistance(booking?.pricing?.distanceKm ? String(booking.pricing.distanceKm) : '')
    setCiToll(booking?.pricing?.toll ? String(booking.pricing.toll) : '')
    setCiDiscount(booking?.pricing?.discount ? String(booking.pricing.discount) : '')
    setCiStops((booking?.stops ?? []).map((s: any) => s.placeName ?? s.location ?? '').filter(Boolean))
    setCiNote('')
    setCiEditingId(null)
    setCiError('')
    setCustomInvoices([])
    if (booking?.tripCode) {
      listCustomInvoices(booking.tripCode).then(setCustomInvoices).catch(() => {})
    }
    if (booking?.flight?.flightNumber && !booking.flight.departure) {
      const date = booking.pickup?.dateTime ? booking.pickup.dateTime.split('T')[0] : undefined
      setFlightLoading(true)
      lookupFlight(booking.flight.flightNumber, date)
        .then(setFlightData)
        .catch((e: any) => {
          try { setFlightError(JSON.parse(e.message)?.error ?? e.message) }
          catch { setFlightError(e.message) }
        })
        .finally(() => setFlightLoading(false))
    }
    if (booking?.razorpayLinkId && booking.paymentStatus !== 'paid') {
      syncPaymentStatus(booking.id).then((r: any) => { if (r?.booking) onUpdate(r.booking) }).catch(() => {})
    }
  }, [booking?.id])

  const enterEdit = () => {
    if (!booking) return
    const isAirport = booking.tripType === 'pickup' || booking.tripType === 'drop'
    // For drop: pickup = customer address. For pickup: drop = customer address
    setEPickup(booking.pickup?.placeName ?? booking.pickup?.location ?? '')
    setEPickupPlaceId(booking.pickup?.placeId ?? '')
    setEDateTime(booking.pickup?.dateTime ? toISTISO(new Date(booking.pickup.dateTime)) : '')
    const airportTerminal = isAirport
      ? (booking.tripType === 'pickup' ? (booking.pickup as any)?.terminal : (booking.drop as any)?.terminal) ?? 'T2'
      : 'T2'
    setETerminal(airportTerminal)
    setEStops((booking.stops ?? []).map((s: any) => s.placeName ?? s.location ?? '').filter(Boolean))
    setEDrop(booking.drop?.placeName ?? booking.drop?.location ?? '')
    setEDropPlaceId(booking.drop?.placeId ?? '')
    setEFlight(booking.flight?.flightNumber ?? '')
    setEPax(String(booking.passengers ?? 1))
    const p = booking.pricing
    const fareBeforeTax = p?.fareBeforeTax ?? p?.basePrice ?? 0
    const storedToll = p?.toll ?? 0
    const discount = p?.discount ?? 0
    const durationMins = p?.durationMinutes || (parseFloat((p as any)?.breakdown?.hours ?? '0') * 60) || 0
    // Absorb stored toll into fare so edit experience is toll-free
    const absorbedFare = fareBeforeTax + storedToll
    setEHours(durationMins ? String(durationMins / 60) : '')
    setEFare(absorbedFare ? String(absorbedFare) : '')
    setEDiscount(discount ? String(discount) : '')
    const computedTotal = absorbedFare ? Math.round((absorbedFare - discount) * 1.05) : 0
    setETotal(computedTotal ? String(computedTotal) : '')
    setEGuestName(booking.guestName ?? '')
    setEGuestPhone(booking.guestPhone ?? '')
    setEGstin(booking.customerGstin ?? '')
    setEGstName(booking.customerGstName ?? '')
    setGstinLookupError('')
    setEditError('')
    setEditMode(true)
  }

  const handleSaveEdit = async () => {
    if (!booking) return
    setSaving(true)
    setEditError('')
    try {
      const isAirport = booking.tripType === 'pickup' || booking.tripType === 'drop'
      const pickupObj = {
        ...booking.pickup,
        placeName: ePickup,
        location: ePickup,
        ...(ePickupPlaceId ? { placeId: ePickupPlaceId } : {}),
        dateTime: eDateTime ? fromISTISO(eDateTime).toISOString() : booking.pickup?.dateTime,
        ...(isAirport && booking.tripType === 'pickup' ? { terminal: eTerminal } : {}),
      }
      const dropObj = {
        ...booking.drop,
        placeName: eDrop,
        location: eDrop,
        ...(eDropPlaceId ? { placeId: eDropPlaceId } : {}),
        ...(isAirport && booking.tripType === 'drop' ? { terminal: eTerminal } : {}),
      }
      const stopsArr = eStops.filter(s => s.trim()).map(s => ({ location: s, placeName: s }))
      const flightObj = isAirport && eFlight ? { ...(booking.flight ?? {}), flightNumber: eFlight } : (eFlight ? { flightNumber: eFlight } : null)
      const res = await patchBooking(booking.id, {
        pickup: pickupObj,
        drop: dropObj,
        stops: stopsArr,
        flight: flightObj,
        passengerCount: Number(ePax),
        fareBreakdown: eFare ? {
          fareBeforeTax: Number(eFare),
          discount: Number(eDiscount) || 0,
          toll: 0,
          durationHours: booking.tripType === 'hourly' && eHours ? Number(eHours) : undefined,
        } : undefined,
        ...(booking.tripType === 'hourly' && eHours && !eFare ? { durationHours: Number(eHours) } : {}),
        ...(booking.guestPhone ? { guestName: eGuestName, guestPhone: eGuestPhone } : {}),
        customerGstin: eGstin.trim() || null,
        customerGstName: eGstName.trim() || null,
      })
      onUpdate(res.booking)
      setEditMode(false)
    } catch (e: any) {
      setEditError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRefreshBooking = async () => {
    if (!booking) return
    setRefreshingBooking(true)
    try {
      // If booking has a payment link and isn't paid yet, sync status from Razorpay
      if (booking.razorpayLinkId && booking.paymentStatus !== 'paid') {
        const r: any = await syncPaymentStatus(booking.id)
        onUpdate(r.booking)
      } else {
        const r: any = await getBooking(booking.id)
        onUpdate(r.booking)
      }
    } catch {}
    finally { setRefreshingBooking(false) }
  }

  const handleMarkPaid = async () => {
    if (!booking) return
    setMarkingPaid(true)
    try { const r: any = await patchBooking(booking.id, { paymentStatus: 'paid', paymentMethod: 'direct' }); onUpdate(r.booking) }
    catch {} finally { setMarkingPaid(false) }
  }

  const handleToggleDriverCollect = async () => {
    if (!booking) return
    setTogglingCollect(true)
    try { const r: any = await patchBooking(booking.id, { driverCollect: !booking.driverCollect }); onUpdate(r.booking) }
    catch {} finally { setTogglingCollect(false) }
  }

  if (!booking) return null

  const handleGenerateLink = async () => {
    setGeneratingLink(true)
    setLinkError('')
    try {
      const r: any = await generatePaymentLink(booking.id, linkType)
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

  const buildWhatsAppCustomer = () => {
    if (!booking) return ''
    const d = booking.assignedDriver
    const v = booking.assignedVehicle
    const effectiveDt = eDateTime ? fromISTISO(eDateTime).toISOString() : booking.pickup?.dateTime
    const pickupDt = effectiveDt ? `${fmtDate(effectiveDt)} · ${fmtTime(effectiveDt)}` : '—'
    const route = booking.tripType === 'pickup'
      ? `BLR ${booking.pickup?.terminal ?? ''} → ${booking.drop?.placeName ?? ''}`
      : `${booking.pickup?.placeName ?? ''} → BLR ${booking.drop?.terminal ?? ''}`

    const lines: string[] = [
      `✅ *Booking Confirmed — Yellow*`,
      ``,
      `*${booking.tripCode}*`,
      `${pickupDt}`,
      `${route}`,
    ]
    if (booking.flight?.flightNumber) lines.push(`Flight: ${booking.flight.flightNumber}`)
    if (d) lines.push(``, `🚗 *Your Driver*`, `${d.name}`, `${formatPhone(d.phone)}`)
    if (v) {
      const vehicleLabel = [v.make, v.model].filter(Boolean).join(' ') || 'Yellow Sky'
      lines.push(``, `🚙 *Vehicle*`, vehicleLabel, `${v.color ? v.color + ' · ' : ''}${v.licensePlate}`)
    }
    if (booking.pricing?.totalPrice) lines.push(``, `💰 *Fare: ${fmtINR(booking.pricing.totalPrice)}* (all inclusive)`)
    return lines.join('\n')
  }

  const buildWhatsAppDriver = () => {
    if (!booking) return ''
    const effectiveDt = eDateTime ? fromISTISO(eDateTime).toISOString() : booking.pickup?.dateTime

    // Always use absolute date (no "Today"/"Tomorrow") for driver copy
    const fmtAbsDate = (iso: string) => {
      const c = getISTComponents(iso)
      if (!c) return '—'
      const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const dow = new Date(c.y, c.mo, c.d).getDay()
      return `${DAYS[dow]}, ${c.d} ${MONTHS[c.mo]} ${c.y}`
    }
    const pickupDt = effectiveDt ? `${fmtAbsDate(effectiveDt)} · ${fmtTime(effectiveDt)}` : '—'

    const customerName = booking.userName || booking.guestName || '—'
    const customerPhone = booking.userPhone || booking.guestPhone || '—'

    const isPickup = booking.tripType === 'pickup'
    const pickupPlace = isPickup
      ? `BLR ${booking.pickup?.terminal ?? ''} (Airport)`
      : (booking.pickup?.placeName ?? booking.pickup?.location ?? '—')
    const dropPlace = isPickup
      ? (booking.drop?.placeName ?? booking.drop?.location ?? '—')
      : `BLR ${booking.drop?.terminal ?? ''} (Airport)`

    // Google Maps link — always for the non-airport location
    // airport pickup → driver goes to DROP first;  airport drop → driver picks up from PICKUP
    const mapsLink = (() => {
      const loc = isPickup ? booking.drop : booking.pickup
      if (!loc) return null
      if (loc.lat && loc.lng) return `https://maps.google.com/?q=${loc.lat},${loc.lng}`
      const addr = loc.placeName ?? loc.location
      if (addr && loc.placeId) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}&query_place_id=${loc.placeId}`
      if (addr) return `https://maps.google.com/?q=${encodeURIComponent(addr)}`
      return null
    })()

    const lines: string[] = [
      `🚖 *New Trip — Yellow*`,
      ``,
      `*${booking.tripCode}*`,
      `${pickupDt}`,
      ``,
      `📍 *Pickup:* ${pickupPlace}`,
    ]
    // For airport pickup: map goes after Drop; for airport drop: map goes after Pickup
    if (isPickup) {
      lines.push(`📍 *Drop:* ${dropPlace}`)
      if (mapsLink) lines.push(mapsLink)
    } else {
      if (mapsLink) lines.push(mapsLink)
      lines.push(`📍 *Drop:* ${dropPlace}`)
    }
    if (booking.flight?.flightNumber) lines.push(`✈️ Flight: ${booking.flight.flightNumber}`)
    if ((booking.stops ?? []).length > 0) {
      lines.push(``, `🛑 *Stops:*`)
      ;(booking.stops ?? []).forEach((s: any, i: number) => lines.push(`  ${i + 1}. ${s.placeName ?? s.location ?? s}`))
    }
    lines.push(``, `👤 *Customer*`, `${customerName}`, `${formatPhone(customerPhone)}`)
    if (booking.pricing?.totalPrice) lines.push(``, `💰 *Fare: ${fmtINR(booking.pricing.totalPrice)}*`)
    return lines.join('\n')
  }

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(buildWhatsAppCustomer()).then(() => {
      setCopiedWA(true)
      setTimeout(() => setCopiedWA(false), 2500)
    })
  }

  const handleCopyWhatsAppDriver = () => {
    navigator.clipboard.writeText(buildWhatsAppDriver()).then(() => {
      setCopiedWADriver(true)
      setTimeout(() => setCopiedWADriver(false), 2500)
    })
  }

  const handleStatusChange = async (newStatus: string) => {
    // For hourly bookings, show a confirmation preview before completing
    if (newStatus === 'completed' && booking.tripType === 'hourly') {
      const startMs = booking.pickup?.dateTime ? new Date(booking.pickup.dateTime).getTime() : null
      const now = new Date()
      const elapsedHours = startMs ? Math.max(0, (now.getTime() - startMs) / 3_600_000) : 0
      const actualHours = Math.max(0.5, Math.ceil(elapsedHours * 2) / 2)
      const pad = (n: number) => String(n).padStart(2, '0')
      const nowIST = getISTComponents(now.toISOString())!
      setHourlyEndTimeStr(`${pad(nowIST.h)}:${pad(nowIST.mi)}`)
      try {
        const result: any = await calcPricing({ tripType: 'hourly', durationHours: actualHours })
        setHourlyCompletePreview({ actualHours, newTotal: result.totalPrice, endTime: now })
      } catch {
        setHourlyCompletePreview({ actualHours, newTotal: 0, endTime: now })
      }
      setConfirmHourlyComplete(true)
      return
    }
    setSaving(true)
    try {
      const res = await patchBooking(booking.id, { status: newStatus })
      onUpdate(res.booking)
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmHourlyComplete = async () => {
    setConfirmHourlyComplete(false)
    setHourlyCompletePreview(null)
    setSaving(true)
    try {
      // Pass the edited end time so the server uses it for elapsed calculation
      const endTimeISO = hourlyCompletePreview?.endTime?.toISOString()
      const res = await patchBooking(booking.id, { status: 'completed', ...(endTimeISO ? { completedAt: endTimeISO } : {}) })
      onUpdate(res.booking)
    } finally {
      setSaving(false)
    }
  }

  const handleHourlyEndTimeChange = async (timeStr: string) => {
    setHourlyEndTimeStr(timeStr)
    if (!timeStr || !booking.pickup?.dateTime) return
    const [hh, mm] = timeStr.split(':').map(Number)
    // Build end time in IST: use IST date of pickup + user-entered IST time
    const pickupIST = getISTComponents(booking.pickup.dateTime)!
    const p2 = (n: number) => String(n).padStart(2, '0')
    let endTime = fromISTISO(`${pickupIST.y}-${p2(pickupIST.mo+1)}-${p2(pickupIST.d)}T${p2(hh)}:${p2(mm)}`)
    // If end time is before start (e.g. next-day trip), add a day
    if (endTime.getTime() < new Date(booking.pickup.dateTime).getTime()) {
      endTime = fromISTISO(`${pickupIST.y}-${p2(pickupIST.mo+1)}-${p2(pickupIST.d+1)}T${p2(hh)}:${p2(mm)}`)
    }
    const elapsedHours = Math.max(0, (endTime.getTime() - new Date(booking.pickup.dateTime).getTime()) / 3_600_000)
    const actualHours = Math.max(0.5, Math.ceil(elapsedHours * 2) / 2)
    setHourlyPreviewLoading(true)
    try {
      const result: any = await calcPricing({ tripType: 'hourly', durationHours: actualHours })
      setHourlyCompletePreview({ actualHours, newTotal: result.totalPrice, endTime })
    } catch {
      setHourlyCompletePreview(prev => prev ? { ...prev, actualHours, endTime } : null)
    } finally {
      setHourlyPreviewLoading(false)
    }
  }

  const handleAssignDriver = async (driver: Driver | null) => {
    setSaving(true)
    try {
      const newStatus = driver && booking.status === 'confirmed' ? 'assigned' : booking.status
      // Never embed the full driver row (base64 docs) in the booking
      const slim = driver ? { id: driver.id, name: driver.name, phone: driver.phone, rating: driver.rating, licenseNo: driver.licenseNo, plate: driver.plate, vehicle: driver.vehicle } : null
      const res = await patchBooking(booking.id, { assignedDriver: slim, status: newStatus })
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

  const handleDelete = async () => {
    if (!booking) return
    setDeleting(true)
    try {
      await deleteBooking(booking.id)
      onDelete?.(booking.id)
      onClose()
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
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
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', background: booking.tripType === 'pickup' ? YL.greenSoft : booking.tripType === 'hourly' ? YL.blueSoft : YL.yellowSoft, color: booking.tripType === 'pickup' ? YL.greenInk : booking.tripType === 'hourly' ? YL.blueInk : YL.ink, padding: '2px 7px', borderRadius: 3 }}>
                {booking.tripType === 'pickup' ? '← Pickup' : booking.tripType === 'hourly' ? 'Hourly' : booking.tripType === 'outstation' ? 'Outstation' : 'Drop →'}
              </span>
            </div>
            <div style={{ fontSize: 13, color: YL.ink2 }}>
              {booking.pickup?.dateTime ? fmtDate(booking.pickup.dateTime) : '—'} at {booking.pickup?.dateTime ? <Mono size={12}>{fmtTime(booking.pickup.dateTime)}</Mono> : '—'} · {booking.passengers} pax{booking.tripType === 'hourly' ? (() => { const mins = booking.pricing?.durationMinutes ?? 0; const hrs = mins ? (mins/60 % 1 === 0 ? mins/60 : (mins/60).toFixed(1)) : null; return hrs ? ` · ${hrs} hrs` : '' })() : ''}
            </div>
          </Stack>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {editMode ? (
              <>
                <button onClick={handleSaveEdit} disabled={saving} style={{ padding: '5px 13px', background: YL.ink, border: `1px solid ${YL.ink}`, borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: saving ? 'not-allowed' : 'pointer', color: YL.yellow, whiteSpace: 'nowrap' }}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setEditMode(false)} style={{ padding: '5px 11px', background: 'transparent', border: `1px solid ${YL.line}`, borderRadius: 8, fontSize: 12, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer', color: YL.ink2, whiteSpace: 'nowrap' }}>
                  Cancel
                </button>
              </>
            ) : (
              <button onClick={enterEdit} style={{ padding: '5px 11px', background: YL.yellow, border: `1px solid ${YL.yellowDeep}`, borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', color: YL.ink, whiteSpace: 'nowrap' }}>
                Edit details
              </button>
            )}
            <button onClick={onClose} style={{ width: 30, height: 30, background: 'transparent', border: `1px solid ${YL.line}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: YL.ink }}>
              <span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.close}</span>
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* Status */}
          <div style={{ padding: '18px 24px', borderBottom: `1px solid ${YL.line}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.7, fontWeight: 600 }}>Status</div>
              <button
                onClick={async () => {
                  const newVal = !sendSms
                  setSmsToggling(true)
                  setSendSms(newVal)
                  try { await patchBooking(booking.id, { sendSms: newVal }); onUpdate({ ...booking, sendSms: newVal }) }
                  catch { setSendSms(!newVal) }
                  finally { setSmsToggling(false) }
                }}
                disabled={smsToggling}
                title="Toggle whether status-change SMS are sent to the customer"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 7, border: `1.5px solid ${sendSms ? YL.leaf : YL.line}`, background: sendSms ? YL.greenSoft : YL.bg, cursor: smsToggling ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', color: sendSms ? YL.greenInk : YL.ink3, transition: 'all 150ms' }}
              >
                <span style={{ width: 6, height: 6, borderRadius: 999, background: sendSms ? YL.leaf : YL.ink3 }}/>
                SMS {sendSms ? 'ON' : 'OFF'}
              </button>
            </div>
            <StatusFlow status={booking.status} onChange={handleStatusChange}/>
          </div>

          {/* Route */}
          <div style={{ padding: '18px 24px', borderBottom: `1px solid ${YL.line}` }}>
            <div style={{ fontSize: 11, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.7, fontWeight: 600, marginBottom: 14 }}>Route</div>

            {editMode ? (
              <Stack gap={12}>
                {/* Guest info if applicable */}
                {booking.guestPhone && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingBottom: 12, borderBottom: `1px dashed ${YL.line}` }}>
                    <div>
                      <div style={{ fontSize: 10.5, color: YL.ink2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Guest name</div>
                      <input value={eGuestName} onChange={e => setEGuestName(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', height: 34, border: `1.5px solid ${YL.line}`, borderRadius: 8, padding: '0 10px', fontFamily: 'inherit', fontSize: 13, color: YL.ink, background: YL.card, outline: 'none' }}/>
                    </div>
                    <div>
                      <div style={{ fontSize: 10.5, color: YL.ink2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Phone</div>
                      <input value={eGuestPhone} onChange={e => setEGuestPhone(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', height: 34, border: `1.5px solid ${YL.line}`, borderRadius: 8, padding: '0 10px', fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: YL.ink, background: YL.card, outline: 'none' }}/>
                    </div>
                  </div>
                )}
                {/* Customer GSTIN (B2B) */}
                <div style={{ paddingBottom: 12, borderBottom: `1px dashed ${YL.line}` }}>
                  <div style={{ fontSize: 10.5, color: YL.ink2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Customer GSTIN <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional · for B2B invoices)</span></div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      value={eGstin} onChange={e => { setEGstin(e.target.value.toUpperCase()); setGstinLookupError('') }}
                      placeholder="29AABCY1234F1Z5"
                      maxLength={15}
                      style={{ flex: 1, boxSizing: 'border-box', height: 34, border: `1.5px solid ${YL.line}`, borderRadius: 8, padding: '0 10px', fontFamily: '"JetBrains Mono", monospace', fontSize: 12.5, color: YL.ink, background: YL.card, outline: 'none' }}
                    />
                    <button
                      disabled={eGstin.length !== 15 || gstinLookupLoading}
                      onClick={async () => {
                        setGstinLookupLoading(true); setGstinLookupError('')
                        try {
                          const r: any = await lookupGstin(eGstin)
                          setEGstName(r.tradeName || r.legalName || '')
                          if (!r.tradeName && !r.legalName) setGstinLookupError('GSTIN valid but company details not available')
                        } catch (e: any) {
                          setGstinLookupError(e.message)
                        } finally { setGstinLookupLoading(false) }
                      }}
                      style={{ height: 34, padding: '0 10px', background: YL.bg, border: `1.5px solid ${YL.line}`, borderRadius: 8, cursor: eGstin.length === 15 ? 'pointer' : 'not-allowed', fontSize: 12, color: YL.ink2, fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: eGstin.length !== 15 ? 0.5 : 1 }}
                    >
                      {gstinLookupLoading ? '…' : 'Look up'}
                    </button>
                  </div>
                  {gstinLookupError && <div style={{ fontSize: 11.5, color: YL.redInk, marginTop: 4 }}>{gstinLookupError}</div>}
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 10.5, color: YL.ink2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Company name (from GSTIN)</div>
                    <input value={eGstName} onChange={e => setEGstName(e.target.value)} placeholder="Auto-filled on lookup" style={{ width: '100%', boxSizing: 'border-box', height: 34, border: `1.5px solid ${YL.line}`, borderRadius: 8, padding: '0 10px', fontFamily: 'inherit', fontSize: 13, color: YL.ink, background: YL.card, outline: 'none' }}/>
                  </div>
                </div>
                {/* Pickup */}
                <div>
                  <div style={{ fontSize: 10.5, color: YL.ink2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Pickup location</div>
                  <PlacesInput label="" value={ePickup} onChange={v => { setEPickup(v); setEPickupPlaceId('') }} onSelect={s => { setEPickup(s.description); setEPickupPlaceId(s.placeId) }}/>
                </div>
                {/* Stops */}
                {eStops.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10.5, color: YL.ink2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Stop {i + 1}</div>
                      <input value={s} onChange={e => setEStops(prev => prev.map((x, idx) => idx === i ? e.target.value : x))} style={{ width: '100%', boxSizing: 'border-box', height: 34, border: `1.5px solid ${YL.line}`, borderRadius: 8, padding: '0 10px', fontFamily: 'inherit', fontSize: 13, color: YL.ink, background: YL.card, outline: 'none' }}/>
                    </div>
                    <button onClick={() => setEStops(prev => prev.filter((_, idx) => idx !== i))} style={{ height: 34, width: 34, flexShrink: 0, background: YL.bg, border: `1.5px solid ${YL.line}`, borderRadius: 8, cursor: 'pointer', color: YL.ink2, fontSize: 16, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </div>
                ))}
                <button onClick={() => setEStops(prev => [...prev, ''])} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: YL.ink2, fontSize: 12, cursor: 'pointer', padding: '2px 0', fontFamily: 'inherit' }}>＋ Add stop</button>
                {/* Drop */}
                <div>
                  <div style={{ fontSize: 10.5, color: YL.ink2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Drop location</div>
                  <PlacesInput label="" value={eDrop} onChange={v => { setEDrop(v); setEDropPlaceId('') }} onSelect={s => { setEDrop(s.description); setEDropPlaceId(s.placeId) }}/>
                </div>
                {/* Date & time + Terminal */}
                <div style={{ display: 'grid', gridTemplateColumns: (booking.tripType === 'pickup' || booking.tripType === 'drop') ? '1fr auto' : '1fr', gap: 8, alignItems: 'end' }}>
                  <div>
                    <div style={{ fontSize: 10.5, color: YL.ink2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Pickup date & time</div>
                    <DateTimePicker value={eDateTime} onChange={setEDateTime} />
                  </div>
                  {(booking.tripType === 'pickup' || booking.tripType === 'drop') && (
                    <div>
                      <div style={{ fontSize: 10.5, color: YL.ink2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Terminal</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {(['T1', 'T2'] as const).map(t => (
                          <button key={t} onClick={() => setETerminal(t)} style={{ height: 34, padding: '0 12px', borderRadius: 8, border: `1.5px solid ${eTerminal === t ? YL.ink : YL.line}`, background: eTerminal === t ? YL.ink : YL.bg, color: eTerminal === t ? YL.yellow : YL.ink, fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {/* Flight + pax/bags */}
                {(booking.tripType === 'pickup' || booking.tripType === 'drop') && (
                  <div>
                    <div style={{ fontSize: 10.5, color: YL.ink2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Flight number</div>
                    <input value={eFlight} onChange={e => setEFlight(e.target.value)} placeholder="e.g. AI 207" style={{ width: '100%', boxSizing: 'border-box', height: 34, border: `1.5px solid ${YL.line}`, borderRadius: 8, padding: '0 10px', fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: YL.ink, background: YL.card, outline: 'none' }}/>
                  </div>
                )}
                {booking.tripType === 'hourly' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[['Passengers', ePax, setEPax], ['Hours', eHours, setEHours]].map(([label, val, setter]: any) => (
                      <div key={label}>
                        <div style={{ fontSize: 10.5, color: YL.ink2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{label}</div>
                        <input type="number" min={0} step={label === 'Hours' ? 0.5 : 1} value={val} onChange={e => setter(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', height: 34, border: `1.5px solid ${YL.line}`, borderRadius: 8, padding: '0 10px', fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: YL.ink, background: YL.card, outline: 'none', textAlign: 'center' }}/>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                    {[['Passengers', ePax, setEPax]].map(([label, val, setter]: any) => (
                      <div key={label}>
                        <div style={{ fontSize: 10.5, color: YL.ink2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{label}</div>
                        <input type="number" min={0} value={val} onChange={e => setter(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', height: 34, border: `1.5px solid ${YL.line}`, borderRadius: 8, padding: '0 10px', fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: YL.ink, background: YL.card, outline: 'none', textAlign: 'center' }}/>
                      </div>
                    ))}
                  </div>
                )}
                {/* Fare breakdown */}
                <div>
                  <div style={{ fontSize: 10.5, color: YL.ink2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Fare breakdown (₹)</div>
                  <div style={{ background: '#F6F3EB', borderRadius: 10, overflow: 'hidden', border: `1px solid ${YL.line}` }}>
                    {/* Fare (before tax) */}
                    <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${YL.line}` }}>
                      <span style={{ flex: 1, fontSize: 12.5, color: YL.ink2, paddingLeft: 12 }}>Fare (before tax)</span>
                      <input
                        type="number" min={0} value={eFare} placeholder="0"
                        onChange={e => {
                          const f = e.target.value
                          setEFare(f)
                          const disc = Number(eDiscount) || 0
                          setETotal(f ? String(Math.round((Number(f) - disc) * 1.05)) : '')
                        }}
                        style={{ width: 90, height: 36, border: 'none', borderLeft: `1px solid ${YL.line}`, padding: '0 10px', fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: YL.ink, background: YL.card, outline: 'none', textAlign: 'right' }}
                      />
                    </div>
                    {/* Discount */}
                    <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${YL.line}` }}>
                      <span style={{ flex: 1, fontSize: 12.5, color: YL.ink2, paddingLeft: 12 }}>Discount</span>
                      <input
                        type="number" min={0} value={eDiscount} placeholder="0"
                        onChange={e => {
                          const d = e.target.value
                          setEDiscount(d)
                          const fare = Number(eFare) || 0
                          setETotal(fare ? String(Math.round((fare - (Number(d) || 0)) * 1.05)) : '')
                        }}
                        style={{ width: 90, height: 36, border: 'none', borderLeft: `1px solid ${YL.line}`, padding: '0 10px', fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: YL.redInk, background: YL.card, outline: 'none', textAlign: 'right' }}
                      />
                    </div>
                    {/* GST (auto) */}
                    {(() => {
                      const fare = Number(eFare) || 0
                      const disc = Number(eDiscount) || 0
                      const taxable = Math.max(0, fare - disc)
                      const gst = Math.round(taxable * 0.05)
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${YL.line}` }}>
                          <span style={{ flex: 1, fontSize: 12.5, color: YL.ink2, paddingLeft: 12 }}>GST (5%)</span>
                          <span style={{ width: 90, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 10, fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: YL.ink3, borderLeft: `1px solid ${YL.line}` }}>
                            {fare ? `₹${gst.toLocaleString('en-IN')}` : '—'}
                          </span>
                        </div>
                      )
                    })()}
                    {/* Total — editable, back-calculates fare */}
                    <div style={{ display: 'flex', alignItems: 'center', background: YL.card }}>
                      <span style={{ flex: 1, fontSize: 12.5, color: YL.ink, fontWeight: 600, paddingLeft: 12 }}>Total</span>
                      <input
                        type="number" min={0} value={eTotal} placeholder="0"
                        onChange={e => {
                          const t = e.target.value
                          setETotal(t)
                          const disc = Number(eDiscount) || 0
                          setEFare(t ? String(Math.max(0, Math.round(Number(t) / 1.05) + disc)) : '')
                        }}
                        style={{ width: 90, height: 36, border: 'none', borderLeft: `1px solid ${YL.line}`, padding: '0 10px', fontFamily: '"JetBrains Mono", monospace', fontSize: 13, fontWeight: 600, color: YL.ink, background: YL.card, outline: 'none', textAlign: 'right' }}
                      />
                    </div>
                  </div>
                </div>
                {editError && <div style={{ padding: '8px 12px', background: YL.redSoft, color: YL.redInk, borderRadius: 8, fontSize: 12.5 }}>{editError}</div>}
              </Stack>
            ) : (
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 999, background: YL.leaf, boxShadow: `0 0 0 1.5px ${YL.leaf}` }}/>
                  {booking.tripType !== 'hourly' && (
                    <>
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
                    </>
                  )}
                </div>
                <Stack gap={20} style={{ flex: 1 }}>
                  <Stack gap={3}>
                    <div style={{ fontSize: 11, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>Pickup · {booking.pickup?.dateTime ? <Mono size={11}>{fmtTime(booking.pickup.dateTime)}</Mono> : '—'}</div>
                    <div style={{ fontSize: 13.5, color: YL.ink, fontWeight: 500 }}>{booking.pickup?.placeName}</div>
                    {booking.pickup?.location && (
                      <a href={booking.pickup.lat && booking.pickup.lng ? `https://www.google.com/maps?q=${booking.pickup.lat},${booking.pickup.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.pickup.location)}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: YL.blueInk, textDecoration: 'underline', cursor: 'pointer' }}>{booking.pickup.location}</a>
                    )}
                  </Stack>
                  {booking.tripType === 'hourly' ? (
                    <Stack gap={3}>
                      <div style={{ fontSize: 11, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>Coverage</div>
                      <div style={{ fontSize: 13.5, color: YL.ink, fontWeight: 500 }}>Unlimited kms · Bangalore City Limits</div>
                    </Stack>
                  ) : (
                    <>
                      {booking.stops?.map((stop, si) => (
                        <Stack key={si} gap={3}>
                          <div style={{ fontSize: 11, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>Stop {si + 1}</div>
                          <div style={{ fontSize: 13.5, color: YL.ink, fontWeight: 500 }}>{stop.placeName || stop.location}</div>
                          {stop.location && (
                            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.location)}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: YL.blueInk, textDecoration: 'underline', cursor: 'pointer' }}>
                              {stop.placeName && stop.placeName !== stop.location ? stop.location : 'Open in Maps'}
                            </a>
                          )}
                        </Stack>
                      ))}
                      <Stack gap={3}>
                        <div style={{ fontSize: 11, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>Drop</div>
                        <div style={{ fontSize: 13.5, color: YL.ink, fontWeight: 500 }}>{booking.drop?.placeName}</div>
                        {booking.drop?.location && (
                          <a href={booking.drop.lat && booking.drop.lng ? `https://www.google.com/maps?q=${booking.drop.lat},${booking.drop.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.drop.location)}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: YL.blueInk, textDecoration: 'underline', cursor: 'pointer' }}>{booking.drop.location}</a>
                        )}
                      </Stack>
                    </>
                  )}
                  {booking.pricing && (
                    <div style={{ display: 'flex', gap: 14, paddingTop: 4, borderTop: `1px dashed ${YL.line}` }}>
                      {booking.tripType === 'hourly' ? (() => {
                        const bkStr: string = (booking.pricing as any)?.breakdown?.hours ?? ''
                        const parsedHrs = bkStr ? parseFloat(bkStr) : 0
                        const mins = booking.pricing.durationMinutes || (parsedHrs * 60) || 0
                        const hours = mins / 60
                        const startISO = booking.pickup?.dateTime
                        // For completed bookings, use the actual end time stamped on completion; otherwise estimate
                        const actualEndISO: string | undefined = (booking.pricing as any)?.actualEndTime
                        const estimatedEndISO = startISO && mins ? new Date(fromISTISO(toISTISO(new Date(startISO))).getTime() + mins * 60000).toISOString() : null
                        const endISO = actualEndISO ?? estimatedEndISO
                        const isActual = !!actualEndISO
                        return <>
                          <Stack gap={4} style={{ flex: 1 }}>
                            <div style={{ fontSize: 10.5, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>Hours</div>
                            <Mono size={13}>{hours % 1 === 0 ? hours : hours.toFixed(1)} hr</Mono>
                          </Stack>
                          <Stack gap={4} style={{ flex: 1 }}>
                            <div style={{ fontSize: 10.5, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>Start</div>
                            <Mono size={13}>{startISO ? fmtTime(startISO) : '—'}</Mono>
                          </Stack>
                          <Stack gap={4} style={{ flex: 1 }}>
                            <div style={{ fontSize: 10.5, color: isActual ? YL.greenInk : YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>End{isActual ? ' ✓' : ''}</div>
                            <Mono size={13}>{endISO ? fmtTime(endISO) : '—'}</Mono>
                          </Stack>
                        </>
                      })() : <>
                        <Stack gap={4} style={{ flex: 1 }}>
                          <div style={{ fontSize: 10.5, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>Distance</div>
                          <Mono size={13}>{booking.pricing.distanceKm} km</Mono>
                        </Stack>
                        <Stack gap={4} style={{ flex: 1 }}>
                          <div style={{ fontSize: 10.5, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>Pax</div>
                          <Mono size={13}>{booking.passengers}</Mono>
                        </Stack>
                      </>}
                    </div>
                  )}
                </Stack>
              </div>
            )}
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
                    .catch((e: any) => {
                      try { setFlightError(JSON.parse(e.message)?.error ?? e.message) }
                      catch { setFlightError(e.message) }
                    })
                    .finally(() => setFlightLoading(false))
                }} style={{ background: 'none', border: `1px solid ${YL.line}`, borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 11, color: YL.ink2, fontFamily: 'inherit' }}>
                  {flightLoading ? 'Loading…' : '↻ Refresh'}
                </button>
              </div>
              {(() => {
                const f = flightData || booking.flight
                const dep = f.departure ? new Date(f.departure) : null
                const arr = f.arrival ? new Date(f.arrival) : null
                const MONS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
                const fmtHM = (iso: string) => { const c = getISTComponents(iso)!; return `${c.h%12||12}:${String(c.mi).padStart(2,'0')} ${c.h>=12?'PM':'AM'}` }
                const fmtMD = (iso: string) => { const c = getISTComponents(iso)!; return `${c.d} ${MONS[c.mo]}` }
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center', padding: '12px 14px', background: YL.bg, borderRadius: 10, border: `1px solid ${YL.line}` }}>
                    <Stack gap={3}>
                      <Mono size={18} weight={700}>{dep ? fmtHM(f.departure!) : '—'}</Mono>
                      <span style={{ fontSize: 11, color: YL.ink2 }}>Departure</span>
                      {dep && <span style={{ fontSize: 10.5, color: YL.ink3 }}>{fmtMD(f.departure!)}</span>}
                    </Stack>
                    <Stack gap={4} style={{ alignItems: 'center' }}>
                      <span style={{ width: 16, height: 16, color: YL.ink2, display: 'flex' }}>{Icons.flight}</span>
                      <Mono size={12} color={YL.ink}>{f.flightNumber}</Mono>
                      {f.airline && <span style={{ fontSize: 10, color: YL.ink3 }}>{f.airline}</span>}
                    </Stack>
                    <Stack gap={3} style={{ textAlign: 'right' }}>
                      <Mono size={18} weight={700} style={{ display: 'block' }}>{arr ? fmtHM(f.arrival!) : '—'}</Mono>
                      <span style={{ fontSize: 11, color: YL.ink2 }}>Arrival</span>
                      {arr && <span style={{ fontSize: 10.5, color: YL.ink3 }}>{fmtMD(f.arrival!)}</span>}
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
                      {(() => {
                        const bkHrs = (p as any)?.breakdown?.hours ?? ''
                        const parsedHrs = bkHrs ? parseFloat(bkHrs) : 0
                        const durationMins = p.durationMinutes || (parsedHrs * 60) || 0
                        const isActualHourly = booking.tripType === 'hourly' && !!(p as any)?.actualEndTime
                        const fareLabel = booking.tripType === 'hourly'
                          ? `Fare (${durationMins ? (durationMins/60 % 1 === 0 ? durationMins/60 : (durationMins/60).toFixed(1)) : '—'} hrs${isActualHourly ? ' actual' : ''})`
                          : `Fare (${p.distanceKm} km)`
                        return <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12.5, color: YL.ink2 }}>{fareLabel}</span><Mono size={12.5}>{fmtINR(fareBeforeTax)}</Mono></div>
                      })()}
                      {gst > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12.5, color: YL.ink2 }}>GST (5%)</span><Mono size={12.5}>{fmtINR(gst)}</Mono></div>}
                      {toll > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12.5, color: YL.ink2 }}>Tolls</span><Mono size={12.5}>{fmtINR(toll)}</Mono></div>}
                    </>
                  )
                })()}
                <div style={{ height: 1, background: YL.line }}/>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: YL.ink, fontWeight: 600 }}>Total</span>
                  <Mono size={18} weight={600}>{fmtINR(booking.pricing.totalPrice)}</Mono>
                </div>
                {/* Payment status row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', background: booking.paymentStatus === 'paid' ? YL.greenSoft : YL.yellowSoft, color: booking.paymentStatus === 'paid' ? YL.greenInk : YL.ink, padding: '3px 7px', borderRadius: 4 }}>
                    {booking.paymentStatus === 'paid' ? (['cash', 'direct'].includes(booking.paymentMethod ?? '') ? 'Paid · Direct' : booking.paymentMethod === 'upi' ? 'Paid · UPI' : 'Paid') : (booking.paymentStatus || 'pending')}
                  </span>
                  {booking.razorpayPaymentId && (
                    <div style={{ width: '100%', marginTop: 2, fontSize: 10.5, color: YL.ink3, fontFamily: '"JetBrains Mono", monospace' }}>
                      Ref: {booking.razorpayPaymentId}
                    </div>
                  )}
                </div>

                {/* Payment actions — only when unpaid */}
                {booking.paymentStatus !== 'paid' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Direct payment */}
                    <button
                      onClick={handleMarkPaid}
                      disabled={markingPaid}
                      style={{ width: '100%', padding: '9px 14px', background: YL.greenSoft, color: YL.greenInk, border: `1.5px solid ${YL.leaf}`, borderRadius: 8, cursor: markingPaid ? 'not-allowed' : 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: '"Bricolage Grotesque", system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      {markingPaid ? 'Saving…' : '✓ Mark as paid (Direct)'}
                    </button>

                    {/* Driver collects — fare becomes visible in the driver app */}
                    <button
                      onClick={handleToggleDriverCollect}
                      disabled={togglingCollect}
                      title="Driver collects payment at trip end — the fare is shown to the driver only for these rides"
                      style={{ width: '100%', padding: '9px 14px', background: booking.driverCollect ? YL.yellow : YL.bg, color: YL.ink, border: `1.5px solid ${booking.driverCollect ? YL.yellowDeep : YL.line}`, borderRadius: 8, cursor: togglingCollect ? 'not-allowed' : 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: '"Bricolage Grotesque", system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      {togglingCollect ? 'Saving…' : booking.driverCollect ? '✓ Driver to collect — fare shown to driver' : 'Driver to collect'}
                    </button>

                    {/* Payment link */}
                    <div>
                      <div style={{ fontSize: 10, color: YL.ink3, textAlign: 'center', marginBottom: 8, letterSpacing: 0.3 }}>— or collect online —</div>
                      {linkUrl ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: YL.bg, border: `1px solid ${YL.line}`, borderRadius: 8 }}>
                          <span style={{ flex: 1, fontSize: 11.5, color: YL.blueInk, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: '"JetBrains Mono", monospace' }}>{linkUrl}</span>
                          <button onClick={handleCopy} style={{ flexShrink: 0, padding: '4px 10px', background: copied ? YL.greenSoft : YL.yellow, color: copied ? YL.greenInk : YL.ink, border: `1px solid ${copied ? YL.leaf : YL.yellowDeep}`, borderRadius: 6, cursor: 'pointer', fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit' }}>
                            {copied ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {/* Type selector */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                            {([['upi', 'UPI only'], ['standard', 'Cards / UPI / Wallets']] as const).map(([val, label]) => (
                              <button key={val} onClick={() => setLinkType(val)} style={{ padding: '7px 10px', background: linkType === val ? YL.ink : YL.bg, color: linkType === val ? YL.yellow : YL.ink2, border: `1.5px solid ${linkType === val ? YL.ink : YL.line}`, borderRadius: 8, cursor: 'pointer', fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit', transition: 'all 120ms' }}>
                                {label}
                              </button>
                            ))}
                          </div>
                          <button onClick={handleGenerateLink} disabled={generatingLink} style={{ width: '100%', padding: '9px 14px', background: generatingLink ? YL.bg : YL.ink, color: generatingLink ? YL.ink2 : YL.yellow, border: `1px solid ${YL.line}`, borderRadius: 8, cursor: generatingLink ? 'not-allowed' : 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: '"Bricolage Grotesque", system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            {generatingLink ? 'Generating…' : 'Generate link'}
                          </button>
                        </div>
                      )}
                      {linkError && <div style={{ fontSize: 11.5, color: YL.redInk, marginTop: 6 }}>{linkError}</div>}
                    </div>
                  </div>
                )}
              </Stack>
            </div>
          )}
          <div style={{ padding: '10px 24px', borderTop: `1px solid ${YL.line}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {booking.status === 'completed' && (() => {
            const custEmail = customers.find(c => c.id === booking.userId)?.email ?? ''
            const handleSendEmail = async () => {
              const addrs = [emailTo.trim(), custEmail].filter(Boolean)
              if (!addrs.length) return
              setEmailSending(true); setEmailResult(null)
              try {
                await emailInvoice(booking.tripCode, [...new Set(addrs)])
                setEmailResult({ ok: true, msg: `Sent to ${[...new Set(addrs)].join(', ')}` })
                setEmailTo('')
              } catch (e: any) {
                setEmailResult({ ok: false, msg: e.message })
              } finally { setEmailSending(false) }
            }
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => openInvoice(booking.tripCode)}
                    style={{ flex: 1, padding: '9px 14px', background: YL.ink, color: YL.yellow, border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: '"Bricolage Grotesque", system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
                  >
                    🧾 {booking.invoiceNo ? `Invoice ${booking.invoiceNo}` : 'View Invoice'}
                  </button>
                  <button
                    onClick={() => { setShowEmailPanel(v => !v); setEmailResult(null) }}
                    style={{ padding: '9px 14px', background: showEmailPanel ? YL.yellowSoft : YL.bg, color: YL.ink, border: `1.5px solid ${YL.line}`, borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: '"Bricolage Grotesque", system-ui' }}
                    title="Email invoice"
                  >
                    ✉️
                  </button>
                </div>
                {showEmailPanel && (
                  <div style={{ background: YL.bg, borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {custEmail && (
                      <div style={{ fontSize: 12, color: YL.ink2 }}>
                        Customer email: <span style={{ fontWeight: 600, color: YL.ink }}>{custEmail}</span>
                      </div>
                    )}
                    <input
                      value={emailTo}
                      onChange={e => setEmailTo(e.target.value)}
                      placeholder={custEmail ? 'Additional email (optional)' : 'Enter email address'}
                      type="email"
                      style={{ height: 36, padding: '0 10px', borderRadius: 8, border: `1.5px solid ${YL.line}`, fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 13, color: YL.ink, background: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                      onKeyDown={e => e.key === 'Enter' && handleSendEmail()}
                    />
                    <button
                      onClick={handleSendEmail}
                      disabled={emailSending || (!emailTo.trim() && !custEmail)}
                      style={{ padding: '8px 14px', background: YL.ink, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: '"Bricolage Grotesque", system-ui', opacity: emailSending ? 0.6 : 1 }}
                    >
                      {emailSending ? 'Sending…' : custEmail && emailTo.trim() ? `Send to both` : 'Send Invoice'}
                    </button>
                    {emailResult && (
                      <div style={{ fontSize: 12, padding: '6px 10px', borderRadius: 7, background: emailResult.ok ? YL.greenSoft : YL.redSoft, color: emailResult.ok ? YL.greenInk : YL.redInk }}>
                        {emailResult.ok ? '✓ ' : '✗ '}{emailResult.msg}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })()}

          {/* Custom Invoice */}
          {(() => {
            const ciBody = () => ({
              amount: Math.round(parseFloat(ciAmount)),
              driverName: ciDriverName.trim() || undefined,
              vehiclePlate: ciVehiclePlate.trim() || undefined,
              customerName: ciCustomerName.trim() || undefined,
              pickupLocation: ciPickup.trim() || undefined,
              dropLocation: ciDrop.trim() || undefined,
              pickupDateTime: ciDateTime ? fromISTISO(ciDateTime).toISOString() : undefined,
              distanceKm: ciDistance ? parseFloat(ciDistance) : undefined,
              toll: ciToll ? Math.round(parseFloat(ciToll)) : undefined,
              discount: ciDiscount ? Math.round(parseFloat(ciDiscount)) : undefined,
              stops: ciStops.filter(Boolean),
              note: ciNote.trim() || undefined,
            })

            const loadCiIntoForm = (ci: CustomInvoice) => {
              setCiEditingId(ci.id)
              setCiAmount(String(ci.customAmount))
              setCiCustomerName(ci.customerName ?? '')
              setCiDriverName(ci.driverName ?? '')
              setCiVehiclePlate(ci.vehiclePlate ?? '')
              setCiPickup(ci.pickupLocation ?? '')
              setCiDrop(ci.dropLocation ?? '')
              setCiDateTime(ci.pickupDateTime ? toISTISO(new Date(ci.pickupDateTime)) : '')
              setCiDistance(ci.distanceKm != null ? String(ci.distanceKm) : '')
              setCiToll(ci.toll != null ? String(ci.toll) : '')
              setCiDiscount(ci.discount != null ? String(ci.discount) : '')
              try { setCiStops(ci.stopsJson ? JSON.parse(ci.stopsJson) : (booking?.stops ?? []).map((s: any) => s.placeName ?? s.location ?? '').filter(Boolean)) } catch { setCiStops([]) }
              setCiNote(ci.note ?? '')
              setCiError('')
            }

            const handleSaveCustomInvoice = async () => {
              if (!booking) return
              const amt = parseFloat(ciAmount)
              if (!ciAmount || isNaN(amt) || amt <= 0) { setCiError('Enter a valid amount'); return }
              setCiSaving(true); setCiError('')
              try {
                const body = ciBody()
                let id: string, invoiceNo: string
                if (ciEditingId) {
                  const r = await updateCustomInvoice(booking.tripCode, ciEditingId, body)
                  id = r.id; invoiceNo = r.invoiceNo
                  setCustomInvoices(prev => prev.map(c => c.id === id ? { ...c, customAmount: body.amount, driverName: body.driverName ?? null, vehiclePlate: body.vehiclePlate ?? null, customerName: body.customerName ?? null, pickupLocation: body.pickupLocation ?? null, dropLocation: body.dropLocation ?? null, pickupDateTime: body.pickupDateTime ?? null, distanceKm: body.distanceKm ?? null, toll: body.toll ?? null, discount: body.discount ?? null, stopsJson: body.stops ? JSON.stringify(body.stops) : null, note: body.note ?? null } : c))
                } else {
                  const r = await createCustomInvoice(booking.tripCode, body)
                  id = r.id; invoiceNo = r.invoiceNo
                  setCustomInvoices(prev => [{ id, invoiceNo, generatedAt: new Date().toISOString(), customAmount: body.amount, driverName: body.driverName ?? null, vehiclePlate: body.vehiclePlate ?? null, customerName: body.customerName ?? null, pickupLocation: body.pickupLocation ?? null, dropLocation: body.dropLocation ?? null, pickupDateTime: body.pickupDateTime ?? null, distanceKm: body.distanceKm ?? null, toll: body.toll ?? null, discount: body.discount ?? null, stopsJson: body.stops ? JSON.stringify(body.stops) : null, note: body.note ?? null }, ...prev])
                }
                openCustomInvoice(booking.tripCode, id)
                setCiEditingId(null)
                setShowCustomInvoice(false)
              } catch (e: any) {
                setCiError(e.message)
              } finally { setCiSaving(false) }
            }
            const inputStyle: React.CSSProperties = { height: 34, padding: '0 10px', borderRadius: 7, border: `1.5px solid ${YL.line}`, fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 12.5, color: YL.ink, background: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' }
            const fieldLabel = (label: string) => <div style={{ fontSize: 10.5, color: YL.ink3, fontWeight: 600, marginBottom: 3 }}>{label}</div>
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  onClick={() => setShowCustomInvoice(v => !v)}
                  style={{ width: '100%', padding: '8px 14px', background: showCustomInvoice ? YL.yellowSoft : YL.bg, color: YL.ink, border: `1.5px solid ${YL.line}`, borderRadius: 9, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: '"Bricolage Grotesque", system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  📋 {customInvoices.length > 0 ? `Custom Invoice (${customInvoices.length})` : 'Create Custom Invoice'}
                </button>
                {showCustomInvoice && (
                  <div style={{ background: YL.bg, borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: YL.ink3 }}>Custom / Customer-copy invoice</div>

                    {customInvoices.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {customInvoices.map(ci => (
                          <div key={ci.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', background: ciEditingId === ci.id ? YL.yellowSoft : '#fff', borderRadius: 7, border: `1px solid ${ciEditingId === ci.id ? YL.yellowDeep : YL.line}` }}>
                            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11.5, color: YL.ink, flex: 1 }}>{ci.invoiceNo}</span>
                            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11.5, color: YL.ink2 }}>₹{ci.customAmount.toLocaleString('en-IN')}</span>
                            <button onClick={() => openCustomInvoice(booking!.tripCode, ci.id)} style={{ padding: '3px 8px', background: YL.ink, color: YL.yellow, border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}>View</button>
                            <button onClick={() => { loadCiIntoForm(ci); setShowCustomInvoice(true) }} style={{ padding: '3px 8px', background: YL.bg, color: YL.ink, border: `1px solid ${YL.line}`, borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}>Edit</button>
                          </div>
                        ))}
                        <div style={{ height: 1, background: YL.line, margin: '2px 0' }}/>
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: YL.ink2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          {ciEditingId ? 'Editing custom invoice' : 'New custom invoice'}
                          {ciEditingId && <button onClick={() => { setCiEditingId(null); /* reset to booking defaults */ setCiAmount(booking?.pricing?.totalPrice ? String(booking.pricing.totalPrice) : ''); setCiCustomerName(booking?.guestName ?? ''); setCiDriverName(booking?.assignedDriver?.name ?? ''); setCiVehiclePlate(booking?.assignedVehicle?.licensePlate ?? ''); setCiPickup(booking?.pickup?.placeName ?? ''); setCiDrop(booking?.drop?.placeName ?? ''); setCiDateTime(booking?.pickup?.dateTime ? toISTISO(new Date(booking.pickup.dateTime)) : ''); setCiDistance(booking?.pricing?.distanceKm ? String(booking.pricing.distanceKm) : ''); setCiToll(booking?.pricing?.toll ? String(booking.pricing.toll) : ''); setCiDiscount(booking?.pricing?.discount ? String(booking.pricing.discount) : ''); setCiStops((booking?.stops ?? []).map((s: any) => s.placeName ?? s.location ?? '').filter(Boolean)); setCiNote('') }} style={{ fontSize: 10.5, padding: '2px 7px', background: 'transparent', border: `1px solid ${YL.line}`, borderRadius: 4, cursor: 'pointer', color: YL.ink2, fontFamily: 'inherit' }}>New instead</button>}
                        </div>
                      </div>
                    )}

                    {/* Billing */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <div>
                        {fieldLabel('Amount (₹) *')}
                        <input value={ciAmount} onChange={e => setCiAmount(e.target.value)} placeholder="0" style={inputStyle} type="number" min="0"/>
                      </div>
                      <div>
                        {fieldLabel('Customer Name')}
                        <input value={ciCustomerName} onChange={e => setCiCustomerName(e.target.value)} placeholder="Override name" style={inputStyle}/>
                      </div>
                      {booking.tripType !== 'pickup' && booking.tripType !== 'drop' && (
                        <div>
                          {fieldLabel('Toll (₹)')}
                          <input value={ciToll} onChange={e => setCiToll(e.target.value)} placeholder="0" style={inputStyle} type="number" min="0"/>
                        </div>
                      )}
                      <div>
                        {fieldLabel('Discount (₹)')}
                        <input value={ciDiscount} onChange={e => setCiDiscount(e.target.value)} placeholder="0" style={inputStyle} type="number" min="0"/>
                      </div>
                    </div>

                    {/* Route */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div>
                        {fieldLabel('Pickup Location')}
                        <PlacesInput label="" value={ciPickup} onChange={setCiPickup} onSelect={s => setCiPickup(s.description)}/>
                      </div>
                      <div>
                        {fieldLabel('Drop Location')}
                        <PlacesInput label="" value={ciDrop} onChange={setCiDrop} onSelect={s => setCiDrop(s.description)}/>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        <div>
                          {fieldLabel('Date & Time')}
                          <DateTimePicker value={ciDateTime} onChange={setCiDateTime} />
                        </div>
                        <div>
                          {fieldLabel('Distance (km)')}
                          <input value={ciDistance} onChange={e => setCiDistance(e.target.value)} placeholder="0.0" style={inputStyle} type="number" min="0" step="0.1"/>
                        </div>
                      </div>
                    </div>

                    {/* Stops */}
                    <div>
                      {fieldLabel('Stops (intermediate)')}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {ciStops.map((s, i) => (
                          <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <PlacesInput label="" value={s} onChange={v => setCiStops(prev => prev.map((x, j) => j === i ? v : x))} onSelect={sel => setCiStops(prev => prev.map((x, j) => j === i ? sel.description : x))}/>
                            </div>
                            <button onClick={() => setCiStops(prev => prev.filter((_, j) => j !== i))} style={{ height: 36, width: 32, marginTop: 1, background: YL.bg, border: `1.5px solid ${YL.line}`, borderRadius: 6, cursor: 'pointer', color: YL.ink2, fontSize: 15, fontWeight: 600, flexShrink: 0 }}>×</button>
                          </div>
                        ))}
                        <button onClick={() => setCiStops(prev => [...prev, ''])} style={{ padding: '5px 10px', background: 'transparent', border: `1.5px dashed ${YL.line}`, borderRadius: 7, cursor: 'pointer', fontSize: 11.5, color: YL.ink2, fontFamily: 'inherit', textAlign: 'left' }}>+ Add stop</button>
                      </div>
                    </div>

                    {/* Driver / Vehicle */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <div>
                        {fieldLabel('Driver Name')}
                        <input value={ciDriverName} onChange={e => setCiDriverName(e.target.value)} placeholder="Override driver" style={inputStyle}/>
                      </div>
                      <div>
                        {fieldLabel('Vehicle Number')}
                        <input value={ciVehiclePlate} onChange={e => setCiVehiclePlate(e.target.value)} placeholder="Override plate" style={inputStyle}/>
                      </div>
                    </div>

                    <div>
                      {fieldLabel('Internal Note (not printed)')}
                      <input value={ciNote} onChange={e => setCiNote(e.target.value)} placeholder="Reason for custom amount…" style={inputStyle}/>
                    </div>

                    {ciError && <div style={{ fontSize: 11.5, color: YL.redInk }}>{ciError}</div>}
                    <button
                      onClick={handleSaveCustomInvoice}
                      disabled={ciSaving}
                      style={{ padding: '8px 14px', background: ciSaving ? YL.bg : YL.ink, color: ciSaving ? YL.ink2 : YL.yellow, border: 'none', borderRadius: 8, cursor: ciSaving ? 'not-allowed' : 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: '"Bricolage Grotesque", system-ui', opacity: ciSaving ? 0.6 : 1 }}
                    >
                      {ciSaving ? 'Saving…' : ciEditingId ? 'Update & Open' : 'Generate & Open'}
                    </button>
                  </div>
                )}
              </div>
            )
          })()}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleCopyWhatsApp}
              style={{ flex: 1, padding: '10px 10px', background: copiedWA ? YL.greenSoft : '#25D366', color: copiedWA ? YL.greenInk : '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: '"Bricolage Grotesque", system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              {copiedWA ? '✓ Copied' : '📋 Customer copy'}
            </button>
            <button
              onClick={handleCopyWhatsAppDriver}
              style={{ flex: 1, padding: '10px 10px', background: copiedWADriver ? YL.greenSoft : '#128C7E', color: copiedWADriver ? YL.greenInk : '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: '"Bricolage Grotesque", system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              {copiedWADriver ? '✓ Copied' : '📋 Driver copy'}
            </button>
          </div>
          </div>
        </div>
        {saving && <div style={{ padding: '10px 24px', background: YL.yellowSoft, fontSize: 12, color: YL.ink, textAlign: 'center' }}>Saving…</div>}
        {confirmHourlyComplete && hourlyCompletePreview && (() => {
          const { actualHours, newTotal } = hourlyCompletePreview
          const startLabel = booking.pickup?.dateTime ? fmtTime(booking.pickup.dateTime) : '—'
          return (
            <div style={{ padding: '14px 24px', background: YL.yellowSoft, borderTop: `1px solid ${YL.line}` }}>
              <div style={{ fontSize: 12.5, color: YL.ink, fontWeight: 600, marginBottom: 10 }}>Complete hourly booking?</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: YL.ink2 }}>Start</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: YL.ink, fontFamily: '"JetBrains Mono", monospace' }}>{startLabel}</span>
                <span style={{ fontSize: 12, color: YL.ink3 }}>→</span>
                <span style={{ fontSize: 12, color: YL.ink2 }}>End</span>
                <input
                  type="time"
                  value={hourlyEndTimeStr}
                  onChange={e => handleHourlyEndTimeChange(e.target.value)}
                  style={{ height: 28, padding: '0 8px', borderRadius: 6, border: `1.5px solid ${YL.line}`, fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: YL.ink, background: YL.card, outline: 'none' }}
                />
                <span style={{ fontSize: 12, color: YL.ink3 }}>·</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: YL.ink }}>
                  {hourlyPreviewLoading ? '…' : `${actualHours % 1 === 0 ? actualHours : actualHours.toFixed(1)} hrs`}
                </span>
                {newTotal > 0 && !hourlyPreviewLoading && (
                  <>
                    <span style={{ fontSize: 12, color: YL.ink3 }}>→</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: YL.ink }}>₹{newTotal.toLocaleString('en-IN')}</span>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleConfirmHourlyComplete} disabled={hourlyPreviewLoading} style={{ padding: '6px 16px', background: YL.ink, color: YL.yellow, border: 'none', borderRadius: 7, cursor: hourlyPreviewLoading ? 'not-allowed' : 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', opacity: hourlyPreviewLoading ? 0.6 : 1 }}>
                  Confirm & complete
                </button>
                <button onClick={() => { setConfirmHourlyComplete(false); setHourlyCompletePreview(null) }} style={{ padding: '6px 12px', background: 'transparent', color: YL.ink2, border: `1px solid ${YL.line}`, borderRadius: 7, cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit' }}>Cancel</button>
              </div>
            </div>
          )
        })()}
        {isSuperAdmin && (confirmDelete ? (
          <div style={{ padding: '14px 24px', background: YL.redSoft, borderTop: `1px solid ${YL.line}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1, fontSize: 12.5, color: YL.redInk }}>Delete this booking permanently?</span>
            <button onClick={handleDelete} disabled={deleting} style={{ padding: '6px 14px', background: YL.gulmohar, color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit' }}>
              {deleting ? 'Deleting…' : 'Confirm'}
            </button>
            <button onClick={() => setConfirmDelete(false)} style={{ padding: '6px 12px', background: 'transparent', color: YL.ink2, border: `1px solid ${YL.line}`, borderRadius: 7, cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit' }}>Cancel</button>
          </div>
        ) : (
          <div style={{ padding: '10px 24px', borderTop: `1px solid ${YL.line}`, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setConfirmDelete(true)} style={{ padding: '6px 12px', background: 'transparent', color: YL.ink3, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', textDecoration: 'underline' }}>
              Delete booking
            </button>
          </div>
        ))}
      </div>
    </>
  )
}

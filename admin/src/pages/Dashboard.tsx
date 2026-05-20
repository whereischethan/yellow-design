import type { Booking, Driver, Stats } from '../types'
import { YL, STATUS_STYLE, Icons, Mono, Stack, Button, Card, PageHeader, StatusBadge, Avatar, fmtDate, fmtTime, fmtINR, useIsMobile } from '../components/ui'

function StatCard({ label, value, hint, accent, sparkValues }: any) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: YL.card, border: `1px solid ${YL.line}`, borderRadius: 12, padding: '18px 18px 16px', position: 'relative', overflow: 'hidden' }}>
      {accent && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent }}/>}
      <div style={{ fontSize: 12, color: YL.ink2, fontWeight: 500 }}>{label}</div>
      <div style={{ marginTop: 10, fontSize: 32, fontWeight: 600, color: YL.ink, letterSpacing: -1, lineHeight: 1 }}>{value}</div>
      {hint && <div style={{ marginTop: 10, fontSize: 11.5, color: YL.ink2 }}>{hint}</div>}
      {sparkValues && (
        <svg width="100%" height="36" style={{ display: 'block', marginTop: 12 }} preserveAspectRatio="none" viewBox="0 0 200 36">
          {(() => {
            const vals = sparkValues
            const max = Math.max(...vals), min = Math.min(...vals)
            const pts = vals.map((v: number, i: number) => `${(i / (vals.length - 1)) * 200},${36 - ((v - min) / Math.max(max - min, 1)) * 36}`).join(' ')
            return <>
              <polyline points={pts} fill="none" stroke={accent || YL.ink} strokeWidth="1.6" strokeLinejoin="round"/>
              <polyline points={`0,36 ${pts} 200,36`} fill={accent || YL.ink} opacity="0.06"/>
            </>
          })()}
        </svg>
      )}
    </div>
  )
}

function Pipeline({ bookings }: { bookings: Booking[] }) {
  const stages = [
    { id: 'pending',     label: 'Pending',     desc: 'Need confirmation' },
    { id: 'confirmed',   label: 'Confirmed',   desc: 'Awaiting driver' },
    { id: 'assigned',    label: 'Assigned',    desc: 'Driver scheduled' },
    { id: 'in_progress', label: 'In progress', desc: 'On the road' },
  ]
  const counts = stages.map(s => bookings.filter(b => b.status === s.id || (s.id === 'in_progress' && b.status === 'arrived')).length)
  const max = Math.max(...counts, 1)
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
        <Stack gap={3}>
          <div style={{ fontSize: 14, fontWeight: 600, color: YL.ink }}>Today's pipeline</div>
          <div style={{ fontSize: 12, color: YL.ink2 }}>Where every active booking sits right now</div>
        </Stack>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: YL.line, borderRadius: 10, overflow: 'hidden', border: `1px solid ${YL.line}` }}>
        {stages.map((s, i) => {
          const c = counts[i]
          const intensity = c / max
          return (
            <div key={s.id} style={{ padding: '14px 16px', background: YL.card, borderTop: `2px solid ${STATUS_STYLE[s.id].bg}` }}>
              <div style={{ fontSize: 11.5, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>{s.label}</div>
              <div style={{ marginTop: 6, fontSize: 28, fontWeight: 600, color: c === 0 ? YL.ink3 : YL.ink, lineHeight: 1 }}>{c}</div>
              <div style={{ marginTop: 8, fontSize: 11, color: YL.ink3 }}>{s.desc}</div>
              <div style={{ marginTop: 10, height: 3, background: YL.bg, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${intensity * 100}%`, height: '100%', background: STATUS_STYLE[s.id].fg, opacity: 0.5 }}/>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function UpcomingTable({ bookings, onOpen, onAssignRequest, isMobile }: { bookings: Booking[]; onOpen: (b: Booking) => void; onAssignRequest: (b: Booking) => void; isMobile: boolean }) {
  const upcoming = bookings
    .filter(b => ['pending', 'confirmed', 'assigned'].includes(b.status))
    .sort((a, b) => new Date(a.pickup?.dateTime ?? 0).getTime() - new Date(b.pickup?.dateTime ?? 0).getTime())
    .slice(0, 8)
  return (
    <Card padding={0}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px 12px' }}>
        <Stack gap={3}>
          <div style={{ fontSize: 14, fontWeight: 600, color: YL.ink }}>Upcoming rides</div>
          <div style={{ fontSize: 12, color: YL.ink2 }}>Next {upcoming.length} pickups by time</div>
        </Stack>
      </div>
      <div style={{ borderTop: `1px solid ${YL.line}` }}>
        {upcoming.length === 0 && (
          <div style={{ padding: '24px 18px', textAlign: 'center', color: YL.ink2, fontSize: 13 }}>No upcoming rides</div>
        )}
        {upcoming.map((b, i) => isMobile ? (
          <div key={b.id} onClick={() => onOpen(b)} style={{ padding: '12px 16px', borderBottom: i < upcoming.length - 1 ? `1px solid ${YL.line}` : 'none', cursor: 'pointer', background: YL.card, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Mono size={12}>{b.tripCode}</Mono>
              <StatusBadge status={b.status} size="sm"/>
              <Mono size={11.5} color={YL.ink2} style={{ marginLeft: 'auto' }}>{b.pickup?.dateTime ? fmtTime(b.pickup.dateTime) : '—'}</Mono>
            </div>
            <div style={{ fontSize: 12.5, color: YL.ink, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: b.tripType === 'pickup' ? YL.leaf : YL.gulmohar, flexShrink: 0 }}/>
              {b.tripType === 'pickup' ? `BLR ${b.pickup?.terminal} → ${b.drop?.placeName}` : `${b.pickup?.placeName} → BLR ${b.drop?.terminal}`}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Mono size={11} color={YL.ink2}>{b.pickup?.dateTime ? fmtDate(b.pickup.dateTime) : '—'}</Mono>
              {b.assignedDriver ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Avatar name={b.assignedDriver.name} size={18}/>
                  <span style={{ fontSize: 11.5, color: YL.ink2 }}>{b.assignedDriver.name.split(' ')[0]}</span>
                </div>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); onAssignRequest(b) }} style={{ height: 24, padding: '0 8px', background: YL.yellow, color: YL.ink, border: `1px solid ${YL.yellowDeep}`, borderRadius: 6, fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                  + Assign
                </button>
              )}
            </div>
          </div>
        ) : (
          <div key={b.id} onClick={() => onOpen(b)} style={{ display: 'grid', gridTemplateColumns: '92px 90px 1fr 140px 110px', gap: 14, padding: '12px 18px', borderBottom: i < upcoming.length - 1 ? `1px solid ${YL.line}` : 'none', cursor: 'pointer', alignItems: 'center', background: i % 2 === 1 ? YL.bg : YL.card, transition: 'background 100ms' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#FCF8EE')}
            onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 1 ? YL.bg : YL.card)}>
            <Mono size={12.5}>{b.tripCode}</Mono>
            <Stack gap={2}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: YL.ink }}>{b.pickup?.dateTime ? fmtDate(b.pickup.dateTime) : '—'}</div>
              <Mono size={11.5} color={YL.ink2}>{b.pickup?.dateTime ? fmtTime(b.pickup.dateTime) : '—'}</Mono>
            </Stack>
            <Stack gap={3}>
              <div style={{ fontSize: 12.5, color: YL.ink, lineHeight: 1.3, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: b.tripType === 'pickup' ? YL.leaf : YL.gulmohar, flexShrink: 0 }}/>
                {b.tripType === 'pickup' ? `BLR ${b.pickup?.terminal} → ${b.drop?.placeName}` : `${b.pickup?.placeName} → BLR ${b.drop?.terminal}`}
              </div>
              {b.flight && <Mono size={11} color={YL.ink2}>{b.flight.flightNumber} · {b.flight.airline}</Mono>}
            </Stack>
            <div>
              {b.assignedDriver ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Avatar name={b.assignedDriver.name} size={22}/>
                  <span style={{ fontSize: 12, color: YL.ink }}>{b.assignedDriver.name.split(' ')[0]}</span>
                </div>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); onAssignRequest(b) }} style={{ height: 26, padding: '0 9px', background: YL.yellow, color: YL.ink, border: `1px solid ${YL.yellowDeep}`, borderRadius: 6, fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 11.5, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 11, height: 11, display: 'flex' }}>{Icons.plus}</span>
                  Assign
                </button>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <StatusBadge status={b.status} size="sm"/>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function DriverStrip({ drivers, bookings }: { drivers: Driver[]; bookings: Booking[] }) {
  const available = drivers.filter(d => d.status === 'available').length
  const onTrip = drivers.filter(d => d.status === 'on-trip').length
  const offline = drivers.filter(d => d.status === 'offline').length

  const earningsByDriver: Record<string, number> = {}
  for (const b of bookings) {
    if (b.status === 'completed' && b.assignedDriver?.id) {
      earningsByDriver[b.assignedDriver.id] = (earningsByDriver[b.assignedDriver.id] ?? 0) + (b.pricing?.totalPrice ?? 0)
    }
  }

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <Stack gap={3}>
          <div style={{ fontSize: 14, fontWeight: 600, color: YL.ink }}>Driver pool</div>
          <div style={{ fontSize: 12, color: YL.ink2 }}>{drivers.length} drivers · {available} available now</div>
        </Stack>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: available, background: YL.greenSoft, height: 6, borderRadius: 2 }}/>
        <div style={{ flex: onTrip, background: YL.yellow, height: 6, borderRadius: 2 }}/>
        <div style={{ flex: offline, background: YL.line, height: 6, borderRadius: 2 }}/>
      </div>
      <Stack gap={10}>
        {drivers.slice(0, 5).map(d => {
          const cur = bookings.find(b => (b.assignedDriver as any)?.id === d.id && ['in_progress', 'arrived', 'assigned'].includes(b.status))
          const dotColor = d.status === 'available' ? YL.leaf : d.status === 'on-trip' ? YL.yellowDeep : YL.ink3
          const earned = earningsByDriver[d.id] ?? 0
          return (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <Avatar name={d.name} size={28}/>
              <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: YL.ink, fontWeight: 500 }}>{d.name}</div>
                <div style={{ fontSize: 11, color: YL.ink2, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: dotColor }}/>
                  {d.status === 'available' && 'Available'}
                  {d.status === 'on-trip' && (cur ? `On ${cur.tripCode}` : 'On trip')}
                  {d.status === 'offline' && 'Offline'}
                </div>
              </Stack>
              <Stack gap={1} style={{ alignItems: 'flex-end' }}>
                <Mono size={11} color={YL.ink2}>{d.trips} rides</Mono>
                {earned > 0 && <Mono size={10} color={YL.ink3}>₹{earned.toLocaleString('en-IN')}</Mono>}
              </Stack>
            </div>
          )
        })}
      </Stack>
    </Card>
  )
}

interface Props {
  bookings: Booking[]
  drivers: Driver[]
  stats: Stats | null
  adminName?: string | null
  onOpen: (b: Booking) => void
  onAssignRequest: (b: Booking) => void
  onNewBooking: () => void
}

export default function Dashboard({ bookings, drivers, stats, adminName, onOpen, onAssignRequest, onNewBooking }: Props) {
  const isMobile = useIsMobile()
  const todayBookings = bookings.filter(b => b.pickup?.dateTime && fmtDate(b.pickup.dateTime) === 'Today')

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = adminName ? adminName.split(' ')[0] : null

  const pad = isMobile ? '14px 16px 24px' : '20px 28px 32px'

  return (
    <div style={{ flex: 1, overflow: 'auto', background: YL.bg }}>
      <PageHeader
        title={firstName ? `${greeting}, ${firstName}` : greeting}
        subtitle={stats ? `${stats.ridesToday} rides today · ${stats.nextTwoHours} in the next 2 hours${(stats as any).openLeads ? ` · ${(stats as any).openLeads} open leads` : ''}` : 'Loading…'}
        actions={<Button variant="primary" onClick={onNewBooking} icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.plus}</span>}>New booking</Button>}
      />
      <div style={{ padding: pad }}>
        {isMobile ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
            <StatCard label="Rides today" value={stats?.ridesToday ?? '…'} accent={YL.yellow} hint="Confirmed + active"/>
            <StatCard label="Revenue" value={stats ? fmtINR(stats.revenueToday) : '…'} accent={YL.leaf}/>
            <StatCard label="Drivers active" value={stats ? `${stats.driversActive}/${drivers.length}` : '…'} accent={YL.gulmohar} hint={`${drivers.filter(d => d.status === 'available').length} available`}/>
            <StatCard label="Next 2 hours" value={stats?.nextTwoHours ?? '…'} accent={YL.ink} hint={`${stats?.pendingCount ?? 0} need confirmation`}/>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
            <StatCard label="Rides today" value={stats?.ridesToday ?? '…'} accent={YL.yellow} hint="Confirmed + active"/>
            <StatCard label="Revenue today" value={stats ? fmtINR(stats.revenueToday) : '…'} accent={YL.leaf} hint="From non-cancelled rides"/>
            <StatCard label="Drivers active" value={stats ? `${stats.driversActive}/${drivers.length}` : '…'} accent={YL.gulmohar} hint={`${drivers.filter(d => d.status === 'available').length} available`}/>
            <StatCard label="Next 2 hours" value={stats?.nextTwoHours ?? '…'} accent={YL.ink} hint={`${stats?.pendingCount ?? 0} need confirmation`}/>
          </div>
        )}

        <div style={{ marginBottom: isMobile ? 14 : 18 }}>
          <Pipeline bookings={[...todayBookings, ...bookings.filter(b => b.pickup?.dateTime && fmtDate(b.pickup.dateTime) === 'Tomorrow')]}/>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: 16 }}>
          <UpcomingTable bookings={bookings} onOpen={onOpen} onAssignRequest={onAssignRequest} isMobile={isMobile}/>
          {!isMobile && <DriverStrip drivers={drivers} bookings={bookings}/>}
        </div>
        {isMobile && (
          <div style={{ marginTop: 16 }}>
            <DriverStrip drivers={drivers} bookings={bookings}/>
          </div>
        )}
      </div>
    </div>
  )
}

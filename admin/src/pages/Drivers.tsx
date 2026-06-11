import React from 'react'
import type { Driver } from '../types'
import { patchDriver, getDriverBookings, impersonate, DRIVER_APP_URL } from '../api'
import type { Booking } from '../types'
import { YL, Icons, Mono, Stack, Button, Chip, PageHeader, Avatar, fmtDate, formatPhone, useIsMobile, ModalShell, ModalHeader } from '../components/ui'

interface Props {
  drivers: Driver[]
  onUpdate: (d: Driver) => void
  onAddDriver: () => void
  onAddVehicle: () => void
}

function DocImage({ label, value }: { label: string; value?: string | null }) {
  if (!value) return (
    <div style={{ padding: '12px 14px', background: YL.bg, border: `1px dashed ${YL.line}`, borderRadius: 8, fontSize: 12, color: YL.ink3, fontStyle: 'italic' }}>
      {label} — not uploaded
    </div>
  )
  const isPdf = value.startsWith('data:application/pdf')
  return (
    <div>
      <div style={{ fontSize: 11, color: YL.ink2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>{label}</div>
      {isPdf ? (
        <a href={value} download={`${label}.pdf`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: YL.bg, border: `1px solid ${YL.line}`, borderRadius: 8, fontSize: 12.5, color: YL.ink, textDecoration: 'none', fontWeight: 500 }}>
          <span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.content}</span>
          Download PDF
        </a>
      ) : (
        <img src={value} alt={label} style={{ width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 8, border: `1px solid ${YL.line}`, background: YL.bg }} />
      )}
    </div>
  )
}

function DriverDrawer({ driver, onClose, onUpdate }: { driver: Driver | null; onClose: () => void; onUpdate: (d: Driver) => void }) {
  const [tab, setTab] = React.useState<'details' | 'trips'>('details')
  const [trips, setTrips] = React.useState<Booking[]>([])
  const [tripsLoading, setTripsLoading] = React.useState(false)
  const [completedCount, setCompletedCount] = React.useState<number | null>(null)
  const [totalEarnings, setTotalEarnings] = React.useState<number | null>(null)
  const [opening, setOpening] = React.useState(false)

  React.useEffect(() => {
    if (!driver) return
    setTab('details'); setTrips([]); setCompletedCount(null); setTotalEarnings(null)
  }, [driver?.id])

  const loadTrips = async () => {
    if (!driver || trips.length > 0) return
    setTripsLoading(true)
    try {
      const r = await getDriverBookings(driver.id)
      setTrips(r.bookings)
      setCompletedCount(r.completedCount)
      setTotalEarnings(r.totalEarnings)
    } finally {
      setTripsLoading(false)
    }
  }

  if (!driver) return null

  const cycleStatus = async () => {
    const next: Record<string, Driver['status']> = { available: 'offline', 'on-trip': 'available', offline: 'available' }
    const res = await patchDriver(driver.id, { status: next[driver.status] })
    onUpdate(res.driver)
  }
  const handleViewAs = async () => {
    setOpening(true)
    try {
      const r: any = await impersonate('driver', driver.id)
      window.open(`${DRIVER_APP_URL}/?impersonate=${encodeURIComponent(r.token)}`, '_blank')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setOpening(false)
    }
  }
  const statusColor = driver.status === 'available' ? YL.greenInk : driver.status === 'on-trip' ? YL.ink : YL.ink3
  const statusLabel = driver.status === 'available' ? 'Available' : driver.status === 'on-trip' ? 'On trip' : 'Offline'

  return (
    <ModalShell open={true} onClose={onClose} width={560}>
      <ModalHeader title={driver.name} subtitle={`Joined ${fmtDate(driver.joined)}`} onClose={onClose} />

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${YL.line}`, background: YL.bg }}>
        {(['details', 'trips'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); if (t === 'trips') loadTrips() }}
            style={{ padding: '10px 20px', background: 'transparent', border: 'none', borderBottom: tab === t ? `2px solid ${YL.ink}` : '2px solid transparent', fontSize: 12.5, fontWeight: tab === t ? 700 : 500, color: tab === t ? YL.ink : YL.ink2, cursor: 'pointer', textTransform: 'capitalize' }}>
            {t === 'trips' ? `Trips (${completedCount ?? driver.trips})` : 'Details'}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {tab === 'details' && (
          <Stack gap={24}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {driver.photoUrl
                ? <img src={driver.photoUrl} alt={driver.name} style={{ width: 64, height: 64, borderRadius: 999, objectFit: 'cover', border: `2px solid ${YL.line}` }} />
                : <Avatar name={driver.name} size={64} />
              }
              <Stack gap={6}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', background: YL.bg, border: `1px solid ${YL.line}`, borderRadius: 20, width: 'fit-content' }}>
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: statusColor, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <Button size="sm" variant="ghost" onClick={cycleStatus}>
                    {driver.status === 'offline' ? 'Set active' : driver.status === 'on-trip' ? 'Mark available' : 'Set offline'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleViewAs} disabled={opening} title="Open the driver app signed in as this driver (1h session)">
                    {opening ? 'Opening…' : '👤 View as driver'}
                  </Button>
                </div>
              </Stack>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                ['Phone', formatPhone(driver.phone)],
                ['Vehicle', driver.vehicle || '—'],
                ['Plate', driver.plate || '—'],
                ['License no.', driver.licenseNo || '—'],
                ['License expiry', driver.licenseExp || '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 10.5, color: YL.ink3, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginBottom: 3 }}>{label}</div>
                  <Mono size={12.5}>{value}</Mono>
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: YL.ink, marginBottom: 14 }}>Documents</div>
              <Stack gap={12}>
                <DocImage label="Driving license" value={driver.docLicense} />
                <DocImage label="Aadhaar card" value={driver.docAadhaar} />
                <DocImage label="PAN card" value={driver.docPan} />
                <DocImage label="Police verification" value={driver.docPolice} />
              </Stack>
            </div>
          </Stack>
        )}

        {tab === 'trips' && (
          <Stack gap={0}>
            {!tripsLoading && totalEarnings !== null && (
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, padding: '12px 16px', background: YL.yellowSoft, borderRadius: 10, border: `1px solid ${YL.yellowDeep}` }}>
                <div>
                  <div style={{ fontSize: 10.5, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginBottom: 2 }}>Completed trips</div>
                  <Mono size={18} weight={700}>{completedCount}</Mono>
                </div>
                <div style={{ width: 1, background: YL.yellowDeep }} />
                <div>
                  <div style={{ fontSize: 10.5, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginBottom: 2 }}>Total earnings</div>
                  <Mono size={18} weight={700}>₹{totalEarnings.toLocaleString('en-IN')}</Mono>
                </div>
              </div>
            )}
            {tripsLoading && <div style={{ padding: '40px 0', textAlign: 'center', color: YL.ink2, fontSize: 13 }}>Loading…</div>}
            {!tripsLoading && trips.length === 0 && <div style={{ padding: '40px 0', textAlign: 'center', color: YL.ink3, fontSize: 13 }}>No trips yet.</div>}
            {trips.map(b => (
              <div key={b.id} style={{ padding: '14px 0', borderBottom: `1px solid ${YL.line}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <Stack gap={3}>
                    <Mono size={12} weight={600}>{b.tripCode}</Mono>
                    <div style={{ fontSize: 11.5, color: YL.ink2 }}>{b.pickup?.location ?? '—'}</div>
                    {b.drop?.location && <div style={{ fontSize: 11, color: YL.ink3 }}>→ {b.drop.location}</div>}
                  </Stack>
                  <Stack gap={4} style={{ alignItems: 'flex-end' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: b.status === 'completed' ? YL.greenSoft : b.status === 'cancelled' ? YL.redSoft : YL.yellowSoft, color: b.status === 'completed' ? YL.greenInk : b.status === 'cancelled' ? YL.redInk : YL.ink }}>
                      {b.status}
                    </span>
                    {b.pricing?.totalPrice != null && <Mono size={11.5} weight={600}>₹{b.pricing.totalPrice}</Mono>}
                  </Stack>
                </div>
                {b.pickup?.dateTime && <Mono size={10.5} color={YL.ink3}>{fmtDate(b.pickup.dateTime)}</Mono>}
              </div>
            ))}
          </Stack>
        )}
      </div>
    </ModalShell>
  )
}

export default function DriversPage({ drivers, onUpdate, onAddDriver, onAddVehicle }: Props) {
  const isMobile = useIsMobile()
  const [filter, setFilter] = React.useState<'all' | 'available' | 'on-trip' | 'offline'>('all')
  const [selected, setSelected] = React.useState<Driver | null>(null)
  const filtered = filter === 'all' ? drivers : drivers.filter(d => d.status === filter)
  const counts = {
    all: drivers.length,
    available: drivers.filter(d => d.status === 'available').length,
    'on-trip': drivers.filter(d => d.status === 'on-trip').length,
    offline: drivers.filter(d => d.status === 'offline').length,
  }

  const handleUpdate = (d: Driver) => {
    onUpdate(d)
    setSelected(d)
  }

  const statusDot = (status: string) => (
    <span style={{ width: 7, height: 7, borderRadius: 999, background: status === 'available' ? YL.leaf : status === 'on-trip' ? YL.yellowDeep : YL.ink3, flexShrink: 0 }} />
  )

  return (
    <div style={{ flex: 1, overflow: 'auto', background: YL.bg, display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="Drivers" subtitle={`${drivers.length} drivers · ${counts.available} available now`}
        actions={<>
          {!isMobile && <Button variant="secondary" onClick={onAddVehicle} icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.plus}</span>}>Add vehicle</Button>}
          <Button variant="primary" onClick={onAddDriver} icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.plus}</span>}>{isMobile ? 'Add' : 'Add driver'}</Button>
        </>}
      />

      <div style={{ padding: isMobile ? '10px 16px' : '14px 28px', background: YL.bg, borderBottom: `1px solid ${YL.line}`, display: 'flex', gap: 6, overflowX: 'auto' }}>
        {([['all', 'All'], ['available', 'Available'], ['on-trip', 'On trip'], ['offline', 'Offline']] as const).map(([k, l]) => (
          <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>
            {k !== 'all' && statusDot(k)}
            {l} <Mono size={11} color={filter === k ? YL.yellow : YL.ink2}>{counts[k]}</Mono>
          </Chip>
        ))}
      </div>

      {!isMobile && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 130px 140px 1fr 100px', gap: 16, padding: '10px 28px', background: YL.bg, borderBottom: `1px solid ${YL.line}`, fontSize: 11, color: YL.ink2, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>
          <div>Driver</div><div>Status</div><div>Phone</div><div>Vehicle</div><div style={{ textAlign: 'right' }}>Trips</div>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ padding: '60px 28px', textAlign: 'center' }}>
            <Stack gap={12} align="center">
              <div style={{ color: YL.ink2, fontSize: 13 }}>No drivers yet.</div>
              <Button variant="primary" onClick={onAddDriver} icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.plus}</span>}>
                Add your first driver
              </Button>
            </Stack>
          </div>
        )}

        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {filtered.map(d => (
              <div key={d.id} onClick={() => setSelected(d)} style={{ padding: '14px 16px', borderBottom: `1px solid ${YL.line}`, background: YL.card, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  {d.photoUrl
                    ? <img src={d.photoUrl} alt={d.name} style={{ width: 36, height: 36, borderRadius: 999, objectFit: 'cover', flexShrink: 0 }} />
                    : <Avatar name={d.name} size={36} />
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: YL.ink, fontWeight: 600 }}>{d.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                      {statusDot(d.status)}
                      <span style={{ fontSize: 11.5, color: d.status === 'available' ? YL.greenInk : d.status === 'on-trip' ? YL.ink : YL.ink3 }}>
                        {d.status === 'available' ? 'Available' : d.status === 'on-trip' ? 'On trip' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  <Mono size={12} color={YL.ink3}>{d.trips} trips</Mono>
                </div>
              </div>
            ))}
          </div>
        ) : (
          filtered.map(d => (
            <div key={d.id} onClick={() => setSelected(d)} style={{ display: 'grid', gridTemplateColumns: '1.5fr 130px 140px 1fr 100px', gap: 16, padding: '14px 28px', alignItems: 'center', borderBottom: `1px solid ${YL.line}`, background: YL.card, cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = YL.bg)}
              onMouseLeave={e => (e.currentTarget.style.background = YL.card)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                {d.photoUrl
                  ? <img src={d.photoUrl} alt={d.name} style={{ width: 32, height: 32, borderRadius: 999, objectFit: 'cover', flexShrink: 0 }} />
                  : <Avatar name={d.name} size={32} />
                }
                <Stack gap={2}>
                  <div style={{ fontSize: 13, color: YL.ink, fontWeight: 500 }}>{d.name}</div>
                  {d.joined && <Mono size={10.5} color={YL.ink2}>Joined {fmtDate(d.joined)}</Mono>}
                </Stack>
              </div>
              <div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 500, color: d.status === 'available' ? YL.greenInk : d.status === 'on-trip' ? YL.ink : YL.ink3 }}>
                  {statusDot(d.status)}
                  {d.status === 'available' ? 'Available' : d.status === 'on-trip' ? 'On trip' : 'Offline'}
                </span>
              </div>
              <Mono size={11.5}>{formatPhone(d.phone)}</Mono>
              <Stack gap={2}>
                {d.plate && <Mono size={11.5}>{d.plate}</Mono>}
                {d.vehicle && <span style={{ fontSize: 11, color: YL.ink2 }}>{d.vehicle}</span>}
                {!d.plate && !d.vehicle && <span style={{ fontSize: 11, color: YL.ink3, fontStyle: 'italic' }}>No vehicle</span>}
              </Stack>
              <Mono size={12.5} weight={500} style={{ textAlign: 'right' }}>{d.trips}</Mono>
            </div>
          ))
        )}
      </div>

      <DriverDrawer
        driver={selected}
        onClose={() => setSelected(null)}
        onUpdate={handleUpdate}
      />
    </div>
  )
}

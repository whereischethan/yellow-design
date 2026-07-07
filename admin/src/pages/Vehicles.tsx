import React from 'react'
import type { Vehicle, Driver } from '../types'
import { patchVehicle, syncVehicleTrips } from '../api'
import { YL, Icons, Mono, Stack, Button, Chip, Card, PageHeader, Avatar, fmtDate, useIsMobile, DatePicker, Input, formatPhone } from '../components/ui'


function VehicleStatusPill({ status, note }: { status: string; note?: string | null }) {
  const styles: Record<string, { bg: string; fg: string; dot: string; label: string }> = {
    'on-trip':     { bg: '#fbeec0', fg: '#7a5d18',     dot: YL.yellowDeep, label: 'On trip' },
    'available':   { bg: YL.greenSoft, fg: YL.greenInk, dot: YL.leaf,     label: 'Available' },
    'assigned':    { bg: YL.yellowSoft, fg: YL.ink,     dot: YL.yellowDeep, label: 'Assigned' },
    'maintenance': { bg: YL.redSoft, fg: YL.redInk,     dot: YL.gulmohar, label: 'In service' },
    'offline':     { bg: YL.line,    fg: YL.ink2,       dot: YL.ink3,     label: 'Offline' },
  }
  const s = styles[status] ?? styles.available
  return (
    <Stack gap={3}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 500, color: s.fg }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: s.dot }}/>
        {s.label}
      </span>
      {note && <div style={{ fontSize: 10.5, color: YL.ink3 }}>{note}</div>}
    </Stack>
  )
}

function DocExpiry({ date, label }: { date: string | null; label: string }) {
  if (!date) return <span style={{ fontSize: 11.5, color: YL.ink3 }}>—</span>
  const today = new Date()
  const d = new Date(date)
  const days = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const danger = days < 30
  const warn = days < 90
  return (
    <Stack gap={1}>
      <Mono size={11} color={YL.ink3}>{label}</Mono>
      <Mono size={11.5} color={danger ? YL.gulmohar : warn ? '#7a5d18' : YL.ink}>{fmtDate(date)}</Mono>
      {danger && <span style={{ fontSize: 10, color: YL.gulmohar, fontWeight: 600 }}>in {days}d</span>}
      {warn && !danger && <span style={{ fontSize: 10, color: '#7a5d18' }}>in {days}d</span>}
    </Stack>
  )
}

interface DrawerProps {
  vehicle: Vehicle | null
  drivers: Driver[]
  onClose: () => void
  onUpdate: (v: Vehicle) => void
  isMobile: boolean
}

function EvBadge() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: YL.greenInk, background: YL.greenSoft, border: `1px solid ${YL.leaf}`, borderRadius: 4, padding: '1px 5px', letterSpacing: 0.3 }}>
      EV
    </span>
  )
}

function VehicleDrawer({ vehicle, drivers, onClose, onUpdate, isMobile }: DrawerProps) {
  const [status, setStatus] = React.useState(vehicle?.status ?? 'available')
  const [note, setNote] = React.useState(vehicle?.maintenance_note ?? '')
  const [insuranceExpiry, setInsuranceExpiry] = React.useState(vehicle?.insurance_expiry ?? '')
  const [fcExpiry, setFcExpiry] = React.useState(vehicle?.fc_expiry ?? '')
  const [driverId, setDriverId] = React.useState<string | null>(vehicle?.driver_id ?? null)
  const [driverQ, setDriverQ] = React.useState('')
  const [driverPickerOpen, setDriverPickerOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [editMode, setEditMode] = React.useState(false)
  const [eMake, setEMake] = React.useState('')
  const [eModel, setEModel] = React.useState('')
  const [eYear, setEYear] = React.useState('')
  const [eColor, setEColor] = React.useState('')
  const [eClass, setEClass] = React.useState('')
  const [eIsEv, setEIsEv] = React.useState(false)

  React.useEffect(() => {
    if (vehicle) {
      setStatus(vehicle.status)
      setNote(vehicle.maintenance_note ?? '')
      setInsuranceExpiry(vehicle.insurance_expiry ?? '')
      setFcExpiry(vehicle.fc_expiry ?? '')
      setDriverId(vehicle.driver_id ?? null)
      setDriverPickerOpen(false)
      setEditMode(false)
    }
  }, [vehicle])

  if (!vehicle) return null

  const openEdit = () => {
    setEMake(vehicle.make)
    setEModel(vehicle.model)
    setEYear(String(vehicle.year))
    setEColor(vehicle.color)
    setEClass(vehicle.class_key)
    setEIsEv(Boolean(vehicle.is_ev))
    setEditMode(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      const body: any = {
        status,
        maintenance_note: note || null,
        insurance_expiry: insuranceExpiry || null,
        fc_expiry: fcExpiry || null,
        driver_id: driverId ?? null,
      }
      if (editMode) {
        body.make = eMake.trim()
        body.model = eModel.trim()
        body.year = Number(eYear)
        body.color = eColor.trim()
        body.class_key = eClass
        body.is_ev = eIsEv ? 1 : 0
      }
      const res = await patchVehicle(vehicle.id, body)
      onUpdate(res.vehicle)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const selectedDriver = drivers.find(d => d.id === driverId) ?? null
  const filteredDrivers = drivers.filter(d => d.name.toLowerCase().includes(driverQ.toLowerCase()) || d.phone.includes(driverQ))

  const statusOptions = [
    { key: 'available',   bg: YL.greenSoft,  fg: YL.greenInk, label: 'Available' },
    { key: 'maintenance', bg: YL.redSoft,    fg: YL.redInk,   label: 'In service' },
    { key: 'offline',     bg: YL.line,       fg: YL.ink2,     label: 'Offline' },
  ]

  const drawerStyle: React.CSSProperties = isMobile
    ? { position: 'fixed', left: 0, right: 0, bottom: 60, top: 0, background: YL.card, zIndex: 200, display: 'flex', flexDirection: 'column', animation: 'yl-slide-up 200ms ease' }
    : { position: 'absolute', top: 0, right: 0, bottom: 0, width: 420, background: YL.card, boxShadow: '-12px 0 40px rgba(43,39,32,0.18)', zIndex: 51, display: 'flex', flexDirection: 'column' }

  return (
    <>
      <div onClick={onClose} style={{ position: isMobile ? 'fixed' : 'absolute', inset: 0, background: 'rgba(43,39,32,0.4)', zIndex: isMobile ? 199 : 50 }}/>
      <div style={drawerStyle}>
        <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${YL.line}`, display: 'flex', alignItems: 'center', gap: 12, background: YL.bg }}>
          <Stack gap={4} style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Mono size={15} weight={600}>{vehicle.plate}</Mono>
              {Boolean(vehicle.is_ev) && <EvBadge />}
            </div>
            <div style={{ fontSize: 13, color: YL.ink2 }}>{vehicle.make} {vehicle.model} · {vehicle.color} · {vehicle.year}</div>
          </Stack>
          <Button size="sm" variant="ghost" onClick={openEdit}>Edit</Button>
          <button onClick={onClose} style={{ width: 30, height: 30, background: 'transparent', border: `1px solid ${YL.line}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: YL.ink }}>
            <span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.close}</span>
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          <Stack gap={16}>
            <Card>
              <div style={{ fontSize: 11, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500, marginBottom: 12 }}>Vehicle details</div>
              {editMode ? (
                <Stack gap={10}>
                  {([['Make', eMake, setEMake], ['Model', eModel, setEModel], ['Year', eYear, setEYear], ['Color', eColor, setEColor]] as [string, string, (v: string) => void][]).map(([l, v, s]) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 12.5, color: YL.ink2, flexShrink: 0 }}>{l}</span>
                      <Input value={v} onChange={(e: any) => s(e.target.value)} style={{ height: 30, fontSize: 12.5, textAlign: 'right', width: 160 }}/>
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12.5, color: YL.ink2 }}>Electric vehicle (EV)</span>
                    <button onClick={() => setEIsEv(p => !p)} style={{ width: 40, height: 22, borderRadius: 11, background: eIsEv ? YL.greenInk : YL.line, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 150ms' }}>
                      <span style={{ position: 'absolute', top: 3, left: eIsEv ? 20 : 3, width: 16, height: 16, borderRadius: 999, background: '#fff', transition: 'left 150ms' }}/>
                    </button>
                  </div>
                </Stack>
              ) : (
                <Stack gap={10}>
                  {([['Make', vehicle.make], ['Model', vehicle.model], ['Year', String(vehicle.year)], ['Plate', vehicle.plate], ['Color', vehicle.color], ['Class', vehicle.class_key], ['EV', vehicle.is_ev ? 'Yes' : 'No'], ['Trips', String(vehicle.trips)]]).map(([l, v]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12.5, color: YL.ink2 }}>{l}</span>
                      <Mono size={12.5}>{v}</Mono>
                    </div>
                  ))}
                </Stack>
              )}
            </Card>

            <Card>
              <div style={{ fontSize: 11, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500, marginBottom: 12 }}>Assigned driver</div>
              {selectedDriver ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <Avatar name={selectedDriver.name} size={36}/>
                  <Stack gap={2} style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: YL.ink }}>{selectedDriver.name}</div>
                    <Mono size={11} color={YL.ink2}>{formatPhone(selectedDriver.phone)}</Mono>
                    <span style={{ fontSize: 11, color: selectedDriver.status === 'available' ? YL.greenInk : YL.ink2 }}>{selectedDriver.status}</span>
                  </Stack>
                  <Button size="sm" variant="ghost" onClick={() => { setDriverId(null); setDriverPickerOpen(false) }}>Remove</Button>
                </div>
              ) : driverPickerOpen ? (
                <div>
                  <Input value={driverQ} onChange={(e: any) => setDriverQ(e.target.value)} placeholder="Search drivers…" style={{ height: 32, marginBottom: 8 }}/>
                  <div style={{ maxHeight: 200, overflow: 'auto', border: `1px solid ${YL.line}`, borderRadius: 8 }}>
                    {filteredDrivers.map(d => (
                      <button key={d.id} onClick={() => { setDriverId(d.id); setDriverPickerOpen(false); setDriverQ('') }} style={{ width: '100%', padding: '9px 12px', background: 'transparent', border: 'none', borderBottom: `1px solid ${YL.line}`, display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', textAlign: 'left' }}>
                        <Avatar name={d.name} size={26}/>
                        <Stack gap={1} style={{ flex: 1 }}>
                          <span style={{ fontSize: 12.5, color: YL.ink, fontWeight: 500 }}>{d.name}</span>
                          <span style={{ fontSize: 11, color: d.status === 'available' ? YL.greenInk : YL.ink2 }}>{d.status}</span>
                        </Stack>
                      </button>
                    ))}
                    {filteredDrivers.length === 0 && <div style={{ padding: 12, fontSize: 12, color: YL.ink3, textAlign: 'center' }}>No drivers found</div>}
                  </div>
                  <button onClick={() => setDriverPickerOpen(false)} style={{ marginTop: 6, fontSize: 12, color: YL.ink3, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                </div>
              ) : (
                <button onClick={() => setDriverPickerOpen(true)} style={{ width: '100%', padding: '10px 12px', background: YL.bg, border: `1.5px dashed ${YL.line}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, color: YL.ink2, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.plus}</span>
                  Assign driver
                </button>
              )}
            </Card>

            <Card>
              <div style={{ fontSize: 11, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500, marginBottom: 12 }}>Documents</div>
              <Stack gap={10}>
                <DatePicker label="Insurance expiry" value={insuranceExpiry} onChange={setInsuranceExpiry} placeholder="Not set"/>
                <DatePicker label="FC expiry" value={fcExpiry} onChange={setFcExpiry} placeholder="Not set"/>
              </Stack>
            </Card>

            <Card>
              <div style={{ fontSize: 11, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500, marginBottom: 12 }}>Status</div>
              <Stack gap={8}>
                {statusOptions.map(s => (
                  <button key={s.key} onClick={() => setStatus(s.key as Vehicle['status'])} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                    background: status === s.key ? s.bg : YL.bg,
                    border: `1.5px solid ${status === s.key ? s.fg : YL.line}`,
                    borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: s.fg, flexShrink: 0 }}/>
                    <span style={{ fontSize: 13, color: YL.ink, fontWeight: status === s.key ? 600 : 400, fontFamily: '"Bricolage Grotesque", system-ui' }}>{s.label}</span>
                  </button>
                ))}
              </Stack>
              {status === 'maintenance' && (
                <div style={{ marginTop: 10 }}>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Maintenance note (e.g. tyre change, AC service)"
                    rows={2}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: `1px solid ${YL.line}`, borderRadius: 7, fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 12.5, color: YL.ink, outline: 'none', resize: 'vertical', background: YL.bg }}
                  />
                </div>
              )}
            </Card>
          </Stack>
        </div>

        <div style={{ padding: '14px 24px', borderTop: `1px solid ${YL.line}`, display: 'flex', gap: 8 }}>
          <Button variant="primary" onClick={save} disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          {editMode && <Button variant="ghost" onClick={() => setEditMode(false)}>Cancel edit</Button>}
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    </>
  )
}

interface Props {
  vehicles: Vehicle[]
  drivers: Driver[]
  onUpdate: (v: Vehicle) => void
  onAddVehicle: () => void
  onVehiclesRefresh?: () => void
}

export default function VehiclesPage({ vehicles, drivers, onUpdate, onAddVehicle, onVehiclesRefresh }: Props) {
  const isMobile = useIsMobile()
  const [filter, setFilter] = React.useState<string>('all')
  const [selected, setSelected] = React.useState<Vehicle | null>(null)
  const [syncing, setSyncing] = React.useState(false)

  React.useEffect(() => {
    syncVehicleTrips().then(() => onVehiclesRefresh?.()).catch(() => {})
  }, [])

  const counts: Record<string, number> = {
    all: vehicles.length,
    available: vehicles.filter(v => v.status === 'available').length,
    'on-trip': vehicles.filter(v => v.status === 'on-trip' || v.status === 'assigned').length,
    maintenance: vehicles.filter(v => v.status === 'maintenance').length,
    offline: vehicles.filter(v => v.status === 'offline').length,
  }

  const filtered = vehicles.filter(v => {
    if (filter !== 'all') {
      if (filter === 'on-trip' && !(v.status === 'on-trip' || v.status === 'assigned')) return false
      if (filter !== 'on-trip' && v.status !== filter) return false
    }
    return true
  })

  const fleetSize = vehicles.length
  const onTripCount = counts['on-trip']
  const utilizationPct = fleetSize > 0 ? Math.round((onTripCount / fleetSize) * 100) : 0

  const today = new Date()
  const ninetyDays = new Date(today.getTime() + 90 * 24 * 3600000)

  const docsExpiring = vehicles.filter(v => {
    const insExp = v.insurance_expiry ? new Date(v.insurance_expiry) : null
    const fcExp = v.fc_expiry ? new Date(v.fc_expiry) : null
    return (insExp && insExp <= ninetyDays && insExp >= today) ||
           (fcExp && fcExp <= ninetyDays && fcExp >= today)
  }).length

  return (
    <div style={{ flex: 1, overflow: 'auto', background: YL.bg, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <PageHeader
        title="Vehicles"
        subtitle={`${fleetSize} cars · ${onTripCount} on trip · ${counts.available} available`}
        actions={<>
          {!isMobile && (
            <Button variant="secondary" onClick={async () => { setSyncing(true); try { await syncVehicleTrips(); onVehiclesRefresh?.() } catch {} finally { setSyncing(false) } }} disabled={syncing}>
              {syncing ? 'Syncing…' : 'Sync trip counts'}
            </Button>
          )}
          <Button variant="primary" onClick={onAddVehicle} icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.plus}</span>}>{isMobile ? 'Add' : 'Add vehicle'}</Button>
        </>}
      />

      {/* Fleet stats */}
      <div style={{ padding: isMobile ? '14px 16px 6px' : '18px 28px 6px', display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: isMobile ? 10 : 14 }}>
        {[
          { label: 'Fleet size', value: String(fleetSize), hint: 'all vehicles' },
          { label: 'Utilization', value: `${utilizationPct}%`, hint: `${onTripCount} active`, accent: YL.yellowDeep },
          { label: 'Docs expiring', value: String(docsExpiring), hint: 'next 90 days', accent: docsExpiring > 0 ? YL.gulmohar : YL.leaf },
        ].map(s => (
          <div key={s.label} style={{ background: YL.card, border: `1px solid ${YL.line}`, borderRadius: 10, padding: isMobile ? '12px 14px' : '14px 16px', position: 'relative', overflow: 'hidden' }}>
            {s.accent && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: s.accent }}/>}
            <div style={{ fontSize: 11, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{s.label}</div>
            <div style={{ marginTop: 6, fontSize: isMobile ? 22 : 26, fontWeight: 600, color: YL.ink, letterSpacing: -0.5, lineHeight: 1, fontFamily: '"Bricolage Grotesque", system-ui' }}>{s.value}</div>
            <div style={{ marginTop: 6, fontSize: 11, color: YL.ink3 }}>{s.hint}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ padding: isMobile ? '10px 16px' : '14px 28px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: `1px solid ${YL.line}`, marginTop: 12, flexWrap: 'wrap', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {([['all', 'All'], ['available', 'Available'], ['on-trip', 'On trip'], ['maintenance', 'In service'], ['offline', 'Offline']] as const).map(([k, l]) => (
            <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>
              {l} <Mono size={11} color={filter === k ? YL.yellow : YL.ink2}>{counts[k]}</Mono>
            </Chip>
          ))}
        </div>
      </div>

      {!isMobile && (
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 120px 180px 200px 28px', gap: 16, padding: '10px 28px', background: YL.bg, borderBottom: `1px solid ${YL.line}`, fontSize: 11, color: YL.ink2, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>
          <div>Plate</div><div>Vehicle</div><div>Status</div><div>Driver</div><div>Documents</div><div/>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ padding: '60px 28px', textAlign: 'center', color: YL.ink2, fontSize: 13 }}>No vehicles in this view.</div>
        )}

        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map(v => (
              <div key={v.id} onClick={() => setSelected(v)} style={{ padding: '14px 16px', borderBottom: `1px solid ${YL.line}`, background: YL.card, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 8 }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: v.class_key === 'yellowSky' ? YL.yellow : YL.greenSoft,
                    border: `1px solid ${v.class_key === 'yellowSky' ? YL.yellowDeep : YL.leaf}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: YL.ink, flexShrink: 0,
                  }}>
                    <span style={{ width: 16, height: 16, display: 'flex' }}>{Icons.car}</span>
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Mono size={13} weight={600}>{v.plate}</Mono>
                      {Boolean(v.is_ev) && <EvBadge />}
                    </div>
                    <div style={{ fontSize: 11.5, color: YL.ink2, marginTop: 1 }}>{v.make} {v.model} · {v.year} · {v.color}</div>
                  </div>
                  <VehicleStatusPill status={v.status} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, color: YL.ink3, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginBottom: 2 }}>Driver</div>
                    {v.driver_name ? (
                      <div style={{ fontSize: 12, color: YL.ink, fontWeight: 500 }}>{v.driver_name}</div>
                    ) : (
                      <span style={{ fontSize: 11, color: YL.ink3, fontStyle: 'italic' }}>Unassigned</span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: YL.ink3, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginBottom: 2 }}>Trips</div>
                    <Mono size={12}>{v.trips ?? 0}</Mono>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          filtered.map(v => (
            <div key={v.id} onClick={() => setSelected(v)} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 120px 180px 200px 28px', gap: 16, padding: '14px 28px', alignItems: 'center', borderBottom: `1px solid ${YL.line}`, background: YL.card, cursor: 'pointer', transition: 'background 100ms' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#FCF8EE')}
              onMouseLeave={(e) => (e.currentTarget.style.background = YL.card)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: v.class_key === 'yellowSky' ? YL.yellow : YL.greenSoft,
                  border: `1px solid ${v.class_key === 'yellowSky' ? YL.yellowDeep : YL.leaf}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: YL.ink, flexShrink: 0,
                }}>
                  <span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.car}</span>
                </span>
                <Mono size={12.5} weight={600}>{v.plate}</Mono>
              </div>
              <Stack gap={2}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 13, color: YL.ink, fontWeight: 500 }}>{v.make} {v.model}</span>
                  {Boolean(v.is_ev) && <EvBadge />}
                </div>
                <div style={{ fontSize: 11, color: YL.ink2 }}>{v.year} · {v.color}</div>
              </Stack>
              <VehicleStatusPill status={v.status} note={v.maintenance_note}/>
              <div>
                {v.driver_name ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar name={v.driver_name} size={24}/>
                    <Stack gap={1}>
                      <span style={{ fontSize: 12.5, color: YL.ink, fontWeight: 500 }}>{v.driver_name}</span>
                      {v.driver_phone && <Mono size={10.5} color={YL.ink2}>{formatPhone(v.driver_phone)}</Mono>}
                    </Stack>
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: YL.ink3, fontStyle: 'italic' }}>Unassigned</span>
                )}
              </div>
              <Stack gap={4}>
                <DocExpiry date={v.insurance_expiry} label="Insurance"/>
                <DocExpiry date={v.fc_expiry} label="FC"/>
              </Stack>
              <span style={{ width: 14, height: 14, color: YL.ink3, display: 'flex' }}>{Icons.chevRight}</span>
            </div>
          ))
        )}
      </div>

      {selected && (
        <VehicleDrawer
          vehicle={selected}
          drivers={drivers}
          onClose={() => setSelected(null)}
          onUpdate={(v) => { onUpdate(v); setSelected(null) }}
          isMobile={isMobile}
        />
      )}
    </div>
  )
}

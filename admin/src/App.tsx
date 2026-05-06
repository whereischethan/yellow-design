import React from 'react'
import type { Booking, Driver, Vehicle, Customer, Lead, Stats } from './types'
import {
  getBookings, getDrivers, getVehicles, getCustomers, getStats, getLeads,
  getStoredAdminKey, clearAdminKey, getStoredAdminUser, setStoredAdminUser, updateMyProfile,
  type AdminProfile,
} from './api'
import { Sidebar, YL, ModalShell, ModalHeader, Button, Stack } from './components/ui'
import type { Page } from './components/ui'
import Dashboard from './pages/Dashboard'
import { BookingsList, BookingDrawer } from './pages/Bookings'
import DriversPage from './pages/Drivers'
import VehiclesPage from './pages/Vehicles'
import CustomersPage from './pages/Customers'
import LeadsPage from './pages/Leads'
import PricingPage from './pages/Pricing'
import TeamPage from './pages/Team'
import { CreateBookingModal, AddDriverModal, AddVehicleModal } from './pages/Modals'
import Login from './pages/Login'

function ProfileModal({ open, admin, onClose, onSaved }: {
  open: boolean
  admin: AdminProfile | null
  onClose: () => void
  onSaved: (a: AdminProfile) => void
}) {
  const [name, setName] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')

  React.useEffect(() => { if (open) { setName(admin?.name || ''); setError('') } }, [open])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const r: any = await updateMyProfile({ name: name.trim() })
      const updated = { ...admin!, name: r.admin.name }
      setStoredAdminUser(updated)
      onSaved(updated)
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', height: 40, padding: '0 12px',
    border: `1.5px solid ${YL.line}`, borderRadius: 10,
    fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 14, color: YL.ink,
    background: YL.card, outline: 'none',
  }

  return (
    <ModalShell open={open} onClose={onClose} width={400}>
      <ModalHeader title="Edit profile" onClose={onClose} />
      <form onSubmit={handleSave} style={{ padding: 24 }}>
        <Stack gap={18}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: YL.ink2, marginBottom: 6 }}>PHONE</div>
            <div style={{ ...inp, display: 'flex', alignItems: 'center', background: YL.bg, color: YL.ink3, fontFamily: '"JetBrains Mono", monospace', fontSize: 13 }}>
              {admin?.phone}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: YL.ink2, marginBottom: 6 }}>NAME</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={inp} autoFocus />
          </div>
          {error && <div style={{ padding: '10px 14px', background: YL.redSoft, borderRadius: 10, fontSize: 13, color: YL.redInk }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
            <Button variant="primary" disabled={saving || name.trim() === (admin?.name || '')} type="submit">
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </Stack>
      </form>
    </ModalShell>
  )
}

export default function App() {
  const [authed, setAuthed]   = React.useState(() => !!getStoredAdminKey())
  const [admin, setAdmin]     = React.useState<AdminProfile | null>(() => getStoredAdminUser())
  const [page, setPage]       = React.useState<Page>('dashboard')
  const [bookings, setBookings]   = React.useState<Booking[]>([])
  const [drivers, setDrivers]     = React.useState<Driver[]>([])
  const [vehicles, setVehicles]   = React.useState<Vehicle[]>([])
  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [leads, setLeads]         = React.useState<Lead[]>([])
  const [stats, setStats]         = React.useState<Stats | null>(null)
  const [openBooking, setOpenBooking] = React.useState<Booking | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError]     = React.useState<string | null>(null)

  const [showNewBooking, setShowNewBooking] = React.useState(false)
  const [showAddDriver, setShowAddDriver]   = React.useState(false)
  const [showAddVehicle, setShowAddVehicle] = React.useState(false)
  const [showProfile, setShowProfile]       = React.useState(false)

  const handleSignOut = () => { clearAdminKey(); setAuthed(false) }

  const refresh = React.useCallback(async () => {
    try {
      const [b, d, v, c, s, l] = await Promise.all([
        getBookings(), getDrivers(), getVehicles(), getCustomers(), getStats(), getLeads(),
      ])
      setBookings(b.bookings)
      setDrivers(d.drivers)
      setVehicles(v.vehicles)
      setCustomers(c.customers)
      setStats(s)
      setLeads(l.leads)
    } catch (e: any) {
      if (e.message?.includes('UNAUTHORIZED')) { clearAdminKey(); setAuthed(false) }
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { refresh() }, [refresh])
  React.useEffect(() => { const id = setInterval(refresh, 30000); return () => clearInterval(id) }, [refresh])

  const counts = {
    bookings: bookings.filter(b => ['pending', 'confirmed', 'assigned', 'arrived', 'in_progress'].includes(b.status)).length,
    drivers: drivers.filter(d => d.status === 'available').length,
  }

  const handleBookingUpdate = (updated: Booking) => {
    setBookings(prev => prev.map(b => b.id === updated.id ? updated : b))
    setOpenBooking(updated)
    getDrivers().then(r => setDrivers(r.drivers)).catch(() => {})
  }

  if (!authed) return <Login onLogin={(a?: AdminProfile) => { setAuthed(true); if (a) setAdmin(a); refresh() }} />

  if (loading) return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', background: YL.bg, fontFamily: '"Bricolage Grotesque", system-ui', color: YL.ink2, fontSize: 14 }}>
      Loading Yellow admin…
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: YL.bg, fontFamily: '"Bricolage Grotesque", system-ui' }}>
      <div style={{ color: YL.redInk, fontSize: 14 }}>Failed to connect to server.</div>
      <div style={{ color: YL.ink2, fontSize: 12, maxWidth: 400, textAlign: 'center' }}>{error}</div>
      {error.includes('UNAUTHORIZED') ? (
        <button onClick={() => { clearAdminKey(); setAuthed(false); setError(null) }} style={{ padding: '8px 16px', background: YL.yellow, border: `1px solid ${YL.yellowDeep}`, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500 }}>Sign out</button>
      ) : (
        <button onClick={() => { setError(null); setLoading(true); refresh() }} style={{ padding: '8px 16px', background: YL.yellow, border: `1px solid ${YL.yellowDeep}`, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500 }}>Retry</button>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: YL.bg, overflow: 'hidden', fontFamily: '"Bricolage Grotesque", system-ui' }}>
      <Sidebar
        active={page}
        setActive={setPage}
        counts={counts}
        adminName={admin?.name ?? null}
        adminPhone={admin?.phone ?? ''}
        onSignOut={handleSignOut}
        onEditProfile={() => setShowProfile(true)}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        {page === 'dashboard'  && <Dashboard bookings={bookings} drivers={drivers} stats={stats} onOpen={setOpenBooking} onAssignRequest={setOpenBooking} onNewBooking={() => setShowNewBooking(true)} />}
        {page === 'bookings'   && <BookingsList bookings={bookings} onOpen={setOpenBooking} onNewBooking={() => setShowNewBooking(true)} />}
        {page === 'drivers'    && <DriversPage drivers={drivers} onUpdate={d => setDrivers(prev => prev.map(x => x.id === d.id ? d : x))} onAddDriver={() => setShowAddDriver(true)} onAddVehicle={() => setShowAddVehicle(true)} />}
        {page === 'vehicles'   && <VehiclesPage vehicles={vehicles} onUpdate={v => setVehicles(prev => prev.map(x => x.id === v.id ? v : x))} onAddVehicle={() => setShowAddVehicle(true)} />}
        {page === 'customers'  && <CustomersPage customers={customers} onUpdate={c => setCustomers(prev => prev.map(x => x.id === c.id ? { ...x, ...c } : x))} />}
        {page === 'leads'      && <LeadsPage leads={leads} bookings={bookings} onUpdate={l => setLeads(prev => prev.map(x => x.id === l.id ? { ...x, ...l } : x))} />}
        {page === 'pricing'    && <PricingPage />}
        {page === 'team'       && <TeamPage selfPhone={admin?.phone ?? ''} />}

        <BookingDrawer booking={openBooking} drivers={drivers} onClose={() => setOpenBooking(null)} onUpdate={handleBookingUpdate} />

        <CreateBookingModal open={showNewBooking} onClose={() => setShowNewBooking(false)} drivers={drivers} customers={customers} onCreated={() => { refresh(); setPage('bookings') }} />
        <AddDriverModal open={showAddDriver} onClose={() => setShowAddDriver(false)} onCreated={() => { getDrivers().then(r => setDrivers(r.drivers)); getVehicles().then(r => setVehicles(r.vehicles)) }} />
        <AddVehicleModal open={showAddVehicle} onClose={() => setShowAddVehicle(false)} drivers={drivers} onCreated={() => { getVehicles().then(r => setVehicles(r.vehicles)); getDrivers().then(r => setDrivers(r.drivers)) }} />
        <ProfileModal open={showProfile} admin={admin} onClose={() => setShowProfile(false)} onSaved={a => setAdmin(a)} />
      </div>
    </div>
  )
}

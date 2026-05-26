import React from 'react'
import type { Booking, Driver, Vehicle, Customer, Lead, Stats } from './types'

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: any) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'monospace', background: '#fff8f8', color: '#c00', minHeight: '100vh' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Runtime error — please share this with support:</div>
          <pre style={{ fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{this.state.error.message}{'\n\n'}{this.state.error.stack}</pre>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: 20, padding: '8px 16px', cursor: 'pointer' }}>Dismiss</button>
        </div>
      )
    }
    return this.props.children
  }
}
import {
  getBookings, getDrivers, getVehicles, getCustomers, getStats, getLeads,
  getStoredAdminKey, clearAdminKey, getStoredAdminUser, setStoredAdminUser, updateMyProfile,
  type AdminProfile,
} from './api'
import { Sidebar, MobileNav, useIsMobile, YL, ModalShell, ModalHeader, Button, Stack } from './components/ui'
import type { Page } from './components/ui'
import Dashboard from './pages/Dashboard'
import { BookingsList, BookingDrawer } from './pages/Bookings'
import DriversPage from './pages/Drivers'
import VehiclesPage from './pages/Vehicles'
import CustomersPage from './pages/Customers'
import LeadsPage from './pages/Leads'
import PricingPage from './pages/Pricing'
import InvoicesPage from './pages/Invoices'
import SettingsPage from './pages/Settings'
import TeamPage from './pages/Team'
import EmptyLegPage from './pages/EmptyLeg'
import FinancePage from './pages/Finance'
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
  const isMobile = useIsMobile()
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
  const [loading, setLoading]         = React.useState(true)
  const [error, setError]             = React.useState<string | null>(null)
  const [networkError, setNetworkError] = React.useState<string | null>(null)

  const [showNewBooking, setShowNewBooking] = React.useState(false)
  const [showAddDriver, setShowAddDriver]   = React.useState(false)
  const [showAddVehicle, setShowAddVehicle] = React.useState(false)
  const [showProfile, setShowProfile]       = React.useState(false)

  const handleSignOut = () => { clearAdminKey(); setAuthed(false) }

  const refresh = React.useCallback(async (isInitial = false) => {
    if (isInitial) setError(null)
    setNetworkError(null)
    try {
      if (isInitial) {
        // Critical path: only what the dashboard needs — show UI immediately
        const [b, d, s] = await Promise.all([getBookings(), getDrivers(), getStats()])
        setBookings(b.bookings)
        setDrivers(d.drivers)
        setStats(s)
        // Deferred: load the rest in background without blocking render
        Promise.all([getVehicles(), getCustomers(), getLeads()]).then(([v, c, l]) => {
          setVehicles(v.vehicles)
          setCustomers(c.customers)
          setLeads(l.leads)
        }).catch((e) => {
          if (e.message?.includes('UNAUTHORIZED')) { clearAdminKey(); setAuthed(false) }
        })
      } else {
        const [b, d, v, c, s, l] = await Promise.all([
          getBookings(), getDrivers(), getVehicles(), getCustomers(), getStats(), getLeads(),
        ])
        setBookings(b.bookings)
        setDrivers(d.drivers)
        setVehicles(v.vehicles)
        setCustomers(c.customers)
        setStats(s)
        setLeads(l.leads)
      }
    } catch (e: any) {
      if (e.message?.includes('UNAUTHORIZED')) { clearAdminKey(); setAuthed(false); return }
      // Initial load failure → full-page error; subsequent → inline banner only
      if (isInitial) setError(e.message)
      else setNetworkError(e.message)
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [])

  React.useEffect(() => { refresh(true) }, [refresh])
  React.useEffect(() => { const id = setInterval(() => refresh(false), 30000); return () => clearInterval(id) }, [refresh])

  const counts = {
    bookings: bookings.filter(b => ['pending', 'confirmed', 'assigned', 'arrived', 'in_progress'].includes(b.status)).length,
    drivers: drivers.filter(d => d.status === 'available').length,
  }

  // Keep drawer in sync when background poll refreshes booking data
  React.useEffect(() => {
    if (!openBooking) return
    const fresh = bookings.find(b => b.id === openBooking.id)
    if (fresh && JSON.stringify(fresh) !== JSON.stringify(openBooking)) setOpenBooking(fresh)
  }, [bookings])

  const handleBookingUpdate = (updated: Booking) => {
    setBookings(prev => prev.map(b => b.id === updated.id ? updated : b))
    setOpenBooking(updated)
    getDrivers().then(r => setDrivers(r.drivers)).catch(() => {})
  }

  if (!authed) return <Login onLogin={(a?: AdminProfile) => { setAuthed(true); if (a) setAdmin(a); refresh() }} />

  if (loading) return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', background: YL.bg, fontFamily: '"Bricolage Grotesque", system-ui', flexDirection: 'column', gap: 28 }}>
      <style>{`
        @keyframes yl-spin { to { transform: rotate(360deg) } }
        @keyframes yl-fade-in { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
        .yl-loader-wrap { animation: yl-fade-in 320ms ease both }
        .yl-spinner { width: 36px; height: 36px; border: 3px solid rgba(43,39,32,0.10); border-top-color: #2B2720; border-radius: 50%; animation: yl-spin 700ms linear infinite }
      `}</style>
      <div className="yl-loader-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        <img src="/logo.png" alt="Yellow" style={{ width: 160, height: 64, objectFit: 'contain', opacity: 0.95 }} />
        <div className="yl-spinner" />
        <div style={{ fontSize: 13, color: YL.ink3, letterSpacing: 0.2 }}>Loading ops dashboard…</div>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: YL.bg, fontFamily: '"Bricolage Grotesque", system-ui' }}>
      <div style={{ color: YL.redInk, fontSize: 14 }}>Failed to connect to server.</div>
      <div style={{ color: YL.ink2, fontSize: 12, maxWidth: 400, textAlign: 'center' }}>{error}</div>
      {error.includes('UNAUTHORIZED') ? (
        <button onClick={() => { clearAdminKey(); setAuthed(false); setError(null) }} style={{ padding: '8px 16px', background: YL.yellow, border: `1px solid ${YL.yellowDeep}`, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500 }}>Sign out</button>
      ) : (
        <button onClick={() => { setError(null); setLoading(true); refresh(true) }} style={{ padding: '8px 16px', background: YL.yellow, border: `1px solid ${YL.yellowDeep}`, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500 }}>Retry</button>
      )}
    </div>
  )

  const isSuperAdmin = admin?.role === 'superadmin'

  const navProps = {
    active: page, setActive: setPage, counts,
    adminName: admin?.name ?? null, adminPhone: admin?.phone ?? '',
    isSuperAdmin,
    onSignOut: handleSignOut, onEditProfile: () => setShowProfile(true),
  }

  return (
    <ErrorBoundary>
    <div style={{ display: 'flex', height: '100%', width: '100%', background: YL.bg, overflow: 'hidden', fontFamily: '"Bricolage Grotesque", system-ui' }}>
      {!isMobile && <Sidebar {...navProps} />}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative', paddingBottom: isMobile ? 60 : 0 }}>
        {networkError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', background: '#FEF2F2', borderBottom: '1px solid #FECACA', fontSize: 12.5, color: '#DC2626', fontFamily: '"Bricolage Grotesque", system-ui', flexShrink: 0 }}>
            <span style={{ flex: 1 }}>Connection lost — retrying automatically. {networkError}</span>
            <button onClick={() => { setNetworkError(null); refresh(false) }} style={{ padding: '4px 10px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Retry now</button>
            <button onClick={() => setNetworkError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontSize: 16, lineHeight: 1, padding: '0 4px' }}>×</button>
          </div>
        )}
        {page === 'dashboard'  && <Dashboard bookings={bookings} drivers={drivers} stats={stats} adminName={admin?.name} onOpen={setOpenBooking} onAssignRequest={setOpenBooking} onNewBooking={() => setShowNewBooking(true)} />}
        {page === 'bookings'   && <BookingsList bookings={bookings} onOpen={setOpenBooking} onNewBooking={() => setShowNewBooking(true)} />}
        {page === 'drivers'    && <DriversPage drivers={drivers} onUpdate={d => setDrivers(prev => prev.map(x => x.id === d.id ? d : x))} onAddDriver={() => setShowAddDriver(true)} onAddVehicle={() => setShowAddVehicle(true)} />}
        {page === 'vehicles'   && <VehiclesPage vehicles={vehicles} drivers={drivers} onUpdate={v => setVehicles(prev => prev.map(x => x.id === v.id ? v : x))} onAddVehicle={() => setShowAddVehicle(true)} onVehiclesRefresh={() => getVehicles().then(r => setVehicles(r.vehicles)).catch(() => {})} />}
        {page === 'customers'  && <CustomersPage customers={customers} onUpdate={c => setCustomers(prev => prev.map(x => x.id === c.id ? { ...x, ...c } : x))} onRefresh={() => getCustomers().then(r => setCustomers(r.customers)).catch(() => {})} />}
        {page === 'leads'      && <LeadsPage leads={leads} bookings={bookings} onUpdate={l => setLeads(prev => prev.map(x => x.id === l.id ? { ...x, ...l } : x))} onBookingCreated={b => { setBookings(prev => [b, ...prev]); setPage('bookings') }} />}
        {page === 'pricing'    && <PricingPage isSuperAdmin={isSuperAdmin} />}
        {page === 'empty-leg'  && <EmptyLegPage />}
        {page === 'invoices'   && <InvoicesPage />}
        {page === 'finance'    && <FinancePage />}
        {page === 'settings'   && <SettingsPage />}
        {page === 'team'       && <TeamPage selfPhone={admin?.phone ?? ''} />}

        <BookingDrawer booking={openBooking} drivers={drivers} vehicles={vehicles} customers={customers} onClose={() => setOpenBooking(null)} onUpdate={handleBookingUpdate} onDelete={id => setBookings(prev => prev.filter(b => b.id !== id))} isSuperAdmin={isSuperAdmin} />

        <CreateBookingModal open={showNewBooking} onClose={() => setShowNewBooking(false)} drivers={drivers} customers={customers} onCreated={() => { refresh(); setPage('bookings') }} />
        <AddDriverModal open={showAddDriver} onClose={() => setShowAddDriver(false)} vehicles={vehicles} onCreated={() => { getDrivers().then(r => setDrivers(r.drivers)); getVehicles().then(r => setVehicles(r.vehicles)) }} />
        <AddVehicleModal open={showAddVehicle} onClose={() => setShowAddVehicle(false)} drivers={drivers} onCreated={() => { getVehicles().then(r => setVehicles(r.vehicles)); getDrivers().then(r => setDrivers(r.drivers)) }} />
        <ProfileModal open={showProfile} admin={admin} onClose={() => setShowProfile(false)} onSaved={a => setAdmin(a)} />
      </div>
      {isMobile && <MobileNav {...navProps} />}
    </div>
    </ErrorBoundary>
  )
}

import React from 'react'
import { YL, Icons } from './ui-tokens'
import { Stack } from './ui'

// ─── Sidebar ──────────────────────────────────────────────────────────────

export type Page = 'dashboard' | 'bookings' | 'drivers' | 'vehicles' | 'customers' | 'leads' | 'pricing' | 'availability' | 'empty-leg' | 'team' | 'invoices' | 'finance' | 'settings'

/** Pages only super admins can access */
export const SUPERADMIN_PAGES: Page[] = ['empty-leg', 'team', 'settings']

interface SidebarProps {
  active: Page
  setActive: (p: Page) => void
  counts: { bookings: number; drivers: number }
  adminName: string | null
  adminPhone: string
  isSuperAdmin?: boolean
  onSignOut: () => void
  onEditProfile: () => void
}

export const Sidebar = ({ active, setActive, counts, adminName, adminPhone, isSuperAdmin, onSignOut, onEditProfile }: SidebarProps) => {
  const [profileOpen, setProfileOpen] = React.useState(false)

  const allItems: { id: Page; label: string; icon: React.ReactNode; badge?: number; superAdminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Icons.dashboard },
    { id: 'bookings',  label: 'Bookings',  icon: Icons.bookings,  badge: counts.bookings },
    { id: 'drivers',   label: 'Drivers',   icon: Icons.drivers,   badge: counts.drivers },
    { id: 'vehicles',  label: 'Vehicles',  icon: Icons.vehicles },
    { id: 'customers', label: 'Customers', icon: Icons.customers },
    { id: 'leads',     label: 'Leads',     icon: Icons.funnel },
    { id: 'pricing',      label: 'Pricing',       icon: Icons.pricing },
    { id: 'availability', label: 'Availability',   icon: Icons.bookings },
    { id: 'empty-leg',    label: 'Empty Leg',      icon: Icons.pricing,   superAdminOnly: true },
    { id: 'invoices',  label: 'Invoices',  icon: Icons.invoice },
    { id: 'finance',   label: 'Finance',   icon: Icons.trending },
    { id: 'team',      label: 'Admin users', icon: Icons.drivers, superAdminOnly: true },
    { id: 'settings',  label: 'Settings',  icon: Icons.settings,  superAdminOnly: true },
  ]
  const items = allItems.filter(it => !it.superAdminOnly || isSuperAdmin)

  const initials = adminName
    ? adminName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : adminPhone.slice(-2)

  return (
    <div style={{ width: 224, background: YL.yellow, color: YL.ink, display: 'flex', flexDirection: 'column', padding: '18px 14px', flexShrink: 0, borderRight: `1px solid ${YL.yellowDeep}`, position: 'relative' }}>
      <div style={{ padding: '12px 6px 24px', display: 'flex', justifyContent: 'center' }}>
        <img src="/logo.png" alt="Yellow" style={{ width: 140, height: 56, objectFit: 'contain' }} />
      </div>

      <Stack gap={2}>
        {items.map(it => (
          <button key={it.id} onClick={() => setActive(it.id)} style={{
            width: '100%', height: 38, padding: '0 12px',
            background: active === it.id ? YL.ink : 'transparent',
            border: 'none', borderRadius: 9,
            color: active === it.id ? YL.yellow : YL.ink,
            display: 'flex', alignItems: 'center', gap: 11,
            fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 13.5, fontWeight: active === it.id ? 600 : 500,
            textAlign: 'left', cursor: 'pointer', transition: 'background 120ms, color 120ms',
          }}>
            <span style={{ display: 'flex', width: 16, height: 16 }}>{it.icon}</span>
            {it.label}
            {it.badge != null && it.badge > 0 && (
              <span style={{ marginLeft: 'auto', fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5, background: active === it.id ? YL.yellow : YL.ink, color: active === it.id ? YL.ink : YL.yellow, padding: '2px 7px', borderRadius: 999, fontWeight: 600 }}>
                {it.badge}
              </span>
            )}
          </button>
        ))}
      </Stack>

      <div style={{ flex: 1 }}/>

      <div style={{ padding: '10px 12px', background: 'rgba(43,39,32,0.06)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: YL.leaf }}/>
        <Stack gap={1}>
          <span style={{ fontSize: 11.5, color: YL.ink, fontWeight: 600 }}>System live</span>
          <span style={{ fontSize: 10.5, color: YL.ink2, fontFamily: '"JetBrains Mono", monospace' }}>BLR · ops</span>
        </Stack>
      </div>

      {/* Profile section — clickable */}
      <div
        onClick={() => setProfileOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 8px', borderTop: '1px solid rgba(43,39,32,0.12)',
          cursor: 'pointer', borderRadius: 10,
          background: profileOpen ? 'rgba(43,39,32,0.08)' : 'transparent',
          transition: 'background 120ms',
        }}
        onMouseEnter={e => { if (!profileOpen) (e.currentTarget as HTMLDivElement).style.background = 'rgba(43,39,32,0.06)' }}
        onMouseLeave={e => { if (!profileOpen) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
      >
        <div style={{ width: 28, height: 28, borderRadius: 999, background: YL.ink, color: YL.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 700, flexShrink: 0 }}>
          {initials}
        </div>
        <Stack gap={1} style={{ minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: 12.5, color: YL.ink, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {adminName || adminPhone}
          </span>
          <span style={{ fontSize: 10.5, color: YL.ink2 }}>{isSuperAdmin ? 'Super Admin' : 'Ops'}</span>
        </Stack>
        <span style={{ display: 'flex', width: 14, height: 14, color: YL.ink2, transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms', flexShrink: 0 }}>{Icons.chevRight}</span>
      </div>

      {/* Profile popover */}
      {profileOpen && (
        <>
          <div onClick={() => setProfileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }}/>
          <div style={{
            position: 'absolute', bottom: 80, left: 14, right: 14,
            background: YL.card, borderRadius: 12, border: `1.5px solid ${YL.line}`,
            boxShadow: '0 8px 24px rgba(43,39,32,0.14)', zIndex: 51, overflow: 'hidden',
          }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${YL.line}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: YL.ink }}>{adminName || '—'}</div>
              <div style={{ fontSize: 11.5, color: YL.ink3, fontFamily: '"JetBrains Mono", monospace', marginTop: 2 }}>{adminPhone}</div>
            </div>
            {[
              { label: 'Edit profile', icon: Icons.edit, action: () => { setProfileOpen(false); onEditProfile() } },
              { label: 'Sign out',     icon: Icons.close, action: () => { setProfileOpen(false); onSignOut() }, danger: true },
            ].map(item => (
              <button key={item.label} onClick={item.action} style={{
                width: '100%', padding: '11px 14px', background: 'transparent', border: 'none',
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 13.5, fontWeight: 500,
                color: (item as any).danger ? YL.redInk : YL.ink, textAlign: 'left',
                transition: 'background 100ms',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = (item as any).danger ? YL.redSoft : YL.bg)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ display: 'flex', width: 15, height: 15, color: 'inherit' }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Mobile bottom nav ────────────────────────────────────────────────────

interface MobileNavProps {
  active: Page
  setActive: (p: Page) => void
  counts: { bookings: number; drivers: number }
  adminName: string | null
  adminPhone: string
  isSuperAdmin?: boolean
  onSignOut: () => void
  onEditProfile: () => void
}

export const MobileNav = ({ active, setActive, counts, adminName, adminPhone, isSuperAdmin, onSignOut, onEditProfile }: MobileNavProps) => {
  const [moreOpen, setMoreOpen] = React.useState(false)

  const primary: { id: Page; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Home',     icon: Icons.dashboard },
    { id: 'bookings',  label: 'Bookings', icon: Icons.bookings, badge: counts.bookings },
    { id: 'drivers',   label: 'Drivers',  icon: Icons.drivers,  badge: counts.drivers },
    { id: 'leads',     label: 'Leads',    icon: Icons.funnel },
  ]

  const allSecondary: { id: Page; label: string; icon: React.ReactNode; superAdminOnly?: boolean }[] = [
    { id: 'vehicles',  label: 'Vehicles',    icon: Icons.vehicles },
    { id: 'customers', label: 'Customers',   icon: Icons.customers },
    { id: 'pricing',      label: 'Pricing',       icon: Icons.pricing },
    { id: 'availability', label: 'Availability',   icon: Icons.bookings },
    { id: 'invoices',     label: 'Invoices',       icon: Icons.invoice },
    { id: 'finance',   label: 'Finance',     icon: Icons.trending },
    { id: 'team',      label: 'Admin users', icon: Icons.drivers,   superAdminOnly: true },
    { id: 'settings',  label: 'Settings',    icon: Icons.settings,  superAdminOnly: true },
  ]
  const secondary = allSecondary.filter(it => !it.superAdminOnly || isSuperAdmin)

  const initials = adminName
    ? adminName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : adminPhone.slice(-2)

  const navigate = (p: Page) => { setActive(p); setMoreOpen(false) }

  return (
    <>
      {/* Overlay */}
      {moreOpen && <div onClick={() => setMoreOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(43,39,32,0.4)', zIndex: 98 }}/>}

      {/* More sheet */}
      {moreOpen && (
        <div style={{ position: 'fixed', bottom: 60, left: 0, right: 0, background: YL.card, borderRadius: '16px 16px 0 0', border: `1px solid ${YL.line}`, boxShadow: '0 -8px 32px rgba(43,39,32,0.18)', zIndex: 99, overflow: 'hidden' }}>
          <div style={{ padding: '8px 0 4px' }}>
            {secondary.map(it => (
              <button key={it.id} onClick={() => navigate(it.id)} style={{ width: '100%', padding: '13px 20px', background: active === it.id ? YL.yellowSoft : 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 15, fontWeight: active === it.id ? 600 : 400, color: YL.ink, textAlign: 'left' }}>
                <span style={{ display: 'flex', width: 18, height: 18, color: YL.ink2 }}>{it.icon}</span>
                {it.label}
              </button>
            ))}
          </div>
          <div style={{ borderTop: `1px solid ${YL.line}`, padding: '8px 0' }}>
            <div style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 999, background: YL.ink, color: YL.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: YL.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{adminName || adminPhone}</div>
                <div style={{ fontSize: 11, color: YL.ink3 }}>{isSuperAdmin ? 'Super Admin' : 'Ops'}</div>
              </div>
            </div>
            <button onClick={() => { setMoreOpen(false); onEditProfile() }} style={{ width: '100%', padding: '12px 20px', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 15, color: YL.ink, textAlign: 'left' }}>
              <span style={{ display: 'flex', width: 18, height: 18, color: YL.ink2 }}>{Icons.edit}</span>
              Edit profile
            </button>
            <button onClick={() => { setMoreOpen(false); onSignOut() }} style={{ width: '100%', padding: '12px 20px', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 15, color: YL.redInk, textAlign: 'left' }}>
              <span style={{ display: 'flex', width: 18, height: 18, color: YL.redInk }}>{Icons.close}</span>
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 60, background: YL.yellow, borderTop: `1px solid ${YL.yellowDeep}`, display: 'flex', zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {primary.map(it => {
          const isActive = active === it.id
          return (
            <button key={it.id} onClick={() => navigate(it.id)} style={{ flex: 1, height: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, color: isActive ? YL.ink : YL.ink2, position: 'relative', padding: 0 }}>
              <span style={{ display: 'flex', width: 20, height: 20 }}>{it.icon}</span>
              <span style={{ fontSize: 9.5, fontWeight: isActive ? 700 : 400, fontFamily: '"Bricolage Grotesque", system-ui', letterSpacing: 0.1 }}>{it.label}</span>
              {it.badge != null && it.badge > 0 && (
                <span style={{ position: 'absolute', top: 8, left: '50%', marginLeft: 6, background: YL.ink, color: YL.yellow, fontSize: 8.5, fontWeight: 700, padding: '1px 4px', borderRadius: 999, fontFamily: '"JetBrains Mono", monospace', lineHeight: 1.4 }}>{it.badge}</span>
              )}
              {isActive && <span style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 2, background: YL.ink, borderRadius: '0 0 2px 2px' }}/>}
            </button>
          )
        })}
        {/* More button */}
        <button onClick={() => setMoreOpen(v => !v)} style={{ flex: 1, height: '100%', background: moreOpen ? 'rgba(43,39,32,0.08)' : 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, color: YL.ink2, padding: 0 }}>
          <span style={{ display: 'flex', width: 20, height: 20 }}>{Icons.dashboard}</span>
          <span style={{ fontSize: 9.5, fontWeight: 400, fontFamily: '"Bricolage Grotesque", system-ui' }}>More</span>
        </button>
      </div>
    </>
  )
}

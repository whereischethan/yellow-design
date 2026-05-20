import React from 'react'
import ReactDOM from 'react-dom'

export const YL = {
  bg: '#F6F3EB',
  card: '#FFFFFF',
  line: '#E2DDD7',
  ink: '#2B2720',
  ink2: '#736E65',
  ink3: '#9E9A91',
  yellow: '#FFD84A',
  yellowDeep: '#E6B800',
  leaf: '#4A9442',
  gulmohar: '#D4763A',
  yellowSoft: '#FFF0A8',
  greenSoft: '#D4F4CD',
  greenInk: '#2B6B24',
  redSoft: '#FDECEA',
  redInk: '#C0392B',
  blueSoft: '#D9E8F4',
  blueInk: '#2c5d85',
}

export const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  pending:     { bg: YL.yellowSoft, fg: YL.ink,      label: 'Pending' },
  confirmed:   { bg: YL.greenSoft,  fg: YL.greenInk, label: 'Confirmed' },
  assigned:    { bg: YL.greenSoft,  fg: YL.greenInk, label: 'Assigned' },
  arrived:     { bg: YL.yellow,     fg: YL.ink,      label: 'Arrived' },
  in_progress: { bg: YL.yellow,     fg: YL.ink,      label: 'In progress' },
  completed:   { bg: YL.line,       fg: YL.ink2,     label: 'Completed' },
  cancelled:   { bg: YL.redSoft,    fg: YL.redInk,   label: 'Cancelled' },
}

// ─── Icons ────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16, stroke = 'currentColor', fill = 'none', strokeWidth = 1.6, style }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
    strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
)

export const Icons: Record<string, React.ReactNode> = {
  dashboard: <Icon d={<><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>}/>,
  bookings:  <Icon d={<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></>}/>,
  drivers:   <Icon d={<><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/></>}/>,
  vehicles:  <Icon d={<><path d="M3 14h18l-2-6H5l-2 6zM3 14v4h2M21 14v4h-2"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></>}/>,
  customers: <Icon d={<><circle cx="9" cy="9" r="3.5"/><path d="M2.5 20c0-3 3-5.5 6.5-5.5s6.5 2.5 6.5 5.5"/><circle cx="17" cy="7" r="2.5"/><path d="M21.5 16c-.4-2-2.2-3.5-4.5-3.5"/></>}/>,
  pricing:   <Icon d={<><path d="M12 3v18M7 7h7a3 3 0 010 6H8a3 3 0 000 6h9"/></>}/>,
  content:   <Icon d={<><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>}/>,
  search:    <Icon d={<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>}/>,
  plus:      <Icon d="M12 5v14M5 12h14"/>,
  chevRight: <Icon d="m9 6 6 6-6 6"/>,
  chevLeft:  <Icon d="m15 6-6 6 6 6"/>,
  close:     <Icon d="M18 6 6 18M6 6l12 12"/>,
  arrowRight: <Icon d="M5 12h14m-6-6 6 6-6 6"/>,
  flight:    <Icon d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1L15 22v-1.5L13 19v-5.5L21 16z"/>,
  phone:     <Icon d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>,
  pin:       <Icon d={<><path d="M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></>}/>,
  car:       <Icon d={<><path d="M3 14h18l-2-6H5l-2 6zM3 14v4h2M21 14v4h-2"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></>}/>,
  clock:     <Icon d={<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>}/>,
  check:     <Icon d="m5 12 5 5 9-12"/>,
  copy:      <Icon d={<><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></>}/>,
  edit:      <Icon d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>,
  download:  <Icon d="M12 3v12m-5-5 5 5 5-5M5 21h14"/>,
  refresh:   <Icon d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5"/>,
  ev:        <Icon d="m13 2-9 12h7l-1 8 9-12h-7l1-8z"/>,
  star:      <Icon d="m12 2 3 7 7 .8-5 5 1.5 7L12 17.8 5.5 21.8 7 14.8l-5-5L9 9z" fill="currentColor"/>,
  whatsapp:  <Icon d="M3 21l1.6-5A8 8 0 1 1 12 20a8 8 0 0 1-3.6-.9L3 21zM9 8.5c0 4 3 7 7 7M9 8.5c0-.7-.5-1.5-1.5-1.5h-.7L6 8.7c0 0 .3 1.6 1.5 3M16.5 15.5c.7 0 1.5-.5 1.5-1.5v-.7l-1.7-.8s-.6.5-1.3.5"/>,
  funnel:    <Icon d="M3 5h18l-7 8v6l-4-2v-4L3 5"/>,
  invoice:   <Icon d={<><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/><path d="M12 19v-4l-2 2 2-4 2 4-2-2v4"/></>}/>,
  settings:  <Icon d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>}/>,
  support:   <Icon d={<><circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4.5 2.6c-1 .6-1.5 1.2-1.5 2.4M12 17h.01"/></>}/>,
  trending:  <Icon d="m3 17 6-6 4 4 8-9M14 5h7v7"/>,
  alert:     <Icon d={<><path d="m12 3 10 18H2L12 3z"/><path d="M12 9v5M12 17.5h.01"/></>}/>,
  dot:       <Icon d={<circle cx="12" cy="12" r="4" fill="currentColor"/>} stroke="none"/>,
}

// ─── Primitives ───────────────────────────────────────────────────────────

export const Mono = ({ children, size = 13, weight = 500, color, style }: any) => (
  <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: size, fontWeight: weight, color: color || YL.ink, letterSpacing: -0.1, ...style }}>
    {children}
  </span>
)

export const Stack = ({ children, gap = 8, dir = 'col', align, justify, style }: any) => (
  <div style={{ display: 'flex', flexDirection: dir === 'col' ? 'column' : 'row', gap, alignItems: align, justifyContent: justify, ...style }}>
    {children}
  </div>
)

export const Button = ({ children, variant = 'secondary', size = 'md', icon, onClick, disabled, style, title }: any) => {
  const sizes: any = { sm: { h: 28, px: 10, fs: 12.5, gap: 6 }, md: { h: 34, px: 13, fs: 13, gap: 7 }, lg: { h: 40, px: 16, fs: 14, gap: 8 } }
  const s = sizes[size]
  const variants: any = {
    primary:   { bg: YL.ink,         fg: YL.yellow,  border: YL.ink },
    yellow:    { bg: YL.yellow,      fg: YL.ink,     border: YL.yellowDeep },
    secondary: { bg: YL.card,        fg: YL.ink,     border: YL.line },
    ghost:     { bg: 'transparent',  fg: YL.ink,     border: 'transparent' },
    danger:    { bg: YL.card,        fg: YL.redInk,  border: YL.line },
  }
  const v = variants[variant]
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{
      height: s.h, padding: `0 ${s.px}px`, background: v.bg, color: v.fg,
      border: `1px solid ${v.border}`, borderRadius: 8,
      fontFamily: '"Bricolage Grotesque", system-ui', fontSize: s.fs, fontWeight: 500, lineHeight: 1,
      display: 'inline-flex', alignItems: 'center', gap: s.gap,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
      transition: 'background 120ms', whiteSpace: 'nowrap', ...style,
    }}>
      {icon}{children}
    </button>
  )
}

export const Input = ({ value, onChange, placeholder, icon, style, type = 'text' }: any) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 34, padding: '0 12px', background: YL.card, border: `1px solid ${YL.line}`, borderRadius: 8, ...style }}>
    {icon && <span style={{ color: YL.ink3, display: 'flex' }}>{icon}</span>}
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{
      flex: 1, border: 'none', outline: 'none', background: 'transparent',
      fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 13, color: YL.ink, minWidth: 0,
    }}/>
  </div>
)

export const Chip = ({ children, active, onClick }: any) => (
  <button onClick={onClick} style={{
    height: 28, padding: '0 11px',
    background: active ? YL.ink : YL.card,
    color: active ? YL.yellow : YL.ink,
    border: `1px solid ${active ? YL.ink : YL.line}`, borderRadius: 999,
    fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 12.5, fontWeight: 500,
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'background 120ms',
  }}>
    {children}
  </button>
)

export const Card = ({ children, style, padding = 18 }: any) => (
  <div style={{ background: YL.card, border: `1px solid ${YL.line}`, borderRadius: 12, padding, ...style }}>
    {children}
  </div>
)

export const PageHeader = ({ title, subtitle, actions, children }: any) => (
  <div style={{ padding: '22px 28px 18px', borderBottom: `1px solid ${YL.line}`, background: YL.bg, display: 'flex', alignItems: 'flex-end', gap: 24, flexShrink: 0 }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <h1 style={{ margin: 0, fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 26, fontWeight: 600, letterSpacing: -0.6, color: YL.ink, lineHeight: 1.1 }}>{title}</h1>
      {subtitle && <div style={{ marginTop: 6, fontSize: 13.5, color: YL.ink2 }}>{subtitle}</div>}
      {children}
    </div>
    {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
  </div>
)

// ─── Status badge ─────────────────────────────────────────────────────────

export const StatusBadge = ({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' }) => {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending
  const isLive = status === 'in_progress' || status === 'arrived'
  const padY = size === 'sm' ? 2 : 3
  const padX = size === 'sm' ? 7 : 9
  const fs = size === 'sm' ? 10.5 : 11.5
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: s.bg, color: s.fg, padding: `${padY}px ${padX}px`, borderRadius: 999, fontSize: fs, fontWeight: 500, lineHeight: 1, whiteSpace: 'nowrap' }}>
      {isLive && <span style={{ width: 6, height: 6, borderRadius: 999, background: s.fg, animation: 'yl-pulse 1.6s ease-in-out infinite' }}/>}
      {s.label}
    </span>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────

const AVATAR_COLORS = [YL.gulmohar, YL.leaf, '#7d5ba6', '#3a7ca5', '#c0392b', '#b89730', '#5d8c4a']
const initials = (name: string) => name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()

export const Avatar = ({ name, size = 28 }: { name: string; size?: number }) => {
  const idx = name ? name.charCodeAt(0) % AVATAR_COLORS.length : 0
  return (
    <div style={{ width: size, height: size, borderRadius: 999, background: AVATAR_COLORS[idx], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Bricolage Grotesque", system-ui', fontSize: size * 0.4, fontWeight: 600, flexShrink: 0 }}>
      {initials(name || '?')}
    </div>
  )
}

// ─── Responsive hook ──────────────────────────────────────────────────────

export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = React.useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  )
  React.useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [breakpoint])
  return isMobile
}

// ─── Sidebar ──────────────────────────────────────────────────────────────

export type Page = 'dashboard' | 'bookings' | 'drivers' | 'vehicles' | 'customers' | 'leads' | 'pricing' | 'team' | 'invoices' | 'settings'

interface SidebarProps {
  active: Page
  setActive: (p: Page) => void
  counts: { bookings: number; drivers: number }
  adminName: string | null
  adminPhone: string
  onSignOut: () => void
  onEditProfile: () => void
}

export const Sidebar = ({ active, setActive, counts, adminName, adminPhone, onSignOut, onEditProfile }: SidebarProps) => {
  const [profileOpen, setProfileOpen] = React.useState(false)

  const items: { id: Page; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Icons.dashboard },
    { id: 'bookings',  label: 'Bookings',  icon: Icons.bookings,  badge: counts.bookings },
    { id: 'drivers',   label: 'Drivers',   icon: Icons.drivers,   badge: counts.drivers },
    { id: 'vehicles',  label: 'Vehicles',  icon: Icons.vehicles },
    { id: 'customers', label: 'Customers', icon: Icons.customers },
    { id: 'leads',     label: 'Leads',     icon: Icons.funnel },
    { id: 'pricing',   label: 'Pricing',   icon: Icons.pricing },
    { id: 'invoices',  label: 'Invoices',  icon: Icons.invoice },
    { id: 'team',      label: 'Admin users', icon: Icons.drivers },
    { id: 'settings',  label: 'Settings',  icon: Icons.settings },
  ]

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
          <span style={{ fontSize: 10.5, color: YL.ink2 }}>Admin</span>
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
  onSignOut: () => void
  onEditProfile: () => void
}

export const MobileNav = ({ active, setActive, counts, adminName, adminPhone, onSignOut, onEditProfile }: MobileNavProps) => {
  const [moreOpen, setMoreOpen] = React.useState(false)

  const primary: { id: Page; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Home',     icon: Icons.dashboard },
    { id: 'bookings',  label: 'Bookings', icon: Icons.bookings, badge: counts.bookings },
    { id: 'drivers',   label: 'Drivers',  icon: Icons.drivers,  badge: counts.drivers },
    { id: 'leads',     label: 'Leads',    icon: Icons.funnel },
  ]

  const secondary: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: 'vehicles',  label: 'Vehicles',    icon: Icons.vehicles },
    { id: 'customers', label: 'Customers',   icon: Icons.customers },
    { id: 'pricing',   label: 'Pricing',     icon: Icons.pricing },
    { id: 'invoices',  label: 'Invoices',    icon: Icons.invoice },
    { id: 'team',      label: 'Admin users', icon: Icons.drivers },
    { id: 'settings',  label: 'Settings',    icon: Icons.settings },
  ]

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
                <div style={{ fontSize: 11, color: YL.ink3 }}>Admin</div>
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

// ─── Modal primitives ─────────────────────────────────────────────────────

export const ModalShell = ({ open, onClose, width = 720, children }: any) => {
  if (!open) return null
  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(43,39,32,0.5)', zIndex: 100 }}/>
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width, maxHeight: '90vh', background: YL.card, borderRadius: 14, zIndex: 101,
        display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(43,39,32,0.3)',
        overflow: 'hidden',
      }}>
        {children}
      </div>
    </>
  )
}

export const ModalHeader = ({ title, subtitle, onClose, accent = true }: any) => (
  <div style={{
    padding: '18px 24px', borderBottom: `1px solid ${YL.line}`,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: accent ? YL.yellow : YL.card,
  }}>
    <Stack gap={3}>
      <div style={{ fontSize: 17, fontWeight: 700, color: YL.ink, letterSpacing: -0.3 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: YL.ink2 }}>{subtitle}</div>}
    </Stack>
    <button onClick={onClose} style={{
      width: 30, height: 30, background: 'transparent',
      border: `1.5px solid ${YL.ink}`, borderRadius: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: YL.ink,
    }}>
      <span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.close}</span>
    </button>
  </div>
)

export const Stepper = ({ steps, current }: { steps: string[]; current: number }) => (
  <div style={{ display: 'flex', alignItems: 'center', padding: '14px 24px', borderBottom: `1px solid ${YL.line}`, background: YL.bg }}>
    {steps.map((s, i) => {
      const done = i < current, active = i === current
      return (
        <React.Fragment key={s}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: done ? YL.ink : active ? YL.yellow : YL.line,
              color: done ? YL.yellow : active ? YL.ink : YL.ink3,
              fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>
              {done ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: 12.5, fontWeight: active ? 600 : 400, color: active ? YL.ink : YL.ink3, whiteSpace: 'nowrap' }}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 1.5, background: i < current ? YL.ink : YL.line, margin: '0 10px' }}/>
          )}
        </React.Fragment>
      )
    })}
  </div>
)

export const FieldLabel = ({ children, required, hint }: { children: React.ReactNode; required?: boolean; hint?: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <span style={{ fontSize: 12.5, fontWeight: 600, color: YL.ink, whiteSpace: 'nowrap' }}>{children}</span>
    {required && <span style={{ fontSize: 10, color: YL.gulmohar, fontWeight: 700 }}>*</span>}
    {hint && <span style={{ fontSize: 11, color: YL.ink3 }}>({hint})</span>}
  </div>
)

export const TilePicker = ({ value, onChange, options, columns = 2 }: any) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 8 }}>
    {options.map((o: any) => (
      <button key={o.value} onClick={() => onChange(o.value)} style={{
        padding: '12px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        background: value === o.value ? YL.yellow : YL.bg,
        border: `1.5px solid ${value === o.value ? YL.yellowDeep : YL.line}`,
        borderRadius: 10, cursor: 'pointer', textAlign: 'left', width: '100%',
      }}>
        <Stack gap={3}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: YL.ink, fontFamily: '"Bricolage Grotesque", system-ui' }}>{o.label}</div>
          {o.desc && <div style={{ fontSize: 11.5, color: YL.ink2 }}>{o.desc}</div>}
        </Stack>
        {o.price && <Mono size={14} weight={600}>{o.price}</Mono>}
      </button>
    ))}
  </div>
)

export const FormInput = ({ label, required, hint, placeholder, value, onChange, type = 'text', icon, prefix, suffix, style }: any) => (
  <Stack gap={6}>
    {label && <FieldLabel required={required} hint={hint}>{label}</FieldLabel>}
    <div style={{ display: 'flex', alignItems: 'center', height: 36, padding: '0 12px', background: YL.card, border: `1px solid ${YL.line}`, borderRadius: 8, ...style }}>
      {prefix && <Mono size={13} color={YL.ink2} style={{ marginRight: 6 }}>{prefix}</Mono>}
      {icon && <span style={{ color: YL.ink3, display: 'flex', marginRight: 8 }}>{icon}</span>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 13, color: YL.ink, minWidth: 0 }}
      />
      {suffix && <Mono size={12} color={YL.ink2} style={{ marginLeft: 6 }}>{suffix}</Mono>}
    </div>
  </Stack>
)

// ─── DateTimePicker ───────────────────────────────────────────────────────

const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DOW_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa']

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000 // UTC+5:30

// All datetimes are stored/displayed in IST.
// Naive ISO strings ("YYYY-MM-DDTHH:MM") are always interpreted as IST.
// UTC ISO strings (ending in Z or +offset) are converted to IST for display.

// Parse any ISO string → IST components. Handles both UTC (with Z) and naive (treat as IST).
function getISTComponents(iso: string): { y: number; mo: number; d: number; h: number; mi: number } | null {
  if (!iso) return null
  const p = (n: number) => String(n).padStart(2, '0')
  if (iso.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(iso)) {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return null
    const ist = new Date(d.getTime() + IST_OFFSET_MS)
    return { y: ist.getUTCFullYear(), mo: ist.getUTCMonth(), d: ist.getUTCDate(), h: ist.getUTCHours(), mi: ist.getUTCMinutes() }
  }
  // Naive string — treat as IST
  const [datePart, timePart = '00:00'] = iso.split('T')
  const [y, mo, day] = datePart.split('-').map(Number)
  const [h, mi] = timePart.split(':').map(Number)
  if (!y || !mo || !day) return null
  return { y, mo: mo - 1, d: day, h: h || 0, mi: mi || 0 }
  void p // suppress unused warning
}

// Format naive IST components → "YYYY-MM-DDTHH:MM" (for picker values)
function fmtISTISO(y: number, mo: number, d: number, h: number, mi: number): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${y}-${p(mo+1)}-${p(d)}T${p(h)}:${p(mi)}`
}

// Format date-only naive ISO → "YYYY-MM-DD"
function fmtDateISO(y: number, mo: number, d: number): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${y}-${p(mo+1)}-${p(d)}`
}

// Convert UTC Date → IST naive ISO "YYYY-MM-DDTHH:MM" (use when receiving UTC dates from server)
export function toISTISO(d: Date): string {
  const ist = new Date(d.getTime() + IST_OFFSET_MS)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${ist.getUTCFullYear()}-${p(ist.getUTCMonth()+1)}-${p(ist.getUTCDate())}T${p(ist.getUTCHours())}:${p(ist.getUTCMinutes())}`
}

// Keep old name as alias so existing callers compile
export const toLocalISO = toISTISO

// Convert IST naive ISO → UTC Date (use when sending to server)
export function fromISTISO(iso: string): Date {
  return new Date(iso.length === 16 ? iso + ':00+05:30' : iso + '+05:30')
}

function fmtDT(iso: string) {
  const c = getISTComponents(iso)
  if (!c) return ''
  const ap = c.h >= 12 ? 'PM' : 'AM'
  return `${c.d} ${MONTHS_LONG[c.mo].slice(0,3)} ${c.y} · ${c.h%12||12}:${String(c.mi).padStart(2,'0')} ${ap}`
}

function fmtDateOnly(iso: string) {
  const c = getISTComponents(iso)
  if (!c) return ''
  return `${c.d} ${MONTHS_LONG[c.mo].slice(0,3)} ${c.y}`
}

const CalIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)

interface PickerPopupProps {
  anchor: { top: number; left: number; above: boolean; width: number }
  viewYear: number; viewMonth: number
  selY: number | null; selM: number | null; selD: number | null
  selH: number; selMin: number
  showTime: boolean
  onPrevMonth: () => void; onNextMonth: () => void
  onPickDay: (d: number) => void
  onAdjH: (delta: number) => void; onAdjM: (delta: number) => void
  onToggleAP: (pm: boolean) => void
  onPickTime: (h: number, m: number) => void
  onDone: () => void
}

function CalendarPopup({ anchor, viewYear, viewMonth, selY, selM, selD, selH, selMin, showTime, onPrevMonth, onNextMonth, onPickDay, onAdjH, onAdjM, onToggleAP, onPickTime, onDone }: PickerPopupProps) {
  const today = new Date()
  const firstDow = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate()
  const cells: (number|null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const POPUP_W = 304
  const style: React.CSSProperties = {
    position: 'fixed',
    width: POPUP_W,
    background: '#FFFFFF',
    border: '1.5px solid #E2DDD7',
    borderRadius: 16,
    boxShadow: '0 12px 48px rgba(43,39,32,0.22)',
    zIndex: 9991,
    fontFamily: '"Bricolage Grotesque", system-ui',
    overflowY: 'auto',
  }
  if (anchor.above) {
    style.bottom = window.innerHeight - anchor.top + 4
    style.left = Math.min(anchor.left, window.innerWidth - POPUP_W - 12)
    style.maxHeight = anchor.top - 16
  } else {
    style.top = anchor.top + 4
    style.left = Math.min(anchor.left, window.innerWidth - POPUP_W - 12)
    style.maxHeight = window.innerHeight - (anchor.top + 4) - 12
  }

  const navBtn: React.CSSProperties = {
    background: '#F6F3EB', border: 'none', borderRadius: 8,
    width: 32, height: 32, cursor: 'pointer', fontSize: 17, color: '#2B2720',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
    fontFamily: 'inherit', lineHeight: 1,
  }
  const spinBtn = (onClick: () => void, label: string) => (
    <button onClick={onClick} style={{
      background: '#F6F3EB', border: 'none', borderRadius: 8,
      width: 44, height: 34, cursor: 'pointer', fontSize: 14, color: '#2B2720',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
      fontFamily: 'inherit',
    }}>{label}</button>
  )

  return ReactDOM.createPortal(
    <>
      <div onClick={onDone} style={{ position: 'fixed', inset: 0, zIndex: 9990 }}/>
      <div style={style}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', borderBottom: '1px solid #F0ECE4' }}>
          <button onClick={onPrevMonth} style={navBtn}>‹</button>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#2B2720', letterSpacing: 0.2 }}>{MONTHS_LONG[viewMonth]} {viewYear}</span>
          <button onClick={onNextMonth} style={navBtn}>›</button>
        </div>

        <div style={{ padding: '10px 12px 0' }}>
          {/* DOW headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
            {DOW_SHORT.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: '#B0A898', padding: '2px 0', letterSpacing: 0.3 }}>{d}</div>)}
          </div>

          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} style={{ height: 36 }}/>
              const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()
              const isSel = day === selD && viewMonth === selM && viewYear === selY
              return (
                <button key={i} onClick={() => onPickDay(day)} style={{
                  border: 'none', borderRadius: 9, height: 36, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13.5, fontWeight: isSel ? 700 : isToday ? 600 : 400,
                  background: isSel ? '#FFD84A' : isToday ? '#FFF5C2' : 'transparent',
                  color: '#2B2720',
                  boxShadow: isToday && !isSel ? 'inset 0 0 0 1.5px #D4A800' : 'none',
                }}>{day}</button>
              )
            })}
          </div>
        </div>

        {showTime && (
          <>
            {/* Time row */}
            <div style={{ margin: '10px 12px 0', paddingTop: 12, borderTop: '1px solid #F0ECE4' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#B0A898', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>Time</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Hour column */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  {spinBtn(() => onAdjH(1), '▲')}
                  <div style={{ width: 44, textAlign: 'center', fontWeight: 700, fontSize: 26, color: '#2B2720', lineHeight: 1, fontFamily: '"JetBrains Mono", monospace' }}>
                    {String(selH%12||12).padStart(2,'0')}
                  </div>
                  {spinBtn(() => onAdjH(-1), '▼')}
                </div>
                <span style={{ fontSize: 26, fontWeight: 700, color: '#2B2720', lineHeight: 1, fontFamily: '"JetBrains Mono", monospace', marginBottom: 2 }}>:</span>
                {/* Minute column */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  {spinBtn(() => onAdjM(15), '▲')}
                  <div style={{ width: 44, textAlign: 'center', fontWeight: 700, fontSize: 26, color: '#2B2720', lineHeight: 1, fontFamily: '"JetBrains Mono", monospace' }}>
                    {String(selMin).padStart(2,'0')}
                  </div>
                  {spinBtn(() => onAdjM(-15), '▼')}
                </div>
                {/* AM/PM */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 4 }}>
                  {(['AM','PM'] as const).map(ap => {
                    const active = ap === 'AM' ? selH < 12 : selH >= 12
                    return (
                      <button key={ap} onClick={() => onToggleAP(ap === 'PM')} style={{
                        border: `1.5px solid ${active ? '#2B2720' : '#E2DDD7'}`,
                        borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                        background: active ? '#2B2720' : '#F6F3EB', color: active ? '#FFD84A' : '#9E9A91',
                        fontFamily: 'inherit', letterSpacing: 0.3,
                      }}>{ap}</button>
                    )
                  })}
                </div>
                {/* Quick-pick common times */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                  {[[6,0],[12,0],[18,0],[21,0]].map(([h,m]) => {
                    const ap = h >= 12 ? 'PM' : 'AM'; const hh = h%12||12
                    const active = selH === h && selMin === m
                    return (
                      <button key={h} onClick={() => onPickTime(h, m)} style={{
                        padding: '3px 8px', border: `1px solid ${active ? '#2B2720' : '#E2DDD7'}`,
                        borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: active ? 700 : 400,
                        background: active ? '#2B2720' : 'transparent', color: active ? '#FFD84A' : '#736E65',
                        fontFamily: '"JetBrains Mono", monospace',
                      }}>{hh}:00 {ap}</button>
                    )
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Done button */}
        <div style={{ padding: '12px 12px 14px' }}>
          <button onClick={onDone} style={{
            width: '100%', background: '#FFD84A', border: 'none', borderRadius: 10,
            padding: '10px 0', fontWeight: 700, fontSize: 13.5, color: '#2B2720', cursor: 'pointer', fontFamily: 'inherit',
          }}>Done</button>
        </div>
      </div>
    </>,
    document.body
  )
}

function usePickerState(value: string, _hasTime: boolean) {
  const parts = value ? getISTComponents(value) : null
  const isValid = !!parts
  const nowIST = getISTComponents(new Date().toISOString())!
  const [viewYear, setViewYear] = React.useState(() => isValid ? parts!.y : nowIST.y)
  const [viewMonth, setViewMonth] = React.useState(() => isValid ? parts!.mo : nowIST.mo)
  React.useEffect(() => {
    if (isValid) { setViewYear(parts!.y); setViewMonth(parts!.mo) }
  }, [value])
  return { isValid, parts, viewYear, viewMonth, setViewYear, setViewMonth }
}

export const DateTimePicker = ({ label, required, value, onChange }: { label?: string; required?: boolean; value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = React.useState(false)
  const [anchor, setAnchor] = React.useState<{ top: number; left: number; above: boolean; width: number } | null>(null)
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const { isValid, parts, viewYear, viewMonth, setViewYear, setViewMonth } = usePickerState(value, true)

  const selY = isValid ? parts!.y : null
  const selM = isValid ? parts!.mo : null
  const selD = isValid ? parts!.d : null
  const selH = isValid ? parts!.h : 8
  const selMin = isValid ? parts!.mi : 0

  const openPicker = () => {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    const POPUP_H = 480
    const above = r.bottom + POPUP_H + 8 > window.innerHeight && r.top > POPUP_H
    setAnchor({ top: above ? r.top : r.bottom, left: r.left, above, width: r.width })
    setOpen(true)
  }

  // Emit IST naive ISO directly from IST components — no browser timezone involved
  const emit = (y: number, mo: number, d: number, h: number, mi: number) =>
    onChange(fmtISTISO(y, mo, d, h, mi))

  const pickDay = (day: number) => emit(viewYear, viewMonth, day, selH, selMin)
  const adjH = (delta: number) => emit(selY??viewYear, selM??viewMonth, selD??1, (selH+delta+24)%24, selMin)
  const adjM = (delta: number) => {
    const newMin = ((selMin + delta) % 60 + 60) % 60
    emit(selY??viewYear, selM??viewMonth, selD??1, selH, newMin)
  }
  const pickTime = (h: number, m: number) => emit(selY??viewYear, selM??viewMonth, selD??1, h, m)
  const toggleAP = (pm: boolean) => emit(selY??viewYear, selM??viewMonth, selD??1, pm?(selH%12)+12:selH%12, selMin)
  const prevMonth = () => { const d = new Date(viewYear, viewMonth > 0 ? viewMonth-1 : 11, 1); setViewYear(d.getFullYear()); setViewMonth(viewMonth > 0 ? viewMonth-1 : 11); if (viewMonth === 0) setViewYear(viewYear-1) }
  const nextMonth = () => { const d = new Date(viewYear, viewMonth < 11 ? viewMonth+1 : 0, 1); setViewYear(d.getFullYear()); setViewMonth(viewMonth < 11 ? viewMonth+1 : 0); if (viewMonth === 11) setViewYear(viewYear+1) }

  return (
    <Stack gap={6}>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      <div ref={triggerRef} onClick={openPicker} style={{
        display: 'flex', alignItems: 'center', height: 40, padding: '0 12px',
        background: '#FFFFFF', border: `1.5px solid ${open ? '#2B2720' : '#E2DDD7'}`, borderRadius: 10,
        cursor: 'pointer', userSelect: 'none', transition: 'border-color 120ms',
      }}>
        <span style={{ color: '#B0A898', marginRight: 8, display: 'flex' }}><CalIcon/></span>
        <span style={{ flex: 1, fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 13, color: isValid ? '#2B2720' : '#B0A898' }}>
          {isValid ? fmtDT(value) : 'Pick date & time'}
        </span>
        <span style={{ fontSize: 10, color: '#B0A898', marginLeft: 4 }}>▾</span>
      </div>
      {open && anchor && (
        <CalendarPopup
          anchor={anchor} viewYear={viewYear} viewMonth={viewMonth}
          selY={selY} selM={selM} selD={selD} selH={selH} selMin={selMin}
          showTime={true}
          onPrevMonth={prevMonth} onNextMonth={nextMonth}
          onPickDay={pickDay} onAdjH={adjH} onAdjM={adjM} onToggleAP={toggleAP}
          onPickTime={pickTime}
          onDone={() => setOpen(false)}
        />
      )}
    </Stack>
  )
}

export const DatePicker = ({ label, required, value, onChange, placeholder }: { label?: string; required?: boolean; value: string; onChange: (v: string) => void; placeholder?: string }) => {
  const [open, setOpen] = React.useState(false)
  const [anchor, setAnchor] = React.useState<{ top: number; left: number; above: boolean; width: number } | null>(null)
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const { isValid, parts, viewYear, viewMonth, setViewYear, setViewMonth } = usePickerState(value, false)

  const selY = isValid ? parts!.y : null
  const selM = isValid ? parts!.mo : null
  const selD = isValid ? parts!.d : null

  const openPicker = () => {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    const POPUP_H = 310
    const above = r.bottom + POPUP_H + 8 > window.innerHeight && r.top > POPUP_H
    setAnchor({ top: above ? r.top : r.bottom, left: r.left, above, width: r.width })
    setOpen(true)
  }

  const pickDay = (day: number) => {
    onChange(fmtDateISO(viewYear, viewMonth, day))
    setOpen(false)
  }
  const prevMonth = () => { setViewMonth(m => { if (m > 0) return m-1; setViewYear(y => y-1); return 11 }) }
  const nextMonth = () => { setViewMonth(m => { if (m < 11) return m+1; setViewYear(y => y+1); return 0 }) }

  return (
    <Stack gap={6}>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      <div ref={triggerRef} onClick={openPicker} style={{
        display: 'flex', alignItems: 'center', height: 40, padding: '0 12px',
        background: '#FFFFFF', border: `1.5px solid ${open ? '#2B2720' : '#E2DDD7'}`, borderRadius: 10,
        cursor: 'pointer', userSelect: 'none', transition: 'border-color 120ms',
      }}>
        <span style={{ color: '#B0A898', marginRight: 8, display: 'flex' }}><CalIcon/></span>
        <span style={{ flex: 1, fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 13, color: isValid ? '#2B2720' : '#B0A898' }}>
          {isValid ? fmtDateOnly(value) : (placeholder || 'Pick a date')}
        </span>
        <span style={{ fontSize: 10, color: '#B0A898', marginLeft: 4 }}>▾</span>
      </div>
      {open && anchor && (
        <CalendarPopup
          anchor={anchor} viewYear={viewYear} viewMonth={viewMonth}
          selY={selY} selM={selM} selD={selD} selH={0} selMin={0}
          showTime={false}
          onPrevMonth={prevMonth} onNextMonth={nextMonth}
          onPickDay={pickDay} onAdjH={() => {}} onAdjM={() => {}} onToggleAP={() => {}} onPickTime={() => {}}
          onDone={() => setOpen(false)}
        />
      )}
    </Stack>
  )
}

// ─── Format helpers ───────────────────────────────────────────────────────

export const fmtTime = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const c = getISTComponents(iso)
  if (!c) return '—'
  const ampm = c.h >= 12 ? 'PM' : 'AM'
  return `${c.h % 12 || 12}:${String(c.mi).padStart(2, '0')} ${ampm}`
}

export const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const c = getISTComponents(iso)
  if (!c) return '—'
  const nowIST = getISTComponents(new Date().toISOString())!
  const diff = Math.round((new Date(c.y, c.mo, c.d).getTime() - new Date(nowIST.y, nowIST.mo, nowIST.d).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  const dd = String(c.d).padStart(2, '0')
  const mm = String(c.mo + 1).padStart(2, '0')
  const yyyy = c.y
  return `${dd}/${mm}/${yyyy}`
}

export const fmtINR = (n: number | null | undefined) =>
  n == null ? '—' : `₹${n.toLocaleString('en-IN')}`

// Known country code prefixes (longest first for greedy match)
const CC_FORMATS: [string, (rest: string) => string][] = [
  ['+971', r => `+971 ${r.slice(0,2)} ${r.slice(2,5)} ${r.slice(5)}`],  // UAE
  ['+44',  r => `+44 ${r.slice(0,4)} ${r.slice(4)}`],                   // UK
  ['+91',  r => `+91 ${r.slice(0,5)} ${r.slice(5)}`],                   // India
  ['+65',  r => `+65 ${r.slice(0,4)} ${r.slice(4)}`],                   // Singapore
  ['+61',  r => `+61 ${r.slice(0,3)} ${r.slice(3,6)} ${r.slice(6)}`],   // Australia
  ['+1',   r => `+1 ${r.slice(0,3)} ${r.slice(3,6)} ${r.slice(6)}`],    // US/Canada
]
const CC_DIGITS: [string, number][] = [
  ['971', 9], ['44', 10], ['91', 10], ['65', 8], ['61', 9], ['1', 10],
]

export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return '—'
  const digits = raw.replace(/\D/g, '')
  for (const [cc, len] of CC_DIGITS) {
    if (digits.startsWith(cc) && digits.length === cc.length + len) {
      const rest = digits.slice(cc.length)
      const fmt = CC_FORMATS.find(([p]) => p === `+${cc}`)
      return fmt ? fmt[1](rest) : `+${cc} ${rest}`
    }
  }
  return raw
}

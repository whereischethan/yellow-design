import React from 'react'

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

// ─── Sidebar ──────────────────────────────────────────────────────────────

export type Page = 'dashboard' | 'bookings' | 'drivers' | 'vehicles' | 'customers' | 'leads' | 'pricing'

interface SidebarProps {
  active: Page
  setActive: (p: Page) => void
  counts: { bookings: number; drivers: number }
}

export const Sidebar = ({ active, setActive, counts }: SidebarProps) => {
  const items: { id: Page; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Icons.dashboard },
    { id: 'bookings',  label: 'Bookings',  icon: Icons.bookings,  badge: counts.bookings },
    { id: 'drivers',   label: 'Drivers',   icon: Icons.drivers,   badge: counts.drivers },
    { id: 'vehicles',  label: 'Vehicles',  icon: Icons.vehicles },
    { id: 'customers', label: 'Customers', icon: Icons.customers },
    { id: 'leads',     label: 'Leads',     icon: Icons.funnel },
    { id: 'pricing',   label: 'Pricing',   icon: Icons.pricing },
  ]
  return (
    <div style={{ width: 224, background: YL.yellow, color: YL.ink, display: 'flex', flexDirection: 'column', padding: '18px 14px', flexShrink: 0, borderRight: `1px solid ${YL.yellowDeep}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px 22px' }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: YL.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 32 32">
            <path d="M9 9l5 8M22 9l-8 12M14 17v3" stroke={YL.yellow} strokeWidth="3" strokeLinecap="round" fill="none"/>
          </svg>
        </div>
        <Stack gap={1}>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3, color: YL.ink }}>Yellow</span>
          <span style={{ fontSize: 10, color: YL.ink, opacity: 0.55, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 600 }}>Ops console</span>
        </Stack>
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
            {it.badge != null && (
              <span style={{ marginLeft: 'auto', fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5, background: active === it.id ? YL.yellow : YL.ink, color: active === it.id ? YL.ink : YL.yellow, padding: '2px 7px', borderRadius: 999, fontWeight: 600 }}>
                {it.badge}
              </span>
            )}
          </button>
        ))}
      </Stack>

      <div style={{ flex: 1 }}/>

      <div style={{ padding: '10px 12px', background: 'rgba(43,39,32,0.06)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: YL.leaf, animation: 'yl-pulse-ring 1.8s ease-in-out infinite' }}/>
        <Stack gap={1}>
          <span style={{ fontSize: 11.5, color: YL.ink, fontWeight: 600 }}>System live</span>
          <span style={{ fontSize: 10.5, color: YL.ink2, fontFamily: '"JetBrains Mono", monospace' }}>BLR · ops</span>
        </Stack>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 6px 4px', borderTop: '1px solid rgba(43,39,32,0.12)' }}>
        <div style={{ width: 28, height: 28, borderRadius: 999, background: YL.ink, color: YL.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 700 }}>AN</div>
        <Stack gap={1} style={{ minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: 12.5, color: YL.ink, fontWeight: 600 }}>Anjali N.</span>
          <span style={{ fontSize: 10.5, color: YL.ink2 }}>Ops · Admin</span>
        </Stack>
      </div>
    </div>
  )
}

// ─── Format helpers ───────────────────────────────────────────────────────

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

// ─── Format helpers ───────────────────────────────────────────────────────

export const fmtTime = (iso: string) => {
  const d = new Date(iso)
  const h = d.getHours(), m = d.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh = h % 12 || 12
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`
}

export const fmtDate = (iso: string) => {
  const d = new Date(iso)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(d); target.setHours(0, 0, 0, 0)
  const diff = (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export const fmtINR = (n: number) => `₹${n.toLocaleString('en-IN')}`

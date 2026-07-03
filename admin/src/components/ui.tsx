import React from 'react'
import ReactDOM from 'react-dom'
import { YL, STATUS_STYLE, Icons } from './ui-tokens'
import { getISTComponents, fmtISTISO, fmtDateISO } from './format'

export * from './ui-tokens'
export * from './nav'
export * from './format'
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

export const PageHeader = ({ title, subtitle, actions, children }: any) => {
  const isMob = useIsMobile()
  return (
    <div style={{ padding: isMob ? '14px 16px 12px' : '22px 28px 18px', borderBottom: `1px solid ${YL.line}`, background: YL.bg, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: isMob ? 'center' : 'flex-end', gap: 12, justifyContent: 'space-between' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontFamily: '"Bricolage Grotesque", system-ui', fontSize: isMob ? 20 : 26, fontWeight: 600, letterSpacing: -0.5, color: YL.ink, lineHeight: 1.1 }}>{title}</h1>
          {subtitle && <div style={{ marginTop: 4, fontSize: isMob ? 12 : 13.5, color: YL.ink2 }}>{subtitle}</div>}
          {children}
        </div>
        {actions && !isMob && <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{actions}</div>}
        {actions && isMob && <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>{actions}</div>}
      </div>
    </div>
  )
}

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
// ─── Modal primitives ─────────────────────────────────────────────────────

export const ModalShell = ({ open, onClose, width = 720, children }: any) => {
  const isMob = useIsMobile()
  // Esc closes any open modal/drawer
  React.useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, onClose])
  if (!open) return null
  if (isMob) {
    return ReactDOM.createPortal(
      <>
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(43,39,32,0.5)', zIndex: 200 }}/>
        <div style={{
          position: 'fixed', bottom: 60, left: 0, right: 0,
          maxHeight: 'calc(90vh - 60px)',
          background: YL.card, borderRadius: '16px 16px 0 0', zIndex: 201,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 -8px 40px rgba(43,39,32,0.24)',
          animation: 'yl-slide-up 240ms cubic-bezier(0.32,0.72,0,1)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {children}
        </div>
      </>,
      document.body
    )
  }
  return ReactDOM.createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(43,39,32,0.5)', zIndex: 200 }}/>
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width, maxHeight: '90vh', background: YL.card, borderRadius: 14, zIndex: 201,
        display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(43,39,32,0.3)',
        overflow: 'hidden',
      }}>
        {children}
      </div>
    </>,
    document.body
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

  const todayIST = getISTComponents(new Date().toISOString())!
  const selY = isValid ? parts!.y : todayIST.y
  const selM = isValid ? parts!.mo : todayIST.mo
  const selD = isValid ? parts!.d : todayIST.d
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

  const todayIST2 = getISTComponents(new Date().toISOString())!
  const selY = isValid ? parts!.y : todayIST2.y
  const selM = isValid ? parts!.mo : todayIST2.mo
  const selD = isValid ? parts!.d : todayIST2.d

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

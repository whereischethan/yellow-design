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
  no_show:     { bg: YL.redSoft,    fg: YL.redInk,   label: 'No-show' },
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

import type { Booking } from '../../types'
import { YL, Mono, StatusBadge, Avatar, fmtDate, fmtTime, fmtINR } from '../../components/ui'

export function BookingCard({ b, onClick }: { b: Booking; onClick: (b: Booking) => void }) {
  const route = b.tripType === 'pickup'
    ? `BLR ${b.pickup?.terminal} → ${b.drop?.placeName}`
    : `${b.pickup?.placeName} → BLR ${b.drop?.terminal}`
  return (
    <div onClick={() => onClick(b)} style={{ padding: '14px 16px', borderBottom: `1px solid ${YL.line}`, cursor: 'pointer', background: YL.card, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Mono size={12.5} weight={600}>{b.tripCode}</Mono>
        <StatusBadge status={b.status} size="sm"/>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', background: b.tripType === 'pickup' ? YL.greenSoft : YL.yellowSoft, color: b.tripType === 'pickup' ? YL.greenInk : YL.ink, padding: '2px 6px', borderRadius: 3, marginLeft: 2 }}>
          {b.tripType === 'pickup' ? '← Pickup' : 'Drop →'}
        </span>
        <Mono size={12} weight={500} style={{ marginLeft: 'auto' }}>{fmtINR(b.pricing?.totalPrice ?? 0)}</Mono>
      </div>
      <div style={{ fontSize: 13, color: YL.ink, lineHeight: 1.4, display: 'flex', alignItems: 'flex-start', gap: 7 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: b.tripType === 'pickup' ? YL.leaf : YL.gulmohar, flexShrink: 0, marginTop: 4 }}/>
        <span>{route}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Mono size={11.5} color={YL.ink2}>{b.pickup?.dateTime ? `${fmtDate(b.pickup.dateTime)} ${fmtTime(b.pickup.dateTime)}` : '—'}</Mono>
          {b.flight && <Mono size={11} color={YL.ink3}>· {b.flight.flightNumber}</Mono>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {b.assignedDriver ? (
            <>
              <Avatar name={b.assignedDriver.name} size={20}/>
              <span style={{ fontSize: 12, color: YL.ink2 }}>{b.assignedDriver.name.split(' ')[0]}</span>
            </>
          ) : (
            <span style={{ fontSize: 11.5, color: YL.ink3, fontStyle: 'italic' }}>Unassigned</span>
          )}
        </div>
      </div>
    </div>
  )
}

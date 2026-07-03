import type { Booking } from '../../types'
import { YL, Icons, Mono, Stack, StatusBadge, Avatar, fmtDate, fmtTime, fmtINR, formatPhone } from '../../components/ui'

export function BookingRow({ b, onClick }: { b: Booking; onClick: (b: Booking) => void }) {
  const route = b.tripType === 'pickup'
    ? `BLR ${b.pickup?.terminal} → ${b.drop?.placeName}`
    : `${b.pickup?.placeName} → BLR ${b.drop?.terminal}`
  return (
    <div onClick={() => onClick(b)} style={{ display: 'grid', gridTemplateColumns: '110px 110px 95px 1fr 165px 145px 90px 28px', gap: 16, padding: '12px 28px', alignItems: 'center', borderBottom: `1px solid ${YL.line}`, cursor: 'pointer', transition: 'background 100ms', background: YL.card }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#FCF8EE')}
      onMouseLeave={(e) => (e.currentTarget.style.background = YL.card)}>
      <Mono size={12.5}>{b.tripCode}</Mono>
      <StatusBadge status={b.status} size="sm"/>
      <Stack gap={2}>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: YL.ink }}>{b.pickup?.dateTime ? fmtDate(b.pickup.dateTime) : '—'}</div>
        <Mono size={11.5} color={YL.ink2}>{b.pickup?.dateTime ? fmtTime(b.pickup.dateTime) : '—'}</Mono>
      </Stack>
      <Stack gap={3}>
        <div style={{ fontSize: 13, color: YL.ink, lineHeight: 1.3, display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: b.tripType === 'pickup' ? YL.leaf : YL.gulmohar, flexShrink: 0 }}/>
          {route}
        </div>
        {b.flight && <Mono size={11} color={YL.ink2}>{b.flight.flightNumber} · {b.flight.airline}</Mono>}
      </Stack>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <Avatar name={b.userName || b.guestName || b.userPhone || '?'} size={24}/>
        <Stack gap={2} style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color: YL.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {b.userName || b.userPhone || b.guestName || `User ${b.userId?.slice(0, 6)}`}
          </div>
          {b.userPhone && <Mono size={10.5} color={YL.ink2}>{formatPhone(b.userPhone)}</Mono>}
        </Stack>
      </div>
      <div>
        {b.assignedDriver ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar name={b.assignedDriver.name} size={22}/>
            <Stack gap={2}>
              <div style={{ fontSize: 12.5, color: YL.ink }}>{b.assignedDriver.name}</div>
              <Mono size={10.5} color={YL.ink2}>{formatPhone(b.assignedDriver.phone)}</Mono>
            </Stack>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: YL.ink3, fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: YL.ink3 }}/>
            Unassigned
          </div>
        )}
      </div>
      <Mono size={12.5} weight={500} style={{ textAlign: 'right' }}>{fmtINR(b.pricing?.totalPrice ?? 0)}</Mono>
      <span style={{ width: 14, height: 14, color: YL.ink3, display: 'flex' }}>{Icons.chevRight}</span>
    </div>
  )
}

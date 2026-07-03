import React from 'react'
import type { Booking, Driver } from '../../types'
import { YL, Icons, Mono, Stack, Button, Input, Card, Avatar, formatPhone } from '../../components/ui'

export function DriverPicker({ booking, drivers, onAssign }: { booking: Booking; drivers: Driver[]; onAssign: (d: Driver | null) => void }) {
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState('')
  const sorted = [...drivers]
    .filter(d => d.name.toLowerCase().includes(q.toLowerCase()) || d.phone.includes(q))
    .sort((a, b) => (({ available: 0, 'on-trip': 1, offline: 2 } as Record<string, number>)[a.status] ?? 3) - (({ available: 0, 'on-trip': 1, offline: 2 } as Record<string, number>)[b.status] ?? 3))

  if (booking.assignedDriver) {
    const d = booking.assignedDriver
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 12, background: YL.bg, borderRadius: 10, border: `1px solid ${YL.line}` }}>
        <Avatar name={d.name} size={36}/>
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: YL.ink }}>{d.name}</div>
          <Mono size={11} color={YL.ink2}>{formatPhone(d.phone)}</Mono>
        </Stack>
        <Button size="sm" variant="ghost" onClick={() => onAssign(null)}>Reassign</Button>
      </div>
    )
  }

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)} style={{ width: '100%', padding: '14px 16px', background: YL.yellow, border: `1px solid ${YL.yellowDeep}`, borderRadius: 10, fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 13, fontWeight: 500, color: YL.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.plus}</span>
          Assign driver
        </button>
      ) : (
        <Card padding={0}>
          <div style={{ padding: '10px 12px', borderBottom: `1px solid ${YL.line}` }}>
            <Input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="Search drivers…" icon={<span style={{ width: 13, height: 13, display: 'flex' }}>{Icons.search}</span>} style={{ height: 30 }}/>
          </div>
          <div style={{ maxHeight: 240, overflow: 'auto' }}>
            {sorted.map(d => {
              const isAvail = d.status === 'available'
              return (
                <button key={d.id} onClick={() => { onAssign(d); setOpen(false) }} disabled={!isAvail} style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: `1px solid ${YL.line}`, display: 'flex', alignItems: 'center', gap: 10, cursor: isAvail ? 'pointer' : 'not-allowed', textAlign: 'left', opacity: isAvail ? 1 : 0.45 }}>
                  <Avatar name={d.name} size={28}/>
                  <Stack gap={2} style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, color: YL.ink, fontWeight: 500 }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: YL.ink2, display: 'flex', gap: 8 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 5, height: 5, borderRadius: 999, background: isAvail ? YL.leaf : d.status === 'on-trip' ? YL.yellowDeep : YL.ink3 }}/>
                        {isAvail ? 'Available' : d.status === 'on-trip' ? 'On trip' : 'Offline'}
                      </span>
                      <Mono size={10.5} color={YL.ink2}>{d.trips} trips</Mono>
                    </div>
                  </Stack>
                </button>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

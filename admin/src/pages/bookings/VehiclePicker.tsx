import React from 'react'
import type { Booking, Vehicle } from '../../types'
import { YL, Icons, Mono, Stack, Button, Input, Card } from '../../components/ui'

export function VehiclePicker({ booking, vehicles, onAssign }: { booking: Booking; vehicles: Vehicle[]; onAssign: (v: Vehicle | null) => void }) {
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState('')
  const filtered = vehicles.filter(v =>
    v.plate.toLowerCase().includes(q.toLowerCase()) ||
    `${v.make} ${v.model}`.toLowerCase().includes(q.toLowerCase())
  )

  if (booking.assignedVehicle) {
    const v = booking.assignedVehicle
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', background: YL.bg, borderRadius: 10, border: `1px solid ${YL.line}` }}>
        <span style={{ width: 14, height: 14, color: YL.ink2, display: 'flex' }}>{Icons.car}</span>
        <Stack gap={2} style={{ flex: 1 }}>
          <Mono size={12}>{v.licensePlate}</Mono>
          <span style={{ fontSize: 11, color: YL.ink2 }}>{v.make} {v.model}</span>
        </Stack>
        <Button size="sm" variant="ghost" onClick={() => onAssign(null)}>Change</Button>
      </div>
    )
  }

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)} style={{ width: '100%', padding: '12px 16px', background: YL.bg, border: `1.5px dashed ${YL.line}`, borderRadius: 10, fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 13, color: YL.ink2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.plus}</span>
          Assign vehicle
        </button>
      ) : (
        <Card padding={0}>
          <div style={{ padding: '10px 12px', borderBottom: `1px solid ${YL.line}` }}>
            <Input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="Search plate or model…" icon={<span style={{ width: 13, height: 13, display: 'flex' }}>{Icons.search}</span>} style={{ height: 30 }}/>
          </div>
          <div style={{ maxHeight: 200, overflow: 'auto' }}>
            {filtered.length === 0 && <div style={{ padding: '14px', fontSize: 12.5, color: YL.ink2, textAlign: 'center' }}>No vehicles found</div>}
            {filtered.map(v => (
              <button key={v.id} onClick={() => { onAssign(v); setOpen(false) }} style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: `1px solid ${YL.line}`, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ width: 14, height: 14, color: YL.ink2, display: 'flex' }}>{Icons.car}</span>
                <Stack gap={2} style={{ flex: 1 }}>
                  <Mono size={12}>{v.plate}</Mono>
                  <span style={{ fontSize: 11, color: YL.ink2 }}>{v.make} {v.model} · {v.color}</span>
                </Stack>
                {v.is_ev === 1 && <span style={{ background: YL.greenSoft, color: YL.greenInk, fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 3 }}>EV</span>}
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

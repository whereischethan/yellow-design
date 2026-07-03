import React from 'react'
import { YL, STATUS_STYLE, Icons, Button } from '../../components/ui'

export function StatusFlow({ status, onChange }: { status: string; onChange: (s: string) => void }) {
  const flow = ['pending', 'confirmed', 'assigned', 'arrived', 'in_progress', 'completed']
  const idx = flow.indexOf(status)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 12 }}>
        {flow.map((s, i) => {
          const done = i < idx, current = i === idx, upcoming = i > idx
          return (
            <React.Fragment key={s}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: 1 }}>
                <div style={{ width: 22, height: 22, borderRadius: 999, background: done ? YL.leaf : current ? YL.yellow : YL.bg, border: `1.5px solid ${done ? YL.leaf : current ? YL.yellowDeep : YL.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: done ? '#fff' : YL.ink }}>
                  {done && <span style={{ width: 10, height: 10, display: 'flex' }}>{Icons.check}</span>}
                  {current && <span style={{ width: 7, height: 7, borderRadius: 999, background: YL.ink }}/>}
                </div>
                <div style={{ fontSize: 9.5, color: upcoming ? YL.ink3 : current ? YL.ink : YL.ink2, fontWeight: current ? 600 : 400, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {STATUS_STYLE[s]?.label.split(' ')[0]}
                </div>
              </div>
              {i < flow.length - 1 && <div style={{ height: 1.5, flex: 1, background: i < idx ? YL.leaf : YL.line, marginTop: -16, marginLeft: -8, marginRight: -8 }}/>}
            </React.Fragment>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
        {idx >= 0 && idx < flow.length - 1 && (
          <Button size="sm" variant="primary" onClick={() => onChange(flow[idx + 1])}>
            Mark as {STATUS_STYLE[flow[idx + 1]]?.label.toLowerCase()}
            <span style={{ width: 12, height: 12, display: 'flex' }}>{Icons.arrowRight}</span>
          </Button>
        )}
        {idx > 0 && status !== 'completed' && (
          <Button size="sm" variant="secondary" onClick={() => onChange(flow[idx - 1])}>
            ← Back to {STATUS_STYLE[flow[idx - 1]]?.label.toLowerCase()}
          </Button>
        )}
        {['assigned', 'arrived'].includes(status) && (
          <Button size="sm" variant="secondary" onClick={() => onChange('no_show')}>Mark no-show</Button>
        )}
        {status !== 'cancelled' && status !== 'completed' && status !== 'no_show' && (
          <Button size="sm" variant="danger" onClick={() => onChange('cancelled')}>Cancel</Button>
        )}
      </div>
    </div>
  )
}

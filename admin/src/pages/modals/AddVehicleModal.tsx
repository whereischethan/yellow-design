import React from 'react'
import type { Driver } from '../../types'
import { createVehicle } from '../../api'
import { YL, Icons, Stack, Button, Input, Avatar, Mono, ModalShell, ModalHeader, FieldLabel, TilePicker, FormInput, DatePicker, formatPhone } from '../../components/ui'

interface AddVehicleModalProps {
  open: boolean
  onClose: () => void
  drivers: Driver[]
  onCreated: () => void
}

export function AddVehicleModal({ open, onClose, drivers, onCreated }: AddVehicleModalProps) {
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')

  const [plate, setPlate] = React.useState('')
  const [make, setMake] = React.useState('Kia')
  const [model, setModel] = React.useState('Carens Clavis')
  const [year, setYear] = React.useState('2024')
  const [color, setColor] = React.useState('Yellow')
  const [classKey, setClassKey] = React.useState('yellowSky')
  const [insuranceExpiry, setInsuranceExpiry] = React.useState('')
  const [fcExpiry, setFcExpiry] = React.useState('')
  const [driverId, setDriverId] = React.useState('')
  const [driverQuery, setDriverQuery] = React.useState('')

  React.useEffect(() => {
    if (open) { setPlate(''); setError(''); setDriverId(''); setDriverQuery(''); setInsuranceExpiry(''); setFcExpiry('') }
  }, [open])

  const matchedDrivers = driverQuery
    ? drivers.filter(d => d.name.toLowerCase().includes(driverQuery.toLowerCase()) || d.phone.includes(driverQuery))
    : drivers.filter(d => d.status === 'available')

  const handleCreate = async () => {
    setSaving(true); setError('')
    try {
      await createVehicle({
        plate: plate.toUpperCase(),
        make, model,
        year: parseInt(year),
        color,
        type: classKey,
        class_key: classKey,
        is_ev: 1,
        insurance_expiry: insuranceExpiry || null,
        fc_expiry: fcExpiry || null,
        driver_id: driverId || null,
        soc: 80, odometer: 0,
      })
      onCreated()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell open={open} onClose={onClose} width={680}>
      <ModalHeader title="Add vehicle" subtitle="Register a new car to the Yellow fleet" onClose={onClose}/>

      <div style={{ padding: 24, overflow: 'auto', flex: 1, minHeight: 0 }}>
        <Stack gap={18}>
          <Stack gap={8}>
            <FieldLabel required>Vehicle class</FieldLabel>
            <TilePicker value={classKey} onChange={setClassKey} options={[
              { value: 'yellowSky',   label: 'Yellow Sky',   desc: 'Airport transfers' },
              { value: 'yellowEarth', label: 'Yellow Earth', desc: 'Outstation / long-distance' },
            ]}/>
          </Stack>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormInput label="Make" required placeholder="Kia, Tata, Toyota…" value={make} onChange={(e: any) => setMake(e.target.value)}/>
            <FormInput label="Model" required placeholder="Carens Clavis, Nexon…" value={model} onChange={(e: any) => setModel(e.target.value)}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <FormInput label="Year" required placeholder="2024" value={year} onChange={(e: any) => setYear(e.target.value)} type="number"/>
            <FormInput label="Color" required placeholder="Yellow" value={color} onChange={(e: any) => setColor(e.target.value)}/>
            <FormInput label="Plate number" required placeholder="KA 01 EV 4521" value={plate} onChange={(e: any) => setPlate(e.target.value)}/>
          </div>

          <div style={{ height: 1, background: YL.line }}/>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <DatePicker label="Insurance expiry" value={insuranceExpiry} onChange={setInsuranceExpiry} placeholder="Not set"/>
            <DatePicker label="FC expiry" value={fcExpiry} onChange={setFcExpiry} placeholder="FC expiry"/>
          </div>

          <div style={{ height: 1, background: YL.line }}/>

          <Stack gap={8}>
            <FieldLabel hint="optional">Assign to driver</FieldLabel>
            <Input value={driverQuery} onChange={(e: any) => setDriverQuery(e.target.value)}
              placeholder="Search driver…"
              icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.search}</span>}/>
            <div style={{ background: YL.bg, border: `1px solid ${YL.line}`, borderRadius: 8, maxHeight: 180, overflow: 'auto' }}>
              <button onClick={() => setDriverId('')} style={{ width: '100%', padding: '9px 12px', display: 'flex', alignItems: 'center', background: driverId === '' ? YL.yellowSoft : 'transparent', border: 'none', borderBottom: `1px solid ${YL.line}`, cursor: 'pointer', textAlign: 'left' }}>
                <Mono size={11.5} color={YL.ink2}>No driver — unassigned</Mono>
              </button>
              {matchedDrivers.map(d => (
                <button key={d.id} onClick={() => setDriverId(d.id)} style={{
                  width: '100%', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 9,
                  background: driverId === d.id ? YL.yellow : 'transparent',
                  border: 'none', borderBottom: `1px solid ${YL.line}`, cursor: 'pointer', textAlign: 'left',
                }}>
                  <Avatar name={d.name} size={24}/>
                  <Stack gap={1} style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: YL.ink }}>{d.name}</div>
                    <Mono size={10.5} color={YL.ink2}>{formatPhone(d.phone)}</Mono>
                  </Stack>
                  <span style={{ fontSize: 11, color: d.status === 'available' ? YL.greenInk : YL.ink3 }}>● {d.status}</span>
                </button>
              ))}
            </div>
          </Stack>

          {error && <div style={{ padding: '10px 14px', background: YL.redSoft, color: YL.redInk, borderRadius: 8, fontSize: 12.5 }}>{error}</div>}
        </Stack>
      </div>

      <div style={{ padding: '14px 24px', borderTop: `1px solid ${YL.line}`, background: YL.bg, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleCreate} disabled={saving || !plate || !make || !model}>
          {saving ? 'Adding…' : 'Add to fleet'}
        </Button>
      </div>
    </ModalShell>
  )
}


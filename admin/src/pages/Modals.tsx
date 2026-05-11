import React from 'react'
import type { Driver, Customer } from '../types'
import { createBooking, createDriver, createVehicle, calcPricing } from '../api'
import { YL, Icons, Stack, Button, Input, Avatar, Mono, ModalShell, ModalHeader, Stepper, FieldLabel, TilePicker, FormInput } from '../components/ui'

const PLACES_KEY = (import.meta as any).env?.VITE_GOOGLE_API_KEY || ''
const BLR_CENTER = { latitude: 12.9716, longitude: 77.5946 }

interface PlaceSuggestion { placeId: string; description: string }

function PlacesInput({ label, value, onChange, onSelect, required }: {
  label: string
  value: string
  onChange: (v: string) => void
  onSelect: (s: PlaceSuggestion) => void
  required?: boolean
}) {
  const [suggestions, setSuggestions] = React.useState<PlaceSuggestion[]>([])
  const [open, setOpen] = React.useState(false)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchSuggestions = async (text: string) => {
    if (text.length < 2) { setSuggestions([]); setOpen(false); return }
    try {
      const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': PLACES_KEY,
          'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text',
        },
        body: JSON.stringify({
          input: text,
          locationBias: { circle: { center: BLR_CENTER, radius: 50000 } },
          includedRegionCodes: ['in'],
        }),
      })
      const data = await res.json()
      const items: PlaceSuggestion[] = (data.suggestions || [])
        .map((s: any) => ({ placeId: s.placePrediction?.placeId, description: s.placePrediction?.text?.text }))
        .filter((s: PlaceSuggestion) => s.placeId && s.description)
      setSuggestions(items)
      setOpen(items.length > 0)
    } catch {
      setSuggestions([]); setOpen(false)
    }
  }

  const handleChange = (v: string) => {
    onChange(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 280)
  }

  const handleSelect = (s: PlaceSuggestion) => {
    onChange(s.description)
    onSelect(s)
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <FormInput
        label={label} required={required}
        placeholder="Area, street, Bangalore"
        value={value}
        onChange={(e: any) => handleChange(e.target.value)}
        icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.pin}</span>}
      />
      {open && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: YL.card, border: `1px solid ${YL.line}`, borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: 220, overflow: 'auto', marginTop: 2 }}>
          {suggestions.map(s => (
            <button key={s.placeId} onClick={() => handleSelect(s)} style={{
              width: '100%', padding: '9px 12px', display: 'block', textAlign: 'left',
              background: 'transparent', border: 'none', borderBottom: `1px solid ${YL.line}`,
              cursor: 'pointer', fontSize: 12.5, color: YL.ink,
              fontFamily: '"Bricolage Grotesque", system-ui',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = YL.bg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              {s.description}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── New Booking Modal ─────────────────────────────────────────────────────

interface CreateBookingModalProps {
  open: boolean
  onClose: () => void
  drivers: Driver[]
  customers: Customer[]
  onCreated: () => void
}

export function CreateBookingModal({ open, onClose, drivers, customers, onCreated }: CreateBookingModalProps) {
  const [step, setStep] = React.useState(0)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')

  // Step 0 - Customer
  const [customerQuery, setCustomerQuery] = React.useState('')
  const [pickedCustomer, setPickedCustomer] = React.useState<Customer | null>(null)
  const [guestName, setGuestName] = React.useState('')
  const [guestPhone, setGuestPhone] = React.useState('')
  const [guestCountryCode, setGuestCountryCode] = React.useState('+91')
  const [isGuest, setIsGuest] = React.useState(false)

  const COUNTRY_CODES = [
    { code: '+91', label: '🇮🇳 +91' },
    { code: '+1', label: '🇺🇸 +1' },
    { code: '+44', label: '🇬🇧 +44' },
    { code: '+971', label: '🇦🇪 +971' },
    { code: '+65', label: '🇸🇬 +65' },
  ]

  // Step 1 - Trip
  const [tripType, setTripType] = React.useState<'drop' | 'pickup'>('drop')
  const [terminal, setTerminal] = React.useState<'T1' | 'T2'>('T2')
  const [address, setAddress] = React.useState('')
  const [addressPlaceId, setAddressPlaceId] = React.useState('')
  const [stops, setStops] = React.useState<Array<{ address: string; placeId: string }>>([])
  const [dateTime, setDateTime] = React.useState('')
  const [flightNumber, setFlightNumber] = React.useState('')
  const [passengers, setPassengers] = React.useState('1')
  const [bags, setBags] = React.useState('0')

  // Step 2 - Vehicle
  const [vehicleType, setVehicleType] = React.useState('yellowSky')
  const [assignedDriverId, setAssignedDriverId] = React.useState('')

  // Pricing
  const [pricingResult, setPricingResult] = React.useState<any>(null)
  const [pricingLoading, setPricingLoading] = React.useState(false)

  const stepNames = ['Customer', 'Trip details', 'Vehicle', 'Confirm']

  React.useEffect(() => {
    if (open) {
      setStep(0); setCustomerQuery(''); setPickedCustomer(null); setIsGuest(false)
      setGuestName(''); setGuestPhone(''); setGuestCountryCode('+91'); setAddress(''); setAddressPlaceId('')
      setStops([]); setDateTime(''); setFlightNumber(''); setPassengers('1'); setBags('0')
      setPricingResult(null); setError('')
    }
  }, [open])

  const matched = customerQuery
    ? customers.filter(c =>
        (c.name || '').toLowerCase().includes(customerQuery.toLowerCase()) ||
        c.phone.includes(customerQuery))
    : customers.slice(0, 6)

  const availableDrivers = drivers.filter(d => d.status === 'available')

  const fetchFare = async () => {
    if (!addressPlaceId) return
    setPricingLoading(true)
    try {
      const stopPlaceIds = stops.filter(s => s.placeId).map(s => s.placeId)
      const result = await calcPricing({ originPlaceId: addressPlaceId, tripType: 'airport', stopPlaceIds })
      setPricingResult(result)
    } catch {
      setPricingResult(null)
    } finally {
      setPricingLoading(false)
    }
  }

  // Fetch fare when reaching confirm step
  const goToStep = (n: number) => {
    setStep(n)
    if (n === 3 && addressPlaceId && !pricingResult) fetchFare()
  }

  const handleCreate = async () => {
    setSaving(true); setError('')
    try {
      const pickup = tripType === 'drop'
        ? { placeName: address, location: address, placeId: addressPlaceId, dateTime: new Date(dateTime).toISOString() }
        : { placeName: `BLR Airport T${terminal}`, location: 'Kempegowda International Airport', dateTime: new Date(dateTime).toISOString(), terminal }
      const drop = tripType === 'drop'
        ? { placeName: `BLR Airport T${terminal}`, location: 'Kempegowda International Airport', terminal }
        : { placeName: address, location: address, placeId: addressPlaceId }

      const assignedDriver = assignedDriverId
        ? drivers.find(d => d.id === assignedDriverId)
        : undefined

      const pricing = pricingResult
        ? {
            distanceKm: pricingResult.distanceKm,
            fareBeforeTax: pricingResult.fareBeforeTax,
            gst: pricingResult.gst,
            toll: pricingResult.toll,
            basePrice: pricingResult.basePrice,
            totalPrice: pricingResult.totalPrice,
          }
        : { distanceKm: 0, basePrice: 0, totalPrice: 0 }

      const stopLocs = stops
        .filter(s => s.placeId)
        .map(s => ({ location: s.address, placeName: s.address, placeId: s.placeId }))

      await createBooking({
        tripType,
        vehicleType,
        passengers: parseInt(passengers),
        luggage: parseInt(bags),
        pickup,
        drop,
        stops: stopLocs.length ? stopLocs : undefined,
        flight: flightNumber ? { flightNumber, airline: '' } : null,
        pricing,
        userId: pickedCustomer?.id,
        guestName: isGuest ? guestName : undefined,
        guestPhone: isGuest ? `${guestCountryCode.replace('+', '')}${guestPhone.replace(/\s/g, '')}` : undefined,
        assignedDriver: assignedDriver ? { id: assignedDriver.id, name: assignedDriver.name, phone: assignedDriver.phone } : undefined,
        status: assignedDriver ? 'assigned' : 'confirmed',
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
    <ModalShell open={open} onClose={onClose} width={720}>
      <ModalHeader title="New booking" subtitle="Create on behalf of customer or as guest" onClose={onClose}/>
      <Stepper steps={stepNames} current={step}/>

      <div style={{ padding: 24, overflow: 'auto', flex: 1, minHeight: 0 }}>
        {step === 0 && (
          <Stack gap={16}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant={!isGuest ? 'primary' : 'secondary'} onClick={() => setIsGuest(false)} size="sm">Existing customer</Button>
              <Button variant={isGuest ? 'primary' : 'secondary'} onClick={() => setIsGuest(true)} size="sm">Guest booking</Button>
            </div>
            {!isGuest ? (
              <>
                <FormInput
                  label="Search customer" required
                  placeholder="Name or phone…"
                  value={customerQuery}
                  onChange={(e: any) => setCustomerQuery(e.target.value)}
                  icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.search}</span>}
                />
                <div style={{ background: YL.bg, border: `1px solid ${YL.line}`, borderRadius: 10, maxHeight: 240, overflow: 'auto' }}>
                  {matched.length === 0 ? (
                    <div style={{ padding: 28, textAlign: 'center', color: YL.ink2, fontSize: 12.5 }}>No customers match.</div>
                  ) : matched.map(c => (
                    <button key={c.id} onClick={() => setPickedCustomer(c)} style={{
                      width: '100%', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 11,
                      background: pickedCustomer?.id === c.id ? YL.yellow : 'transparent',
                      border: 'none', borderBottom: `1px solid ${YL.line}`, cursor: 'pointer', textAlign: 'left',
                    }}>
                      <Avatar name={c.name || c.phone} size={28}/>
                      <Stack gap={2} style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: YL.ink }}>{c.name || '—'}</div>
                        <Mono size={11} color={YL.ink2}>{c.phone} · {c.trip_count} trips</Mono>
                      </Stack>
                      {pickedCustomer?.id === c.id && <span style={{ color: YL.ink, fontSize: 14 }}>✓</span>}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormInput label="Guest name" placeholder="Full name" value={guestName} onChange={(e: any) => setGuestName(e.target.value)}/>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: YL.ink2, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Phone</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select
                      value={guestCountryCode}
                      onChange={e => setGuestCountryCode(e.target.value)}
                      style={{ height: 38, border: `1.5px solid ${YL.line}`, borderRadius: 8, padding: '0 8px', fontFamily: 'inherit', fontSize: 12, color: YL.ink, background: YL.bg, cursor: 'pointer', outline: 'none' }}
                    >
                      {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </select>
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={e => setGuestPhone(e.target.value)}
                      placeholder="number"
                      style={{ flex: 1, height: 38, border: `1.5px solid ${YL.line}`, borderRadius: 8, padding: '0 10px', fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: YL.ink, background: YL.card, outline: 'none' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </Stack>
        )}

        {step === 1 && (
          <Stack gap={16}>
            <Stack gap={8}>
              <FieldLabel required>Trip direction</FieldLabel>
              <TilePicker value={tripType} onChange={setTripType} options={[
                { value: 'drop',   label: 'Drop to airport',   desc: 'Customer location → BLR Airport' },
                { value: 'pickup', label: 'Pickup from airport', desc: 'BLR Airport → Customer location' },
              ]}/>
            </Stack>
            <PlacesInput
              label={tripType === 'drop' ? 'Pickup address' : 'Drop address'}
              required
              value={address}
              onChange={(v) => { setAddress(v); setAddressPlaceId(''); setPricingResult(null) }}
              onSelect={(s) => { setAddress(s.description); setAddressPlaceId(s.placeId) }}
            />

            {/* Stops */}
            {stops.map((stop, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <PlacesInput
                    label={`Stop ${i + 1}`}
                    value={stop.address}
                    onChange={(v) => setStops(s => s.map((x, idx) => idx === i ? { ...x, address: v, placeId: '' } : x))}
                    onSelect={(sel) => setStops(s => s.map((x, idx) => idx === i ? { address: sel.description, placeId: sel.placeId } : x))}
                  />
                </div>
                <button
                  onClick={() => { setStops(s => s.filter((_, idx) => idx !== i)); setPricingResult(null) }}
                  style={{ height: 38, padding: '0 10px', background: YL.bg, border: `1.5px solid ${YL.line}`, borderRadius: 8, cursor: 'pointer', color: YL.ink2, fontSize: 16, fontFamily: 'inherit', marginBottom: 0 }}
                  title="Remove stop"
                >×</button>
              </div>
            ))}
            <button
              onClick={() => setStops(s => [...s, { address: '', placeId: '' }])}
              style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: YL.ink2, fontSize: 12, cursor: 'pointer', padding: '2px 0', fontFamily: 'inherit', letterSpacing: 0.2 }}
            >＋ Add stop</button>

            <Stack gap={8}>
              <FieldLabel required>Airport terminal</FieldLabel>
              <TilePicker value={terminal} onChange={setTerminal} options={[
                { value: 'T1', label: 'BLR T1', desc: 'Domestic + some international' },
                { value: 'T2', label: 'BLR T2', desc: 'New terminal · most flights' },
              ]}/>
            </Stack>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormInput label="Date & time" required placeholder="YYYY-MM-DDTHH:MM" value={dateTime}
                onChange={(e: any) => setDateTime(e.target.value)} type="datetime-local"
                icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.clock}</span>}/>
              <FormInput label="Flight number" hint="optional" placeholder="6E 184" value={flightNumber}
                onChange={(e: any) => setFlightNumber(e.target.value)}
                icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.flight}</span>}/>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormInput label="Passengers" type="number" placeholder="1" value={passengers} onChange={(e: any) => setPassengers(e.target.value)}/>
              <FormInput label="Bags" type="number" placeholder="0" value={bags} onChange={(e: any) => setBags(e.target.value)}/>
            </div>
          </Stack>
        )}

        {step === 2 && (
          <Stack gap={16}>
            <Stack gap={8}>
              <FieldLabel required>Vehicle class</FieldLabel>
              <TilePicker value={vehicleType} onChange={setVehicleType} options={[
                { value: 'yellowSky', label: 'Yellow Sky', desc: 'Kia Carens Clavis · 6 seats' },
              ]}/>
            </Stack>
            <Stack gap={8}>
              <FieldLabel hint="optional">Assign driver now</FieldLabel>
              <div style={{ background: YL.bg, border: `1px solid ${YL.line}`, borderRadius: 10, maxHeight: 200, overflow: 'auto' }}>
                <button onClick={() => setAssignedDriverId('')} style={{
                  width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                  background: assignedDriverId === '' ? YL.yellowSoft : 'transparent',
                  border: 'none', borderBottom: `1px solid ${YL.line}`, cursor: 'pointer', textAlign: 'left',
                }}>
                  <Mono size={11.5} color={YL.ink2}>Leave blank — auto-dispatch later</Mono>
                </button>
                {availableDrivers.map(d => (
                  <button key={d.id} onClick={() => setAssignedDriverId(d.id)} style={{
                    width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                    background: assignedDriverId === d.id ? YL.yellow : 'transparent',
                    border: 'none', borderBottom: `1px solid ${YL.line}`, cursor: 'pointer', textAlign: 'left',
                  }}>
                    <Avatar name={d.name} size={26}/>
                    <Stack gap={2} style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: YL.ink }}>{d.name}</div>
                      <Mono size={10.5} color={YL.ink2}>{d.plate} · {d.rating.toFixed(1)}★</Mono>
                    </Stack>
                    <span style={{ fontSize: 11, color: YL.greenInk }}>● Available</span>
                  </button>
                ))}
              </div>
            </Stack>
          </Stack>
        )}

        {step === 3 && (
          <Stack gap={16}>
            <FieldLabel>Booking summary</FieldLabel>
            <div style={{ background: YL.bg, border: `1px solid ${YL.line}`, borderRadius: 10, overflow: 'hidden' }}>
              {[
                ['Customer', pickedCustomer ? pickedCustomer.name : (isGuest ? guestName || 'Guest' : '—')],
                ['Phone', pickedCustomer ? pickedCustomer.phone : (isGuest ? `${guestCountryCode} ${guestPhone}` : '—')],
                ['Direction', tripType === 'drop' ? `Drop → BLR ${terminal}` : `Pickup ← BLR ${terminal}`],
                ['Address', address || '—'],
                ...stops.filter(s => s.address).map((s, i) => [`Stop ${i + 1}`, s.address]),
                ['Date & time', dateTime || '—'],
                ...(flightNumber ? [['Flight', flightNumber]] : []),
                ['Passengers', `${passengers} pax · ${bags} bags`],
                ['Vehicle', vehicleType === 'yellowSky' ? 'Yellow Sky' : vehicleType],
                ...(assignedDriverId ? [['Driver', drivers.find(d => d.id === assignedDriverId)?.name || '—']] : []),
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${YL.line}`, fontSize: 12.5 }}>
                  <span style={{ color: YL.ink2 }}>{k}</span>
                  <span style={{ color: YL.ink, fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              <div style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: YL.yellow }}>
                <Stack gap={3}>
                  <div style={{ fontSize: 11, color: YL.ink2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Estimated fare</div>
                  {pricingLoading && <div style={{ fontSize: 11, color: YL.ink2 }}>Calculating…</div>}
                  {pricingResult && <div style={{ fontSize: 11, color: YL.ink2 }}>{pricingResult.distanceKm} km · incl. tolls + GST</div>}
                  {!pricingResult && !pricingLoading && !addressPlaceId && <div style={{ fontSize: 11, color: YL.ink2 }}>Select address from dropdown for fare</div>}
                </Stack>
                <Mono size={22} weight={600}>
                  {pricingLoading ? '…' : pricingResult ? `₹${pricingResult.totalPrice.toLocaleString('en-IN')}` : '—'}
                </Mono>
              </div>
            </div>
            {error && <div style={{ padding: '10px 14px', background: YL.redSoft, color: YL.redInk, borderRadius: 8, fontSize: 12.5 }}>{error}</div>}
          </Stack>
        )}
      </div>

      <div style={{ padding: '14px 24px', borderTop: `1px solid ${YL.line}`, background: YL.bg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11.5, color: YL.ink2, whiteSpace: 'nowrap' }}>Step {step + 1} of {stepNames.length}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {step > 0 && <Button variant="secondary" onClick={() => setStep(s => s - 1)}>Back</Button>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          {step < stepNames.length - 1 ? (
            <Button variant="primary" onClick={() => goToStep(step + 1)} disabled={step === 0 && !pickedCustomer && !isGuest}>Continue</Button>
          ) : (
            <Button variant="primary" onClick={handleCreate} disabled={saving}>{saving ? 'Creating…' : 'Create booking'}</Button>
          )}
        </div>
      </div>
    </ModalShell>
  )
}

// ─── Add Driver Modal ──────────────────────────────────────────────────────

interface AddDriverModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function FileUploadRow({ label, hint, value, onChange }: {
  label: string; hint: string; value: string; onChange: (v: string) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const hasFile = !!value

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: hasFile ? YL.greenSoft : YL.bg, border: `1px dashed ${hasFile ? YL.leaf : YL.line}`, borderRadius: 10 }}>
      <input ref={inputRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
        onChange={async e => {
          const file = e.target.files?.[0]
          if (file) { const b64 = await fileToBase64(file); onChange(b64) }
        }}
      />
      <Stack gap={3} style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: YL.ink, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11.5, color: hasFile ? YL.greenInk : YL.ink2 }}>
          {hasFile ? `✓ ${file_display_name(value)}` : `${hint} · PDF or JPG, max 5 MB`}
        </div>
      </Stack>
      <button onClick={() => inputRef.current?.click()} style={{ padding: '6px 12px', background: hasFile ? YL.leaf : YL.card, color: hasFile ? 'white' : YL.ink, border: `1px solid ${hasFile ? YL.leaf : YL.line}`, borderRadius: 6, cursor: 'pointer', fontSize: 11.5, fontWeight: 500 }}>
        {hasFile ? 'Change' : 'Upload'}
      </button>
    </div>
  )
}

function file_display_name(dataUrl: string): string {
  try { return dataUrl.length > 30 ? 'File ready' : dataUrl } catch { return 'File ready' }
}

export function AddDriverModal({ open, onClose, onCreated }: AddDriverModalProps) {
  const [step, setStep] = React.useState(0)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')

  const [name, setName] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [plate, setPlate] = React.useState('')
  const [vehicle, setVehicle] = React.useState('Kia Carens Clavis')
  const [photoUrl, setPhotoUrl] = React.useState('')
  const [docLicense, setDocLicense] = React.useState('')
  const [docAadhaar, setDocAadhaar] = React.useState('')
  const [docPan, setDocPan] = React.useState('')
  const [docPolice, setDocPolice] = React.useState('')
  const [licenseNo, setLicenseNo] = React.useState('')
  const [licenseExp, setLicenseExp] = React.useState('')
  const photoInputRef = React.useRef<HTMLInputElement>(null)

  const stepNames = ['Personal', 'Documents', 'Vehicle & Bank']

  React.useEffect(() => {
    if (open) {
      setStep(0); setName(''); setPhone(''); setPlate(''); setError('')
      setPhotoUrl(''); setDocLicense(''); setDocAadhaar(''); setDocPan(''); setDocPolice('')
      setLicenseNo(''); setLicenseExp('')
    }
  }, [open])

  const handleCreate = async () => {
    setSaving(true); setError('')
    try {
      await createDriver({
        name, phone,
        plate: plate || null,
        vehicle: vehicle || 'Kia Carens Clavis',
        photo_url: photoUrl || null,
        doc_license: docLicense || null,
        doc_aadhaar: docAadhaar || null,
        doc_pan: docPan || null,
        doc_police: docPolice || null,
        license_no: licenseNo || null,
        license_exp: licenseExp || null,
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
    <ModalShell open={open} onClose={onClose} width={720}>
      <ModalHeader title="Add driver" subtitle="Onboard a new driver to the Yellow fleet" onClose={onClose}/>
      <Stepper steps={stepNames} current={step}/>

      <div style={{ padding: 24, overflow: 'auto', flex: 1, minHeight: 0 }}>
        {step === 0 && (
          <Stack gap={16}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                onClick={() => photoInputRef.current?.click()}
                style={{ width: 72, height: 72, borderRadius: 999, background: photoUrl ? 'transparent' : YL.bg, border: `2px dashed ${photoUrl ? YL.leaf : YL.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: YL.ink3, cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}
              >
                {photoUrl
                  ? <img src={photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 999 }} />
                  : <span style={{ width: 22, height: 22, display: 'flex' }}>{Icons.drivers}</span>
                }
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={async e => {
                  const file = e.target.files?.[0]
                  if (file) { const b64 = await fileToBase64(file); setPhotoUrl(b64) }
                }}
              />
              <Stack gap={4}>
                <div style={{ fontSize: 13, color: YL.ink, fontWeight: 500 }}>Profile photo</div>
                <div style={{ fontSize: 11.5, color: YL.ink2 }}>Used in the customer app.</div>
                <button onClick={() => photoInputRef.current?.click()} style={{ marginTop: 4, width: 'fit-content', padding: '6px 12px', background: YL.yellow, color: YL.ink, border: `1px solid ${YL.yellowDeep}`, borderRadius: 6, cursor: 'pointer', fontSize: 11.5, fontWeight: 600 }}>
                  {photoUrl ? 'Change photo' : 'Upload photo'}
                </button>
              </Stack>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormInput label="Full name" required placeholder="As per Aadhaar" value={name} onChange={(e: any) => setName(e.target.value)}/>
              <FormInput label="Phone" required placeholder="+91 …" value={phone} onChange={(e: any) => setPhone(e.target.value)}
                icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.phone}</span>}/>
            </div>
          </Stack>
        )}

        {step === 1 && (
          <Stack gap={16}>
            <div style={{ fontSize: 12, color: YL.ink2, lineHeight: 1.5, background: YL.yellowSoft, padding: '10px 14px', borderRadius: 8, border: `1px solid ${YL.yellowDeep}` }}>
              All documents must be valid for at least 90 days. Driver cannot go live until KYC clears.
            </div>
            <FileUploadRow label="Driving license" hint="Front + back" value={docLicense} onChange={setDocLicense}/>
            <FileUploadRow label="Aadhaar card" hint="Front + back" value={docAadhaar} onChange={setDocAadhaar}/>
            <FileUploadRow label="PAN card" hint="Front" value={docPan} onChange={setDocPan}/>
            <FileUploadRow label="Police verification" hint="PVC certificate" value={docPolice} onChange={setDocPolice}/>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormInput label="License number" required placeholder="KA01 20230012345" value={licenseNo} onChange={(e: any) => setLicenseNo(e.target.value)}/>
              <FormInput label="License expiry" required placeholder="YYYY-MM-DD" value={licenseExp} onChange={(e: any) => setLicenseExp(e.target.value)}/>
            </div>
          </Stack>
        )}

        {step === 2 && (
          <Stack gap={16}>
            <FormInput label="License plate" hint="if assigning now" placeholder="KA 01 EV 4521" value={plate} onChange={(e: any) => setPlate(e.target.value)}/>
            <FormInput label="Vehicle" placeholder="Kia Carens Clavis" value={vehicle} onChange={(e: any) => setVehicle(e.target.value)}/>
            <div style={{ height: 1, background: YL.line, margin: '4px 0' }}/>
            <FieldLabel>Bank details (for payouts)</FieldLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormInput label="Account holder" required placeholder="Full name on account" value="" onChange={() => {}}/>
              <FormInput label="IFSC" required placeholder="HDFC0001234" value="" onChange={() => {}}/>
            </div>
            <FormInput label="Account number" required placeholder="••••• 1234" value="" onChange={() => {}}/>
            <FormInput label="UPI ID" hint="for fast settlements" placeholder="name@bank" value="" onChange={() => {}}/>
            {error && <div style={{ padding: '10px 14px', background: YL.redSoft, color: YL.redInk, borderRadius: 8, fontSize: 12.5 }}>{error}</div>}
          </Stack>
        )}
      </div>

      <div style={{ padding: '14px 24px', borderTop: `1px solid ${YL.line}`, background: YL.bg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11.5, color: YL.ink2, whiteSpace: 'nowrap' }}>Step {step + 1} of {stepNames.length}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {step > 0 && <Button variant="secondary" onClick={() => setStep(s => s - 1)}>Back</Button>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          {step < stepNames.length - 1 ? (
            <Button variant="primary" onClick={() => setStep(s => s + 1)} disabled={step === 0 && (!name || !phone)}>Continue</Button>
          ) : (
            <Button variant="primary" onClick={handleCreate} disabled={saving}>{saving ? 'Saving…' : 'Add driver'}</Button>
          )}
        </div>
      </div>
    </ModalShell>
  )
}

// ─── Add Vehicle Modal ─────────────────────────────────────────────────────

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
            <FormInput label="Insurance expiry" placeholder="YYYY-MM-DD" value={insuranceExpiry} onChange={(e: any) => setInsuranceExpiry(e.target.value)} type="date"/>
            <FormInput label="FC expiry" hint="Fitness Certificate" placeholder="YYYY-MM-DD" value={fcExpiry} onChange={(e: any) => setFcExpiry(e.target.value)} type="date"/>
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
                    <Mono size={10.5} color={YL.ink2}>{d.phone}</Mono>
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

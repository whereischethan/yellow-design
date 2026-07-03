import React from 'react'
import type { PricingConfig } from '../types'
import { getPricing, savePricing } from '../api'
import { YL, Mono, Button, PageHeader } from '../components/ui'

interface Field {
  key: string
  label: string
  prefix?: string
  suffix?: string
  hint: string
}

const SECTIONS: { title: string; color: string; fields: Field[] }[] = [
  {
    title: 'Airport',
    color: '#FFF0A8',
    fields: [
      { key: 'airport_per_km',      label: 'Per km',           prefix: '₹', suffix: '/km', hint: 'Applied to full trip distance' },
      { key: 'airport_trip_charge', label: 'Trip charge',      prefix: '₹',     hint: 'Flat fee per booking (included in fare, not shown separately)' },
      { key: 'airport_toll',        label: 'Toll',             prefix: '₹',     hint: 'Included in GST taxable base' },
      { key: 'airport_gst',         label: 'GST',              suffix: '%',     hint: 'On (km fare + trip charge + toll)' },
    ],
  },
  {
    title: 'Outstation',
    color: '#D4F4CD',
    fields: [
      { key: 'outstation_per_km',      label: 'Per km',         prefix: '₹', suffix: '/km', hint: 'Full route distance' },
      { key: 'outstation_driver_bata', label: 'Driver bata',    prefix: '₹',     hint: 'Daily allowance' },
      { key: 'outstation_night_halt',  label: 'Night halt',     prefix: '₹',     hint: 'Per night outstation' },
      { key: 'outstation_gst',         label: 'GST',            suffix: '%',     hint: 'On (fare + bata)' },
    ],
  },
  {
    title: 'Hourly',
    color: '#D9E8F4',
    fields: [
      { key: 'hourly_base_rate',  label: 'Hourly rate',    prefix: '₹', suffix: '/hr', hint: 'Base rate per hour' },
    ],
  },
]
// First Ride Discount config lives on the Empty Leg page (with the other promo levers).

function PriceCard({ field, config, onChange, readOnly }: {
  field: Field
  config: PricingConfig
  onChange: (key: string, val: string) => void
  readOnly?: boolean
}) {
  return (
    <div style={{ background: YL.card, border: `1.5px solid ${YL.line}`, borderRadius: 12, padding: '11px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: YL.ink, marginBottom: 2 }}>{field.label}</div>
        <div style={{ fontSize: 11.5, color: YL.ink3 }}>{field.hint}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', height: 36, padding: '0 12px', background: YL.bg, border: `1.5px solid ${YL.line}`, borderRadius: 9, opacity: readOnly ? 0.7 : 1 }}>
        {field.prefix && <Mono size={13} color={YL.ink2} style={{ marginRight: 4 }}>{field.prefix}</Mono>}
        <input
          value={config[field.key] ?? ''}
          onChange={e => onChange(field.key, e.target.value)}
          readOnly={readOnly}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: '"JetBrains Mono", monospace', fontSize: 15, color: YL.ink, fontWeight: 600, minWidth: 0, cursor: readOnly ? 'default' : 'text' }}
        />
        {field.suffix && <Mono size={12} color={YL.ink2}>{field.suffix}</Mono>}
      </div>
    </div>
  )
}

function calcAirportFare(km: number, cfg: PricingConfig) {
  const perKm      = parseFloat(cfg.airport_per_km      ?? '32')
  const tripCharge = parseFloat(cfg.airport_trip_charge ?? '100')
  const toll       = parseFloat(cfg.airport_toll        ?? '185')
  const gstRate    = parseFloat(cfg.airport_gst         ?? '5') / 100
  const kmFare     = Math.round(km * perKm)
  const fareBeforeTax = kmFare + tripCharge
  const gst        = Math.round((fareBeforeTax + toll) * gstRate)
  const total      = fareBeforeTax + toll + gst
  return { kmFare, fareBeforeTax, gst, toll, total }
}

function calcOutstationFare(km: number, cfg: PricingConfig) {
  const perKm      = parseFloat(cfg.outstation_per_km      ?? '0')
  const driverBata = parseFloat(cfg.outstation_driver_bata ?? '0')
  const gstRate    = parseFloat(cfg.outstation_gst         ?? '0') / 100
  const base       = km * perKm
  const total      = Math.round((base + driverBata) * (1 + gstRate))
  return { base: Math.round(base), total, driverBata, gst: cfg.outstation_gst ?? '0' }
}

function PricingCalculator({ config }: { config: PricingConfig }) {
  const [tripType, setTripType] = React.useState<'airport' | 'outstation'>('airport')
  const [km, setKm] = React.useState('')

  const distance = parseFloat(km)
  const valid = !isNaN(distance) && distance > 0
  const airportResult = valid ? calcAirportFare(distance, config) : null
  const outstationResult = valid ? calcOutstationFare(distance, config) : null
  const result = tripType === 'airport' ? airportResult : outstationResult

  return (
    <div style={{ background: YL.card, border: `1.5px solid ${YL.line}`, borderRadius: 14, padding: '20px 24px' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: YL.ink, marginBottom: 4 }}>Fare calculator</div>
      <div style={{ fontSize: 12, color: YL.ink3, marginBottom: 16 }}>Preview fare using current config values</div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: `1.5px solid ${YL.line}` }}>
          {(['airport', 'outstation'] as const).map(t => (
            <button key={t} onClick={() => setTripType(t)} style={{
              padding: '7px 16px', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 500,
              background: tripType === t ? YL.yellow : YL.bg, color: YL.ink,
              fontFamily: '"Bricolage Grotesque", system-ui',
            }}>
              {t === 'airport' ? 'Airport' : 'Outstation'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: YL.bg, border: `1.5px solid ${YL.line}`, borderRadius: 8, padding: '0 12px', height: 36 }}>
          <input
            value={km}
            onChange={e => setKm(e.target.value)}
            placeholder="Distance"
            type="number"
            style={{ border: 'none', outline: 'none', background: 'transparent', fontFamily: '"JetBrains Mono", monospace', fontSize: 14, color: YL.ink, width: 80 }}
          />
          <Mono size={12} color={YL.ink3}>km</Mono>
        </div>
      </div>

      {result ? (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ background: YL.yellow, borderRadius: 10, padding: '14px 20px', minWidth: 140 }}>
            <div style={{ fontSize: 11, color: YL.ink2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Total fare</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: YL.ink, fontFamily: '"Bricolage Grotesque", system-ui', letterSpacing: -0.5 }}>₹{result.total.toLocaleString('en-IN')}</div>
            <div style={{ fontSize: 11, color: YL.ink2 }}>{km} km · incl. GST</div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            {tripType === 'airport' && airportResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {([
                  [`Fare (${km} km)`, `₹${airportResult.fareBeforeTax.toLocaleString('en-IN')}`],
                  ['GST (5%)', `₹${airportResult.gst.toLocaleString('en-IN')}`],
                  ['Toll', `₹${airportResult.toll.toLocaleString('en-IN')}`],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '4px 0', borderBottom: `1px solid ${YL.line}` }}>
                    <span style={{ color: YL.ink2 }}>{k}</span>
                    <Mono size={12.5}>{v}</Mono>
                  </div>
                ))}
              </div>
            )}
            {tripType === 'outstation' && outstationResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {([
                  ['Distance fare', `₹${outstationResult.base.toLocaleString('en-IN')}`],
                  ['Driver bata', `₹${outstationResult.driverBata}`],
                  ['GST', `${outstationResult.gst}%`],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '4px 0', borderBottom: `1px solid ${YL.line}` }}>
                    <span style={{ color: YL.ink2 }}>{k}</span>
                    <Mono size={12.5}>{v}</Mono>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: YL.ink3 }}>
          {km && !valid ? 'Enter a valid distance in km' : 'Enter a distance above to preview the fare'}
        </div>
      )}
    </div>
  )
}

export default function PricingPage({ isSuperAdmin }: { isSuperAdmin?: boolean }) {
  const [config, setConfig] = React.useState<PricingConfig>({})
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [dirty, setDirty] = React.useState(false)

  React.useEffect(() => {
    getPricing().then(r => { setConfig(r.config); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const handleChange = (key: string, val: string) => {
    setConfig(prev => ({ ...prev, [key]: val }))
    setDirty(true)
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await savePricing(config)
      setConfig(res.config)
      setDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    getPricing().then(r => { setConfig(r.config); setDirty(false) })
  }

  if (loading) return (
    <div style={{ flex: 1, background: YL.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: YL.ink2, fontSize: 13 }}>
      Loading pricing…
    </div>
  )

  return (
    <div style={{ flex: 1, overflow: 'auto', background: YL.bg }}>
      <PageHeader
        title="Pricing"
        subtitle={isSuperAdmin ? "Changes apply to the customer app immediately" : "View-only — contact a Super Admin to change rates"}
        actions={isSuperAdmin ? <>
          {dirty && <Button variant="secondary" onClick={handleDiscard}>Discard</Button>}
          <Button variant="primary" onClick={handleSave} disabled={saving || !dirty}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
          </Button>
        </> : undefined}
      />

      <div style={{ padding: '18px 28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '18px 24px', alignItems: 'start' }}>
        {SECTIONS.map(section => (
          <div key={section.title}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ padding: '3px 12px', borderRadius: 20, background: section.color, border: `1px solid ${YL.line}`, fontSize: 12, fontWeight: 700, color: YL.ink, letterSpacing: 0.2 }}>
                {section.title}
              </div>
              <div style={{ flex: 1, height: 1, background: YL.line }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {section.fields.map(f => (
                <PriceCard key={f.key} field={f} config={config} onChange={handleChange} readOnly={!isSuperAdmin} />
              ))}
            </div>
          </div>
        ))}

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ padding: '3px 12px', borderRadius: 20, background: '#F0EDE8', border: `1px solid ${YL.line}`, fontSize: 12, fontWeight: 700, color: YL.ink, letterSpacing: 0.2 }}>
              Calculator
            </div>
            <div style={{ flex: 1, height: 1, background: YL.line }} />
          </div>
          <PricingCalculator config={config} />
        </div>

        {saved && (
          <div style={{ gridColumn: '1 / -1', padding: '12px 16px', background: '#D4F4CD', color: YL.greenInk, borderRadius: 10, fontSize: 13, fontWeight: 500 }}>
            ✓ Pricing saved — customer app will use updated fares immediately.
          </div>
        )}
      </div>
    </div>
  )
}

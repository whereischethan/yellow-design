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
      { key: 'airport_fixed_km',    label: 'Fixed fare up to', suffix: 'km',    hint: 'Flat price for trips within this distance' },
      { key: 'airport_fixed_price', label: 'Base fare',        prefix: '₹',     hint: 'Charged within the fixed km threshold' },
      { key: 'airport_per_km',      label: 'Extra per km',     prefix: '₹', suffix: '/km', hint: 'Applied beyond threshold' },
      { key: 'airport_toll',        label: 'Toll',             prefix: '₹',     hint: 'Flat charge on every airport trip' },
      { key: 'airport_gst',         label: 'GST',              suffix: '%',     hint: 'On (base + toll)' },
      { key: 'airport_meet_greet',  label: 'Meet & greet',     prefix: '₹',     hint: 'Optional add-on' },
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
      { key: 'hourly_extra_rate', label: 'Extra hour',     prefix: '₹', suffix: '/hr', hint: 'Beyond initial booking' },
    ],
  },
]

function PriceCard({ field, config, onChange }: {
  field: Field
  config: PricingConfig
  onChange: (key: string, val: string) => void
}) {
  return (
    <div style={{
      background: YL.card,
      border: `1.5px solid ${YL.line}`,
      borderRadius: 14,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: YL.ink, marginBottom: 2 }}>{field.label}</div>
        <div style={{ fontSize: 11.5, color: YL.ink3 }}>{field.hint}</div>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center',
        height: 40, padding: '0 12px',
        background: YL.bg, border: `1.5px solid ${YL.line}`,
        borderRadius: 10,
      }}>
        {field.prefix && <Mono size={13} color={YL.ink2} style={{ marginRight: 4 }}>{field.prefix}</Mono>}
        <input
          value={config[field.key] ?? ''}
          onChange={e => onChange(field.key, e.target.value)}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontFamily: '"JetBrains Mono", monospace', fontSize: 15,
            color: YL.ink, fontWeight: 600, minWidth: 0,
          }}
        />
        {field.suffix && <Mono size={12} color={YL.ink2}>{field.suffix}</Mono>}
      </div>
    </div>
  )
}

export default function PricingPage() {
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
        subtitle="Changes apply to the customer app immediately"
        actions={<>
          {dirty && <Button variant="secondary" onClick={handleDiscard}>Discard</Button>}
          <Button variant="primary" onClick={handleSave} disabled={saving || !dirty}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
          </Button>
        </>}
      />

      <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        {SECTIONS.map(section => (
          <div key={section.title}>
            {/* Section label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                padding: '3px 12px', borderRadius: 20,
                background: section.color, border: `1px solid ${YL.line}`,
                fontSize: 12, fontWeight: 700, color: YL.ink, letterSpacing: 0.2,
              }}>
                {section.title}
              </div>
              <div style={{ flex: 1, height: 1, background: YL.line }} />
            </div>

            {/* Card grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 12,
            }}>
              {section.fields.map(f => (
                <PriceCard key={f.key} field={f} config={config} onChange={handleChange} />
              ))}
            </div>
          </div>
        ))}

        {saved && (
          <div style={{
            padding: '12px 16px', background: '#D4F4CD', color: YL.greenInk,
            borderRadius: 10, fontSize: 13, fontWeight: 500,
          }}>
            ✓ Pricing saved — customer app will use updated fares immediately.
          </div>
        )}
      </div>
    </div>
  )
}

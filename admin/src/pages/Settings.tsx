import React from 'react'
import { getSettings, saveSettings } from '../api'
import { YL, Mono, Button, PageHeader, Stack } from '../components/ui'

interface SettingField {
  key: string
  label: string
  hint: string
  placeholder: string
  multiline?: boolean
}

const FIELDS: SettingField[] = [
  { key: 'company_name',    label: 'Company Name',       hint: 'As it appears on invoices', placeholder: 'Yellow Cabs Pvt Ltd' },
  { key: 'company_gstin',   label: 'GSTIN',              hint: '15-character GST registration number', placeholder: '29AABCY1234F1Z5' },
  { key: 'company_address', label: 'Company Address',    hint: 'Use | to separate lines (e.g. "12 MG Road|Bengaluru 560001|Karnataka")', placeholder: '12 MG Road|Bengaluru 560001|Karnataka', multiline: true },
  { key: 'company_sac_code',label: 'SAC Code',           hint: 'SAC for cab/taxi services', placeholder: '996412' },
  { key: 'company_phone',   label: 'Support Phone',      hint: 'Shown on invoice footer', placeholder: '+91 98765 43210' },
  { key: 'company_email',   label: 'Support Email',      hint: 'Shown on invoice footer', placeholder: 'support@yellowcabs.in' },
  { key: 'invoice_base_url',label: 'Invoice Public URL', hint: 'Base URL for invoice links sent via SMS (no trailing slash)', placeholder: 'https://api.yellowcabs.in' },
  { key: 'invoice_start_seq', label: 'Starting Invoice Sequence', hint: 'First invoice will be this number + 1. Set before first use only.', placeholder: '0' },
]

function Field({ field, value, onChange }: { field: SettingField; value: string; onChange: (v: string) => void }) {
  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px',
    border: `1.5px solid ${YL.line}`, borderRadius: 10,
    fontFamily: field.key === 'company_gstin' || field.key === 'invoice_start_seq' || field.key === 'company_sac_code'
      ? '"JetBrains Mono", monospace' : '"Bricolage Grotesque", system-ui',
    fontSize: 14, color: YL.ink, background: YL.card, outline: 'none',
    resize: field.multiline ? 'vertical' : undefined,
    minHeight: field.multiline ? 80 : undefined,
  }

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: YL.ink2, letterSpacing: 0.3, marginBottom: 4, textTransform: 'uppercase' as const }}>
        {field.label}
      </div>
      {field.multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          style={{ ...inputStyle, height: 80 } as any}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          style={inputStyle}
        />
      )}
      <div style={{ fontSize: 11.5, color: YL.ink3, marginTop: 4 }}>{field.hint}</div>
    </div>
  )
}

export default function SettingsPage() {
  const [config, setConfig] = React.useState<Record<string, string>>({})
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving]   = React.useState(false)
  const [saved, setSaved]     = React.useState(false)
  const [dirty, setDirty]     = React.useState(false)
  const [error, setError]     = React.useState('')

  React.useEffect(() => {
    getSettings().then((r: any) => {
      setConfig(r.config ?? {})
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleChange = (key: string, val: string) => {
    setConfig(prev => ({ ...prev, [key]: val }))
    setDirty(true)
    setSaved(false)
    setError('')
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res: any = await saveSettings(config)
      setConfig(res.config)
      setDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ flex: 1, background: YL.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: YL.ink2, fontSize: 13 }}>
      Loading settings…
    </div>
  )

  return (
    <div style={{ flex: 1, overflow: 'auto', background: YL.bg }}>
      <PageHeader
        title="Settings"
        subtitle="Company details used on GST invoices"
        actions={<>
          {dirty && <Button variant="secondary" onClick={() => { getSettings().then((r: any) => { setConfig(r.config); setDirty(false) }) }}>Discard</Button>}
          <Button variant="primary" onClick={handleSave} disabled={saving || !dirty}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
          </Button>
        </>}
      />

      <div style={{ padding: '24px 28px', maxWidth: 640 }}>
        <Stack gap={20}>
          {/* Company section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ padding: '3px 12px', borderRadius: 20, background: YL.yellowSoft, border: `1px solid ${YL.line}`, fontSize: 12, fontWeight: 700, color: YL.ink, letterSpacing: 0.2 }}>
                Company
              </div>
              <div style={{ flex: 1, height: 1, background: YL.line }}/>
            </div>
            <Stack gap={16}>
              {FIELDS.slice(0, 6).map(f => (
                <Field key={f.key} field={f} value={config[f.key] ?? ''} onChange={v => handleChange(f.key, v)} />
              ))}
            </Stack>
          </div>

          {/* Invoice section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ padding: '3px 12px', borderRadius: 20, background: YL.blueSoft, border: `1px solid ${YL.line}`, fontSize: 12, fontWeight: 700, color: YL.ink, letterSpacing: 0.2 }}>
                Invoice
              </div>
              <div style={{ flex: 1, height: 1, background: YL.line }}/>
            </div>
            <Stack gap={16}>
              {FIELDS.slice(6).map(f => (
                <Field key={f.key} field={f} value={config[f.key] ?? ''} onChange={v => handleChange(f.key, v)} />
              ))}
            </Stack>
          </div>

          {error && (
            <div style={{ padding: '12px 16px', background: YL.redSoft, color: YL.redInk, borderRadius: 10, fontSize: 13 }}>
              {error}
            </div>
          )}

          {saved && (
            <div style={{ padding: '12px 16px', background: YL.greenSoft, color: YL.greenInk, borderRadius: 10, fontSize: 13, fontWeight: 500 }}>
              ✓ Settings saved — new invoices will use the updated company details.
            </div>
          )}

          {/* Invoice preview note */}
          {config.company_gstin && (
            <div style={{ padding: '14px 16px', background: YL.card, border: `1px solid ${YL.line}`, borderRadius: 10, fontSize: 12.5, color: YL.ink2, lineHeight: 1.6 }}>
              <strong style={{ color: YL.ink }}>Invoice format:</strong> <Mono size={12.5}>YL/2627/Q1/00001</Mono>
              <br/>Financial year (Apr–Mar) · Quarter (Q1=Apr–Jun, Q2=Jul–Sep, Q3=Oct–Dec, Q4=Jan–Mar) · Sequential
            </div>
          )}
        </Stack>
      </div>
    </div>
  )
}

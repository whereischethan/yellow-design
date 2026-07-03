import React from 'react'
import type { Vehicle } from '../../types'
import { createDriver } from '../../api'
import { YL, Icons, Stack, Button, ModalShell, ModalHeader, Stepper, FieldLabel, FormInput } from '../../components/ui'

interface AddDriverModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
  vehicles?: Vehicle[]
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

export function AddDriverModal({ open, onClose, onCreated, vehicles = [] }: AddDriverModalProps) {
  const [step, setStep] = React.useState(0)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')

  const [name, setName] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [selectedVehicleId, setSelectedVehicleId] = React.useState('')
  const [photoUrl, setPhotoUrl] = React.useState('')
  const [docLicense, setDocLicense] = React.useState('')
  const [docAadhaar, setDocAadhaar] = React.useState('')
  const [docPan, setDocPan] = React.useState('')
  const [docPolice, setDocPolice] = React.useState('')
  const [licenseNo, setLicenseNo] = React.useState('')
  const [licenseExp, setLicenseExp] = React.useState('')
  const [bankHolder, setBankHolder] = React.useState('')
  const [bankIfsc, setBankIfsc] = React.useState('')
  const [bankAccount, setBankAccount] = React.useState('')
  const [bankUpi, setBankUpi] = React.useState('')
  const photoInputRef = React.useRef<HTMLInputElement>(null)

  const stepNames = ['Personal', 'Documents', 'Vehicle & Bank']

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId)

  React.useEffect(() => {
    if (open) {
      setStep(0); setName(''); setPhone(''); setSelectedVehicleId(''); setError('')
      setPhotoUrl(''); setDocLicense(''); setDocAadhaar(''); setDocPan(''); setDocPolice('')
      setLicenseNo(''); setLicenseExp('')
      setBankHolder(''); setBankIfsc(''); setBankAccount(''); setBankUpi('')
    }
  }, [open])

  const handleCreate = async () => {
    setSaving(true); setError('')
    try {
      await createDriver({
        name, phone,
        plate: selectedVehicle?.plate ?? null,
        vehicle: selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : null,
        photo_url: photoUrl || null,
        doc_license: docLicense || null,
        doc_aadhaar: docAadhaar || null,
        doc_pan: docPan || null,
        doc_police: docPolice || null,
        license_no: licenseNo || null,
        license_exp: licenseExp || null,
        bank_holder: bankHolder || null,
        bank_ifsc: bankIfsc || null,
        bank_account: bankAccount || null,
        bank_upi: bankUpi || null,
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
            <div>
              <FieldLabel>Assign vehicle</FieldLabel>
              <select
                value={selectedVehicleId}
                onChange={e => setSelectedVehicleId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${YL.line}`, borderRadius: 8, background: YL.card, color: YL.ink, fontSize: 13, outline: 'none' }}
              >
                <option value="">— No vehicle yet —</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.plate} · {v.make} {v.model}</option>
                ))}
              </select>
            </div>
            <div style={{ height: 1, background: YL.line, margin: '4px 0' }}/>
            <FieldLabel>Bank details (for payouts)</FieldLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormInput label="Account holder" placeholder="Full name on account" value={bankHolder} onChange={(e: any) => setBankHolder(e.target.value)}/>
              <FormInput label="IFSC" placeholder="HDFC0001234" value={bankIfsc} onChange={(e: any) => setBankIfsc(e.target.value)}/>
            </div>
            <FormInput label="Account number" placeholder="••••• 1234" value={bankAccount} onChange={(e: any) => setBankAccount(e.target.value)}/>
            <FormInput label="UPI ID" hint="for fast settlements" placeholder="name@bank" value={bankUpi} onChange={(e: any) => setBankUpi(e.target.value)}/>
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

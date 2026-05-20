import React, { useState } from 'react'
import { sendAdminOtp, verifyAdminOtp, setStoredAdminToken, setStoredAdminUser, type AdminProfile } from '../api'

interface Props { onLogin: (admin?: AdminProfile) => void }

const COUNTRY_CODE = '+91'

const inputStyle: React.CSSProperties = {
  flex: 1, height: 48,
  border: '1.5px solid #D4C9B8', borderRadius: 12, padding: '0 14px',
  fontFamily: '"JetBrains Mono", monospace', fontSize: 15, color: '#2B2720',
  background: '#fff', outline: 'none',
}

const btnStyle = (disabled: boolean): React.CSSProperties => ({
  width: '100%', height: 48,
  background: disabled ? '#D4C9B8' : '#2B2720',
  color: disabled ? '#8A7E6E' : '#FFD84A',
  border: 'none', borderRadius: 12,
  fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 15, fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
})

export default function Login({ onLogin }: Props) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const displayPhone = `${COUNTRY_CODE} ${phone.trim()}`

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleaned = phone.replace(/\s/g, '')
    if (!cleaned) return
    setLoading(true)
    setError('')
    try {
      await sendAdminOtp(cleaned, COUNTRY_CODE)
      setStep('otp')
    } catch (err: any) {
      const msg: string = err.message || 'Could not send OTP'
      // Surface admin-check failures clearly
      if (msg.toLowerCase().includes('not authorised') || msg.toLowerCase().includes('not authorized')) {
        setError('This number is not registered as an admin.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp.trim()) return
    setLoading(true)
    setError('')
    try {
      const { token, admin } = await verifyAdminOtp(phone.replace(/\s/g, ''), otp.trim(), COUNTRY_CODE)
      setStoredAdminToken(token)
      setStoredAdminUser(admin)
      onLogin(admin)
    } catch (err: any) {
      setError(err.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFD84A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Bricolage Grotesque", system-ui' }}>
      <div style={{ background: '#F6F3EB', borderRadius: 24, padding: 36, width: 380, border: '1.5px solid #2B2720', boxShadow: '0 8px 32px rgba(43,39,32,0.12)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <img src="/logo.png" alt="Yellow" style={{ width: 160, height: 64, objectFit: 'contain', marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: '#8A7E6E', margin: 0, textAlign: 'center' }}>
            {step === 'phone' && 'Enter your phone number to sign in'}
            {step === 'otp' && `OTP sent to ${displayPhone}`}
          </p>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#DC2626' }}>
            {error}
          </div>
        )}

        {step === 'phone' && (
          <form onSubmit={handleSendOtp}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', height: 48, border: '1.5px solid #D4C9B8', borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', padding: '0 14px', borderRight: '1.5px solid #D4C9B8', background: '#F0EBE0', fontFamily: '"JetBrains Mono", monospace', fontSize: 14, color: '#2B2720', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  🇮🇳 +91
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit number"
                  autoFocus
                  maxLength={10}
                  style={{ flex: 1, height: '100%', border: 'none', padding: '0 14px', fontFamily: '"JetBrains Mono", monospace', fontSize: 15, color: '#2B2720', background: 'transparent', outline: 'none' }}
                />
              </div>
            </div>
            <button type="submit" disabled={loading || phone.replace(/\s/g, '').length < 10} style={btnStyle(loading || phone.replace(/\s/g, '').length < 10)}>
              {loading ? 'Sending…' : 'Send OTP →'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp}>
            <input
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              placeholder="4-digit OTP"
              autoFocus
              maxLength={4}
              style={{ ...inputStyle, flex: 'unset', width: '100%', boxSizing: 'border-box', marginBottom: 14 }}
            />
            <button type="submit" disabled={loading || otp.length < 4} style={btnStyle(loading || otp.length < 4)}>
              {loading ? 'Verifying…' : 'Verify OTP →'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('phone'); setOtp(''); setError('') }}
              style={{ marginTop: 10, width: '100%', background: 'transparent', border: 'none', color: '#8A7E6E', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ← Change phone number
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

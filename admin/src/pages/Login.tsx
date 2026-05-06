import React, { useState } from 'react'
import { sendAdminOtp, verifyAdminOtp, setStoredAdminToken } from '../api'

interface Props { onLogin: () => void }

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', height: 48,
  border: '1.5px solid #D4C9B8', borderRadius: 12, padding: '0 14px',
  fontFamily: '"JetBrains Mono", monospace', fontSize: 15, color: '#2B2720',
  background: '#fff', outline: 'none', marginBottom: 14,
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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleaned = phone.replace(/\s/g, '')
    if (!cleaned) return
    setLoading(true)
    setError('')
    try {
      await sendAdminOtp(cleaned)
      setStep('otp')
    } catch (err: any) {
      setError(err.message || 'Could not send OTP')
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
      const { token } = await verifyAdminOtp(phone.replace(/\s/g, ''), otp.trim())
      setStoredAdminToken(token)
      onLogin()
    } catch (err: any) {
      setError(err.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFD84A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Bricolage Grotesque", system-ui' }}>
      <div style={{ background: '#F6F3EB', borderRadius: 24, padding: 36, width: 360, border: '1.5px solid #2B2720', boxShadow: '0 8px 32px rgba(43,39,32,0.12)' }}>
        <h1 style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 28, fontWeight: 600, color: '#2B2720', marginBottom: 4, letterSpacing: -0.5 }}>Yellow Ops</h1>
        <p style={{ fontSize: 14, color: '#8A7E6E', marginBottom: 28 }}>
          {step === 'phone' ? 'Enter your admin phone number' : `OTP sent to ${phone}`}
        </p>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#DC2626' }}>
            {error}
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp}>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Phone number (with country code)"
              autoFocus
              style={inputStyle}
            />
            <button type="submit" disabled={loading || !phone.trim()} style={btnStyle(loading || !phone.trim())}>
              {loading ? 'Sending…' : 'Send OTP →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <input
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              placeholder="4-digit OTP"
              autoFocus
              maxLength={4}
              style={inputStyle}
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

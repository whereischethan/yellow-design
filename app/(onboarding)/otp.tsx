import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Animated, TextInput, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import Svg, { Path, Circle } from 'react-native-svg'
import { YL, FONTS } from '../../constants/theme'
import YButton from '../../components/YButton'
import { verifyOtp, resendOtp, updateProfile } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

function AppChrome({ right }: { right?: React.ReactNode }) {
  const router = useRouter()
  return (
    <View style={styles.chrome}>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Svg width={20} height={20} viewBox="0 0 20 20">
          <Path
            d="M12 4L6 10L12 16"
            stroke={YL.ink}
            strokeWidth={1.8}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>
      <View style={{ flex: 1 }} />
      {right}
    </View>
  )
}

function BlinkingCaret() {
  const opacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.delay(400),
      ])
    )
    blink.start()
    return () => blink.stop()
  }, [opacity])

  return (
    <Animated.View
      style={{
        width: 2,
        height: 28,
        backgroundColor: YL.ink,
        borderRadius: 1,
        opacity,
      }}
    />
  )
}

function OtpBox({ digit, isActive }: { digit: string; isActive: boolean }) {
  const hasFill = digit !== ''
  const borderColor = hasFill || isActive ? YL.ink : YL.line

  return (
    <View style={[styles.otpBox, { borderColor }]}>
      {digit ? (
        <Text style={styles.otpDigit}>{digit}</Text>
      ) : isActive ? (
        <BlinkingCaret />
      ) : null}
    </View>
  )
}

function ClockIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16">
      <Circle cx={8} cy={8} r={6} stroke={YL.ink3} strokeWidth={1.2} fill="none" />
      <Path
        d="M8 5V8L10 10"
        stroke={YL.ink3}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  )
}

export default function ScreenOTP() {
  const router = useRouter()
  const { phone, name: formName, email: formEmail, next } = useLocalSearchParams<{ phone: string; name?: string; email?: string; next?: string }>()
  const { login, updateUser } = useAuth()
  const inputRef = useRef<TextInput>(null)
  const [otp, setOtp] = useState('')
  const [timer, setTimer] = useState(30)
  const [canResend, setCanResend] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true)
      return
    }
    const id = setInterval(() => setTimer(t => t - 1), 1000)
    return () => clearInterval(id)
  }, [timer])

  // Web OTP API — works on Android Chrome
  useEffect(() => {
    if (Platform.OS !== 'web') return
    if (!('OTPCredential' in window)) return
    const controller = new AbortController()
    ;(navigator.credentials as any)
      .get({ otp: { transport: ['sms'] }, signal: controller.signal })
      .then((cred: any) => {
        if (cred?.code) {
          const cleaned = cred.code.replace(/\D/g, '').slice(0, 4)
          setOtp(cleaned)
          if (cleaned.length === 4) handleVerify(cleaned)
        }
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const handleVerify = async (code: string) => {
    if (code.length !== 4 || loading) return
    setLoading(true)
    setError('')
    try {
      const data = await verifyOtp(phone, code)
      login(data.user)
      // Persist name/email to server if not already on the account
      const updates: { name?: string; email?: string } = {}
      if (formName && !data.user?.name) updates.name = formName
      if (formEmail) updates.email = formEmail
      if (Object.keys(updates).length) {
        updateUser(updates)
        updateProfile(updates).catch(() => {})
      }
      // If a pending destination was passed (e.g. from booking flow), go there
      if (next) {
        try {
          const { pathname, params: nextParams } = JSON.parse(next)
          router.replace({ pathname, params: nextParams })
          return
        } catch {}
      }
      router.replace('/(app)/home')
    } catch (e: any) {
      setError(e.message || 'Invalid OTP')
      setLoading(false)
    }
  }

  const handleOtpChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 4)
    setOtp(cleaned)
    if (error) setError('')
    if (cleaned.length === 4) handleVerify(cleaned)
  }

  const handleResend = async () => {
    if (!canResend) return
    setOtp('')
    setTimer(60)
    setCanResend(false)
    setError('')
    inputRef.current?.focus()
    try {
      await resendOtp(phone)
    } catch {
      // silent — timer already reset
    }
  }

  const formatTimer = (s: number) => `0:${s.toString().padStart(2, '0')}`

  const displayPhone = phone ? `+${phone.slice(0, 2)} ${phone.slice(2, 7)} ${phone.slice(7)}` : '+91 ••••• •••••'

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppChrome right={<Text style={styles.stepIndicator}>2 / 2</Text>} />

      {/* Hidden TextInput captures keyboard input */}
      <TextInput
        ref={inputRef}
        value={otp}
        onChangeText={handleOtpChange}
        keyboardType="number-pad"
        maxLength={4}
        style={styles.hiddenInput}
        autoFocus
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        {...(Platform.OS === 'web' ? { dataSet: { clarityMask: 'True' } } as any : {})}
      />

      <Pressable style={styles.content} onPress={() => inputRef.current?.focus()}>
        {/* Headline */}
        <Text style={styles.headline}>Enter the code</Text>

        {/* Sent to row */}
        <Text style={styles.sentTo}>
          Sent to {displayPhone}{'  '}
          <Text style={styles.changeLink} onPress={() => router.back()}>Change</Text>
        </Text>

        {/* OTP boxes */}
        <View style={styles.otpRow}>
          {Array.from({ length: 4 }).map((_, i) => (
            <OtpBox
              key={i}
              digit={otp[i] ?? ''}
              isActive={i === otp.length && otp.length < 4}
            />
          ))}
        </View>

        {/* Error */}
        {!!error && (
          <Text style={{ color: '#C0392B', fontSize: 13, marginBottom: 12 }}>{error}</Text>
        )}

        {/* Resend row */}
        <View style={styles.resendRow}>
          <Text style={styles.resendText}>Didn't receive the OTP?</Text>
          {canResend ? (
            <Pressable onPress={handleResend}>
              <Text style={[styles.timerText, { textDecorationLine: 'underline', color: YL.ink }]}>
                Resend
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.timerText}>{formatTimer(timer)}</Text>
          )}
        </View>

        {/* Auto-read SMS notice — native only */}
        {Platform.OS !== 'web' && (
          <View style={styles.autoReadBox}>
            <ClockIcon />
            <Text style={styles.autoReadText}>Reading SMS automatically…</Text>
          </View>
        )}

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* CTA */}
        <YButton
          variant="ink"
          size="lg"
          disabled={otp.length !== 4 || loading}
          onPress={() => handleVerify(otp)}
        >
          {loading ? 'Verifying…' : 'Verify & continue'}
        </YButton>
      </Pressable>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: YL.bg,
  },
  chrome: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: YL.ink3,
    paddingRight: 8,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  headline: {
    fontFamily: FONTS.display,
    fontSize: 34,
    letterSpacing: -1,
    fontWeight: '500',
    color: YL.ink,
    marginBottom: 6,
  },
  sentTo: {
    fontSize: 14.5,
    color: YL.ink2,
    marginBottom: 28,
  },
  changeLink: {
    textDecorationLine: 'underline',
    fontWeight: '500',
    color: YL.ink,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  otpBox: {
    flex: 1,
    height: 64,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: YL.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigit: {
    fontFamily: FONTS.display,
    fontSize: 28,
    fontWeight: '500',
    color: YL.ink,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  resendText: {
    fontSize: 13,
    color: YL.ink3,
  },
  timerText: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: YL.ink3,
  },
  autoReadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: YL.line,
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  autoReadText: {
    fontSize: 12.5,
    color: YL.ink2,
  },
})

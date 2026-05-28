import { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { verifyDriverOtp } from '@/lib/api'
import { useDriverAuth } from '@/context/DriverAuthContext'
import { YL, FONTS } from '@/constants/theme'

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>()
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<TextInput>(null)
  const { signIn } = useDriverAuth()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleVerify(code: string) {
    if (code.length < 4) return
    setError('')
    setLoading(true)
    try {
      const data = await verifyDriverOtp(phone, code)
      await signIn(data.token, data.driver)
      router.replace('/(duty)/clock-in')
    } catch (e: any) {
      setError(e.message || 'Invalid OTP')
      setOtp('')
      inputRef.current?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.back} onPress={() => router.replace('/(auth)/phone')}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.top}>
          <Text style={styles.headline}>Enter OTP</Text>
          <Text style={styles.sub}>Sent to +91 {phone}</Text>
        </View>

        {/* Hidden real input */}
        <TextInput
          ref={inputRef}
          value={otp}
          onChangeText={(t) => {
            const clean = t.replace(/\D/g, '').slice(0, 4)
            setOtp(clean)
            setError('')
            if (clean.length === 4) handleVerify(clean)
          }}
          keyboardType="number-pad"
          maxLength={4}
          style={styles.hiddenInput}
          autoFocus
        />

        {/* Visual OTP boxes */}
        <TouchableOpacity style={styles.boxes} onPress={() => inputRef.current?.focus()} activeOpacity={1}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.box,
                otp.length === i && styles.boxActive,
                otp.length > i && styles.boxFilled,
              ]}
            >
              <Text style={styles.boxText}>{otp[i] || ''}</Text>
            </View>
          ))}
        </TouchableOpacity>

        {!!error && <Text style={styles.error}>{error}</Text>}

        {loading && <ActivityIndicator color={YL.ink} style={{ marginTop: 20 }} />}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: YL.bg },
  container: { flex: 1, paddingHorizontal: 24 },
  back: { paddingTop: 12, paddingBottom: 8 },
  backText: { fontFamily: FONTS.display, fontSize: 15, color: YL.ink2 },
  top: { paddingTop: 24, paddingBottom: 40 },
  headline: { fontFamily: FONTS.displaySemiBold, fontSize: 32, color: YL.ink, marginBottom: 8 },
  sub: { fontFamily: FONTS.display, fontSize: 15, color: YL.ink2 },
  hiddenInput: { position: 'absolute', opacity: 0, width: 0, height: 0 },
  boxes: { flexDirection: 'row', gap: 12, justifyContent: 'flex-start' },
  box: {
    width: 64,
    height: 72,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: YL.line,
    backgroundColor: YL.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: YL.ink, borderWidth: 2 },
  boxFilled: { backgroundColor: YL.yellowSoft, borderColor: YL.yellowDeep },
  boxText: { fontFamily: FONTS.mono, fontSize: 26, color: YL.ink },
  error: { fontFamily: FONTS.display, fontSize: 13, color: YL.gulmohar, marginTop: 16 },
})

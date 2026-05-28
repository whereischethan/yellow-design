import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { sendDriverOtp } from '@/lib/api'
import { YL, FONTS } from '@/constants/theme'

export default function PhoneScreen() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSend() {
    const clean = phone.replace(/\D/g, '')
    if (clean.length !== 10) {
      setError('Enter a valid 10-digit phone number')
      return
    }
    setError('')
    setLoading(true)
    try {
      await sendDriverOtp(clean)
      router.replace({ pathname: '/(auth)/otp', params: { phone: clean } })
    } catch (e: any) {
      setError(e.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <View style={styles.top}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>YELLOW DRIVER</Text>
          </View>
          <Text style={styles.headline}>Sign in to start{'\n'}your duty</Text>
          <Text style={styles.sub}>Enter your registered phone number</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputRow}>
            <View style={styles.cc}>
              <Text style={styles.ccText}>+91</Text>
            </View>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={(t) => { setPhone(t.replace(/\D/g, '')); setError('') }}
              placeholder="98765 43210"
              placeholderTextColor={YL.ink3}
              keyboardType="phone-pad"
              maxLength={10}
              returnKeyType="done"
              onSubmitEditing={handleSend}
            />
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSend} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Get OTP →</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Only registered Yellow drivers can sign in.</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: YL.bg },
  container: { flex: 1, paddingHorizontal: 24 },
  top: { flex: 1, justifyContent: 'center', paddingBottom: 8 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: YL.yellow,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 20,
  },
  badgeText: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1.5, color: YL.ink },
  headline: { fontFamily: FONTS.displaySemiBold, fontSize: 32, color: YL.ink, lineHeight: 40, marginBottom: 8 },
  sub: { fontFamily: FONTS.display, fontSize: 15, color: YL.ink2 },
  form: { paddingBottom: 32 },
  inputRow: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: YL.line,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: YL.card,
  },
  cc: {
    backgroundColor: YL.bg2,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: YL.line,
  },
  ccText: { fontFamily: FONTS.mono, fontSize: 15, color: YL.ink },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 16,
    fontFamily: FONTS.mono,
    fontSize: 18,
    color: YL.ink,
    letterSpacing: 1,
  },
  error: { fontFamily: FONTS.display, fontSize: 13, color: YL.gulmohar, marginBottom: 12 },
  btn: {
    backgroundColor: YL.ink,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontFamily: FONTS.displaySemiBold, fontSize: 16, color: '#fff' },
  footer: {
    fontFamily: FONTS.display,
    fontSize: 12,
    color: YL.ink3,
    textAlign: 'center',
    paddingBottom: 24,
  },
})

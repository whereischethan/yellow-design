import React, { useRef, useState } from 'react'
import {
  View, Text, Pressable, StyleSheet, TextInput,
  Modal, FlatList, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import Svg, { Path, Circle } from 'react-native-svg'
import { YL, FONTS } from '../../constants/theme'
import YAppChrome from '../../components/YAppChrome'
import YButton from '../../components/YButton'
import { sendOtp } from '../../lib/api'

const COUNTRIES = [
  { code: '+91', name: 'India', flag: '🇮🇳', digits: 10 },
  { code: '+1', name: 'United States', flag: '🇺🇸', digits: 10 },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧', digits: 10 },
  { code: '+971', name: 'UAE', flag: '🇦🇪', digits: 9 },
  { code: '+65', name: 'Singapore', flag: '🇸🇬', digits: 8 },
  { code: '+60', name: 'Malaysia', flag: '🇲🇾', digits: 10 },
  { code: '+61', name: 'Australia', flag: '🇦🇺', digits: 9 },
  { code: '+49', name: 'Germany', flag: '🇩🇪', digits: 11 },
  { code: '+33', name: 'France', flag: '🇫🇷', digits: 9 },
  { code: '+81', name: 'Japan', flag: '🇯🇵', digits: 10 },
  { code: '+82', name: 'South Korea', flag: '🇰🇷', digits: 10 },
  { code: '+86', name: 'China', flag: '🇨🇳', digits: 11 },
  { code: '+852', name: 'Hong Kong', flag: '🇭🇰', digits: 8 },
  { code: '+886', name: 'Taiwan', flag: '🇹🇼', digits: 9 },
  { code: '+66', name: 'Thailand', flag: '🇹🇭', digits: 9 },
  { code: '+62', name: 'Indonesia', flag: '🇮🇩', digits: 11 },
  { code: '+63', name: 'Philippines', flag: '🇵🇭', digits: 10 },
  { code: '+84', name: 'Vietnam', flag: '🇻🇳', digits: 10 },
  { code: '+880', name: 'Bangladesh', flag: '🇧🇩', digits: 10 },
  { code: '+92', name: 'Pakistan', flag: '🇵🇰', digits: 10 },
  { code: '+94', name: 'Sri Lanka', flag: '🇱🇰', digits: 9 },
  { code: '+977', name: 'Nepal', flag: '🇳🇵', digits: 10 },
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦', digits: 9 },
  { code: '+974', name: 'Qatar', flag: '🇶🇦', digits: 8 },
  { code: '+965', name: 'Kuwait', flag: '🇰🇼', digits: 8 },
  { code: '+973', name: 'Bahrain', flag: '🇧🇭', digits: 8 },
  { code: '+968', name: 'Oman', flag: '🇴🇲', digits: 8 },
  { code: '+972', name: 'Israel', flag: '🇮🇱', digits: 9 },
  { code: '+90', name: 'Turkey', flag: '🇹🇷', digits: 10 },
  { code: '+31', name: 'Netherlands', flag: '🇳🇱', digits: 9 },
  { code: '+41', name: 'Switzerland', flag: '🇨🇭', digits: 9 },
  { code: '+46', name: 'Sweden', flag: '🇸🇪', digits: 9 },
  { code: '+47', name: 'Norway', flag: '🇳🇴', digits: 8 },
  { code: '+45', name: 'Denmark', flag: '🇩🇰', digits: 8 },
  { code: '+39', name: 'Italy', flag: '🇮🇹', digits: 10 },
  { code: '+34', name: 'Spain', flag: '🇪🇸', digits: 9 },
  { code: '+351', name: 'Portugal', flag: '🇵🇹', digits: 9 },
  { code: '+32', name: 'Belgium', flag: '🇧🇪', digits: 9 },
  { code: '+43', name: 'Austria', flag: '🇦🇹', digits: 10 },
  { code: '+48', name: 'Poland', flag: '🇵🇱', digits: 9 },
  { code: '+27', name: 'South Africa', flag: '🇿🇦', digits: 9 },
  { code: '+234', name: 'Nigeria', flag: '🇳🇬', digits: 10 },
  { code: '+254', name: 'Kenya', flag: '🇰🇪', digits: 9 },
  { code: '+20', name: 'Egypt', flag: '🇪🇬', digits: 10 },
  { code: '+55', name: 'Brazil', flag: '🇧🇷', digits: 11 },
  { code: '+52', name: 'Mexico', flag: '🇲🇽', digits: 10 },
  { code: '+54', name: 'Argentina', flag: '🇦🇷', digits: 10 },
  { code: '+64', name: 'New Zealand', flag: '🇳🇿', digits: 9 },
  { code: '+7', name: 'Russia', flag: '🇷🇺', digits: 10 },
]

function CountryPickerModal({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean
  selected: typeof COUNTRIES[0]
  onSelect: (c: typeof COUNTRIES[0]) => void
  onClose: () => void
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>Country code</Text>
        <FlatList
          data={COUNTRIES}
          keyExtractor={item => `${item.code}|${item.name}`}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.countryRow, item.code === selected.code && styles.countryRowActive]}
              onPress={() => { onSelect(item); onClose() }}
            >
              <Text style={styles.countryFlag}>{item.flag}</Text>
              <Text style={styles.countryName}>{item.name}</Text>
              <Text style={styles.countryCode}>{item.code}</Text>
              {item.code === selected.code && (
                <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                  <Path d="M3 8L6.5 11.5L13 4.5" stroke={YL.ink} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              )}
            </Pressable>
          )}
          style={{ maxHeight: 360 }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
  )
}

function ShieldIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <Path d="M7 1.5L11.5 3.5V7C11.5 9.5 9.5 11.5 7 12.5C4.5 11.5 2.5 9.5 2.5 7V3.5Z" stroke={YL.ink3} strokeWidth={1.2} fill="none" />
    </Svg>
  )
}

function ArrowIcon() {
  return (
    <Svg width={14} height={8} viewBox="0 0 14 8" fill="none">
      <Path d="M1 4H12M9 1L12 4L9 7" stroke={YL.ink2} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export default function ScreenReserveSignIn() {
  const router = useRouter()
  const params = useLocalSearchParams<{ pickup?: string; drop?: string; time?: string; next?: string; mode?: string }>()

  const [country, setCountry] = useState(COUNTRIES[0])
  const [showPicker, setShowPicker] = useState(false)
  const [signingIn, setSigningIn] = useState(params.mode === 'signin')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const phoneRef = useRef<TextInput>(null)
  const emailRef = useRef<TextInput>(null)

  const pickupLabel = params.pickup ? (() => { try { return JSON.parse(params.pickup!)?.placeName } catch { return params.pickup } })() : null
  const dropLabel = params.drop ? (() => { try { return JSON.parse(params.drop!)?.placeName } catch { return params.drop } })() : null
  const timeLabel = params.time || null
  const hasBreadcrumb = !!(pickupLabel && dropLabel)

  const canContinue = signingIn
    ? phone.length === country.digits
    : name.trim().length >= 2 && phone.length === country.digits

  const handleContinue = async () => {
    if (!canContinue) {
      if (!signingIn && name.trim().length < 2) setError('Please enter your full name.')
      else setError(`Enter a valid ${country.digits}-digit number.`)
      return
    }
    setError('')
    setLoading(true)
    try {
      const fullPhone = `${country.code.replace('+', '')}${phone}`
      await sendOtp(phone, country.code)

      if (country.code !== '+91') {
        // International: SMS OTP not supported — hand off to WhatsApp flow
        router.push({
          pathname: '/(onboarding)/whatsapp-verify',
          params: {
            phone: fullPhone,
            displayPhone: `${country.code} ${phone}`,
            ...(signingIn ? {} : { name: name.trim(), email: email.trim() }),
            ...(params.next ? { next: params.next } : {}),
          },
        })
      } else {
        router.push({
          pathname: '/(onboarding)/otp',
          params: {
            phone: fullPhone,
            ...(signingIn ? {} : { name: name.trim(), email: email.trim() }),
            ...(params.next ? { next: params.next } : {}),
          },
        })
      }
    } catch (err: any) {
      setError(err?.message || 'Could not send OTP. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <CountryPickerModal
        visible={showPicker}
        selected={country}
        onSelect={setCountry}
        onClose={() => setShowPicker(false)}
      />

      <YAppChrome
        right={
          <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: YL.ink3, paddingRight: 4, letterSpacing: 0.4 }}>
            RESERVE
          </Text>
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Route breadcrumb */}
          {hasBreadcrumb && (
            <View style={styles.breadcrumb}>
              <View style={styles.breadcrumbDot} />
              <Text style={styles.breadcrumbText} numberOfLines={1}>
                {pickupLabel}
              </Text>
              <ArrowIcon />
              <Text style={styles.breadcrumbText} numberOfLines={1}>
                {dropLabel}
              </Text>
              {timeLabel && (
                <Text style={styles.breadcrumbTime}>· {timeLabel}</Text>
              )}
            </View>
          )}

          {/* Headline */}
          <Text style={styles.headline}>
            {signingIn ? 'Welcome back' : 'A few details, '}
            {!signingIn && <Text style={[styles.headline, { fontStyle: 'italic' }]}>before we begin.</Text>}
          </Text>

          <Text style={styles.body}>
            {signingIn
              ? 'Enter your mobile number and we\'ll send a one-time code.'
              : 'So we can quote your fare, dispatch your chauffeur, and have everything ready when you arrive.'}
          </Text>

          {/* Fields */}
          <View style={styles.fieldStack}>
            {/* Name — hidden in sign-in mode */}
            {!signingIn && (
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>FULL NAME</Text>
                <TextInput
                  value={name}
                  onChangeText={(v) => { setName(v); setError('') }}
                  style={styles.input}
                  placeholder="Your full name"
                  placeholderTextColor={YL.ink3}
                  autoCapitalize="words"
                  autoComplete="name"
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                  {...(Platform.OS === 'web' ? { outlineWidth: 0 } as any : {})}
                />
              </View>
            )}

            {/* Mobile */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>MOBILE</Text>
              <View style={styles.phoneRow}>
                <Pressable onPress={() => setShowPicker(true)} style={styles.flagBtn}>
                  <Text style={styles.flagEmoji}>{country.flag}</Text>
                  <Text style={styles.dialCode}>{country.code}</Text>
                  <Svg width={10} height={6} viewBox="0 0 10 6" fill="none">
                    <Path d="M1 1L5 5L9 1" stroke={YL.ink3} strokeWidth={1.5} strokeLinecap="round" />
                  </Svg>
                </Pressable>
                <TextInput
                  ref={phoneRef}
                  value={phone}
                  onChangeText={(v) => { setPhone(v.replace(/\D/g, '')); setError('') }}
                  style={[styles.input, styles.phoneInput]}
                  placeholder={'•'.repeat(country.digits)}
                  placeholderTextColor={YL.ink3}
                  keyboardType="phone-pad"
                  maxLength={country.digits}
                  returnKeyType={signingIn ? 'done' : 'next'}
                  onSubmitEditing={signingIn ? handleContinue : () => emailRef.current?.focus()}
                  {...(Platform.OS === 'web' ? { outlineWidth: 0, dataSet: { clarityMask: 'True' } } as any : {})}
                />
              </View>
            </View>

            {/* Email — hidden in sign-in mode */}
            {!signingIn && (
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>
                  EMAIL{'  '}
                  <Text style={styles.optionalLabel}>OPTIONAL</Text>
                </Text>
                <TextInput
                  ref={emailRef}
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                  placeholder="for receipts & GST invoices"
                  placeholderTextColor={YL.ink3}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="done"
                  onSubmitEditing={handleContinue}
                  {...(Platform.OS === 'web' ? { outlineWidth: 0 } as any : {})}
                />
              </View>
            )}
          </View>

          {/* Trust line */}
          <View style={styles.trustRow}>
            <ShieldIcon />
            <Text style={styles.trustText}>Phone never shared · driver calls are masked</Text>
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <View style={{ flex: 1, minHeight: 24 }} />

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.termsText}>
              We'll text a one-time code to verify. By continuing you agree to our{' '}
              <Text style={{ textDecorationLine: 'underline', color: YL.ink }}>Terms</Text>.
            </Text>
            <YButton
              variant="primary"
              onPress={handleContinue}
              disabled={!canContinue || loading}
            >
              {loading ? 'Sending…' : 'Continue →'}
            </YButton>
            <Pressable
              onPress={() => { setSigningIn(v => !v); setError(''); setName('') }}
              style={{ alignItems: 'center', paddingVertical: 6 }}
            >
              <Text style={{ fontFamily: FONTS.display, fontSize: 13, color: YL.ink3 }}>
                {signingIn ? 'New here? ' : 'Already have an account? '}
                <Text style={{ color: YL.ink, textDecorationLine: 'underline' }}>
                  {signingIn ? 'Create account' : 'Sign in'}
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: YL.bg,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexGrow: 1,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: YL.line,
    backgroundColor: YL.card,
    alignSelf: 'flex-start',
    marginBottom: 22,
    flexShrink: 1,
    maxWidth: '100%',
  },
  breadcrumbDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: YL.ink,
    flexShrink: 0,
  },
  breadcrumbText: {
    fontFamily: FONTS.mono,
    fontSize: 10.5,
    color: YL.ink2,
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  breadcrumbTime: {
    fontFamily: FONTS.mono,
    fontSize: 10.5,
    color: YL.ink3,
    letterSpacing: 0.3,
    flexShrink: 0,
  },
  headline: {
    fontFamily: FONTS.display,
    fontSize: 32,
    fontWeight: '500',
    letterSpacing: -1,
    color: YL.ink,
    lineHeight: 36,
    marginBottom: 8,
  },
  body: {
    fontFamily: FONTS.display,
    fontSize: 13.5,
    color: YL.ink2,
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 320,
  },
  fieldStack: {
    gap: 14,
    marginBottom: 18,
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: FONTS.mono,
    fontSize: 10.5,
    color: YL.ink3,
    letterSpacing: 0.5,
  },
  optionalLabel: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: YL.ink3,
    opacity: 0.6,
    letterSpacing: 0.4,
  },
  input: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: YL.line,
    backgroundColor: YL.card,
    paddingHorizontal: 16,
    fontFamily: FONTS.display,
    fontSize: 16,
    color: YL.ink,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 10,
  },
  flagBtn: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: YL.line,
    backgroundColor: YL.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 6,
  },
  flagEmoji: {
    fontSize: 18,
  },
  dialCode: {
    fontFamily: FONTS.display,
    fontSize: 15,
    fontWeight: '500',
    color: YL.ink,
  },
  phoneInput: {
    flex: 1,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  trustText: {
    fontFamily: FONTS.display,
    fontSize: 12,
    color: YL.ink3,
  },
  error: {
    fontFamily: FONTS.display,
    fontSize: 13,
    color: '#C0392B',
    marginBottom: 8,
  },
  footer: {
    paddingBottom: 12,
    gap: 12,
  },
  termsText: {
    fontFamily: FONTS.display,
    fontSize: 11.5,
    color: YL.ink3,
    lineHeight: 17,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalSheet: {
    backgroundColor: YL.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: YL.line,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: FONTS.display,
    fontSize: 16,
    fontWeight: '600',
    color: YL.ink,
    marginBottom: 12,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: YL.lineSoft,
  },
  countryRowActive: {
    backgroundColor: YL.yellowSoft,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  countryFlag: {
    fontSize: 22,
  },
  countryName: {
    fontFamily: FONTS.display,
    fontSize: 15,
    color: YL.ink,
    flex: 1,
  },
  countryCode: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: YL.ink3,
  },
})

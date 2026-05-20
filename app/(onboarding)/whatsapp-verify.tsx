import React from 'react'
import { View, Text, Pressable, StyleSheet, Linking, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import Svg, { Path } from 'react-native-svg'
import { YL, FONTS } from '../../constants/theme'
import YAppChrome from '../../components/YAppChrome'
import YButton from '../../components/YButton'
import { SUPPORT_WHATSAPP } from '../../constants/config'

function WhatsAppIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.398A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"
        fill="#25D366"
      />
      <Path
        d="M16.5 14.25c-.375-.188-2.25-1.125-2.625-1.25-.375-.125-.625-.188-.875.188s-1 1.25-1.25 1.5c-.25.25-.5.25-.875.062-.375-.187-1.625-.625-3.125-2-.75-.75-1.25-1.625-1.375-2s.125-.5.375-.687c.25-.188.375-.25.5-.5.125-.25.062-.5-.062-.688-.125-.187-.875-2.062-1.188-2.875-.25-.625-.5-.5-.687-.5h-.625c-.25 0-.625.063-.938.375S3 7.375 3 8.625s.938 2.5 1.062 2.625c.125.125 1.875 2.875 4.5 3.938.625.25 1.125.438 1.5.562.625.188 1.188.188 1.625.125.5-.062 1.5-.625 1.75-1.188.25-.562.25-1.062.188-1.187-.062-.062-.25-.125-.625-.313z"
        fill="white"
      />
    </Svg>
  )
}

export default function WhatsAppVerifyScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    phone: string       // full e.g. "449876543210"
    displayPhone: string // formatted e.g. "+44 9876 543210"
    name?: string
    email?: string
    next?: string
  }>()

  const { phone, displayPhone, name, email, next } = params

  const openWhatsApp = () => {
    const message = encodeURIComponent(
      `Hi Yellow, please send my login OTP for number +${phone}`
    )
    const url = `https://wa.me/${SUPPORT_WHATSAPP}?text=${message}`
    Linking.openURL(url)
  }

  const goToOtpEntry = () => {
    router.push({
      pathname: '/(onboarding)/otp',
      params: {
        phone,
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
        ...(next ? { next } : {}),
      },
    })
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <YAppChrome />

      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconWrap}>
          <WhatsAppIcon />
        </View>

        <Text style={styles.headline}>Verify via WhatsApp</Text>

        <Text style={styles.body}>
          OTP via SMS isn't available for your number. Message us on WhatsApp and we'll send your verification code right back.
        </Text>

        {/* Phone display */}
        <View style={styles.phoneChip}>
          <Text style={styles.phoneChipText}>{displayPhone}</Text>
        </View>

        <Text style={styles.instruction}>
          Tap the button below — it'll open WhatsApp with your number pre-filled. We'll reply with your code within a few minutes.
        </Text>

        <YButton variant="primary" onPress={openWhatsApp} style={styles.whatsappBtn}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <WhatsAppIcon />
            <Text style={{ fontFamily: FONTS.display, fontSize: 16, fontWeight: '600', color: YL.ink }}>
              Open WhatsApp
            </Text>
          </View>
        </YButton>

        <Pressable onPress={goToOtpEntry} style={styles.otpLink}>
          <Text style={styles.otpLinkText}>
            Already have the code?{' '}
            <Text style={{ color: YL.ink, textDecorationLine: 'underline' }}>Enter it →</Text>
          </Text>
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Change number</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: YL.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#E8FBF0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  headline: {
    fontFamily: FONTS.display,
    fontSize: 28,
    fontWeight: '600',
    color: YL.ink,
    letterSpacing: -0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: YL.ink2,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 300,
  },
  phoneChip: {
    backgroundColor: YL.card,
    borderWidth: 1.5,
    borderColor: YL.line,
    borderRadius: 100,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 20,
  },
  phoneChipText: {
    fontFamily: FONTS.mono,
    fontSize: 15,
    color: YL.ink,
    letterSpacing: 0.5,
  },
  instruction: {
    fontFamily: FONTS.display,
    fontSize: 13,
    color: YL.ink3,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 28,
    maxWidth: 280,
  },
  whatsappBtn: {
    width: '100%',
    marginBottom: 16,
  },
  otpLink: {
    paddingVertical: 10,
    marginBottom: 8,
  },
  otpLinkText: {
    fontFamily: FONTS.display,
    fontSize: 13.5,
    color: YL.ink2,
    textAlign: 'center',
  },
  backLink: {
    paddingVertical: 8,
  },
  backLinkText: {
    fontFamily: FONTS.display,
    fontSize: 13,
    color: YL.ink3,
  },
})

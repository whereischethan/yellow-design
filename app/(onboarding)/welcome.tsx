import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Svg, { Path, Circle } from 'react-native-svg'
import { YL, FONTS } from '../../constants/theme'
import GulmoharSpray from '../../components/GulmoharSpray'
import YBrand from '../../components/YBrand'
import YButton from '../../components/YButton'

export default function ScreenWelcome() {
  const router = useRouter()

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Main yellow card */}
      <View style={styles.card}>
        {/* Decorative spray */}
        <GulmoharSpray
          style={{ position: 'absolute', right: -40, top: -30, width: 220, height: 220 }}
          color={YL.ink}
          opacity={0.06}
        />

        {/* Top row: brand + pill */}
        <View style={styles.topRow}>
          <YBrand size={22} logoSource={require('../../assets/logo.png')} />
          <View style={styles.pill}>
            <Text style={styles.pillText}>100% ELECTRIC</Text>
          </View>
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* SUV Illustration */}
        <Svg
          width="100%"
          height={130}
          viewBox="0 0 320 140"
          style={{ marginBottom: 14 }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Body */}
          <Path
            d="M40 95 L60 65 Q75 55 100 52 L220 52 Q245 55 260 70 L290 85 Q300 88 300 95 L300 110 Q300 115 295 115 L40 115 Q35 115 35 110 L35 100 Q35 95 40 95 Z"
            fill={YL.ink}
          />
          {/* Front window */}
          <Path
            d="M72 72 L95 60 L155 60 L155 80 L70 80 Z"
            fill={YL.yellow}
            opacity={0.95}
          />
          {/* Rear window */}
          <Path
            d="M160 60 L215 60 Q235 62 245 75 L245 80 L160 80 Z"
            fill={YL.yellow}
            opacity={0.95}
          />
          {/* Left wheel outer */}
          <Circle cx={95} cy={118} r={16} fill={YL.ink} />
          {/* Left wheel inner */}
          <Circle cx={95} cy={118} r={8} fill={YL.yellow} />
          {/* Right wheel outer */}
          <Circle cx={235} cy={118} r={16} fill={YL.ink} />
          {/* Right wheel inner */}
          <Circle cx={235} cy={118} r={8} fill={YL.yellow} />
          {/* Lightning bolt */}
          <Path
            d="M280 50 L270 65 L278 66 L270 80"
            stroke={YL.ink}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>

        {/* Headline */}
        <Text style={styles.headline}>{'Arrive rested.\nRide Yellow.'}</Text>

        {/* Kannada sub */}
        <Text style={styles.kannadaSub}>
          ವಿಶ್ರಾಂತಿಯಿಂದ ತಲುಪಿ · ಹಳದಿಯಲ್ಲಿ ಪ್ರಯಾಣಿಸಿ
        </Text>

        {/* Description */}
        <Text style={styles.description}>
          Premium electric SUVs to & from Kempegowda International — flight-aware, zero-cancel.
        </Text>
      </View>

      {/* Bottom section */}
      <View style={styles.bottom}>
        <YButton
          variant="ink"
          size="lg"
          onPress={() => router.push('/(onboarding)/phone')}
        >
          Get started
        </YButton>
        <YButton
          variant="primary"
          size="lg"
          onPress={() => router.push({ pathname: '/(onboarding)/phone', params: { mode: 'signin' } })}
        >
          Sign in
        </YButton>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: YL.bg,
  },
  card: {
    margin: 16,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
    backgroundColor: YL.yellow,
    borderRadius: 28,
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pill: {
    backgroundColor: YL.ink,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: {
    fontFamily: FONTS.mono,
    fontSize: 10.5,
    fontWeight: '600',
    color: YL.yellow,
    letterSpacing: 0.5,
  },
  headline: {
    fontFamily: FONTS.display,
    fontSize: 40,
    letterSpacing: -1.3,
    fontWeight: '500',
    color: YL.ink,
    lineHeight: 46,
  },
  kannadaSub: {
    fontFamily: FONTS.kannada,
    fontSize: 15,
    color: YL.ink,
    opacity: 0.75,
    marginTop: 6,
  },
  description: {
    fontSize: 14.5,
    color: YL.ink,
    opacity: 0.78,
    lineHeight: 14.5 * 1.45,
    maxWidth: 300,
    marginTop: 10,
  },
  bottom: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 10,
  },
  signInText: {
    fontSize: 13.5,
    color: YL.ink2,
    textAlign: 'center',
    marginTop: 4,
  },
  signInBold: {
    fontWeight: '600',
    color: YL.ink,
  },
})

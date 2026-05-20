import React from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Svg, { Path, Circle } from 'react-native-svg'
import { YL, FONTS } from '../../constants/theme'
import YBrand from '../../components/YBrand'
import { SUPPORT_WHATSAPP } from '../../constants/config'

function CalendarIcon() {
  return (
    <Svg width={56} height={56} viewBox="0 0 56 56" fill="none">
      <Circle cx={28} cy={28} r={26} fill={YL.bg2} stroke={YL.line} strokeWidth={1.5} />
      <Path
        d="M18 22H38V38H18V22Z"
        stroke={YL.ink}
        strokeWidth={1.6}
        strokeLinejoin="round"
        fill={YL.card}
      />
      <Path d="M18 26H38" stroke={YL.ink} strokeWidth={1.4} />
      <Path d="M23 20V23" stroke={YL.ink} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M33 20V23" stroke={YL.ink} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M22 31H25" stroke={YL.ink} strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M31 31H34" stroke={YL.ink} strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M22 34H25" stroke={YL.ink} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  )
}

function TipRow({ text }: { text: string }) {
  return (
    <View style={styles.tipRow}>
      <View style={styles.tipBullet} />
      <Text style={styles.tipText}>{text}</Text>
    </View>
  )
}

export default function UnavailableScreen() {
  const router = useRouter()

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.topBar}>
          <YBrand size={22} logoSource={require('../../assets/logo.png')} />
        </View>

        {/* Icon badge */}
        <View style={styles.iconWrap}>
          <CalendarIcon />
        </View>

        {/* Headlines */}
        <Text style={styles.headline}>Not Available</Text>
        <Text style={styles.body}>
          We don't have a Yellow available for this slot right now. Our team can often arrange
          something — reach out on WhatsApp and we'll do our best.
        </Text>

        {/* Tips card */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>You can also try</Text>
          <TipRow text="A different date or time" />
          <TipRow text="Booking further in advance (24 h+ is ideal)" />
          <TipRow text="Checking back later — availability updates regularly" />
        </View>

        {/* WhatsApp CTA */}
        <Pressable
          style={({ pressed }) => [styles.waBtn, { opacity: pressed ? 0.85 : 1 }]}
          onPress={() => Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP}`)}
        >
          <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
            <Path
              d="M10 1.5C5.306 1.5 1.5 5.306 1.5 10C1.5 11.572 1.928 13.044 2.672 14.306L1.5 18.5L5.832 17.354C7.056 18.044 8.48 18.44 10 18.44C14.694 18.44 18.5 14.634 18.5 9.94C18.5 5.246 14.694 1.5 10 1.5Z"
              fill="#25D366"
            />
            <Path
              d="M7.6 6.4C7.4 6 7.1 6 6.9 6C6.7 6 6.5 6 6.3 6C6.1 6 5.8 6.1 5.5 6.4C5.2 6.7 4.5 7.4 4.5 8.7C4.5 10 5.5 11.3 5.6 11.5C5.7 11.7 7.4 14.5 10.2 15.5C12.5 16.4 13 16.2 13.5 16.2C14 16.2 15.1 15.5 15.4 14.8C15.7 14.1 15.7 13.5 15.6 13.4C15.5 13.3 15.3 13.2 15 13.1C14.7 13 13.4 12.4 13.2 12.3C13 12.2 12.8 12.2 12.6 12.4C12.4 12.6 11.9 13.2 11.7 13.4C11.5 13.6 11.4 13.6 11.1 13.5C10.8 13.4 9.9 13.1 8.8 12.1C7.9 11.3 7.3 10.3 7.2 10C7.1 9.7 7.2 9.6 7.4 9.4C7.5 9.3 7.7 9.1 7.8 8.9C7.9 8.7 8 8.6 8.1 8.4C8.2 8.2 8.1 8 8 7.8C7.9 7.6 7.4 6.4 7.6 6.4Z"
              fill="white"
            />
          </Svg>
          <Text style={styles.waBtnText}>Chat on WhatsApp</Text>
        </Pressable>

        {/* Secondary actions */}
        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => router.back()}
        >
          <Text style={styles.secondaryBtnText}>← Try a different slot</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.ghostBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => router.replace('/(app)/home')}
        >
          <Text style={styles.ghostBtnText}>Back to Home</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: YL.bg,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    alignItems: 'center',
  },
  topBar: {
    alignSelf: 'stretch',
    paddingTop: 16,
    paddingBottom: 8,
  },
  iconWrap: {
    marginTop: 40,
    marginBottom: 24,
  },
  headline: {
    fontFamily: FONTS.display,
    fontWeight: '600',
    fontSize: 28,
    letterSpacing: -0.8,
    color: YL.ink,
    textAlign: 'center',
  },
  headlineKn: {
    fontFamily: FONTS.display,
    fontSize: 15,
    color: YL.ink3,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  body: {
    fontFamily: FONTS.display,
    fontSize: 14.5,
    lineHeight: 22,
    color: YL.ink2,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: 24,
  },
  tipsCard: {
    alignSelf: 'stretch',
    backgroundColor: YL.card,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: YL.line,
    padding: 18,
    marginBottom: 28,
    gap: 10,
  },
  tipsTitle: {
    fontFamily: FONTS.display, fontWeight: '600',
    fontSize: 13,
    letterSpacing: 0.1,
    color: YL.ink,
    marginBottom: 4,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tipBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: YL.ink3,
    marginTop: 7,
  },
  tipText: {
    fontFamily: FONTS.display,
    fontSize: 13.5,
    lineHeight: 20,
    color: YL.ink2,
    flex: 1,
  },
  waBtn: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: YL.ink,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  waBtnText: {
    fontFamily: FONTS.display, fontWeight: '600',
    fontSize: 15,
    color: YL.card,
  },
  secondaryBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: YL.line,
    backgroundColor: YL.card,
    marginBottom: 10,
  },
  secondaryBtnText: {
    fontFamily: FONTS.display,
    fontSize: 14.5,
    color: YL.ink,
  },
  ghostBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 12,
  },
  ghostBtnText: {
    fontFamily: FONTS.display,
    fontSize: 13.5,
    color: YL.ink3,
  },
})

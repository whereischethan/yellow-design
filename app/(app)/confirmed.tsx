import React from 'react'
import { View, Text, ScrollView, Share, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import Svg, { Path } from 'react-native-svg'
import { YL, FONTS } from '../../constants/theme'
import YAppChrome from '../../components/YAppChrome'
import YButton from '../../components/YButton'
import GulmoharSpray from '../../components/GulmoharSpray'
import type { Booking } from '../../types/booking'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso)
    const h = d.getHours()
    const m = d.getMinutes().toString().padStart(2, '0')
    const ampm = h >= 12 ? 'PM' : 'AM'
    return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} · ${h % 12 || 12}:${m} ${ampm}`
  } catch {
    return ''
  }
}

function PinIcon({ color = YL.ink3 }: { color?: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <Path d="M7 1.5C4.791 1.5 3 3.291 3 5.5c0 3 4 7 4 7s4-4 4-7c0-2.209-1.791-4-4-4Z" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M7 6.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill={color} />
    </Svg>
  )
}

function ClockIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <Path d="M7 1.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z" stroke={YL.ink3} strokeWidth={1.4} />
      <Path d="M7 4v3l2 1.5" stroke={YL.ink3} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export default function ScreenConfirmed() {
  const router = useRouter()
  const params = useLocalSearchParams<{ booking: string }>()
  const booking: Booking | null = (() => {
    try { return params.booking ? JSON.parse(params.booking) : null } catch { return null }
  })()

  const handleShare = async () => {
    if (!booking) return
    const pickupTime = booking.pickup?.dateTime ? formatDateTime(booking.pickup.dateTime) : ''
    const code = booking.tripCode ?? booking.id ?? ''
    try {
      await Share.share({
        message: `My Yellow ride is confirmed!\nBooking: ${code}\nPickup: ${pickupTime}\nFrom: ${booking.pickup?.placeName || ''}\nTo: ${booking.drop?.placeName || ''}`,
      })
    } catch {}
  }

  const bookingCode = booking?.tripCode ?? (booking?.id ? `#${booking.id.slice(0, 8).toUpperCase()}` : '#YL-XXXXXX')
  const pickupLabel = booking?.pickup?.placeName || booking?.pickup?.location || 'Pickup location'
  const dropLabel = booking?.drop?.placeName || booking?.drop?.location || 'Drop location'
  const pickupDateTime = booking?.pickup?.dateTime ? formatDateTime(booking.pickup.dateTime) : null

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: YL.bg, overflow: 'hidden' }}>
      <GulmoharSpray
        style={{ position: 'absolute', right: -80, top: -20, width: 280, height: 280 }}
        color={YL.gulmohar}
        opacity={0.1}
      />
      <GulmoharSpray
        style={{ position: 'absolute', left: -100, bottom: -40, width: 260, height: 260, transform: [{ rotate: '180deg' }] }}
        color={YL.gulmohar}
        opacity={0.08}
      />

      <YAppChrome
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: YL.leaf }} />
            <Text style={{ fontFamily: FONTS.display, fontSize: 12, color: YL.ink3 }}>confirmed</Text>
          </View>
        }
      />

      <ScrollView
        style={{ flex: 1, zIndex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Check badge */}
        <View style={{
          width: 64, height: 64, borderRadius: 32,
          backgroundColor: YL.yellow, borderWidth: 2, borderColor: YL.ink,
          alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          shadowColor: YL.yellowDeep, shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
        }}>
          <Svg width={30} height={24} viewBox="0 0 30 24" fill="none">
            <Path d="M4 13L11 20L26 4" stroke={YL.ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>

        {/* Headline */}
        <Text style={{ fontFamily: FONTS.display, fontSize: 34, fontWeight: '500', color: YL.ink, letterSpacing: -1 }}>
          Your <Text style={{ fontStyle: 'italic' }}>Yellow</Text>{'\nis locked in.'}
        </Text>
        <Text style={{ fontFamily: FONTS.display, fontSize: 14, color: YL.ink2, marginTop: 8 }}>
          Booking{' '}
          <Text style={{ fontFamily: FONTS.mono, color: YL.ink }}>{bookingCode}</Text>
        </Text>

        {/* Trip details card */}
        <View style={{
          marginTop: 20, padding: 18, backgroundColor: YL.card,
          borderWidth: 1, borderColor: YL.line, borderRadius: 22,
          gap: 14,
        }}>
          {pickupDateTime && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ marginTop: 1 }}><ClockIcon /></View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONTS.mono, fontSize: 10.5, color: YL.ink3, letterSpacing: 0.3, marginBottom: 3 }}>
                  PICKUP TIME
                </Text>
                <Text style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: '500', color: YL.ink }}>
                  {pickupDateTime}
                </Text>
              </View>
            </View>
          )}

          <View style={{ height: 1, backgroundColor: YL.lineSoft }} />

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View style={{ marginTop: 1 }}><PinIcon color={YL.leaf} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 10.5, color: YL.ink3, letterSpacing: 0.3, marginBottom: 3 }}>
                FROM
              </Text>
              <Text style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: '500', color: YL.ink }}>
                {pickupLabel}
              </Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: YL.lineSoft }} />

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View style={{ marginTop: 1 }}><PinIcon color={YL.gulmohar} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 10.5, color: YL.ink3, letterSpacing: 0.3, marginBottom: 3 }}>
                TO
              </Text>
              <Text style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: '500', color: YL.ink }}>
                {dropLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Chauffeur notice */}
        <View style={{
          marginTop: 12, padding: 14, paddingHorizontal: 16,
          backgroundColor: YL.bg2, borderRadius: 14,
          borderWidth: 1, borderColor: YL.lineSoft,
        }}>
          <Text style={{ fontFamily: FONTS.display, fontSize: 13, color: YL.ink2, lineHeight: 19 }}>
            Your chauffeur will be confirmed closer to the trip. We'll send you a notification.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom buttons */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20, zIndex: 1 }}>
        <YButton variant="outline" full={false} style={{ flex: 1 }} onPress={handleShare}>
          Share
        </YButton>
        <YButton variant="ink" full={false} style={{ flex: 2 }} onPress={() => {
          if (booking) {
            router.replace({ pathname: '/(app)/awaiting', params: { booking: params.booking } })
          } else {
            router.replace('/(app)/home')
          }
        }}>
          {booking ? 'Track booking' : 'Back to home'}
        </YButton>
      </View>
    </SafeAreaView>
  )
}

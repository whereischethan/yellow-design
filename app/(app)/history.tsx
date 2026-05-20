import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Svg, { Path, Circle } from 'react-native-svg'
import { YL, FONTS } from '../../constants/theme'
import YAppChrome from '../../components/YAppChrome'
import BottomNav from '../../components/BottomNav'
import { getBookings, getApiBase, getAuthToken } from '../../lib/api'
import type { Booking } from '../../types/booking'

type Tab = 'upcoming' | 'past'

const UPCOMING_STATUSES = new Set(['pending', 'confirmed', 'assigned', 'arrived', 'in_progress'])
const PAST_STATUSES = new Set(['completed', 'cancelled'])

function formatDateTime(dt: string): string {
  try {
    const date = new Date(dt)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const timeStr = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    if (date.toDateString() === today.toDateString()) return `Today · ${timeStr}`
    if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow · ${timeStr}`
    const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    return `${dateStr} · ${timeStr}`
  } catch {
    return dt
  }
}

function StatusBadge({ status }: { status: string }) {
  let bg: string = YL.bg2
  let color: string = YL.ink3
  let label = status.replace('_', ' ').toUpperCase()

  if (['confirmed', 'assigned', 'arrived'].includes(status)) {
    bg = YL.yellowSoft; color = YL.ink; label = 'UPCOMING'
  } else if (status === 'in_progress') {
    bg = YL.leafSoft; color = YL.leaf; label = 'EN ROUTE'
  } else if (status === 'completed') {
    bg = YL.bg2; color = YL.ink3; label = 'DONE'
  } else if (status === 'cancelled') {
    bg = '#FEF2F2'; color = '#C0392B'; label = 'CANCELLED'
  } else if (status === 'pending') {
    bg = YL.bg2; color = YL.ink3; label = 'PENDING'
  }

  return (
    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: bg }}>
      <Text style={{ fontFamily: FONTS.mono, fontSize: 10, color, letterSpacing: 0.3 }}>{label}</Text>
    </View>
  )
}

function RouteIcon({ upcoming }: { upcoming?: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Circle cx={5} cy={6} r={2} stroke={upcoming ? YL.ink : YL.ink2} strokeWidth={1.5} />
      <Path d="M5 8V12" stroke={upcoming ? YL.ink : YL.ink2} strokeWidth={1.5} strokeDasharray="2 2" />
      <Path
        d="M3.5 12L5 14.5L6.5 12"
        stroke={upcoming ? YL.ink : YL.ink2}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M9 6H15M9 12H15" stroke={upcoming ? YL.ink : YL.ink3} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}

function BookingRow({ booking, onPress }: { booking: Booking; onPress: () => void }) {
  const upcoming = UPCOMING_STATUSES.has(booking.status)
  const pickupName = booking.pickup?.placeName || booking.pickup?.location || 'Pickup'
  const dropName = booking.drop?.placeName || booking.drop?.location || 'Drop'
  const title = `${pickupName} → ${dropName}`
  const time = booking.pickup?.dateTime ? formatDateTime(booking.pickup.dateTime) : '—'
  const price = booking.pricing?.totalPrice
    ? `₹${booking.pricing.totalPrice.toLocaleString('en-IN')}`
    : '—'
  const driverName = booking.assignedDriver?.name

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        paddingVertical: 14,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: upcoming ? YL.yellow : YL.bg2,
          borderWidth: upcoming ? 1.5 : 0,
          borderColor: upcoming ? YL.ink : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <RouteIcon upcoming={upcoming} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text
            style={{
              fontFamily: FONTS.display,
              fontSize: 14,
              fontWeight: '500',
              color: YL.ink,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
          <StatusBadge status={booking.status} />
        </View>
        {driverName && (
          <Text style={{ fontFamily: FONTS.display, fontSize: 12, color: YL.ink3, marginTop: 1 }} numberOfLines={1}>
            {driverName}
          </Text>
        )}
        <Text style={{ fontFamily: FONTS.mono, fontSize: 11.5, color: YL.ink3, marginTop: 2 }}>
          {booking.tripCode ? `#${booking.tripCode} · ` : ''}{time}
        </Text>
        {booking.status === 'completed' && booking.tripCode && (
          <Pressable
            onPress={e => {
              e.stopPropagation?.()
              const token = getAuthToken()
              const url = `${getApiBase()}/invoices/${booking.tripCode}${token ? `?token=${encodeURIComponent(token)}` : ''}`
              Linking.openURL(url)
            }}
            style={{ alignSelf: 'flex-start', marginTop: 3 }}
          >
            <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: YL.ink2, textDecorationLine: 'underline' }}>
              Download invoice
            </Text>
          </Pressable>
        )}
      </View>
      <Text
        style={{
          fontFamily: FONTS.display,
          fontSize: 15,
          fontWeight: '500',
          color: YL.ink,
        }}
      >
        {price}
      </Text>
    </Pressable>
  )
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 60, paddingBottom: 20 }}>
      <Svg width={56} height={56} viewBox="0 0 56 56" fill="none">
        <Circle cx={28} cy={28} r={26} fill={YL.bg2} stroke={YL.line} strokeWidth={1.5} />
        <Path
          d="M18 24H38V38H18V24Z"
          stroke={YL.ink3}
          strokeWidth={1.5}
          strokeLinejoin="round"
          fill={YL.card}
        />
        <Path d="M18 28H38" stroke={YL.ink3} strokeWidth={1.3} />
        <Path d="M23 22V25" stroke={YL.ink3} strokeWidth={1.5} strokeLinecap="round" />
        <Path d="M33 22V25" stroke={YL.ink3} strokeWidth={1.5} strokeLinecap="round" />
      </Svg>
      <Text
        style={{
          fontFamily: FONTS.display,
          fontSize: 17,
          fontWeight: '500',
          color: YL.ink,
          marginTop: 16,
          letterSpacing: -0.3,
        }}
      >
        {tab === 'upcoming' ? 'No upcoming rides' : 'No past rides'}
      </Text>
      <Text style={{ fontFamily: FONTS.display, fontSize: 13.5, color: YL.ink3, marginTop: 6, textAlign: 'center', maxWidth: 260 }}>
        {tab === 'upcoming'
          ? 'Book a ride from the home screen to get started.'
          : 'Your completed and cancelled rides will appear here.'}
      </Text>
    </View>
  )
}

export default function ScreenRideHistory() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('upcoming')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getBookings()
      .then((data) => {
        if (!cancelled) setBookings(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Could not load rides.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const upcomingBookings = bookings.filter((b) => UPCOMING_STATUSES.has(b.status))
  const pastBookings = bookings.filter((b) => PAST_STATUSES.has(b.status))
  const shown = tab === 'upcoming' ? upcomingBookings : pastBookings

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: YL.bg, overflow: 'hidden' }}>
      <YAppChrome title="Ride history" />

      {/* Tab switcher */}
      <View
        style={{
          flexDirection: 'row',
          marginHorizontal: 20,
          marginTop: 4,
          marginBottom: 12,
          backgroundColor: YL.bg2,
          borderRadius: 12,
          padding: 3,
          gap: 3,
        }}
      >
        {(['upcoming', 'past'] as Tab[]).map((t) => {
          const active = t === tab
          const count = t === 'upcoming' ? upcomingBookings.length : pastBookings.length
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 9,
                borderRadius: 10,
                backgroundColor: active ? YL.card : 'transparent',
                alignItems: 'center',
                opacity: pressed ? 0.8 : 1,
                ...(active ? {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06,
                  shadowRadius: 2,
                  elevation: 1,
                } : {}),
              })}
            >
              <Text
                style={{
                  fontFamily: FONTS.display,
                  fontSize: 13,
                  fontWeight: active ? '600' : '400',
                  color: active ? YL.ink : YL.ink3,
                }}
              >
                {t === 'upcoming' ? 'Upcoming' : 'Past'}
                {!loading && count > 0 ? ` · ${count}` : ''}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <ActivityIndicator size="large" color={YL.ink3} />
          </View>
        ) : error ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text style={{ fontFamily: FONTS.display, fontSize: 14, color: YL.ink3, textAlign: 'center' }}>
              {error}
            </Text>
          </View>
        ) : shown.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <View
            style={{
              backgroundColor: YL.card,
              borderWidth: 1,
              borderColor: YL.line,
              borderRadius: 20,
              paddingHorizontal: 16,
            }}
          >
            {shown.map((booking, i) => (
              <View
                key={booking.id}
                style={{
                  borderBottomWidth: i < shown.length - 1 ? 1 : 0,
                  borderBottomColor: YL.lineSoft,
                }}
              >
                <BookingRow
                  booking={booking}
                  onPress={() => {
                    if (UPCOMING_STATUSES.has(booking.status)) {
                      router.push({ pathname: '/(app)/awaiting', params: { booking: JSON.stringify(booking) } })
                    } else {
                      router.push({ pathname: '/(app)/complete', params: { bookingId: booking.id } })
                    }
                  }}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <BottomNav
        active="history"
        onRide={() => router.push('/(app)/home')}
        onRewards={() => router.push('/(app)/referral')}
        onAccount={() => router.push('/(app)/profile')}
      />
    </SafeAreaView>
  )
}

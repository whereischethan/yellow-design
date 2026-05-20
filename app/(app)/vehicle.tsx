import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import Svg, { Path, Circle } from 'react-native-svg'
import { YL, FONTS } from '../../constants/theme'
import YAppChrome from '../../components/YAppChrome'
import YButton from '../../components/YButton'
import { IconPerson, IconBag } from '../../components/icons'
import { checkAvailability, logLead } from '../../lib/api'
import type { PricingResponse, BookingLocation, FlightInfo } from '../../types/booking'

function VehicleSvg() {
  return (
    <Svg width={78} height={50} viewBox="0 0 80 36">
      <Path
        d="M8 22 L16 14 Q22 10 32 10 L58 10 Q65 12 70 18 L74 22 Q76 23 76 25 L76 28 Q76 30 74 30 L10 30 Q8 30 8 28 L8 24 Q8 23 8 22 Z"
        fill={YL.ink}
      />
      <Path d="M20 18 L28 13 L42 13 L42 21 L20 21 Z" fill={YL.yellow} />
      <Path d="M44 13 L55 13 Q62 14 66 20 L66 21 L44 21 Z" fill={YL.yellow} />
      <Circle cx={24} cy={30} r={5} fill={YL.ink} />
      <Circle cx={60} cy={30} r={5} fill={YL.ink} />
    </Svg>
  )
}

function CheckMark() {
  return (
    <View style={styles.checkCircle}>
      <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
        <Path d="M2 7L5.5 10.5L12 3.5" stroke="white" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  )
}

export default function ScreenVehicle() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    passengers: string
    checkInBags: string
    cabinBags: string
tripType: string
    terminal: string
    pickup: string
    drop: string
    stops: string
    flight: string
    pricing: string
  }>()

  const passengers = parseInt(params.passengers ?? '1', 10)
  const checkInBags = parseInt(params.checkInBags ?? '0', 10)
  const cabinBags = parseInt(params.cabinBags ?? '0', 10)
  const bags = checkInBags + cabinBags
const pickup: BookingLocation | null = params.pickup ? JSON.parse(params.pickup) : null
  const pricing: PricingResponse | null = params.pricing ? JSON.parse(params.pricing) : null

  const yellowSkyPrice = pricing?.vehicleOptions?.yellowSky?.totalPrice
    ?? pricing?.vehicleOptions?.suv?.totalPrice
    ?? pricing?.totalPrice
    ?? 0

  const distanceKm = pricing?.distanceKm

  const [availability, setAvailability] = useState<{
    checked: boolean
    available: boolean
  }>({ checked: false, available: true })

  useEffect(() => {
    if (!pickup?.dateTime) {
      setAvailability({ checked: true, available: true })
      return
    }
    checkAvailability(pickup.dateTime)
      .then((result) => {
        setAvailability({ checked: true, available: result.available })
      })
      .catch(() => {
        setAvailability({ checked: true, available: true })
      })
  }, [pickup?.dateTime])

  // Log this pricing view as a lead
  useEffect(() => {
    if (!pickup || !pricing) return
    const drop = params.drop ? JSON.parse(params.drop) : null
    const stops = params.stops ? JSON.parse(params.stops) : undefined
    logLead({
      tripType: params.tripType,
      pickup,
      drop,
      stops,
      price: yellowSkyPrice,
      pickupTime: pickup.dateTime,
      flight: params.flight || undefined,
      pricing: pricing ?? undefined,
    })
  }, [])

  const handleReview = () => {
    router.push({
      pathname: '/(app)/review',
      params: {
        passengers: String(passengers),
        checkInBags: String(checkInBags),
        cabinBags: String(cabinBags),
tripType: params.tripType,
        terminal: params.terminal,
        pickup: params.pickup,
        drop: params.drop,
        stops: params.stops || '',
        flight: params.flight,
        pricing: params.pricing,
        vehicleType: 'yellowSky',
        vehiclePrice: String(yellowSkyPrice),
      },
    })
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: YL.bg }}>
      <YAppChrome right={
        <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: YL.ink3 }}>Step 2</Text>
      } />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headline}>
          Your{'  '}
          <Text style={{ fontStyle: 'italic' }}>ride</Text>
        </Text>

        {/* Context chip */}
        <View style={styles.contextChip}>
          <IconPerson size={14} color={YL.ink2} />
          <Text style={styles.contextText}>
            <Text style={{ fontWeight: '600', color: YL.ink }}>{passengers} passenger{passengers !== 1 ? 's' : ''}</Text>
          </Text>
          <View style={styles.chipDivider} />
          <IconBag size={14} color={YL.ink2} large />
          <Text style={styles.contextText}>
            <Text style={{ fontWeight: '600', color: YL.ink }}>{bags} bag{bags !== 1 ? 's' : ''}</Text>
          </Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.editText}>edit</Text>
          </Pressable>
        </View>

        {/* Availability notice */}
        {!availability.checked && (
          <View style={styles.availabilityRow}>
            <ActivityIndicator size="small" color={YL.ink3} />
            <Text style={styles.availabilityText}>Checking availability…</Text>
          </View>
        )}

        {availability.checked && !availability.available && (
          <View style={styles.unavailableBanner}>
            <Text style={styles.unavailableText}>
              No vehicles available at this time. Please go back and choose a different pickup time.
            </Text>
          </View>
        )}

        {/* Vehicle card */}
        <View style={styles.vehicleCard}>
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>YELLOW SKY</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <VehicleSvg />
            <View style={{ flex: 1 }}>
              <Text style={styles.vehicleName}>Kia Carens Clavis EV</Text>
              <View style={styles.vehicleStats}>
                <View style={styles.statRow}>
                  <IconPerson size={14} color={YL.ink2} />
                  <Text style={styles.statText}>{passengers} pax</Text>
                </View>
                <View style={styles.statRow}>
                  <IconBag size={14} color={YL.ink2} large />
                  <Text style={styles.statText}>{bags} bag{bags !== 1 ? 's' : ''}</Text>
                </View>
              </View>
              {!!distanceKm && (
                <Text style={styles.distanceText}>{distanceKm} km</Text>
              )}
            </View>

            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={styles.price}>₹{yellowSkyPrice.toLocaleString('en-IN')}</Text>
              <CheckMark />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom */}
      <View style={styles.bottom}>
        <YButton
          variant="primary"
          onPress={handleReview}
          disabled={availability.checked && !availability.available}
        >
          Review booking →
        </YButton>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  headline: {
    fontFamily: FONTS.display,
    fontSize: 30,
    fontWeight: '500',
    color: YL.ink,
    letterSpacing: -0.9,
    marginBottom: 6,
  },
  headlineSub: { fontFamily: FONTS.display, fontSize: 13.5, color: YL.ink3, marginBottom: 20 },
  contextChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: YL.card,
    borderWidth: 1,
    borderColor: YL.line,
    borderRadius: 100,
    alignSelf: 'flex-start',
    gap: 8,
    marginBottom: 16,
  },
  contextText: { fontFamily: FONTS.display, fontSize: 12.5, color: YL.ink2 },
  chipDivider: { width: 1, height: 14, backgroundColor: YL.line },
  editText: {
    fontFamily: FONTS.display,
    fontSize: 12.5,
    color: YL.ink3,
    marginLeft: 6,
    textDecorationLine: 'underline',
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  availabilityText: { fontSize: 13, color: YL.ink3 },
  unavailableBanner: {
    backgroundColor: '#FDF2F2',
    borderWidth: 1,
    borderColor: '#E8B4B4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  unavailableText: { fontSize: 13.5, color: '#C0392B', lineHeight: 20 },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    left: 14,
    backgroundColor: YL.yellow,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: YL.ink,
    paddingHorizontal: 10,
    paddingVertical: 3,
    zIndex: 10,
  },
  recommendedText: {
    fontFamily: FONTS.mono,
    fontSize: 10.5,
    fontWeight: '600',
    color: YL.ink,
    letterSpacing: 0.4,
  },
  vehicleCard: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: YL.yellow,
    borderWidth: 1.5,
    borderColor: YL.ink,
    position: 'relative',
    overflow: 'visible',
    marginTop: 16,
  },
  vehicleName: {
    fontFamily: FONTS.display,
    fontSize: 18,
    fontWeight: '500',
    color: YL.ink,
    letterSpacing: -0.4,
  },
  vehicleStats: { flexDirection: 'row', marginTop: 6, gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  distanceText: { fontFamily: FONTS.mono, fontSize: 11, color: YL.ink3, marginTop: 6, letterSpacing: 0.2 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontFamily: FONTS.display, fontSize: 12, color: YL.ink2 },
  price: { fontFamily: FONTS.display, fontSize: 20, fontWeight: '600', color: YL.ink, letterSpacing: -0.4 },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: YL.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
})

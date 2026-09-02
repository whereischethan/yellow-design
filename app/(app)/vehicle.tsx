import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Image,
  Dimensions,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import Svg, { Path, Circle } from 'react-native-svg'
import { YL, FONTS } from '../../constants/theme'
import YAppChrome from '../../components/YAppChrome'
import YButton from '../../components/YButton'
import { IconPerson } from '../../components/icons'
import { checkAvailability, notifyAvailability, logLead, getApiBase } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { SUPPORT_WHATSAPP } from '../../constants/config'
import { pixelViewContent, pixelLead, pixelInitiateCheckout } from '../../lib/pixel'
import { gtagLead } from '../../lib/gtag'
import type { PricingResponse, BookingLocation, FlightInfo } from '../../types/booking'

const SCREEN_W = Dimensions.get('window').width
const PHOTO_W = SCREEN_W * 0.62
const PHOTO_H = PHOTO_W * 0.66

const VEHICLE_PHOTOS = [
  {
    src: require('../../assets/vehicles/clavis-exterior.jpg'),
    caption: 'Exterior',
  },
  {
    src: require('../../assets/vehicles/clavis-sunroof.jpg'),
    caption: 'Panoramic sunroof',
  },
  {
    src: require('../../assets/vehicles/clavis-cabin.jpg'),
    caption: 'Rear cabin',
  },
  {
    src: require('../../assets/vehicles/clavis-purifier.jpg'),
    caption: 'Smart air purifier',
  },
]

function PhotoStrip() {
  return (
    <View style={{ marginTop: 24 }}>
      <Text style={photoStyles.label}>Inside your ride</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: 20, paddingRight: 12, gap: 10 }}
        decelerationRate="fast"
        snapToInterval={PHOTO_W + 10}
        snapToAlignment="start"
      >
        {VEHICLE_PHOTOS.map((photo) => (
          <View key={photo.caption} style={{ width: PHOTO_W }}>
            <Image
              source={photo.src}
              style={photoStyles.tile}
              resizeMode="cover"
            />
            <Text style={photoStyles.caption}>{photo.caption}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const photoStyles = StyleSheet.create({
  label: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: YL.ink3,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  tile: {
    width: PHOTO_W,
    height: PHOTO_H,
    borderRadius: 14,
    backgroundColor: YL.line,
  },
  caption: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: YL.ink3,
    marginTop: 6,
    letterSpacing: 0.2,
  },
})

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
tripType: string
    terminal: string
    pickup: string
    drop: string
    stops: string
    flight: string
    pricing: string
  }>()

  const passengers = parseInt(params.passengers ?? '1', 10)
const pickup: BookingLocation | null = params.pickup ? JSON.parse(params.pickup) : null
  const pricing: PricingResponse | null = params.pricing ? JSON.parse(params.pricing) : null

  const yellowSkyPrice = pricing?.vehicleOptions?.yellowSky?.totalPrice
    ?? pricing?.totalPrice
    ?? 0

  const distanceKm = pricing?.distanceKm

  const [firstRideConfig, setFirstRideConfig] = useState({ pct: 10, threshold: 1000 })
  useEffect(() => {
    fetch(`${getApiBase()}/pricing/config`)
      .then(r => r.json())
      .then(d => {
        if (d?.firstRideDiscountPct != null) setFirstRideConfig({
          pct: d.firstRideDiscountPct,
          threshold: d.firstRideDiscountThreshold ?? 1000,
        })
      })
      .catch(() => {})
  }, [])

  const { user } = useAuth()
  const isNewUser = (user?.bookingCount ?? 0) === 0
  const hasEmptyLeg = !!pricing?.emptyLeg
  const hasPromo = !!pricing?.promo
  const originalFare = hasEmptyLeg ? yellowSkyPrice + (pricing?.emptyLeg?.savedAmount ?? 0) : yellowSkyPrice
  function calcFirstRideDiscount(fare: number): number {
    if (fare < firstRideConfig.threshold) return 0
    return Math.round(fare * firstRideConfig.pct / 100)
  }
  // Empty leg and the flat-fare promo are exclusive — no first-ride discount stacks with either
  const newUserDiscount = !hasEmptyLeg && !hasPromo && isNewUser ? calcFirstRideDiscount(yellowSkyPrice) : 0
  const newUserPct = firstRideConfig.pct
  const effectivePrice = yellowSkyPrice - newUserDiscount
  const totalSaved = (hasEmptyLeg ? pricing!.emptyLeg!.savedAmount : 0) + newUserDiscount
  const showDiscount = hasEmptyLeg || hasPromo || isNewUser

  const [availability, setAvailability] = useState<{
    checked: boolean
    available: boolean
    blocked: boolean
    checkFailed?: boolean
    reason?: string
  }>({ checked: false, available: true, blocked: false })
  const [notifyDone, setNotifyDone] = useState(false)
  const [notifying, setNotifying]   = useState(false)
  const [notifyError, setNotifyError] = useState(false)

  useEffect(() => {
    if (!pickup?.dateTime) {
      setAvailability({ checked: true, available: true, blocked: false })
      return
    }
    checkAvailability(pickup.dateTime)
      .then((result) => {
        setAvailability({ checked: true, available: result.available, blocked: !!result.blocked, checkFailed: !!result.checkFailed, reason: result.reason })
      })
      .catch(() => {
        setAvailability({ checked: true, available: false, blocked: false, checkFailed: true })
      })
  }, [pickup?.dateTime])

  const handleNotifyMe = async () => {
    if (!pickup?.dateTime || notifying) return
    setNotifying(true)
    setNotifyError(false)
    try {
      await notifyAvailability(pickup.dateTime)
      setNotifyDone(true)
    } catch {
      setNotifyError(true)
    } finally {
      setNotifying(false)
    }
  }

  // Log this pricing view as a lead and fire browser pixel events
  useEffect(() => {
    if (!pickup || !pricing) return
    const drop = params.drop ? JSON.parse(params.drop) : null
    const stops = params.stops ? JSON.parse(params.stops) : undefined
    logLead({
      tripType: params.tripType,
      pickup,
      drop,
      stops,
      price: effectivePrice,
      pickupTime: pickup.dateTime,
      flight: params.flight || undefined,
      pricing: pricing ?? undefined,
    }).then((leadId) => {
      // ViewContent — user sees the priced vehicle card
      pixelViewContent({ value: effectivePrice, eventID: `vc_${leadId ?? Date.now()}` })
      if (leadId) {
        // Lead + InitiateCheckout with IDs matching the server Conversions API events
        pixelLead({ value: effectivePrice, eventID: `lead_${leadId}` })
        pixelInitiateCheckout({ value: effectivePrice, eventID: `checkout_${leadId}` })
        gtagLead({ value: effectivePrice, leadId })
      }
    })
  }, [])

  const handleReview = () => {
    router.push({
      pathname: '/(app)/review',
      params: {
        passengers: String(passengers),
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
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.headline, { paddingHorizontal: 20 }]}>
          Your{'  '}
          <Text style={{ fontStyle: 'italic' }}>ride</Text>
        </Text>

        {/* Context chip */}
        <View style={[styles.contextChip, { marginHorizontal: 20 }]}>
          <IconPerson size={14} color={YL.ink2} />
          <Text style={styles.contextText}>
            <Text style={{ fontWeight: '600', color: YL.ink }}>{passengers} passenger{passengers !== 1 ? 's' : ''}</Text>
          </Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.editText}>edit</Text>
          </Pressable>
        </View>

        {/* Availability notice */}
        {!availability.checked && (
          <View style={[styles.availabilityRow, { paddingHorizontal: 20 }]}>
            <ActivityIndicator size="small" color={YL.ink3} />
            <Text style={styles.availabilityText}>Checking availability…</Text>
          </View>
        )}

        {availability.checked && !availability.available && (
          <View style={[styles.unavailableBanner, { marginHorizontal: 20 }]}>
            <Text style={styles.unavailableTitle}>
              {availability.checkFailed ? 'Availability check failed' : 'Not available at this time'}
            </Text>
            <Text style={styles.unavailableText}>
              {availability.checkFailed
                ? 'Couldn\'t confirm availability right now. Please try again or reach out to us.'
                : availability.blocked
                  ? 'We\'re not operating during your selected pickup time.'
                  : 'Our vehicle is already scheduled around your pickup time.'}
              {!availability.checkFailed && "\nContact us — we'll do our best to accommodate you."}
            </Text>
            <View style={styles.unavailableActions}>
              <Pressable
                style={styles.unavailableBtn}
                onPress={() => Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Hi, I tried booking a Yellow ride but the slot isn\'t available. Can you help?')}`)}
              >
                <Text style={styles.unavailableBtnText}>WhatsApp us</Text>
              </Pressable>
              {!availability.checkFailed && (
                notifyDone ? (
                  <Text style={styles.notifyDoneText}>We'll reach out when this slot opens up.</Text>
                ) : (
                  <Pressable
                    style={[styles.unavailableBtn, styles.unavailableBtnSecondary]}
                    onPress={handleNotifyMe}
                    disabled={notifying}
                  >
                    <Text style={[styles.unavailableBtnText, styles.unavailableBtnTextSecondary]}>
                      {notifying ? 'Saving…' : 'Notify me when free'}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
            {notifyError && (
              <Text style={[styles.unavailableText, { color: '#c0392b', marginTop: 6 }]}>
                Couldn't save your request. Please use WhatsApp instead.
              </Text>
            )}
          </View>
        )}

        {/* Vehicle card */}
        <View style={[styles.vehicleCard, { marginHorizontal: 20 }]}>
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>YELLOW SKY</Text>
          </View>
          {showDiscount && (
            <View style={styles.specialRateBadge}>
              <Text style={styles.specialRateText}>
                {hasEmptyLeg
                  ? (pricing!.emptyLeg!.type === 'homeBase' ? 'HOME RATE' : '✦ SPECIAL RATE')
                  : hasPromo
                  ? '✦ FLAT FARE'
                  : `✦ ${newUserPct}% FIRST RIDE`}
              </Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <VehicleSvg />
            <View style={{ flex: 1 }}>
              <Text style={styles.vehicleName}>Kia Carens Clavis EV</Text>
              <View style={styles.vehicleStats}>
                <View style={styles.statRow}>
                  <IconPerson size={14} color={YL.ink2} />
                  <Text style={styles.statText}>{passengers} pax</Text>
                </View>
              </View>
              {!!distanceKm && (
                <Text style={styles.distanceText}>{distanceKm} km</Text>
              )}
            </View>

            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              {showDiscount && (
                <Text style={styles.originalPrice}>₹{originalFare.toLocaleString('en-IN')}</Text>
              )}
              <Text style={styles.price}>₹{effectivePrice.toLocaleString('en-IN')}</Text>
              {showDiscount && (
                <Text style={styles.savingsText}>save ₹{totalSaved.toLocaleString('en-IN')}</Text>
              )}
              <CheckMark />
            </View>
          </View>
        </View>

        <PhotoStrip />
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
    padding: 16,
    marginBottom: 16,
    gap: 6,
  },
  unavailableTitle: { fontSize: 15, fontWeight: '700', color: '#C0392B', fontFamily: FONTS.ui, marginBottom: 2 },
  unavailableText: { fontSize: 13.5, color: '#C0392B', lineHeight: 20, fontFamily: FONTS.ui },
  unavailableActions: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  unavailableBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#C0392B', borderRadius: 8,
  },
  unavailableBtnText: { fontSize: 13, fontWeight: '600', color: '#fff', fontFamily: FONTS.ui },
  unavailableBtnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#C0392B' },
  unavailableBtnTextSecondary: { color: '#C0392B' },
  notifyDoneText: { fontSize: 13, color: '#C0392B', fontFamily: FONTS.ui, alignSelf: 'center', fontStyle: 'italic' },
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
  originalPrice: { fontFamily: FONTS.display, fontSize: 13, color: YL.ink3, textDecorationLine: 'line-through', letterSpacing: -0.2 },
  price: { fontFamily: FONTS.display, fontSize: 20, fontWeight: '600', color: YL.ink, letterSpacing: -0.4 },
  specialRateBadge: {
    position: 'absolute',
    top: -10,
    right: 14,
    backgroundColor: YL.gulmohar,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: YL.ink,
    paddingHorizontal: 10,
    paddingVertical: 3,
    zIndex: 10,
  },
  specialRateText: {
    fontFamily: FONTS.mono,
    fontSize: 10.5,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  savingsText: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: YL.leaf,
    letterSpacing: 0.2,
  },
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

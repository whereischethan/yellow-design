import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, Switch, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import Svg, { Path, Circle } from 'react-native-svg'
import { YL, FONTS } from '../../constants/theme'
import YAppChrome from '../../components/YAppChrome'
import YButton from '../../components/YButton'
import RouteVisualizer from '../../components/RouteVisualizer'
import { createPaymentOrder, verifyPaymentAndCreateBooking, logLead } from '../../lib/api'
import type { PricingResponse, BookingLocation, FlightInfo, VehicleType, CreateBookingRequest } from '../../types/booking'

function VehicleSvg() {
  return (
    <Svg width={60} height={40} viewBox="0 0 80 36">
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

function FareLine({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
      <Text style={{ fontFamily: FONTS.display, fontSize: 13.5, color: YL.ink2 }}>{label}</Text>
      <Text style={{ fontFamily: FONTS.display, fontSize: 13.5, color: muted ? YL.ink3 : YL.ink, fontWeight: muted ? '400' : '500' }}>
        {value}
      </Text>
    </View>
  )
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const h = d.getHours()
    const m = d.getMinutes().toString().padStart(2, '0')
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} · ${h12}:${m} ${ampm}`
  } catch {
    return iso
  }
}

export default function ScreenReview() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    passengers: string
    bags: string
    meetAndGreet: string
    petFriendly: string
    tripType: string
    terminal: string
    pickup: string
    drop: string
    flight: string
    pricing: string
    vehicleType: string
    vehiclePrice: string   // kept for backward compat, not used in fare calc
  }>()

  const passengers = parseInt(params.passengers ?? '1', 10)
  const bags = parseInt(params.bags ?? '0', 10)
  const meetAndGreet = params.meetAndGreet === '1'
  const petFriendly = params.petFriendly === '1'
  const vehicleType = (params.vehicleType ?? 'yellowSky') as VehicleType

  const pickup: BookingLocation | null = params.pickup ? JSON.parse(params.pickup) : null
  const drop: BookingLocation | null = params.drop ? JSON.parse(params.drop) : null
  const flight: FlightInfo | null = params.flight ? JSON.parse(params.flight) : null
  const pricing: PricingResponse | null = params.pricing ? JSON.parse(params.pricing) : null

  const meetAndGreetFee = meetAndGreet ? (pricing?.optionalMeetGreet ?? 100) : 0
  // Total comes entirely from server-calculated pricing — no client-side arithmetic
  const total = (pricing?.totalPrice ?? 0) + meetAndGreetFee

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Log / refresh lead on review page mount — highest-intent pre-payment signal
  useEffect(() => {
    if (!pickup || !pricing) return
    logLead({
      tripType: params.tripType,
      pickup,
      drop: drop ?? undefined,
      price: total,
      pickupTime: pickup.dateTime,
      flight: params.flight || undefined,
      pricing,
    })
  }, [])
  const [forGuest, setForGuest] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  // Stores Razorpay response for retry if network fails after payment succeeds
  const [pendingVerification, setPendingVerification] = useState<{
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
    bookingData: CreateBookingRequest
  } | null>(null)

  const canConfirm = !forGuest || (guestName.trim().length >= 2 && guestPhone.trim().length >= 8)

  const buildBookingData = (): CreateBookingRequest => ({
    tripType: params.tripType as 'pickup' | 'drop',
    vehicleType,
    passengers,
    luggage: bags,
    pickup: pickup!,
    drop: drop!,
    flight: flight ?? undefined,
    pricing: {
      distanceKm: pricing!.distanceKm,
      fareBeforeTax: pricing!.fareBeforeTax ?? pricing!.basePrice ?? 0,
      gst: pricing!.gst ?? 0,
      toll: pricing!.toll ?? 0,
      totalPrice: total,
      basePrice: pricing!.fareBeforeTax ?? pricing!.basePrice ?? 0,
      extraKmCharge: 0,
    },
    ...(forGuest && guestName.trim() ? { guestName: guestName.trim(), guestPhone: guestPhone.trim() } : {}),
  })

  const doVerify = async (
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    bookingData: CreateBookingRequest
  ) => {
    const booking = await verifyPaymentAndCreateBooking({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      bookingData,
    })
    router.replace({
      pathname: '/(app)/confirmed',
      params: { booking: JSON.stringify(booking) },
    })
  }

  const handleRetryVerification = async () => {
    if (!pendingVerification) return
    setLoading(true)
    setError('')
    try {
      await doVerify(
        pendingVerification.razorpay_order_id,
        pendingVerification.razorpay_payment_id,
        pendingVerification.razorpay_signature,
        pendingVerification.bookingData
      )
    } catch (e: any) {
      setError(e.message || 'Confirmation failed. Please contact support.')
      setLoading(false)
    }
  }

  const loadRazorpay = (): Promise<void> =>
    new Promise((resolve, reject) => {
      if ((window as any).Razorpay) return resolve()
      const s = document.createElement('script')
      s.src = 'https://checkout.razorpay.com/v1/checkout.js'
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('Could not load payment SDK. Please refresh and try again.'))
      document.head.appendChild(s)
    })

  const handlePay = async () => {
    if (!pickup || !drop || !pricing) {
      setError('Missing booking details. Please go back and try again.')
      return
    }
    setLoading(true)
    setError('')

    try {
      if (Platform.OS !== 'web') {
        setError('Please use the web app to complete payment.')
        setLoading(false)
        return
      }

      await loadRazorpay()

      const orderRes = await createPaymentOrder(total)
      const bookingData = buildBookingData()

      const options = {
        key: orderRes.keyId,
        amount: orderRes.amount,
        currency: orderRes.currency,
        order_id: orderRes.orderId,
        name: 'Yellow',
        description: 'Airport Transfer',
        theme: { color: '#FFD84A' },
        handler: async (response: {
          razorpay_order_id: string
          razorpay_payment_id: string
          razorpay_signature: string
        }) => {
          // Store for retry safety — user has paid, don't lose this
          setPendingVerification({ ...response, bookingData })
          try {
            await doVerify(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature,
              bookingData
            )
          } catch (e: any) {
            setError(e.message || 'Payment received but confirmation failed. Tap "Retry confirmation" below.')
            setLoading(false)
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false)
            setError('Payment cancelled. Please try again.')
          },
        },
        prefill: {},
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.on('payment.failed', (r: any) => {
        setLoading(false)
        setError(r.error?.description || 'Payment failed. Please try again.')
      })
      rzp.open()
      // Don't setLoading(false) here — wait for handler/ondismiss
    } catch (e: any) {
      setError(e.message || 'Could not start payment')
      setLoading(false)
    }
  }

  const pickupLabel = pickup?.placeName || pickup?.location || 'Pickup'
  const dropLabel = drop?.placeName || drop?.location || 'Drop'
  const pickupTime = pickup?.dateTime ? formatDateTime(pickup.dateTime) : ''
  const dropSublabel = flight ? `Flight ${flight.flightNumber} · ${flight.airline}` : null

  // Show actual address when a saved-place label (e.g. "Home") differs from the real address
  const pickupAddress = pickup?.location && pickup.location !== pickupLabel ? pickup.location : undefined
  const dropAddress = drop?.location && drop.location !== dropLabel ? drop.location : undefined

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: YL.bg }}>
      <YAppChrome right={
        <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: YL.ink3 }}>Review</Text>
      } />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headline}>
          Looking <Text style={{ fontStyle: 'italic' }}>good.</Text>
        </Text>

        {/* Route summary */}
        <View style={styles.card}>
          <RouteVisualizer
            stops={[
              { label: pickupLabel, address: pickupAddress, sublabel: pickupTime },
              { label: dropLabel, address: dropAddress, sublabel: dropSublabel ?? undefined },
            ]}
          />
        </View>

        {/* Vehicle card */}
        <View style={[styles.card, { padding: 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <VehicleSvg />
            <View style={{ flex: 1 }}>
              <Text style={styles.vehicleName}>Kia Carens Clavis EV</Text>
              <Text style={styles.vehicleDetail}>
                {passengers} passenger{passengers !== 1 ? 's' : ''} · {bags} bag{bags !== 1 ? 's' : ''}
                {meetAndGreet ? ' · Meet & greet' : ''}
                {petFriendly ? ' · Pet-friendly' : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Guest toggle */}
        <View style={[styles.card, { padding: 16 }]}>
          <Pressable style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }} onPress={() => setForGuest(v => !v)}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.display, fontSize: 14.5, fontWeight: '500', color: YL.ink }}>
                Booking for someone else?
              </Text>
              <Text style={{ fontFamily: FONTS.display, fontSize: 12, color: YL.ink3, marginTop: 2 }}>
                Add guest's name and number for the driver
              </Text>
            </View>
            <Switch
              value={forGuest}
              onValueChange={setForGuest}
              trackColor={{ false: YL.line, true: YL.ink }}
              thumbColor={forGuest ? YL.yellow : YL.card}
            />
          </Pressable>

          {forGuest && (
            <View style={{ marginTop: 14, gap: 10 }}>
              <TextInput
                value={guestName}
                onChangeText={setGuestName}
                placeholder="Guest's full name"
                placeholderTextColor={YL.ink3}
                autoCapitalize="words"
                style={styles.guestInput}
                {...(Platform.OS === 'web' ? { outlineWidth: 0 } as any : {})}
              />
              <TextInput
                value={guestPhone}
                onChangeText={v => setGuestPhone(v.replace(/\D/g, ''))}
                placeholder="Guest's mobile number"
                placeholderTextColor={YL.ink3}
                keyboardType="phone-pad"
                maxLength={12}
                style={styles.guestInput}
                {...(Platform.OS === 'web' ? { outlineWidth: 0 } as any : {})}
              />
            </View>
          )}
        </View>

        {/* Fare card */}
        <View style={styles.card}>
          {pricing?.fareBeforeTax != null ? (
            <>
              <FareLine
                label={`Fare (${pricing.distanceKm} km)`}
                value={`₹${pricing.fareBeforeTax.toLocaleString('en-IN')}`}
              />
              <FareLine label={`GST (5%)`} value={`₹${pricing.gst.toLocaleString('en-IN')}`} muted />
              <FareLine label="Airport toll" value={`₹${pricing.toll.toLocaleString('en-IN')}`} muted />
            </>
          ) : (
            <FareLine label="Fare" value={`₹${(pricing?.basePrice ?? 0).toLocaleString('en-IN')}`} />
          )}
          {meetAndGreet && <FareLine label="Meet & greet" value={`₹${meetAndGreetFee}`} />}
          <View style={{ height: 1, backgroundColor: YL.lineSoft, marginVertical: 10 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontFamily: FONTS.display, fontSize: 15, fontWeight: '600', color: YL.ink }}>
              Total
            </Text>
            <Text style={styles.totalAmount}>₹{total.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Zero-cancel promise */}
        <View style={styles.promiseCard}>
          <View style={styles.promiseIcon}>
            <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
              <Path d="M9 2L14 4V9C14 12 11.5 14.5 9 16C6.5 14.5 4 12 4 9V4L9 2Z" fill="white" opacity={0.9} />
              <Path d="M6.5 9L8 10.5L11.5 7" stroke={YL.leaf} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
          <Text style={styles.promiseText}>
            <Text style={{ fontWeight: '600', color: YL.ink }}>Zero-cancel</Text>
            {' · driver on-site 5 min before pickup · flight-aware'}
          </Text>
        </View>

        {!!error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Retry confirmation after network failure post-payment */}
        {pendingVerification && error ? (
          <YButton variant="outline" onPress={handleRetryVerification} disabled={loading}>
            {loading ? 'Retrying…' : 'Retry confirmation'}
          </YButton>
        ) : null}
      </ScrollView>

      {/* Bottom CTA */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 }}>
        <YButton variant="primary" onPress={handlePay} disabled={loading || !canConfirm}>
          {loading ? 'Opening payment…' : `Pay ₹${total.toLocaleString('en-IN')}`}
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
  card: {
    backgroundColor: YL.card,
    borderWidth: 1,
    borderColor: YL.line,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  vehicleName: { fontFamily: FONTS.display, fontSize: 17, fontWeight: '500', color: YL.ink },
  vehicleDetail: { fontFamily: FONTS.display, fontSize: 12.5, color: YL.ink3, marginTop: 2 },
  totalAmount: {
    fontFamily: FONTS.display,
    fontSize: 26,
    fontWeight: '500',
    color: YL.ink,
    letterSpacing: -0.6,
  },
  promiseCard: {
    padding: 14,
    paddingHorizontal: 16,
    backgroundColor: YL.leafSoft,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  promiseIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: YL.leaf,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promiseText: { fontFamily: FONTS.display, fontSize: 12.5, color: YL.ink2, lineHeight: 18, flex: 1 },
  errorText: { color: '#C0392B', fontSize: 13.5, textAlign: 'center', marginTop: 4, marginBottom: 8 },
  guestInput: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: YL.line,
    backgroundColor: YL.bg,
    paddingHorizontal: 14,
    fontFamily: FONTS.display,
    fontSize: 15,
    color: YL.ink,
  },
})

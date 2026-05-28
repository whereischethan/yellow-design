import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, ActivityIndicator, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { YL, FONTS } from '../../constants/theme'
import YAppChrome from '../../components/YAppChrome'
import YButton from '../../components/YButton'
import RouteVisualizer from '../../components/RouteVisualizer'
import { getBooking, getApiBase, getAuthToken } from '../../lib/api'
import type { Booking } from '../../types/booking'

import { fmtDateTimeIST } from '../../lib/ist'

function formatDateTime(iso: string): string {
  return fmtDateTimeIST(iso)
}

function fmtINR(n: number) {
  return '₹' + n.toLocaleString('en-IN')
}

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

function FareLine({ label, value, total = false }: { label: string; value: string; total?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: total ? 6 : 4 }}>
      <Text style={{ fontFamily: FONTS.display, fontSize: total ? 14 : 13.5, fontWeight: total ? '600' : '400', color: total ? YL.ink : YL.ink2 }}>
        {label}
      </Text>
      <Text style={{ fontFamily: FONTS.display, fontSize: total ? 19 : 13.5, fontWeight: '500', color: YL.ink }}>
        {value}
      </Text>
    </View>
  )
}

export default function ScreenTripComplete() {
  const router = useRouter()
  const params = useLocalSearchParams<{ bookingId?: string; booking?: string }>()
  const [booking, setBooking] = useState<Booking | null>(() => {
    try { return params.booking ? JSON.parse(params.booking) : null } catch { return null }
  })
  const [loading, setLoading] = useState(!params.booking && !!params.bookingId)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    if (params.bookingId && !booking) {
      setLoading(true)
      getBooking(params.bookingId)
        .then(setBooking)
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [params.bookingId])

  const driver = booking?.assignedDriver
  const vehicle = booking?.assignedVehicle
  const tripCode = booking?.tripCode ?? '——'
  const fare = (booking as any)?.price ?? booking?.pricing?.totalPrice ?? 0
  const pickupName = booking?.pickup?.placeName ?? booking?.pickup?.location ?? 'Pickup'
  const dropName = booking?.drop?.placeName ?? booking?.drop?.location ?? 'Destination'
  const pickupTime = booking?.pickup?.dateTime ? formatDateTime(booking.pickup.dateTime) : ''
  const dropTime = booking?.drop?.dateTime ? formatDateTime(booking.drop.dateTime) : ''
  const flightNum = (booking as any)?.flight?.flightNumber ?? ''
  const isCancelled = booking?.status === 'cancelled'

  async function downloadInvoice() {
    if (!booking?.tripCode) return
    setSharing(true)
    try {
      const token = getAuthToken()
      const base = getApiBase()
      const url = `${base}/invoices/${booking.tripCode}${token ? `?token=${encodeURIComponent(token)}` : ''}`
      await Linking.openURL(url)
    } catch {}
    setSharing(false)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: YL.bg }}>
      <YAppChrome
        right={
          <View style={{
            paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
            backgroundColor: isCancelled ? '#FEF2F2' : YL.bg2,
          }}>
            <Text style={{
              fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 0.3,
              color: isCancelled ? '#C0392B' : YL.ink3,
            }}>
              {isCancelled ? 'CANCELLED' : 'COMPLETED'}
            </Text>
          </View>
        }
      />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={YL.ink3} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={{ fontFamily: FONTS.display, fontSize: 30, fontWeight: '500', color: YL.ink, letterSpacing: -0.8, marginBottom: 2 }}>
            {isCancelled ? (
              <>Booking{' '}<Text style={{ fontStyle: 'italic' }}>cancelled.</Text></>
            ) : (
              <>You{' '}<Text style={{ fontStyle: 'italic' }}>arrived.</Text></>
            )}
          </Text>
          <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: YL.ink3, letterSpacing: 0.3, marginBottom: 20 }}>
            #{tripCode}
          </Text>

          {/* Route */}
          <View style={{ padding: 16, backgroundColor: YL.card, borderWidth: 1, borderColor: YL.line, borderRadius: 20, marginBottom: 10 }}>
            <Text style={{ fontFamily: FONTS.mono, fontSize: 10.5, color: YL.ink3, letterSpacing: 0.3, marginBottom: 12 }}>ROUTE</Text>
            <RouteVisualizer
              stops={[
                { label: pickupName, sublabel: [pickupTime, flightNum].filter(Boolean).join(' · ') || undefined },
                { label: dropName, sublabel: dropTime || undefined },
              ]}
            />
          </View>

          {/* Chauffeur */}
          {driver && (
            <View style={{ padding: 16, backgroundColor: YL.card, borderWidth: 1, borderColor: YL.line, borderRadius: 20, marginBottom: 10 }}>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 10.5, color: YL.ink3, letterSpacing: 0.3, marginBottom: 12 }}>CHAUFFEUR</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{
                  width: 46, height: 46, borderRadius: 23,
                  backgroundColor: YL.gulmoharSoft, borderWidth: 1.5, borderColor: YL.gulmohar + '33',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontFamily: FONTS.display, fontSize: 17, fontWeight: '500', color: YL.gulmohar }}>
                    {getInitials(driver.name)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FONTS.display, fontSize: 16, fontWeight: '500', color: YL.ink }}>{driver.name}</Text>
                  {vehicle && (
                    <Text style={{ fontFamily: FONTS.display, fontSize: 12.5, color: YL.ink3, marginTop: 1 }}>
                      {vehicle.make} {vehicle.model} · {vehicle.licensePlate}
                    </Text>
                  )}
                </View>
                {driver.rating != null && (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontFamily: FONTS.mono, fontSize: 14, fontWeight: '600', color: YL.ink }}>
                      {driver.rating.toFixed(1)}
                    </Text>
                    <Text style={{ fontFamily: FONTS.mono, fontSize: 9, color: YL.ink3, letterSpacing: 0.3 }}>RATING</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Receipt */}
          {fare > 0 && !isCancelled && (
            <View style={{ padding: 16, backgroundColor: YL.card, borderWidth: 1, borderColor: YL.line, borderRadius: 20, marginBottom: 10 }}>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 10.5, color: YL.ink3, letterSpacing: 0.3, marginBottom: 12 }}>
                RECEIPT
              </Text>
              {booking?.pricing?.basePrice != null && booking.pricing.basePrice > 0 && (
                <FareLine label="Base fare" value={fmtINR(booking.pricing.basePrice)} />
              )}
              {booking?.pricing?.extraKmCharge != null && booking.pricing.extraKmCharge > 0 && (
                <FareLine label="Extra km" value={fmtINR(booking.pricing.extraKmCharge)} />
              )}
              {booking?.pricing?.distanceKm != null && booking.pricing.distanceKm > 0 && (
                <FareLine label="Distance" value={`${booking.pricing.distanceKm.toFixed(0)} km`} />
              )}
              <View style={{ height: 1, backgroundColor: YL.lineSoft, marginVertical: 8 }} />
              <FareLine label="Total paid" value={fmtINR(fare)} total />
            </View>
          )}
        </ScrollView>
      )}

      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20, flexDirection: 'row', gap: 10 }}>
        <YButton variant="outline" full={false} style={{ flex: 1 }} loading={sharing} onPress={downloadInvoice}>
          Download invoice
        </YButton>
        <YButton variant="ink" full={false} style={{ flex: 1 }} onPress={() => router.replace('/(app)/history')}>
          Back to rides
        </YButton>
      </View>
    </SafeAreaView>
  )
}

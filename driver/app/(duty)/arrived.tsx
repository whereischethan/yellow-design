import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { YL, FONTS } from '@/constants/theme'
import { useDuty, DutyReading } from '@/context/DutyContext'
import { saveReading, updateBookingStatus } from '@/lib/api'
import { callPhone, openWhatsApp } from '@/lib/contact'

export default function ArrivedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { bookings, addReading, readingByType } = useDuty()
  const booking = bookings.find((b) => b.id === id) ?? null

  const [odo, setOdo] = useState('')
  const [soc, setSoc] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handoffReading = readingByType('handoff')
  const handoffOdo = handoffReading?.odometer

  const odoNum = parseFloat(odo)
  const socNum = parseFloat(soc)
  const bothFilled =
    odo.trim().length > 0 && soc.trim().length > 0 && !isNaN(odoNum) && !isNaN(socNum)

  const odoDelta =
    handoffOdo != null && !isNaN(odoNum) && odo.trim().length > 0
      ? odoNum - handoffOdo
      : null

  function goBack() {
    if (router.canGoBack()) router.back()
    else router.replace('/(duty)/roster')
  }

  function handleCallPassenger() {
    if (!booking?.guestPhone) return
    callPhone(booking.guestPhone)
  }

  function handleWhatsApp() {
    if (!booking?.guestPhone) return
    const pickupName = booking.pickup?.placeName ?? booking.pickup?.location
    const v = booking.assignedVehicle
    const vehicleDesc = v
      ? ` Look for the ${[v.color, v.make, v.model].filter(Boolean).join(' ')}${v.licensePlate ? ` (${v.licensePlate})` : ''}.`
      : ''
    const msg =
      `Hi${booking.guestName ? ` ${booking.guestName}` : ''}, this is your Yellow driver. ` +
      `I have arrived at your pickup point${pickupName ? ` — ${pickupName}` : ''}.${vehicleDesc}`
    openWhatsApp(booking.guestPhone, msg)
  }

  async function handleStartTrip() {
    if (!bothFilled || !booking) return
    setSaving(true)
    setError(null)
    try {
      const reading: DutyReading = {
        type: 'trip_start',
        bookingId: booking.id,
        odometer: odoNum,
        soc: socNum,
        timestamp: new Date().toISOString(),
      }
      await saveReading({ type: 'trip_start', bookingId: booking.id, odometer: odoNum, soc: socNum })
      addReading(reading)
      await updateBookingStatus(booking.id, 'in_progress')
      router.replace(`/(duty)/in-trip?id=${booking.id}`)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to start trip. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.centerState}>
          <Text style={styles.centerText}>Trip not found.</Text>
          <TouchableOpacity onPress={() => router.replace('/(duty)/roster')} style={styles.backLinkBtn}>
            <Text style={styles.backLinkText}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} hitSlop={12}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>At Pickup</Text>
          <View style={styles.arrivalBadge}>
            <View style={styles.arrivalDot} />
            <Text style={styles.arrivalText}>ARRIVED</Text>
          </View>
        </View>

        {/* Passenger confirmation card */}
        <View style={styles.card}>
          <Text style={styles.riderName}>{booking.guestName ?? 'Passenger'}</Text>

          {booking.passengerCount != null && (
            <Text style={styles.passengerCount}>
              {booking.passengerCount} passenger{booking.passengerCount !== 1 ? 's' : ''}
            </Text>
          )}

          {booking.flight ? (
            <View style={styles.flightRow}>
              <Text style={styles.flightNumber}>{booking.flight.flightNumber}</Text>
              <Text style={styles.flightAirline}>{booking.flight.airline}</Text>
              {booking.flight.arrival ? (
                <Text style={styles.flightTime}>Arr. {booking.flight.arrival}</Text>
              ) : null}
            </View>
          ) : null}

          {booking.stops?.map((stop, i) => (
            <View key={i} style={styles.destinationRow}>
              <Text style={styles.destinationLabel}>STOP {i + 1}</Text>
              <Text style={styles.destinationText} numberOfLines={2}>
                {stop.placeName ?? stop.location}
              </Text>
            </View>
          ))}

          <View style={styles.destinationRow}>
            <Text style={styles.destinationLabel}>DROP</Text>
            <Text style={styles.destinationText} numberOfLines={2}>
              {booking.drop?.placeName ?? booking.drop?.location ?? '—'}
            </Text>
          </View>
        </View>

        {/* Contact passenger */}
        <View style={styles.contactRow}>
          <TouchableOpacity
            style={[styles.contactBtn, !booking.guestPhone && styles.contactBtnDisabled]}
            onPress={handleCallPassenger}
            disabled={!booking.guestPhone}
            activeOpacity={0.75}
          >
            <Text style={styles.contactBtnText}>📞 Call passenger</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.whatsappBtn, !booking.guestPhone && styles.contactBtnDisabled]}
            onPress={handleWhatsApp}
            disabled={!booking.guestPhone}
            activeOpacity={0.75}
          >
            <Text style={styles.whatsappBtnText}>WhatsApp "I've arrived"</Text>
          </TouchableOpacity>
        </View>

        {/* Trip start readings */}
        <Text style={styles.sectionEyebrow}>TRIP START READINGS</Text>

        <View style={styles.readingRow}>
          {/* Odometer card */}
          <View style={[styles.readingCard, styles.readingCardHalf]}>
            <Text style={styles.readingLabel}>ODOMETER</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.readingInput}
                value={odo}
                onChangeText={setOdo}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={YL.ink3}
                maxLength={7}
              />
              <Text style={styles.unitText}>km</Text>
            </View>
            {odoDelta !== null && (
              <Text style={styles.deltaText}>+{odoDelta} km since handoff</Text>
            )}
          </View>

          {/* Battery card */}
          <View style={[styles.readingCard, styles.readingCardHalf]}>
            <Text style={styles.readingLabel}>BATTERY SOC</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.readingInput}
                value={soc}
                onChangeText={(v) => {
                  const n = parseFloat(v)
                  if (v === '' || (n >= 0 && n <= 100)) setSoc(v)
                }}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={YL.ink3}
                maxLength={3}
              />
              <Text style={styles.unitText}>%</Text>
            </View>
          </View>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Start trip button */}
        <TouchableOpacity
          style={[styles.primaryBtn, (!bothFilled || saving) && styles.primaryBtnDisabled]}
          onPress={handleStartTrip}
          disabled={!bothFilled || saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Start trip →</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: YL.bg,
  },
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  backArrow: {
    fontFamily: FONTS.mono,
    fontSize: 20,
    color: YL.ink,
  },
  title: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 22,
    color: YL.ink,
    flex: 1,
  },
  arrivalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: YL.leafSoft,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  arrivalDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: YL.leaf,
  },
  arrivalText: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: YL.leaf,
  },
  card: {
    backgroundColor: YL.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: YL.line,
    padding: 16,
    gap: 8,
  },
  riderName: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 20,
    color: YL.ink,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 12,
  },
  contactBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: YL.line,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: YL.card,
  },
  contactBtnDisabled: {
    opacity: 0.4,
  },
  contactBtnText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 14,
    color: YL.ink2,
  },
  whatsappBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: YL.leafSoft,
  },
  whatsappBtnText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 14,
    color: YL.leaf,
  },
  passengerCount: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: YL.ink2,
  },
  flightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  flightNumber: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: YL.ink,
  },
  flightAirline: {
    fontFamily: FONTS.display,
    fontSize: 13,
    color: YL.ink2,
  },
  flightTime: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: YL.ink3,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
  },
  destinationLabel: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    color: YL.ink3,
    marginTop: 2,
  },
  destinationText: {
    fontFamily: FONTS.display,
    fontSize: 15,
    color: YL.ink,
    flex: 1,
  },
  sectionEyebrow: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    color: YL.ink3,
  },
  readingRow: {
    flexDirection: 'row',
    gap: 12,
  },
  readingCard: {
    backgroundColor: YL.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: YL.line,
    padding: 16,
    overflow: 'hidden',
  },
  readingCardHalf: {
    flex: 1,
  },
  readingLabel: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    color: YL.ink3,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  readingInput: {
    fontFamily: FONTS.mono,
    fontSize: 28,
    color: YL.ink,
    flex: 1,
    padding: 0,
    minWidth: 0,
  },
  unitText: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: YL.ink3,
    paddingBottom: 3,
  },
  deltaText: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: YL.ink3,
    marginTop: 6,
  },
  errorText: {
    fontFamily: FONTS.display,
    fontSize: 13,
    color: YL.gulmohar,
  },
  primaryBtn: {
    backgroundColor: YL.ink,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryBtnDisabled: {
    opacity: 0.4,
  },
  primaryBtnText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  centerText: {
    fontFamily: FONTS.display,
    fontSize: 16,
    color: YL.ink2,
  },
  backLinkBtn: {
    padding: 8,
  },
  backLinkText: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: YL.leaf,
  },
})

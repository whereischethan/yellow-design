import React, { useState } from 'react'
import {
  View, Text, Pressable, StyleSheet, ScrollView, Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Svg, { Path } from 'react-native-svg'
import { YL, FONTS } from '../../constants/theme'
import YAppChrome from '../../components/YAppChrome'
import YButton from '../../components/YButton'
import StepBtn from '../../components/StepBtn'
import LocationAutocomplete from '../../components/location/LocationAutocomplete'
import SavedPlacesSuggest from '../../components/SavedPlacesSuggest'
import DateTimePicker from '../../components/DateTimePicker'
import type { LocationData } from '../../types/booking'
import { SUPPORT_WHATSAPP } from '../../constants/config'

type TripKind = 'oneway' | 'round'

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function fmtDate(d: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const h = d.getHours()
  const m = d.getMinutes().toString().padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} at ${h12}:${m} ${ampm}`
}

function WhatsAppIcon() {
  return (
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
  )
}

export default function ScreenOutstation() {
  const router = useRouter()
  const [tripKind, setTripKind] = useState<TripKind>('round')
  const [origin, setOrigin] = useState<LocationData | null>(null)
  const [dest, setDest] = useState<LocationData | null>(null)
  const [departDate, setDepartDate] = useState<Date>(() => { const d = addDays(new Date(), 3); d.setHours(7, 0, 0, 0); return d })
  const [returnDate, setReturnDate] = useState<Date>(() => { const d = addDays(new Date(), 5); d.setHours(18, 0, 0, 0); return d })
  const [passengers, setPassengers] = useState(2)
  const [bags, setBags] = useState(2)
  const [error, setError] = useState('')

  const canRequest = !!(origin && dest)

  const handleRequestWhatsApp = () => {
    if (!origin || !dest) {
      setError('Please enter pickup and destination.')
      return
    }
    setError('')

    const from = origin.placeName ?? origin.description
    const to = dest.placeName ?? dest.description
    const lines = [
      `Hi Yellow! I'd like to book an outstation trip.`,
      ``,
      `Type: ${tripKind === 'round' ? 'Round trip' : 'One-way'}`,
      `From: ${from}`,
      `To: ${to}`,
      `Depart: ${fmtDate(departDate)}`,
      ...(tripKind === 'round' ? [`Return: ${fmtDate(returnDate)}`] : []),
      `Passengers: ${passengers}`,
      `Bags: ${bags}`,
    ]

    const msg = encodeURIComponent(lines.join('\n'))
    Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP}?text=${msg}`)
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <YAppChrome
        right={
          <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: YL.ink3, letterSpacing: 0.4 }}>
            OUTSTATION
          </Text>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 }}>
          <Text style={styles.headline}>
            Take Yellow out of{' '}
            <Text style={{ fontStyle: 'italic' }}>town</Text>
          </Text>
        </View>

        {/* Trip type */}
        <View style={styles.segmentRow}>
          {(['oneway', 'round'] as TripKind[]).map(k => (
            <Pressable
              key={k}
              style={[styles.segmentBtn, tripKind === k && styles.segmentBtnActive]}
              onPress={() => setTripKind(k)}
            >
              <Text style={[styles.segmentText, tripKind === k && styles.segmentTextActive]}>
                {k === 'oneway' ? 'One-way' : 'Round trip'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Route */}
        <View style={{ paddingHorizontal: 20, gap: 10, marginBottom: 10 }}>
          <View>
            <Text style={styles.fieldLabel}>PICKUP IN BANGALORE</Text>
            <SavedPlacesSuggest onSelect={loc => setOrigin(loc)} />
            <LocationAutocomplete
              placeholder="Area or locality in Bangalore"
              value={origin?.placeName ?? origin?.description}
              onLocationSelect={loc => setOrigin(loc)}
              restrictToBangalore
            />
          </View>
          <View>
            <Text style={styles.fieldLabel}>DESTINATION</Text>
            <LocationAutocomplete
              placeholder="City, place anywhere in India"
              value={dest?.placeName ?? dest?.description}
              onLocationSelect={loc => setDest(loc)}
            />
          </View>
        </View>

        {/* Dates */}
        <View style={styles.datesCard}>
          <View>
            <Text style={styles.dateLabel}>PICKUP DATE & TIME</Text>
            <DateTimePicker
              value={departDate}
              onChange={setDepartDate}
              minimumDate={addDays(new Date(), 1)}
            />
          </View>
          {tripKind === 'round' && (
            <>
              <View style={styles.dateDivider} />
              <View>
                <Text style={styles.dateLabel}>RETURN DATE & TIME</Text>
                <DateTimePicker
                  value={returnDate}
                  onChange={setReturnDate}
                  minimumDate={addDays(departDate, 1)}
                />
              </View>
            </>
          )}
        </View>

        {/* Passengers & bags */}
        <View style={styles.stepperCard}>
          <View style={styles.stepperRow}>
            <Text style={styles.stepperLabel}>Passengers</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <StepBtn label="-" onPress={() => setPassengers(v => Math.max(1, v - 1))} disabled={passengers <= 1} />
              <Text style={styles.stepperValue}>{passengers}</Text>
              <StepBtn label="+" onPress={() => setPassengers(v => Math.min(6, v + 1))} disabled={passengers >= 6} />
            </View>
          </View>
          <View style={styles.stepperDivider} />
          <View style={styles.stepperRow}>
            <Text style={styles.stepperLabel}>Bags</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <StepBtn label="-" onPress={() => setBags(v => Math.max(0, v - 1))} disabled={bags <= 0} />
              <Text style={styles.stepperValue}>{bags}</Text>
              <StepBtn label="+" onPress={() => setBags(v => Math.min(6, v + 1))} disabled={bags >= 6} />
            </View>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Our team will confirm pricing and availability on WhatsApp. Inter-state permits, fuel & driver bata included.
          </Text>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20 }}>
        <Pressable
          onPress={handleRequestWhatsApp}
          style={({ pressed }) => [styles.waBtn, !canRequest && styles.waBtnDisabled, { opacity: pressed && canRequest ? 0.85 : 1 }]}
        >
          <WhatsAppIcon />
          <Text style={styles.waBtnText}>Request via WhatsApp →</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: YL.bg },
  headline: {
    fontFamily: FONTS.display,
    fontSize: 26,
    letterSpacing: -0.7,
    fontWeight: '500',
    color: YL.ink,
  },
  segmentRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 6,
  },
  segmentBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 12,
    borderWidth: 1, borderColor: YL.line, backgroundColor: YL.card, alignItems: 'center',
  },
  segmentBtnActive: { backgroundColor: YL.ink, borderColor: YL.ink },
  segmentText: { fontFamily: FONTS.display, fontSize: 12.5, fontWeight: '500', color: YL.ink2 },
  segmentTextActive: { fontWeight: '600', color: '#FFFFFF' },
  fieldLabel: {
    fontFamily: FONTS.mono, fontSize: 10.5, color: YL.ink3,
    letterSpacing: 0.5, marginBottom: 6,
  },
  datesCard: {
    marginHorizontal: 20, marginBottom: 10, padding: 14,
    backgroundColor: YL.card, borderWidth: 1, borderColor: YL.line, borderRadius: 18, gap: 12,
  },
  dateDivider: { height: 1, backgroundColor: YL.lineSoft },
  dateLabel: { fontFamily: FONTS.mono, fontSize: 10.5, letterSpacing: 0.3, color: YL.ink3, marginBottom: 6 },
  stepperCard: {
    marginHorizontal: 20, marginBottom: 10,
    backgroundColor: YL.card, borderWidth: 1, borderColor: YL.line, borderRadius: 18,
    paddingHorizontal: 16,
  },
  stepperRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12,
  },
  stepperDivider: { height: 1, backgroundColor: YL.lineSoft },
  stepperLabel: { fontFamily: FONTS.display, fontSize: 14.5, color: YL.ink },
  stepperValue: { fontFamily: FONTS.display, fontSize: 16, fontWeight: '500', color: YL.ink, minWidth: 24, textAlign: 'center' },
  infoCard: {
    marginHorizontal: 20, marginBottom: 10, padding: 12,
    paddingHorizontal: 14, backgroundColor: YL.leafSoft, borderRadius: 12,
  },
  infoText: { fontFamily: FONTS.display, fontSize: 12, color: YL.ink2, lineHeight: 18 },
  error: { marginHorizontal: 20, color: '#C0392B', fontSize: 13, textAlign: 'center' },
  waBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: YL.ink, borderRadius: 16, paddingVertical: 17,
  },
  waBtnDisabled: { opacity: 0.4 },
  waBtnText: {
    fontFamily: FONTS.display, fontWeight: '600', fontSize: 16, color: YL.yellow,
  },
})

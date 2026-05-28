import React, { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Svg, { Path } from 'react-native-svg'
import { YL, FONTS } from '../../constants/theme'
import YAppChrome from '../../components/YAppChrome'
import YButton from '../../components/YButton'
import StepBtn from '../../components/StepBtn'
import { IconPerson } from '../../components/icons'
import LocationAutocomplete from '../../components/location/LocationAutocomplete'
import SavedPlacesSuggest from '../../components/SavedPlacesSuggest'
import DateTimePicker from '../../components/DateTimePicker'
import { fetchFlight, fetchPricing } from '../../lib/api'
import { fmtDateTimeIST } from '../../lib/ist'
import { useAuth } from '../../context/AuthContext'
import type { LocationData } from '../../types/booking'

const BLR_AIRPORT_PLACE_ID = 'ChIJLYXWgMIWrjsRaPq-dJ38diA'
const BLR_AIRPORT_NAME = 'Kempegowda International Airport Bengaluru'

function defaultDateTime() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(6, 0, 0, 0)
  return d
}

function PlaneUpIcon({ active }: { active: boolean }) {
  const c = active ? YL.ink : YL.ink2
  return (
    <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
      <Path d="M7.5 2L7.5 13M7.5 2L4 5.5M7.5 2L11 5.5" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2 10L4.5 8.5L7.5 9.5L10.5 8.5L13 10" stroke={c} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function PlaneDownIcon({ active }: { active: boolean }) {
  const c = active ? YL.ink : YL.ink2
  return (
    <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
      <Path d="M7.5 13L7.5 2M7.5 13L4 9.5M7.5 13L11 9.5" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2 5L4.5 6.5L7.5 5.5L10.5 6.5L13 5" stroke={c} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function CheckIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
      <Path d="M2 6L5 9L10 3" stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}


interface CompactStepperProps {
  label: string
  sub: string
  value: number
  onInc: () => void
  onDec: () => void
  icon: React.ReactNode
  min?: number
  max?: number
}

function CompactStepper({ label, sub, value, onInc, onDec, icon, min = 0, max = 10 }: CompactStepperProps) {
  return (
    <View style={styles.stepperRow}>
      <View style={styles.stepperIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepperLabel}>{label}</Text>
        <Text style={styles.stepperSub}>{sub}</Text>
      </View>
      <View style={styles.stepperControls}>
        <StepBtn label="-" onPress={onDec} disabled={value <= min} />
        <Text style={styles.stepperCount}>{value}</Text>
        <StepBtn label="+" onPress={onInc} disabled={value >= max} />
      </View>
    </View>
  )
}

export default function ScreenAirport() {
  const router = useRouter()
  const { user, isLoggedIn } = useAuth()
  const [activeTab, setActiveTab] = useState<'to' | 'from'>('to')
  const [location, setLocation] = useState<LocationData | null>(null)
  const [terminal, setTerminal] = useState<'T1' | 'T2'>('T2')
  const [flightNumber, setFlightNumber] = useState('')
  const [flight, setFlight] = useState<any>(null)
  const [flightError, setFlightError] = useState('')
  const [loadingFlight, setLoadingFlight] = useState(false)
  const [dateTime, setDateTime] = useState<Date>(defaultDateTime)
  const [passengers, setPassengers] = useState(4)
const [stops, setStops] = useState<Array<LocationData | null>>([])
  const [loadingPricing, setLoadingPricing] = useState(false)
  const [pricingError, setPricingError] = useState('')

  const displayName = user?.name
    ? user.name.split(' ')[0].toUpperCase()
    : user?.phone?.slice(-4) || 'YOU'

  const handleFlightLookup = async () => {
    const fn = flightNumber.trim().toUpperCase()
    if (fn.length < 4) return
    setLoadingFlight(true)
    setFlightError('')
    setFlight(null)
    try {
      const data = await fetchFlight(fn, dateTime)
      setFlight(data)
      // Auto-fill pickup time from flight schedule
      if (activeTab === 'to' && data.departure) {
        const dep = new Date(data.departure)
        dep.setHours(dep.getHours() - 2, dep.getMinutes(), 0, 0)
        setDateTime(dep)
      } else if (activeTab === 'from' && data.arrival) {
        setDateTime(new Date(data.arrival))
      }
    } catch (e: any) {
      setFlightError('Could not look up flight — you can continue without it')
    } finally {
      setLoadingFlight(false)
    }
  }

  const addStop = () => setStops(s => [...s, null])
  const removeStop = (i: number) => setStops(s => s.filter((_, idx) => idx !== i))
  const updateStop = (i: number, loc: LocationData | null) => setStops(s => s.map((v, idx) => idx === i ? loc : v))

  const handleChooseVehicle = async () => {
    if (!location) {
      setPricingError(activeTab === 'to' ? 'Enter your pickup location' : 'Enter your drop location')
      return
    }
    setLoadingPricing(true)
    setPricingError('')
    try {
      const tripType = activeTab === 'to' ? 'drop' : 'pickup'
      const originPlaceId = location.placeId
      const stopPlaceIds = stops.filter(s => s?.placeId).map(s => s!.placeId)

      const pricing = await fetchPricing({
        originPlaceId,
        tripType,
        stops: stopPlaceIds,
        pickupDateTime: dateTime.toISOString(),
        originLat: location.lat,
        originLng: location.lng,
      })

      const userLoc = {
        location: location.description,
        placeName: location.placeName || location.description,
        placeId: location.placeId,
        dateTime: dateTime.toISOString(),
        lat: location.lat,
        lng: location.lng,
      }
      const airportLoc = {
        location: BLR_AIRPORT_NAME,
        placeName: `BLR Airport — Terminal ${terminal}`,
        placeId: BLR_AIRPORT_PLACE_ID,
        dateTime: dateTime.toISOString(),
        terminal,
      }

      const pickupLoc = activeTab === 'to' ? userLoc : airportLoc
      const dropLoc = activeTab === 'to' ? airportLoc : userLoc

      const flightParam = flight
        ? JSON.stringify({
            flightNumber: flight.flightNumber,
            airline: flight.airline,
            departure: flight.departure || '',
            arrival: flight.arrival || '',
            status: flight.status || '',
          })
        : ''

      const stopLocs = stops
        .filter(s => s?.placeId)
        .map(s => ({ location: s!.description, placeName: s!.placeName || s!.description, placeId: s!.placeId }))

      const vehicleParams = {
        passengers: String(passengers),
tripType,
        terminal,
        pickup: JSON.stringify(pickupLoc),
        drop: JSON.stringify(dropLoc),
        stops: stopLocs.length ? JSON.stringify(stopLocs) : '',
        flight: flightParam,
        pricing: JSON.stringify(pricing),
      }

      if (!isLoggedIn) {
        router.push({
          pathname: '/(onboarding)/phone',
          params: {
            pickup: location?.description,
            drop: activeTab === 'to' ? 'BLR Airport' : location?.description,
            time: fmtDateTimeIST(dateTime.toISOString()),
            next: JSON.stringify({ pathname: '/(app)/vehicle', params: vehicleParams }),
          },
        })
        return
      }

      router.push({ pathname: '/(app)/vehicle', params: vehicleParams })
    } catch (e: any) {
      setPricingError(e.message || 'Could not calculate fare')
    } finally {
      setLoadingPricing(false)
    }
  }


  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <YAppChrome />

        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingName}>{displayName}</Text>
          <Text style={styles.headline}>
            {'Where are you '}
            <Text style={[styles.headline, { fontStyle: 'italic' }]}>flying?</Text>
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tab, activeTab === 'to' && styles.tabActive]}
            onPress={() => { setActiveTab('to'); setLocation(null); setFlight(null); setFlightError(''); setStops([]) }}
          >
            <PlaneUpIcon active={activeTab === 'to'} />
            <Text style={[styles.tabText, activeTab === 'to' && styles.tabTextActive]}>To airport</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'from' && styles.tabActive]}
            onPress={() => { setActiveTab('from'); setLocation(null); setFlight(null); setFlightError(''); setStops([]) }}
          >
            <PlaneDownIcon active={activeTab === 'from'} />
            <Text style={[styles.tabText, activeTab === 'from' && styles.tabTextActive]}>From airport</Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Route card */}
          <View style={[styles.routeCard, { zIndex: 20 }]}>
            {activeTab === 'from' ? (
              <>
                {/* From airport: BLR Airport on top (pickup), stops in middle, user location below (drop) */}
                <View>
                  <Text style={styles.routeMonoLabel}>PICKUP</Text>
                  <View style={styles.airportNameRow}>
                    <Text style={styles.routeMainText}>BLR Airport</Text>
                    {(['T1', 'T2'] as const).map((t) => (
                      <Pressable key={t} style={[styles.terminalChip, terminal === t && styles.terminalChipActive]} onPress={() => setTerminal(t)}>
                        <Text style={[styles.terminalChipText, terminal === t && styles.terminalChipTextActive]}>{t}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.routeSubText}>Kempegowda International · Devanahalli</Text>
                </View>

                <View style={styles.routeDivider} />

                {stops.map((stop, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, zIndex: 50 - i }}>
                    <View style={{ flex: 1 }}>
                      <LocationAutocomplete
                        label={`STOP ${i + 1}`}
                        placeholder="Add a stop…"
                        value={stop?.description || stop?.placeName}
                        onLocationSelect={(loc) => updateStop(i, loc)}
                        restrictToBangalore
                      />
                    </View>
                    <Pressable onPress={() => removeStop(i)} style={styles.stopRemoveBtn}>
                      <Text style={styles.stopRemoveTxt}>×</Text>
                    </Pressable>
                  </View>
                ))}

                <Pressable onPress={addStop} style={styles.addStopBtn}>
                  <Text style={styles.addStopTxt}>＋ Add stop</Text>
                </Pressable>

                <View style={styles.routeDivider} />

                <SavedPlacesSuggest onSelect={(loc) => { setLocation(loc); setPricingError('') }} />
                <LocationAutocomplete
                  label="DROP LOCATION"
                  placeholder="Where should we drop you?"
                  value={location?.description || location?.placeName}
                  onLocationSelect={(loc) => { setLocation(loc); setPricingError('') }}
                  restrictToBangalore
                />
              </>
            ) : (
              <>
                {/* To airport: user location on top (pickup), stops in middle, BLR Airport below (drop) */}
                <SavedPlacesSuggest onSelect={(loc) => { setLocation(loc); setPricingError('') }} />
                <LocationAutocomplete
                  label="PICKUP LOCATION"
                  placeholder="Home, hotel, office…"
                  value={location?.description || location?.placeName}
                  onLocationSelect={(loc) => { setLocation(loc); setPricingError('') }}
                  restrictToBangalore
                />

                <View style={styles.routeDivider} />

                {stops.map((stop, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, zIndex: 50 - i }}>
                    <View style={{ flex: 1 }}>
                      <LocationAutocomplete
                        label={`STOP ${i + 1}`}
                        placeholder="Add a stop…"
                        value={stop?.description || stop?.placeName}
                        onLocationSelect={(loc) => updateStop(i, loc)}
                        restrictToBangalore
                      />
                    </View>
                    <Pressable onPress={() => removeStop(i)} style={styles.stopRemoveBtn}>
                      <Text style={styles.stopRemoveTxt}>×</Text>
                    </Pressable>
                  </View>
                ))}

                <Pressable onPress={addStop} style={styles.addStopBtn}>
                  <Text style={styles.addStopTxt}>＋ Add stop</Text>
                </Pressable>

                <View style={styles.routeDivider} />

                <View>
                  <Text style={styles.routeMonoLabel}>DROP</Text>
                  <View style={styles.airportNameRow}>
                    <Text style={styles.routeMainText}>BLR Airport</Text>
                    {(['T1', 'T2'] as const).map((t) => (
                      <Pressable key={t} style={[styles.terminalChip, terminal === t && styles.terminalChipActive]} onPress={() => setTerminal(t)}>
                        <Text style={[styles.terminalChipText, terminal === t && styles.terminalChipTextActive]}>{t}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.routeSubText}>Kempegowda International · Devanahalli</Text>
                </View>
              </>
            )}
          </View>

          {/* Flight number */}
          <View style={[styles.flightBox, { marginTop: 10 }]}>
            <Text style={styles.monoLabel}>FLIGHT <Text style={{ color: YL.ink3, fontWeight: '400' }}>(optional)</Text></Text>
            <View style={styles.flightInputRow}>
              <TextInput
                value={flightNumber}
                onChangeText={(t) => {
                  setFlightNumber(t.toUpperCase())
                  setFlightError('')
                  if (!t) setFlight(null)
                }}
                onSubmitEditing={handleFlightLookup}
                onBlur={handleFlightLookup}
                placeholder="6E 2134"
                placeholderTextColor={YL.ink3}
                style={[styles.flightInput, Platform.OS === 'web' && ({ outlineWidth: 0 } as any)]}
                autoCapitalize="characters"
                returnKeyType="search"
              />
              {loadingFlight && <Text style={styles.flightSearching}>…</Text>}
              {flight && !loadingFlight && <Text style={{ color: YL.leaf, fontSize: 12 }}>✓</Text>}
            </View>
            {!!flightError && <Text style={styles.flightError}>{flightError}</Text>}
          </View>

          {/* Pickup time — full width so AM/PM is never clipped */}
          <View style={{ marginTop: 10 }}>
            <Text style={styles.monoLabel}>PICKUP TIME</Text>
            <DateTimePicker
              value={dateTime}
              onChange={setDateTime}
              minimumDate={new Date()}
            />
          </View>

          {/* Passengers */}
          <View style={styles.passengerCard}>
            <CompactStepper
              label="Passengers"
              sub="up to 6"
              value={passengers}
              onInc={() => setPassengers(v => v + 1)}
              onDec={() => setPassengers(v => v - 1)}
              icon={<IconPerson size={20} color={YL.ink} />}
              min={1}
              max={6}
            />
          </View>

{!!pricingError && (
            <Text style={styles.pricingError}>{pricingError}</Text>
          )}
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottomCta}>
          <YButton
            variant="ink"
            size="lg"
            onPress={handleChooseVehicle}
            disabled={loadingPricing || !location}
          >
            {loadingPricing ? 'Calculating fare…' : 'Choose vehicle →'}
          </YButton>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: YL.bg },
  greeting: { paddingHorizontal: 20, paddingTop: 2, paddingBottom: 4 },
  greetingName: { fontFamily: FONTS.mono, fontSize: 11, color: YL.ink3, letterSpacing: 0.4 },
  headline: {
    fontFamily: FONTS.display,
    fontSize: 26,
    lineHeight: 26 * 1.05,
    letterSpacing: -0.8,
    fontWeight: '500',
    color: YL.ink,
    marginTop: 4,
  },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6, gap: 8 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: YL.line,
    backgroundColor: YL.card,
  },
  tabActive: { backgroundColor: YL.yellow, borderColor: YL.ink },
  tabText: { fontSize: 14.5, fontWeight: '500', color: YL.ink },
  tabTextActive: { fontWeight: '600' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20 },
  routeCard: {
    padding: 16,
    backgroundColor: YL.card,
    borderWidth: 1,
    borderColor: YL.line,
    borderRadius: 20,
    gap: 12,
    overflow: 'visible',
  },
  routeMonoLabel: {
    fontFamily: FONTS.mono,
    fontSize: 10.5,
    letterSpacing: 0.4,
    color: YL.ink3,
    marginBottom: 3,
  },
  routeMainText: { fontSize: 15, fontWeight: '500', color: YL.ink },
  routeSubText: { fontSize: 12, color: YL.ink3, marginTop: 2 },
  routeDivider: { height: 1, backgroundColor: YL.lineSoft },
  airportNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'nowrap' },
  terminalChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: YL.line,
    backgroundColor: YL.bg,
  },
  terminalChipActive: { backgroundColor: YL.ink, borderColor: YL.ink },
  terminalChipText: { fontFamily: FONTS.mono, fontSize: 11, color: YL.ink2 },
  terminalChipTextActive: { color: '#FFFFFF' },
  flightBox: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: YL.card,
    borderWidth: 1,
    borderColor: YL.line,
    borderRadius: 12,
  },
  monoLabel: {
    fontFamily: FONTS.mono,
    fontSize: 10.5,
    letterSpacing: 0.4,
    color: YL.ink3,
    marginBottom: 4,
  },
  flightInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flightInput: {
    flex: 1,
    fontFamily: FONTS.mono,
    fontSize: 14,
    fontWeight: '500',
    color: YL.ink,
    paddingVertical: 2,
  },
  flightSearching: { fontFamily: FONTS.mono, fontSize: 14, color: YL.ink3 },
  flightError: { fontSize: 11, color: '#C0392B', marginTop: 4 },
  passengerCard: {
    marginTop: 14,
    backgroundColor: YL.card,
    borderWidth: 1,
    borderColor: YL.line,
    borderRadius: 18,
    overflow: 'hidden',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    paddingHorizontal: 14,
  },
  stepperIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: YL.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperLabel: { fontSize: 14.5, fontWeight: '500', color: YL.ink },
  stepperSub: { fontFamily: FONTS.display, fontSize: 11.5, color: YL.ink3 },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperCount: {
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: '500',
    color: YL.ink,
    minWidth: 28,
    textAlign: 'center',
  },
  passengerDivider: { height: 1, backgroundColor: YL.lineSoft },
  addOnsSection: { marginTop: 14, marginBottom: 8 },
  chipsRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: YL.line,
    backgroundColor: YL.card,
  },
  chipActive: { backgroundColor: YL.ink, borderColor: YL.ink },
  chipText: { fontSize: 13, color: YL.ink },
  chipTextActive: { color: '#FFFFFF' },
  pricingError: { color: '#C0392B', fontSize: 13, marginTop: 8, textAlign: 'center' },
  bottomCta: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  addStopBtn: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 2 },
  addStopTxt: { fontFamily: FONTS.mono, fontSize: 11.5, color: YL.ink2, letterSpacing: 0.2 },
  stopRemoveBtn: { marginTop: 18, width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: YL.bg2, borderWidth: 1, borderColor: YL.line },
  stopRemoveTxt: { fontSize: 18, color: YL.ink2, lineHeight: 22 },
})

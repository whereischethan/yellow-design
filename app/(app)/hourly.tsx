import React, { useState, useEffect } from 'react'
import {
  View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { YL, FONTS } from '../../constants/theme'
import YAppChrome from '../../components/YAppChrome'
import YButton from '../../components/YButton'
import LocationAutocomplete from '../../components/location/LocationAutocomplete'
import SavedPlacesSuggest from '../../components/SavedPlacesSuggest'
import DateTimePicker from '../../components/DateTimePicker'
import { useAuth } from '../../context/AuthContext'
import { getApiBase } from '../../lib/api'
import type { LocationData } from '../../types/booking'

const DURATION_HOURS = [4, 8, 12]

function tomorrow(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(9, 0, 0, 0)
  return d
}

export default function ScreenHourly() {
  const router = useRouter()
  const { isLoggedIn } = useAuth()
  const [activeDuration, setActiveDuration] = useState(8)
  const [pickupLocation, setPickupLocation] = useState<LocationData | null>(null)
  const [dropLocation, setDropLocation] = useState<LocationData | null>(null)
  const [startTime, setStartTime] = useState<Date>(tomorrow())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hourlyRate, setHourlyRate] = useState(500)

  useEffect(() => {
    fetch(`${getApiBase()}/pricing/config`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.hourlyRate) setHourlyRate(d.hourlyRate) })
      .catch(() => {})
  }, [])

  const canBook = !!(pickupLocation && dropLocation)

  const handleBook = async () => {
    if (!pickupLocation) { setError('Please enter a pickup location.'); return }
    if (!dropLocation) { setError('Please enter a final drop location.'); return }
    setLoading(true)
    setError('')
    try {
      const price = activeDuration * hourlyRate

      const pickupLoc = {
        location: pickupLocation.description,
        placeName: pickupLocation.placeName ?? pickupLocation.description,
        placeId: pickupLocation.placeId,
        dateTime: startTime.toISOString(),
        lat: pickupLocation.lat,
        lng: pickupLocation.lng,
      }
      const dropLoc = {
        location: dropLocation.description,
        placeName: dropLocation.placeName ?? dropLocation.description,
        placeId: dropLocation.placeId,
        dateTime: '',
        lat: dropLocation.lat,
        lng: dropLocation.lng,
      }

      const pricing = {
        distanceKm: 0,
        durationMinutes: activeDuration * 60,
        basePrice: price,
        extraKmCharge: 0,
        totalPrice: price,
        vehicleOptions: {
          yellowSky: { basePrice: price, extraKmCharge: 0, totalPrice: price },
        },
      }

      const vehicleParams = {
        passengers: '1',
        bags: '0',
        meetAndGreet: '0',
        petFriendly: '0',
        tripType: 'pickup',
        terminal: '',
        pickup: JSON.stringify(pickupLoc),
        drop: JSON.stringify(dropLoc),
        flight: '',
        pricing: JSON.stringify(pricing),
      }

      if (!isLoggedIn) {
        router.push({
          pathname: '/(onboarding)/phone',
          params: {
            pickup: pickupLocation?.description,
            next: JSON.stringify({ pathname: '/(app)/vehicle', params: vehicleParams }),
          },
        })
        return
      }

      router.push({ pathname: '/(app)/vehicle', params: vehicleParams })
    } catch (e: any) {
      setError(e.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <YAppChrome
        right={
          <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: YL.ink3, letterSpacing: 0.4 }}>
            HOURLY
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
            Keep the <Text style={{ fontStyle: 'italic' }}>car.</Text>
          </Text>
          <Text style={styles.subline}>₹500 / hr · Unlimited kms within Bangalore</Text>
        </View>

        {/* Duration */}
        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <Text style={styles.monoLabel}>DURATION</Text>
          <View style={styles.durationRow}>
            {DURATION_HOURS.map(h => {
              const isActive = activeDuration === h
              return (
                <Pressable
                  key={h}
                  style={[styles.durationCard, isActive && styles.durationCardActive]}
                  onPress={() => setActiveDuration(h)}
                >
                  <Text style={styles.durationNum}>{h}<Text style={styles.durationUnit}>hr</Text></Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* Pickup location */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <Text style={styles.monoLabel}>PICKUP LOCATION</Text>
          <SavedPlacesSuggest onSelect={loc => setPickupLocation(loc)} />
          <LocationAutocomplete
            placeholder="Where should we pick you up?"
            value={pickupLocation?.placeName ?? pickupLocation?.description}
            onLocationSelect={loc => setPickupLocation(loc)}
            restrictToBangalore
          />
        </View>

        {/* Drop location */}
        <View style={{ paddingHorizontal: 20, marginTop: 14 }}>
          <Text style={styles.monoLabel}>FINAL DROP LOCATION</Text>
          <LocationAutocomplete
            placeholder="Where should we drop you off?"
            value={dropLocation?.placeName ?? dropLocation?.description}
            onLocationSelect={loc => setDropLocation(loc)}
            restrictToBangalore
          />
        </View>

        {/* Start time */}
        <View style={{ paddingHorizontal: 20, marginTop: 14 }}>
          <Text style={styles.monoLabel}>START TIME</Text>
          <DateTimePicker
            value={startTime}
            onChange={setStartTime}
            minimumDate={new Date()}
            mode="datetime"
          />
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Unlimited kms within Bangalore city limits. Tolls and parking charged at actuals.
          </Text>
        </View>

        {!!error && <Text style={{ marginHorizontal: 20, color: '#C0392B', fontSize: 13, marginTop: 4 }}>{error}</Text>}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20 }}>
        <YButton variant="ink" size="lg" onPress={handleBook} disabled={!canBook || loading}>
          {loading ? <ActivityIndicator color={YL.bg} size="small" /> : 'Choose vehicle →'}
        </YButton>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: YL.bg, overflow: 'hidden' },
  headline: { fontFamily: FONTS.display, fontSize: 26, letterSpacing: -0.7, fontWeight: '500', color: YL.ink },
  subline: { fontFamily: FONTS.display, fontSize: 13, color: YL.ink3, marginTop: 3 },
  monoLabel: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 0.4, color: YL.ink3, marginBottom: 10 },
  durationRow: { flexDirection: 'row', gap: 10 },
  durationCard: {
    flex: 1, paddingVertical: 18, paddingHorizontal: 10,
    borderRadius: 16, borderWidth: 1.5, borderColor: YL.line,
    backgroundColor: YL.card, alignItems: 'center',
  },
  durationCardActive: {
    backgroundColor: YL.yellow, borderColor: YL.ink,
    shadowColor: YL.yellowDeep, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22, shadowRadius: 8, elevation: 4,
  },
  durationNum: { fontFamily: FONTS.display, fontSize: 28, fontWeight: '500', letterSpacing: -0.4, color: YL.ink },
  durationUnit: { fontFamily: FONTS.display, fontSize: 14, color: YL.ink, marginLeft: 2 },
  infoCard: {
    marginHorizontal: 20, marginTop: 16, marginBottom: 4, padding: 12,
    paddingHorizontal: 14, backgroundColor: YL.leafSoft, borderRadius: 12,
  },
  infoText: { fontFamily: FONTS.display, fontSize: 12, color: YL.ink2, lineHeight: 18 },
})

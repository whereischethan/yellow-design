import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { YL, FONTS } from '@/constants/theme'
import { useDriverAuth } from '@/context/DriverAuthContext'
import { useDuty } from '@/context/DutyContext'
import { getDriverMe, getDriverBookings } from '@/lib/api'
import { estimatedRangeKm } from '@/lib/energy'

function greeting(name: string): string {
  const hour = new Date().getHours()
  if (hour < 12) return `Good morning, ${name}`
  if (hour < 17) return `Good afternoon, ${name}`
  return `Good evening, ${name}`
}

function formatShiftDate(): string {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Kolkata',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  })
}

export default function ClockInScreen() {
  const { driver, updateDriver } = useDriverAuth()
  const { clockInTime, bookings, setBookings, clockIn } = useDuty()
  const [loading, setLoading] = useState(true)
  const [clocking, setClocking] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const [meData, tripsData] = await Promise.all([getDriverMe(), getDriverBookings()])
        updateDriver(meData.driver ?? meData)
        setBookings(tripsData?.bookings ?? tripsData ?? [])
      } catch {
        // silent — use cached data
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const vehicle = driver?.assignedVehicle
  const soc = vehicle?.soc ?? null
  const range = soc != null ? estimatedRangeKm(soc) : null
  const socColor = soc != null && soc < 20 ? YL.gulmohar : YL.leaf
  const firstBooking = bookings[0] ?? null

  async function handleClockIn() {
    setClocking(true)
    try {
      clockIn()
      router.replace('/(duty)/handoff')
    } finally {
      setClocking(false)
    }
  }

  function handleContinue() {
    router.replace('/(duty)/roster')
  }

  const shiftDate = formatShiftDate()
  const driverName = driver?.name ?? '—'

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* TopBar */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.topName}>{driverName}</Text>
            <Text style={styles.topDate}>{shiftDate}</Text>
          </View>
          {!!clockInTime && (
            <View style={styles.onDutyPill}>
              <View style={styles.onDutyDot} />
              <Text style={styles.onDutyText}>ON DUTY</Text>
            </View>
          )}
        </View>

        {/* Greeting card */}
        <View style={styles.card}>
          {loading ? (
            <ActivityIndicator color={YL.ink2} />
          ) : (
            <>
              <Text style={styles.greetingText}>{greeting(driverName)}</Text>
              <Text style={styles.greetingDate}>{shiftDate}</Text>
            </>
          )}
        </View>

        {/* Vehicle card */}
        <View style={styles.card}>
          {vehicle ? (
            <>
              <View style={styles.vehicleHeader}>
                <Text style={styles.vehicleLabel}>
                  {vehicle.make} {vehicle.model}
                </Text>
                <View style={styles.platePill}>
                  <Text style={styles.plateText}>{vehicle.licensePlate}</Text>
                </View>
              </View>
              {/* SoC bar */}
              <View style={styles.socBarBg}>
                <View style={[styles.socBarFill, { width: `${soc ?? 0}%` as any, backgroundColor: socColor }]} />
              </View>
              <Text style={styles.socText}>
                {soc != null ? `${soc}% · ~${range} km` : 'Battery — enter at handoff'}
              </Text>
            </>
          ) : (
            <Text style={styles.noVehicle}>No vehicle assigned yet</Text>
          )}
        </View>

        {/* First trip preview */}
        {firstBooking && (
          <View style={styles.card}>
            <Text style={styles.sectionEyebrow}>FIRST TRIP</Text>
            <Text style={styles.tripTime}>
              {firstBooking.pickup?.dateTime ? formatTime(firstBooking.pickup.dateTime) : '—'}
            </Text>
            <View style={styles.routeRow}>
              <Text style={styles.routeText} numberOfLines={1}>
                {firstBooking.pickup?.placeName ?? firstBooking.pickup?.location ?? '—'}
              </Text>
              <Text style={styles.routeArrow}>→</Text>
              <Text style={styles.routeText} numberOfLines={1}>
                {firstBooking.drop?.placeName ?? firstBooking.drop?.location ?? '—'}
              </Text>
            </View>
          </View>
        )}

        {/* CTA button */}
        {clockInTime ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleContinue} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Continue duty →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryBtn, clocking && styles.primaryBtnDisabled]}
            onPress={handleClockIn}
            disabled={clocking}
            activeOpacity={0.85}
          >
            {clocking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Clock in &amp; start duty</Text>
            )}
          </TouchableOpacity>
        )}
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  topName: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: YL.ink2,
  },
  topDate: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: YL.ink3,
    marginTop: 2,
  },
  onDutyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: YL.leafSoft,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },
  onDutyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: YL.leaf,
  },
  onDutyText: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: YL.leaf,
  },
  card: {
    backgroundColor: YL.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: YL.line,
    padding: 20,
  },
  greetingText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 26,
    color: YL.ink,
    marginBottom: 6,
  },
  greetingDate: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: YL.ink2,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  vehicleLabel: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 18,
    color: YL.ink,
  },
  platePill: {
    backgroundColor: YL.bg2,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  plateText: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: YL.ink,
  },
  socBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: YL.line,
    overflow: 'hidden',
    marginBottom: 8,
  },
  socBarFill: {
    height: 8,
    borderRadius: 4,
  },
  socText: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: YL.ink2,
  },
  noVehicle: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: YL.ink3,
  },
  sectionEyebrow: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    color: YL.ink3,
    marginBottom: 8,
  },
  tripTime: {
    fontFamily: FONTS.mono,
    fontSize: 20,
    color: YL.ink,
    marginBottom: 8,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeText: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: YL.ink2,
    flex: 1,
  },
  routeArrow: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: YL.ink3,
  },
  primaryBtn: {
    backgroundColor: YL.ink,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
})

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YL, FONTS } from '@/constants/theme';
import { useDuty } from '@/context/DutyContext';
import { useDriverAuth } from '@/context/DriverAuthContext';

export default function SignedOffScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookings, clearDuty } = useDuty();
  const { signOut } = useDriverAuth();

  // Tomorrow's bookings from the already-fetched roster (future dates)
  const tomorrowIST = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  })()
  const tomorrowBookings = bookings
    .filter((b) => {
      const dt = b.pickup?.dateTime
      if (!dt) return false
      return new Date(dt).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === tomorrowIST
    })
    .sort((a, b) => (a.pickup?.dateTime ?? '').localeCompare(b.pickup?.dateTime ?? ''))

  const firstTomorrow = tomorrowBookings[0] ?? null
  const firstTomorrowTime = firstTomorrow?.pickup?.dateTime
    ? new Date(firstTomorrow.pickup.dateTime).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
      })
    : null
  const firstTomorrowPickup = firstTomorrow?.pickup?.placeName ?? firstTomorrow?.pickup?.location ?? ''
  const firstTomorrowDrop = firstTomorrow?.drop?.placeName ?? firstTomorrow?.drop?.location ?? ''

  // Suggest alarm 90 min before first trip, or omit if no tomorrow trips
  const alarmSuggestion = (() => {
    if (!firstTomorrow?.pickup?.dateTime) return null
    const tripMs = new Date(firstTomorrow.pickup.dateTime).getTime()
    const alarmMs = tripMs - 90 * 60 * 1000
    return new Date(alarmMs).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
    })
  })()

  async function handleSignOut() {
    clearDuty();
    await signOut();
    router.replace('/(auth)/phone');
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Celebration mark */}
        <View style={styles.celebrationSection}>
          <View style={styles.celebrationCircle}>
            <Text style={styles.celebrationTick}>✓</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>You're all done!</Text>
        <Text style={styles.subtitle}>
          Great work today. Rest up for tomorrow.
        </Text>

        {/* Tomorrow card */}
        <View style={styles.tomorrowCard}>
          <Text style={styles.tomorrowEyebrow}>TOMORROW</Text>
          {firstTomorrow ? (
            <View style={styles.tomorrowTripInfo}>
              <Text style={styles.tomorrowTime}>{firstTomorrowTime}</Text>
              <Text style={styles.tomorrowRoute}>
                {firstTomorrowPickup} → {firstTomorrowDrop}
              </Text>
            </View>
          ) : (
            <Text style={styles.tomorrowEmpty}>
              No trips scheduled yet — check back tomorrow
            </Text>
          )}
          {alarmSuggestion && (
            <View style={styles.alarmRow}>
              <Text style={styles.alarmText}>⏰ Set alarm for {alarmSuggestion}</Text>
            </View>
          )}
        </View>

        {/* Replay today */}
        <TouchableOpacity
          style={styles.replayButton}
          onPress={() => router.push('/(duty)/roster')}
        >
          <Text style={styles.replayButtonText}>Replay today</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Sign out */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: YL.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 8,
    alignItems: 'center',
    gap: 14,
  },
  celebrationSection: {
    marginTop: 32,
    marginBottom: 8,
  },
  celebrationCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: YL.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationTick: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 40,
    color: YL.yellow,
  },
  title: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 28,
    color: YL.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.display,
    fontSize: 15,
    color: YL.ink2,
    textAlign: 'center',
    lineHeight: 22,
  },
  tomorrowCard: {
    backgroundColor: YL.ink,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    gap: 10,
  },
  tomorrowEyebrow: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.8,
  },
  tomorrowTripInfo: {
    gap: 4,
  },
  tomorrowTime: {
    fontFamily: FONTS.monoMedium,
    fontSize: 20,
    color: '#FFFFFF',
  },
  tomorrowRoute: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  tomorrowEmpty: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 20,
  },
  alarmRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 10,
  },
  alarmText: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: YL.yellow,
  },
  replayButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: YL.line,
  },
  replayButtonText: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: YL.ink2,
  },
  bottomBar: {
    backgroundColor: YL.card,
    borderTopWidth: 1,
    borderTopColor: YL.line,
    padding: 16,
    alignItems: 'center',
  },
  signOutButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  signOutText: {
    fontFamily: FONTS.display,
    fontSize: 15,
    color: YL.gulmohar,
  },
});

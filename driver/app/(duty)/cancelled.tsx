import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YL, FONTS } from '@/constants/theme';
import { useDuty } from '@/context/DutyContext';

export default function CancelledScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bookings, currentBooking, nextBooking, completeTrip } = useDuty();

  const booking = bookings.find((b) => b.id === id) ?? currentBooking;

  const cancellationNote = 'This trip was cancelled. You are not at fault.';

  const nextPickupTime = nextBooking
    ? new Date((nextBooking.pickup as any)?.dateTime ?? Date.now()).toLocaleTimeString(
        'en-IN',
        { hour: '2-digit', minute: '2-digit' },
      )
    : null;
  const nextPickupName = (nextBooking?.pickup as any)?.placeName ?? 'Next pickup';
  const nextDropName = (nextBooking?.drop as any)?.placeName ?? 'Drop-off';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Alert banner */}
        <View style={styles.alertBanner}>
          <Text style={styles.alertEyebrow}>TRIP CANCELLED</Text>
          <Text style={styles.alertNote}>{cancellationNote}</Text>
        </View>

        {/* Next trip card */}
        {nextBooking && (
          <View style={styles.nextTripCard}>
            <Text style={styles.nextTripEyebrow}>NEXT TRIP</Text>
            <Text style={styles.nextTripTime}>{nextPickupTime}</Text>
            <Text style={styles.nextTripRoute}>
              {nextPickupName} → {nextDropName}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* CTA */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.rosterButton}
          onPress={() => { completeTrip(); router.replace('/(duty)/roster'); }}
        >
          <Text style={styles.rosterButtonText}>Back to roster</Text>
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
    gap: 14,
    paddingBottom: 8,
  },
  alertBanner: {
    backgroundColor: YL.gulmoharSoft,
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  alertEyebrow: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: YL.gulmohar,
    letterSpacing: 0.8,
  },
  alertNote: {
    fontFamily: FONTS.display,
    fontSize: 15,
    color: YL.ink,
    lineHeight: 22,
  },
  nextTripCard: {
    backgroundColor: YL.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: YL.line,
    padding: 16,
    gap: 4,
  },
  nextTripEyebrow: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: YL.ink3,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  nextTripTime: {
    fontFamily: FONTS.monoMedium,
    fontSize: 18,
    color: YL.ink,
  },
  nextTripRoute: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: YL.ink2,
  },
  bottomBar: {
    backgroundColor: YL.card,
    borderTopWidth: 1,
    borderTopColor: YL.line,
    padding: 16,
  },
  rosterButton: {
    backgroundColor: YL.ink,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  rosterButtonText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 16,
    color: YL.yellow,
  },
});

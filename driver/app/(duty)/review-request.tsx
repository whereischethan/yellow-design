import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YL, FONTS } from '@/constants/theme';
import { useDuty } from '@/context/DutyContext';
import { calcCo2Grams } from '@/lib/energy';

export default function ReviewRequestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    bookings,
    currentBooking,
    completeTrip,
    nextBooking,
  } = useDuty();

  const booking = bookings.find((b) => b.id === id) ?? currentBooking;
  const bookingId = booking?.id ?? id ?? '';

  const hasMoreTrips = nextBooking != null;

  const distanceKm: number =
    (booking?.pricing as any)?.distanceKm ?? 0;

  const co2Grams = useMemo(() => distanceKm > 0 ? calcCo2Grams(distanceKm) : 0, [distanceKm]);

  const nextPickupTime = nextBooking?.pickup?.dateTime
    ? new Date(nextBooking.pickup.dateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
    : null;
  const nextPickupName = nextBooking?.pickup?.placeName ?? nextBooking?.pickup?.location ?? 'Next pickup';
  const nextDropName = nextBooking?.drop?.placeName ?? nextBooking?.drop?.location ?? 'Drop-off';

  const googleReviewUrl = process.env.EXPO_PUBLIC_GOOGLE_REVIEW_URL ?? '';

  async function handleNextTrip() {
    completeTrip();
    router.replace('/(duty)/roster');
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.headerTitle}>Before you go</Text>

        {/* Paid confirmation chip */}
        <View style={styles.paidChip}>
          <Text style={styles.paidChipText}>Payment received ✓</Text>
        </View>

        {/* Review card — only shown if review URL is configured */}
        {!!googleReviewUrl && (
          <View style={styles.reviewCard}>
            <Text style={styles.stars}>⭐⭐⭐⭐⭐</Text>
            <Text style={styles.reviewBody}>
              If the ride was good, a quick Google review helps us grow!
            </Text>
            <TouchableOpacity
              style={styles.shareLinkButton}
              onPress={() => Linking.openURL(googleReviewUrl)}
            >
              <Text style={styles.shareLinkText}>Share Google review link →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* CO₂ recap — only shown when we have real distance data */}
        {co2Grams > 0 && (
          <View style={styles.co2Chip}>
            <Text style={styles.co2ChipText}>
              🌿 {(co2Grams / 1000).toFixed(1)} kg CO₂ avoided this trip
            </Text>
          </View>
        )}

        {/* Next trip preview */}
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

      {/* Bottom buttons */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {hasMoreTrips ? (
          <TouchableOpacity style={styles.nextTripButton} onPress={handleNextTrip}>
            <Text style={styles.nextTripButtonText}>Next trip →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.closeDutyButton}
            onPress={() => router.push('/(duty)/close-duty')}
          >
            <Text style={styles.closeDutyText}>Close duty</Text>
          </TouchableOpacity>
        )}
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
  headerTitle: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 24,
    color: YL.ink,
  },
  paidChip: {
    alignSelf: 'flex-start',
    backgroundColor: YL.leafSoft,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  paidChipText: {
    fontFamily: FONTS.display,
    fontSize: 13,
    color: YL.leaf,
  },
  reviewCard: {
    backgroundColor: YL.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: YL.line,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  stars: {
    fontSize: 28,
    letterSpacing: 4,
  },
  reviewBody: {
    fontFamily: FONTS.display,
    fontSize: 15,
    color: YL.ink2,
    textAlign: 'center',
    lineHeight: 22,
  },
  shareLinkButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: YL.line,
  },
  shareLinkText: {
    fontFamily: FONTS.display,
    fontSize: 13,
    color: YL.ink2,
  },
  co2Chip: {
    backgroundColor: YL.leafSoft,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  co2ChipText: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: YL.leaf,
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
  nextTripButton: {
    backgroundColor: YL.ink,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextTripButtonText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 16,
    color: YL.yellow,
  },
  closeDutyButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: YL.line,
  },
  closeDutyText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 16,
    color: YL.ink,
  },
});

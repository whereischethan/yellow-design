import React, { useEffect, useState } from 'react';
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
import * as Location from 'expo-location';
import { YL, FONTS } from '@/constants/theme';
import { useDuty } from '@/context/DutyContext';
import { isWithinKm } from '@/lib/geo';

export default function InTripScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bookings, currentBooking } = useDuty();

  const booking = bookings.find((b) => b.id === id) ?? currentBooking;

  const [nearDrop, setNearDrop] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const distanceKm: number = (booking?.pricing as any)?.distanceKm ?? 0;
  const totalDuration = distanceKm > 0 ? (distanceKm / 30) * 60 : null; // minutes, null if unknown

  const pickupDt = booking?.pickup
    ? new Date((booking.pickup as any).dateTime ?? Date.now())
    : new Date();

  useEffect(() => {
    const tick = setInterval(() => {
      setElapsed((Date.now() - pickupDt.getTime()) / 60000);
    }, 10000);
    setElapsed((Date.now() - pickupDt.getTime()) / 60000);
    return () => clearInterval(tick);
  }, [pickupDt.getTime()]);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 100 },
        (loc) => {
          const drop = (booking?.drop as any);
          if (drop?.lat && drop?.lng) {
            setNearDrop(
              isWithinKm(
                loc.coords.latitude,
                loc.coords.longitude,
                drop.lat,
                drop.lng,
                2,
              ),
            );
          } else {
            setNearDrop(true);
          }
        },
      );
    })();
    return () => {
      sub?.remove();
    };
  }, []);

  const progress = totalDuration ? Math.min(100, Math.round((elapsed / totalDuration) * 100)) : 0;

  const pickupName = (booking?.pickup as any)?.placeName ?? 'Pickup';
  const dropName = (booking?.drop as any)?.placeName ?? 'Drop-off';
  const tripCode = booking?.id?.slice(-6).toUpperCase() ?? '------';
  const riderName =
    (booking as any)?.riderName ?? (booking as any)?.userName ?? 'Rider';
  const passengerCount = (booking as any)?.passengerCount ?? 1;

  const etaStr = (() => {
    if (!totalDuration) return 'ETA unknown'
    const etaMinutes = Math.max(0, Math.round(totalDuration - elapsed))
    const h = Math.floor(etaMinutes / 60)
    const m = etaMinutes % 60
    return h > 0 ? `${h}h ${m}m remaining` : `${m}m remaining`
  })()

  const dropHasCoords = !!(
    (booking?.drop as any)?.lat && (booking?.drop as any)?.lng
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>In Trip</Text>
          <View style={styles.tripCodePill}>
            <Text style={styles.tripCodeText}>{tripCode}</Text>
          </View>
        </View>

        {/* Progress card */}
        <View style={styles.card}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressPct}>{progress}% complete</Text>

          <View style={styles.routeRow}>
            <View style={styles.routeItem}>
              <Text style={styles.routeLabel}>FROM</Text>
              <Text style={styles.routeName} numberOfLines={2}>
                {pickupName}
              </Text>
            </View>
            <Text style={styles.routeArrow}>→</Text>
            <View style={[styles.routeItem, styles.routeItemRight]}>
              <Text style={[styles.routeLabel, { textAlign: 'right' }]}>TO</Text>
              <Text
                style={[styles.routeName, { textAlign: 'right' }]}
                numberOfLines={2}
              >
                {dropName}
              </Text>
            </View>
          </View>

          <View style={styles.etaRow}>
            <Text style={styles.etaText}>ETA: {etaStr}</Text>
            {distanceKm > 0 && <Text style={styles.etaDist}>{distanceKm} km total</Text>}
          </View>
        </View>

        {/* Rider card */}
        <View style={styles.card}>
          <View style={styles.riderRow}>
            <View style={styles.riderAvatar}>
              <Text style={styles.riderAvatarText}>
                {riderName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.riderInfo}>
              <Text style={styles.riderName}>{riderName}</Text>
              <Text style={styles.riderMeta}>
                {passengerCount} passenger{passengerCount !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.acPill}>
              <Text style={styles.acText}>❄ 20°C</Text>
            </View>
          </View>
        </View>

        {/* Geofence status */}
        <View
          style={[
            styles.geofenceCard,
            { backgroundColor: nearDrop ? YL.leafSoft : YL.gulmoharSoft },
          ]}
        >
          <Text
            style={[
              styles.geofenceText,
              { color: nearDrop ? YL.leaf : YL.gulmohar },
            ]}
          >
            {nearDrop
              ? '📍 Near drop-off — ready to arrive'
              : dropHasCoords
              ? '📍 Not yet near drop-off (within 2 km to unlock arrival)'
              : '📍 Manual arrival — no drop coordinates'}
          </Text>
        </View>
      </ScrollView>

      {/* Bottom actions */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.bottomRow}>
          <TouchableOpacity
            style={styles.sosButton}
            onPress={() => Linking.openURL('tel:112')}
          >
            <Text style={styles.sosText}>🆘 SOS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.issueButton}
            onPress={() => router.push('/(duty)/dispatch')}
          >
            <Text style={styles.issueText}>Report issue</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.arrivedButton, !nearDrop && styles.arrivedButtonDisabled]}
          disabled={!nearDrop}
          onPress={() =>
            router.push(`/(duty)/end-trip?id=${booking?.id ?? id}`)
          }
        >
          <Text
            style={[
              styles.arrivedButtonText,
              !nearDrop && styles.arrivedButtonTextDisabled,
            ]}
          >
            Arrived at destination ✓
          </Text>
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
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 22,
    color: YL.ink,
  },
  tripCodePill: {
    backgroundColor: YL.yellow,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tripCodeText: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: YL.ink,
  },
  card: {
    backgroundColor: YL.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: YL.line,
    padding: 16,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: YL.line,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: YL.yellow,
  },
  progressPct: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: YL.ink3,
    marginBottom: 12,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeItem: {
    flex: 1,
  },
  routeItemRight: {
    alignItems: 'flex-end',
  },
  routeLabel: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: YL.ink3,
    marginBottom: 2,
  },
  routeName: {
    fontFamily: FONTS.display,
    fontSize: 15,
    color: YL.ink,
  },
  routeArrow: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: YL.ink3,
    marginHorizontal: 8,
  },
  etaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: YL.lineSoft,
    paddingTop: 10,
  },
  etaText: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: YL.ink2,
  },
  etaDist: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: YL.ink3,
  },
  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  riderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: YL.yellowSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderAvatarText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 18,
    color: YL.ink,
  },
  riderInfo: {
    flex: 1,
  },
  riderName: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 16,
    color: YL.ink,
  },
  riderMeta: {
    fontFamily: FONTS.display,
    fontSize: 13,
    color: YL.ink2,
    marginTop: 2,
  },
  acPill: {
    backgroundColor: YL.bg2,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  acText: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: YL.ink2,
  },
  geofenceCard: {
    borderRadius: 12,
    padding: 12,
  },
  geofenceText: {
    fontFamily: FONTS.display,
    fontSize: 14,
  },
  bottomBar: {
    backgroundColor: YL.card,
    borderTopWidth: 1,
    borderTopColor: YL.line,
    padding: 16,
    gap: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sosButton: {
    flex: 1,
    backgroundColor: YL.gulmoharSoft,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sosText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 15,
    color: YL.gulmohar,
  },
  issueButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: YL.line,
  },
  issueText: {
    fontFamily: FONTS.display,
    fontSize: 15,
    color: YL.ink2,
  },
  arrivedButton: {
    backgroundColor: YL.ink,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  arrivedButtonDisabled: {
    backgroundColor: YL.line,
  },
  arrivedButtonText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 16,
    color: YL.yellow,
  },
  arrivedButtonTextDisabled: {
    color: YL.ink3,
  },
});

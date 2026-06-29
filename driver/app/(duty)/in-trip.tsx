import React, { useEffect, useRef, useState } from 'react';
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
import { postDriverLocation } from '@/lib/api';

export default function InTripScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bookings, currentBooking } = useDuty();

  const booking = bookings.find((b) => b.id === id) ?? currentBooking;

  const [nearDrop, setNearDrop] = useState(false);
  const [gpsUnavailable, setGpsUnavailable] = useState(false);
  const [gpsWeak, setGpsWeak] = useState(false);
  const gotFixRef = useRef(false);

  const distanceKm: number = (booking?.pricing as any)?.distanceKm ?? 0;

  // If GPS never resolves within 60s (permission denied, slow web geolocation),
  // unlock manual arrival instead of soft-locking the driver
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!gotFixRef.current) setGpsUnavailable(true);
    }, 60_000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let lastPost = 0;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 50 },
        (loc) => {
          gotFixRef.current = true;
          setGpsUnavailable(false);
          const accuracy = loc.coords.accuracy ?? 0;
          const weak = accuracy > 50;
          setGpsWeak(weak);
          if (!weak && Date.now() - lastPost >= 10_000) {
            lastPost = Date.now();
            postDriverLocation({
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
              heading: loc.coords.heading ?? undefined,
              speed: loc.coords.speed ?? undefined,
            });
          }
          const drop = (booking?.drop as any);
          if (drop?.lat && drop?.lng) {
            setNearDrop(
              isWithinKm(
                { lat: loc.coords.latitude, lng: loc.coords.longitude },
                { lat: drop.lat, lng: drop.lng },
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

  const pickupName = (booking?.pickup as any)?.placeName ?? (booking?.pickup as any)?.location ?? 'Pickup';
  const dropName = (booking?.drop as any)?.placeName ?? (booking?.drop as any)?.location ?? 'Drop-off';
  const tripCode = booking?.tripCode ?? booking?.id?.slice(-6).toUpperCase() ?? '------';
  const riderName = booking?.guestName ?? 'Passenger';
  const passengerCount = (booking as any)?.passengerCount ?? 1;
  const stops = booking?.stops ?? [];

  const dropHasCoords = !!(
    (booking?.drop as any)?.lat && (booking?.drop as any)?.lng
  );

  const canArrive = nearDrop || !dropHasCoords || gpsUnavailable;

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

        {gpsWeak && (
          <View style={{ backgroundColor: '#FEF9C3', borderRadius: 10, padding: 10, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: '#92400E' }}>GPS weak — location not being shared</Text>
          </View>
        )}

        {/* Route card */}
        <View style={styles.card}>
          <View style={styles.routeStop}>
            <Text style={styles.routeLabel}>FROM</Text>
            <Text style={styles.routeName} numberOfLines={2}>
              {pickupName}
            </Text>
          </View>

          {stops.map((stop, i) => (
            <View key={i} style={styles.routeStop}>
              <Text style={styles.routeLabel}>STOP {i + 1}</Text>
              <Text style={styles.routeName} numberOfLines={2}>
                {stop.placeName ?? stop.location}
              </Text>
            </View>
          ))}

          <View style={styles.routeStop}>
            <Text style={styles.routeLabel}>TO</Text>
            <Text style={styles.routeName} numberOfLines={2}>
              {dropName}
            </Text>
          </View>

          {distanceKm > 0 && (
            <Text style={styles.distanceText}>{distanceKm} km total</Text>
          )}

          {dropHasCoords && (
            <TouchableOpacity
              style={styles.navigateLink}
              onPress={() =>
                Linking.openURL(
                  `https://www.google.com/maps/dir/?api=1&destination=${(booking?.drop as any).lat},${(booking?.drop as any).lng}&travelmode=driving`,
                )
              }
              activeOpacity={0.7}
            >
              <Text style={styles.navigateLinkText}>Navigate to drop →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Passenger card */}
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
          </View>
        </View>

        {/* Geofence status */}
        <View
          style={[
            styles.geofenceCard,
            { backgroundColor: canArrive ? YL.leafSoft : YL.gulmoharSoft },
          ]}
        >
          <Text
            style={[
              styles.geofenceText,
              { color: canArrive ? YL.leaf : YL.gulmohar },
            ]}
          >
            {nearDrop
              ? '📍 Near drop-off — ready to arrive'
              : gpsUnavailable
              ? '📍 Location unavailable — manual arrival enabled'
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
        </View>

        <TouchableOpacity
          style={[styles.arrivedButton, !canArrive && styles.arrivedButtonDisabled]}
          disabled={!canArrive}
          onPress={() =>
            router.push(`/(duty)/end-trip?id=${booking?.id ?? id}`)
          }
        >
          <Text
            style={[
              styles.arrivedButtonText,
              !canArrive && styles.arrivedButtonTextDisabled,
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
  routeStop: {
    marginBottom: 12,
  },
  routeLabel: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    color: YL.ink3,
    marginBottom: 2,
  },
  routeName: {
    fontFamily: FONTS.display,
    fontSize: 15,
    color: YL.ink,
  },
  distanceText: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: YL.ink3,
    borderTopWidth: 1,
    borderTopColor: YL.lineSoft,
    paddingTop: 10,
  },
  navigateLink: {
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  navigateLinkText: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: YL.leaf,
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

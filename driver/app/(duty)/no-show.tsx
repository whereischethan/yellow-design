import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YL, FONTS } from '@/constants/theme';
import { useDuty } from '@/context/DutyContext';
import { callPhone, normalizePhone } from '@/lib/contact';

const WAIT_SECONDS = 300;
const OPS_WHATSAPP = '918628062808';

function formatCountdown(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function NoShowScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bookings, currentBooking, advanceTrip } = useDuty();

  const booking = bookings.find((b) => b.id === id) ?? currentBooking;
  const bookingId = booking?.id ?? id ?? '';

  const passengerPhone = booking?.guestPhone ?? '';

  const [secondsLeft, setSecondsLeft] = useState(WAIT_SECONDS);
  const [expired, setExpired] = useState(false);
  const [marking, setMarking] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const progress = secondsLeft / WAIT_SECONDS;

  // Cancellations are admin-only — the driver reports the no-show to ops,
  // who cancel the trip from the dashboard.
  function handleReportNoShow() {
    setMarking(true);
    const tripCode = (booking as any)?.tripCode ?? bookingId.slice(-6).toUpperCase();
    const msg = encodeURIComponent(`No-show report: rider not at pickup for trip ${tripCode} after 5 min wait. Please cancel.`);
    Linking.openURL(`https://wa.me/${OPS_WHATSAPP}?text=${msg}`).catch(() => {});
    advanceTrip();
    router.replace('/(duty)/roster');
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Alert header */}
      <View style={styles.alertBanner}>
        <Text style={styles.alertBannerText}>RIDER NOT AT PICKUP</Text>
      </View>

      <View style={styles.body}>
        {/* Timer card */}
        <View style={styles.timerCard}>
          <Text style={styles.timerDisplay}>{formatCountdown(secondsLeft)}</Text>
          <Text style={styles.timerSubtext}>Free wait time remaining</Text>
          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%` },
              ]}
            />
          </View>
        </View>

        {/* Contact row */}
        <View style={styles.contactRow}>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => (passengerPhone ? callPhone(passengerPhone) : undefined)}
          >
            <Text style={styles.contactButtonText}>📞 Call passenger</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() =>
              passengerPhone
                ? Linking.openURL(`sms:+${normalizePhone(passengerPhone)}`)
                : undefined
            }
          >
            <Text style={styles.contactButtonText}>💬 SMS passenger</Text>
          </TouchableOpacity>
        </View>

        {/* Policy note */}
        <View style={styles.policyNote}>
          <Text style={styles.policyText}>
            If the rider doesn't show within 5 minutes, report it to ops — they'll cancel the trip.
          </Text>
        </View>

        {/* Mark no-show (visible after expiry) */}
        {expired && (
          <TouchableOpacity
            style={styles.noShowButton}
            onPress={handleReportNoShow}
            disabled={marking}
          >
            <Text style={styles.noShowButtonText}>
              {marking ? 'Reporting…' : 'Report no-show to ops'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Rider arrived */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.arrivedButton}
          onPress={() => router.replace(`/(duty)/arrived?id=${bookingId}`)}
        >
          <Text style={styles.arrivedButtonText}>Rider arrived</Text>
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
  alertBanner: {
    backgroundColor: YL.gulmohar,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  alertBannerText: {
    fontFamily: FONTS.monoMedium,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  body: {
    flex: 1,
    padding: 20,
    gap: 14,
  },
  timerCard: {
    backgroundColor: YL.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: YL.line,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  timerDisplay: {
    fontFamily: FONTS.mono,
    fontSize: 56,
    color: YL.ink,
    letterSpacing: 2,
  },
  timerSubtext: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: YL.ink2,
    marginBottom: 12,
  },
  progressBg: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: YL.line,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: YL.gulmohar,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 10,
  },
  contactButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: YL.line,
    backgroundColor: YL.card,
  },
  contactButtonText: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: YL.ink2,
  },
  policyNote: {
    backgroundColor: YL.gulmoharSoft,
    borderRadius: 10,
    padding: 12,
  },
  policyText: {
    fontFamily: FONTS.display,
    fontSize: 13,
    color: YL.gulmohar,
    lineHeight: 19,
  },
  noShowButton: {
    backgroundColor: YL.ink,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  noShowButtonText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 16,
    color: YL.yellow,
  },
  bottomBar: {
    backgroundColor: YL.card,
    borderTopWidth: 1,
    borderTopColor: YL.line,
    padding: 16,
  },
  arrivedButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: YL.line,
  },
  arrivedButtonText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 15,
    color: YL.ink,
  },
});

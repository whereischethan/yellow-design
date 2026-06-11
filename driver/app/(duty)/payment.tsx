import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YL, FONTS } from '@/constants/theme';
import { useDuty } from '@/context/DutyContext';
import { createPaymentQr, getPaymentStatus, markPaid, getDriverBooking } from '@/lib/api';

type QrData = {
  image_url?: string;
  upi_string?: string;
  dev_mode?: boolean;
};

const UPI_APPS = ['GPay', 'PhonePe', 'Paytm', 'BHIM'];

export default function PaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bookings, currentBooking, refreshBooking } = useDuty();

  const booking = bookings.find((b) => b.id === id) ?? currentBooking;
  const bookingId = booking?.id ?? id ?? '';

  const totalPrice: number = (booking?.pricing as any)?.totalPrice ?? 0;
  const tripCode = bookingId.slice(-6).toUpperCase();

  const [qrData, setQrData] = useState<QrData | null>(null);
  const [loadingQr, setLoadingQr] = useState(true);
  const [paid, setPaid] = useState(false);
  const [handlingCash, setHandlingCash] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await createPaymentQr(bookingId);
        setQrData(data);
      } catch (_) {
        setQrData({ dev_mode: true, upi_string: `upi://pay?pa=yellow@upi&am=${totalPrice}&tn=${tripCode}` });
      } finally {
        setLoadingQr(false);
      }
    })();
  }, [bookingId]);

  useEffect(() => {
    if (paid) return;
    pollRef.current = setInterval(async () => {
      try {
        const status = await getPaymentStatus(bookingId);
        if (status?.paid) {
          setPaid(true);
          clearInterval(pollRef.current!);
          try {
            const updated = await getDriverBooking(bookingId);
            if (updated?.booking) refreshBooking(updated.booking);
          } catch (_) {}
          setTimeout(() => {
            router.replace(`/(duty)/review-request?id=${bookingId}`);
          }, 500);
        }
      } catch (_) {}
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [bookingId, paid]);

  async function handleCash() {
    setHandlingCash(true);
    try {
      await markPaid(bookingId, 'direct');
      try {
        const updated = await getDriverBooking(bookingId);
        if (updated?.booking) refreshBooking(updated.booking);
      } catch (_) {}
      router.replace(`/(duty)/review-request?id=${bookingId}`);
    } catch (_) {
      setHandlingCash(false);
    }
  }

  const showRealQr = !loadingQr && qrData?.image_url && !qrData?.dev_mode;
  const showMockQr = !loadingQr && (qrData?.dev_mode || (!qrData?.image_url && qrData !== null));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.headerTitle}>Collect Payment</Text>

        {/* Fare display */}
        <View style={styles.fareSection}>
          <Text style={styles.fareAmount}>
            ₹{totalPrice.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.tripCode}>{tripCode}</Text>
        </View>

        {/* QR card */}
        <View style={styles.qrCard}>
          <View style={styles.qrContainer}>
            {loadingQr && (
              <View style={styles.qrPlaceholder}>
                <ActivityIndicator size="large" color={YL.ink2} />
                <Text style={styles.qrLoadingText}>Generating QR…</Text>
              </View>
            )}

            {showRealQr && (
              <Image
                source={{ uri: qrData!.image_url }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            )}

            {showMockQr && (
              <View style={styles.mockQr}>
                <View style={styles.mockQrInner}>
                  <Text style={styles.mockQrLabel}>QR</Text>
                </View>
                <Text style={styles.mockQrTitle}>Scan via UPI app</Text>
                {qrData?.upi_string ? (
                  <Text style={styles.mockQrString} numberOfLines={2}>
                    {qrData.upi_string}
                  </Text>
                ) : null}
              </View>
            )}

            {/* Success overlay */}
            {paid && (
              <View style={styles.successOverlay}>
                <View style={styles.successCircle}>
                  <Text style={styles.successTick}>✓</Text>
                </View>
              </View>
            )}
          </View>

          {/* UPI app pills */}
          <View style={styles.upiRow}>
            {UPI_APPS.map((app) => (
              <View key={app} style={styles.upiPill}>
                <Text style={styles.upiPillText}>{app}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Cash button */}
        <TouchableOpacity
          style={styles.cashButton}
          onPress={handleCash}
          disabled={handlingCash || paid}
        >
          <Text style={styles.cashButtonText}>
            {handlingCash ? 'Processing…' : 'Accept direct payment'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
    gap: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 22,
    color: YL.ink,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  fareSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  fareAmount: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 48,
    color: YL.ink,
  },
  tripCode: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: YL.ink3,
    marginTop: 4,
  },
  qrCard: {
    backgroundColor: YL.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: YL.line,
    padding: 20,
    alignItems: 'center',
    width: '100%',
  },
  qrContainer: {
    width: 220,
    height: 220,
    marginBottom: 16,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrPlaceholder: {
    alignItems: 'center',
    gap: 12,
  },
  qrLoadingText: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: YL.ink3,
  },
  qrImage: {
    width: 220,
    height: 220,
    borderRadius: 8,
  },
  mockQr: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  mockQrInner: {
    width: 160,
    height: 160,
    borderWidth: 2,
    borderColor: YL.line,
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: YL.bg2,
  },
  mockQrLabel: {
    fontFamily: FONTS.mono,
    fontSize: 28,
    color: YL.ink3,
  },
  mockQrTitle: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: YL.ink2,
  },
  mockQrString: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: YL.ink3,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(246,243,235,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: YL.leafSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTick: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 36,
    color: YL.leaf,
  },
  upiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  upiPill: {
    backgroundColor: YL.bg2,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  upiPillText: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: YL.ink2,
  },
  cashButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: YL.line,
    alignItems: 'center',
    width: '100%',
  },
  cashButtonText: {
    fontFamily: FONTS.display,
    fontSize: 15,
    color: YL.ink2,
  },
});

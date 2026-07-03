import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { YL, FONTS } from '@/constants/theme';
import { useDuty } from '@/context/DutyContext';
import { createPaymentQr, markPaid, getDriverBooking, updateBookingStatus } from '@/lib/api';

type QrData = {
  upi_string: string;
  vpa: string;
  amount: number;
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
  const tripCode = booking?.tripCode ?? bookingId.slice(-6).toUpperCase();

  const [qrData, setQrData] = useState<QrData | null>(null);
  const [loadingQr, setLoadingQr] = useState(true);
  const [qrError, setQrError] = useState('');
  const [paid, setPaid] = useState(false);
  const [confirming, setConfirming] = useState<'upi' | 'cash' | null>(null);
  const [confirmError, setConfirmError] = useState('');

  async function loadQr() {
    setLoadingQr(true);
    setQrError('');
    try {
      const data = await createPaymentQr(bookingId);
      if (data?.upi_string) setQrData(data);
      else setQrError('Could not generate QR code');
    } catch (e: any) {
      setQrError(e?.message || 'Could not generate QR code');
    } finally {
      setLoadingQr(false);
    }
  }

  useEffect(() => { loadQr(); }, [bookingId]);

  // Driver confirms the money landed (UPI notification on their phone, or cash
  // in hand). Ops later verifies these against the bank statement in Finance.
  async function handleConfirm(method: 'upi' | 'cash') {
    if (confirming || paid) return;
    setConfirming(method);
    setConfirmError('');
    try {
      await markPaid(bookingId, method);
      await updateBookingStatus(bookingId, 'completed');
      setPaid(true);
      try {
        const updated = await getDriverBooking(bookingId);
        if (updated?.booking) refreshBooking(updated.booking);
      } catch {}
      setTimeout(() => {
        router.replace(`/(duty)/review-request?id=${bookingId}`);
      }, 500);
    } catch (e: any) {
      setConfirmError(e?.message || 'Could not confirm payment — check your connection and retry.');
      setConfirming(null);
    }
  }

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

            {!loadingQr && !!qrError && (
              <View style={styles.qrPlaceholder}>
                <Text style={[styles.qrLoadingText, { color: '#DC2626', marginBottom: 12, textAlign: 'center' }]}>
                  {qrError}
                </Text>
                <TouchableOpacity onPress={loadQr} style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: YL.ink, borderRadius: 10 }}>
                  <Text style={{ fontFamily: FONTS.mono, fontSize: 13, color: YL.bg }}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {!loadingQr && !qrError && qrData && (
              <QRCode value={qrData.upi_string} size={220} backgroundColor="transparent" />
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

          {qrData?.vpa ? <Text style={styles.vpaText}>{qrData.vpa}</Text> : null}

          {/* UPI app pills */}
          <View style={styles.upiRow}>
            {UPI_APPS.map((app) => (
              <View key={app} style={styles.upiPill}>
                <Text style={styles.upiPillText}>{app}</Text>
              </View>
            ))}
          </View>
        </View>

        {confirmError ? (
          <Text style={styles.errorText}>{confirmError}</Text>
        ) : null}

        {/* Confirm buttons */}
        <TouchableOpacity
          style={styles.upiButton}
          onPress={() => handleConfirm('upi')}
          disabled={!!confirming || paid}
        >
          <Text style={styles.upiButtonText}>
            {confirming === 'upi' ? 'Confirming…' : 'UPI payment received ✓'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cashButton}
          onPress={() => handleConfirm('cash')}
          disabled={!!confirming || paid}
        >
          <Text style={styles.cashButtonText}>
            {confirming === 'cash' ? 'Confirming…' : 'Collected cash'}
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
  vpaText: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: YL.ink2,
    marginBottom: 10,
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
  errorText: {
    fontFamily: FONTS.display,
    fontSize: 13,
    color: '#DC2626',
    textAlign: 'center',
  },
  upiButton: {
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: YL.ink,
    alignItems: 'center',
    width: '100%',
  },
  upiButtonText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 15,
    color: YL.yellow,
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

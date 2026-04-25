import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, Linking, Modal, Platform,
  Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { YL } from "../../constants/theme";
import {
  Booking, buildWhatsAppUrl, createPaymentOrder, getAuthToken,
  getBookings, getPaymentConfig, openWhatsAppUrl, rateBooking, verifyPayment,
} from "../../lib/api";

// Razorpay web types
declare global {
  interface Window {
    Razorpay: new (opts: any) => { open(): void; close(): void };
  }
}

type TripStatus = "Upcoming" | "Completed" | "Cancelled" | "Expired";

function getStatus(b: Booking): TripStatus {
  if ((b.status as string) === "expired") return "Expired";
  if (b.status === "cancelled") return "Cancelled";
  if (b.status === "completed") return "Completed";
  return "Upcoming";
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(s: string) {
  return new Date(s).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

const STATUS_COLOR: Record<TripStatus, string> = {
  Upcoming: YL.leaf,
  Completed: YL.ink2,
  Cancelled: "#EF4444",
  Expired: YL.ink3,
};

const SUPPORT_WA = "+918628062808";

export default function MyTripsScreen() {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rating modal
  const [ratingBookingId, setRatingBookingId] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  // Payment retry
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    if (!getAuthToken()) { setLoading(false); setBookings([]); return; }
    try {
      setError(null);
      const data = await getBookings();
      setBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trips");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) fetchTrips();
  }, [fetchTrips, authLoading]);

  // Auto-refresh when active trips exist
  useEffect(() => {
    const hasActive = bookings.some(b => ["confirmed", "assigned", "arrived", "in_progress"].includes(b.status));
    if (!hasActive || !isLoggedIn) return;
    const t = setInterval(fetchTrips, 30000);
    return () => clearInterval(t);
  }, [bookings, isLoggedIn, fetchTrips]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchTrips(); }, [fetchTrips]);

  // Razorpay payment retry
  async function handlePayment(booking: Booking) {
    if (!booking.pendingAmount) return;
    setPayingBookingId(booking.id);
    try {
      const config = await getPaymentConfig();
      if (!config.onlinePaymentAvailable || !config.razorpayKeyId) {
        const url = buildWhatsAppUrl(SUPPORT_WA, `Hi, I need to complete payment for booking ${booking.tripCode || booking.id}`);
        await openWhatsAppUrl(url);
        return;
      }
      const order = await createPaymentOrder(booking.id, booking.pendingAmount);
      await openRazorpay(config.razorpayKeyId, order, booking);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Error", msg);
    } finally {
      setPayingBookingId(null);
    }
  }

  function openRazorpay(key: string, order: any, booking: Booking) {
    return new Promise<void>((resolve, reject) => {
      if (Platform.OS === "web") {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => {
          const rz = new window.Razorpay({
            key, amount: order.amount, currency: order.currency,
            name: "Yellow", description: "Airport Transfer", order_id: order.id,
            handler: async (response: any) => {
              try {
                await verifyPayment(response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature, booking.id);
                await fetchTrips();
                resolve();
              } catch (e) { reject(e); }
            },
            theme: { color: YL.yellow },
            modal: { ondismiss: resolve },
          });
          rz.open();
        };
        document.head.appendChild(script);
      } else {
        resolve();
      }
    });
  }

  // Rating submit
  async function submitRating() {
    if (!ratingBookingId) return;
    setSubmittingRating(true);
    try {
      await rateBooking(ratingBookingId, selectedRating, ratingComment.trim() || undefined);
      setRatingBookingId(null);
      setRatingComment("");
      setSelectedRating(5);
      await fetchTrips();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit rating";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Error", msg);
    } finally {
      setSubmittingRating(false);
    }
  }

  const upcoming = bookings.filter(b => getStatus(b) === "Upcoming");
  const past = bookings.filter(b => getStatus(b) !== "Upcoming");

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.push("/(app)/home")}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View>
          <Text style={styles.title}>My trips</Text>
          <Text style={styles.titleKn}>ನನ್ನ ಪ್ರಯಾಣಗಳು</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {authLoading || loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={YL.yellow} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={fetchTrips}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🚗</Text>
          <Text style={styles.emptyTitle}>No trips yet</Text>
          <Text style={styles.emptyDesc}>Your booked rides will appear here.</Text>
          <Pressable style={styles.ctaBtn} onPress={() => router.push("/(app)/home")}>
            <Text style={styles.ctaBtnText}>Book a ride</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 48 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={YL.yellow} />}
          showsVerticalScrollIndicator={false}
        >
          {upcoming.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>UPCOMING · ಮುಂಬರುವ</Text>
              {upcoming.map(b => <TripCard key={b.id} booking={b} onPay={() => handlePayment(b)} onRate={() => { setRatingBookingId(b.id); setSelectedRating(5); }} paying={payingBookingId === b.id} />)}
            </View>
          )}
          {past.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>PAST · ಹಿಂದಿನ</Text>
              {past.map(b => <TripCard key={b.id} booking={b} onPay={() => handlePayment(b)} onRate={() => { setRatingBookingId(b.id); setSelectedRating(5); }} paying={payingBookingId === b.id} />)}
            </View>
          )}
        </ScrollView>
      )}

      {/* Rating modal */}
      <Modal visible={!!ratingBookingId} transparent animationType="slide" onRequestClose={() => setRatingBookingId(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setRatingBookingId(null)}>
          <View style={styles.ratingSheet}>
            <Text style={styles.ratingTitle}>How was your ride?</Text>
            <Text style={styles.ratingKn}>ಪ್ರಯಾಣ ಹೇಗಿತ್ತು?</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(s => (
                <Pressable key={s} onPress={() => setSelectedRating(s)}>
                  <Text style={[styles.star, s <= selectedRating && styles.starActive]}>★</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.commentInput}
              placeholder="Any comments? (optional)"
              placeholderTextColor={YL.ink3}
              value={ratingComment}
              onChangeText={setRatingComment}
              multiline
              numberOfLines={3}
            />
            <Pressable style={styles.ctaBtn} onPress={submitRating} disabled={submittingRating}>
              {submittingRating
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.ctaBtnText}>Submit rating</Text>
              }
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function TripCard({ booking, onPay, onRate, paying }: { booking: Booking; onPay(): void; onRate(): void; paying: boolean }) {
  const status = getStatus(booking);
  const isCompleted = status === "Completed";
  const needsPayment = booking.pendingAmount && booking.pendingAmount > 0 && !["completed", "cancelled", "expired"].includes(booking.status);
  const canRate = isCompleted && !booking.rating;

  const rideType = (booking as any).rideType || booking.tripType || "airport";
  const rideLabel = rideType === "outstation" ? "Outstation" : rideType === "hourly" ? "Hourly" : "Airport";

  return (
    <View style={styles.card}>
      {/* Top row */}
      <View style={styles.cardTop}>
        <View style={styles.tripCodeWrap}>
          <Text style={styles.tripCode}>{booking.tripCode || booking.id.slice(-8).toUpperCase()}</Text>
          <Text style={styles.rideTypeLabel}>{rideLabel}</Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: STATUS_COLOR[status] + "18" }]}>
          <Text style={[styles.statusText, { color: STATUS_COLOR[status] }]}>{status}</Text>
        </View>
      </View>

      {/* Route */}
      <View style={styles.route}>
        <Text style={styles.routeFrom} numberOfLines={1}>{booking.pickup.location}</Text>
        <Text style={styles.routeArrow}>→</Text>
        <Text style={styles.routeTo} numberOfLines={1}>{booking.drop.location}</Text>
      </View>

      {/* Meta */}
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{fmtDate(booking.pickup.dateTime)} · {fmtTime(booking.pickup.dateTime)}</Text>
        {!booking.hidePrice && booking.pricing && (
          <Text style={styles.metaPrice}>₹{booking.pricing.totalPrice.toLocaleString("en-IN")}</Text>
        )}
      </View>

      {/* Driver */}
      {booking.assignedDriver && (
        <View style={styles.driverRow}>
          <Text style={styles.driverText}>
            Partner: {booking.assignedDriver.name} · {booking.assignedVehicle?.licensePlate || ""}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.cardActions}>
        {needsPayment && (
          <Pressable style={styles.payBtn} onPress={onPay} disabled={paying}>
            {paying ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.payBtnText}>Pay ₹{booking.pendingAmount}</Text>}
          </Pressable>
        )}
        {canRate && (
          <Pressable style={styles.rateBtn} onPress={onRate}>
            <Text style={styles.rateBtnText}>Rate ride ★</Text>
          </Pressable>
        )}
        {booking.rating && (
          <Text style={styles.ratedText}>{"★".repeat(booking.rating.rating)} Rated</Text>
        )}
        <Pressable
          style={styles.supportBtn}
          onPress={() => openWhatsAppUrl(buildWhatsAppUrl(SUPPORT_WA, `Hi, I need help with booking ${booking.tripCode || booking.id}`))}
        >
          <Text style={styles.supportBtnText}>Support</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: YL.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: YL.bg2, justifyContent: "center", alignItems: "center" },
  backIcon: { fontSize: 24, color: YL.ink, marginTop: -2 },
  title: { fontSize: 20, fontWeight: "700", color: YL.ink, letterSpacing: -0.5 },
  titleKn: { fontSize: 12, color: YL.ink3, marginTop: 1 },

  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32, gap: 12 },
  errorText: { fontSize: 14, color: "#EF4444", textAlign: "center" },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: YL.bg2, borderRadius: 12 },
  retryText: { fontSize: 14, fontWeight: "600", color: YL.ink },
  emptyEmoji: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: "600", color: YL.ink, letterSpacing: -0.4 },
  emptyDesc: { fontSize: 14, color: YL.ink2, textAlign: "center" },

  section: { paddingHorizontal: 20, paddingTop: 20 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: YL.ink3, letterSpacing: 0.5, marginBottom: 12 },

  card: {
    backgroundColor: YL.card, borderRadius: 18,
    borderWidth: 1, borderColor: YL.line,
    padding: 16, marginBottom: 12,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  tripCodeWrap: { gap: 2 },
  tripCode: { fontSize: 13, fontWeight: "700", color: YL.ink, fontVariant: ["tabular-nums"], letterSpacing: 0.3 },
  rideTypeLabel: { fontSize: 11, color: YL.ink3, fontWeight: "500" },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  statusText: { fontSize: 12, fontWeight: "600" },

  route: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  routeFrom: { flex: 1, fontSize: 13.5, fontWeight: "500", color: YL.ink },
  routeArrow: { fontSize: 13, color: YL.ink3 },
  routeTo: { flex: 1, fontSize: 13.5, fontWeight: "500", color: YL.ink, textAlign: "right" },

  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  metaText: { fontSize: 12.5, color: YL.ink2 },
  metaPrice: { fontSize: 14, fontWeight: "700", color: YL.ink },

  driverRow: { backgroundColor: YL.bg2, borderRadius: 10, padding: 8, marginBottom: 8 },
  driverText: { fontSize: 12.5, color: YL.ink2 },

  cardActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  payBtn: { backgroundColor: YL.ink, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 7 },
  payBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  rateBtn: { backgroundColor: YL.yellow, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 7 },
  rateBtnText: { color: YL.ink, fontSize: 13, fontWeight: "600" },
  ratedText: { fontSize: 13, color: YL.leaf, fontWeight: "600", paddingVertical: 7 },
  supportBtn: { borderWidth: 1, borderColor: YL.line, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 7 },
  supportBtnText: { fontSize: 13, color: YL.ink2, fontWeight: "500" },

  ctaBtn: { backgroundColor: YL.ink, borderRadius: 16, height: 52, justifyContent: "center", alignItems: "center", paddingHorizontal: 32, marginTop: 4 },
  ctaBtnText: { color: "#fff", fontSize: 15, fontWeight: "600", letterSpacing: -0.2 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  ratingSheet: { backgroundColor: YL.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 12 },
  ratingTitle: { fontSize: 22, fontWeight: "600", color: YL.ink, letterSpacing: -0.5 },
  ratingKn: { fontSize: 13, color: YL.ink3, marginTop: -6 },
  starsRow: { flexDirection: "row", gap: 8 },
  star: { fontSize: 36, color: YL.line },
  starActive: { color: YL.yellow },
  commentInput: {
    borderWidth: 1.5, borderColor: YL.line, borderRadius: 14,
    padding: 14, fontSize: 14.5, color: YL.ink, minHeight: 80,
    textAlignVertical: "top",
  },
});

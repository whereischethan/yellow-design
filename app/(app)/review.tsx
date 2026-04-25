import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { YL } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import {
  createBooking,
  createPaymentOrder,
  getPaymentConfig,
  setAuthToken,
  verifyPayment,
} from "../../lib/api";

function rideLabel(b: any) {
  if (b.rideType === "airport") return b.tripType === "pickup" ? "Airport Pickup" : "Airport Drop";
  if (b.rideType === "outstation") return b.tripVariant === "round_trip" ? "Outstation · Round Trip" : "Outstation · One Way";
  if (b.rideType === "hourly") return `Hourly · ${b.hours}h`;
  return "Ride";
}

function routeFrom(b: any) {
  if (b.rideType === "airport" && b.tripType === "pickup") return "BLR Airport";
  return b.origin || "Pickup";
}

function routeTo(b: any) {
  if (b.rideType === "airport" && b.tripType === "drop") return "BLR Airport";
  if (b.rideType === "hourly") return `${b.hours}h from pickup`;
  return b.destination || "Destination";
}

function vehicleLabel(key: string) {
  return key === "yellowSky" ? "Yellow Sky" : "Yellow";
}

function vehicleSub(key: string) {
  if (key === "yellowSky") return "Kia Carens Clavis EV · Panoramic Sunroof";
  return "Kia Carens Clavis EV";
}

export default function ReviewScreen() {
  const params = useLocalSearchParams<{ booking: string }>();
  const { user, isTestUser, logout } = useAuth();
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [razorpayKeyId, setRazorpayKeyId] = useState<string | null>(null);

  // Guest booking
  const [isGuest, setIsGuest] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  let booking: any = {};
  try {
    booking = JSON.parse(params.booking || "{}");
  } catch {}

  const vehicle = booking.vehicle || "yellow";
  const vp = booking.vehiclePricing || booking.pricing?.vehicleOptions?.[vehicle] || {};
  const totalPrice = vp.totalPrice ?? booking.pricing?.totalPrice ?? 0;
  const distanceKm = booking.pricing?.distanceKm ?? 0;

  useEffect(() => {
    if (Platform.OS === "web" && !isTestUser) {
      getPaymentConfig()
        .then((config) => {
          if (config.onlinePaymentAvailable && config.razorpayKeyId) {
            setRazorpayKeyId(config.razorpayKeyId);
            const s = document.createElement("script");
            s.src = "https://checkout.razorpay.com/v1/checkout.js";
            s.async = true;
            document.body.appendChild(s);
          }
        })
        .catch(() => {});
    }
  }, [isTestUser]);

  async function handleConfirm() {
    if (isBooking) return;
    setIsBooking(true);
    setBookingError(null);

    try {
      const bookingRequest: any = {
        rideType: booking.rideType,
        tripType: booking.tripType,
        tripVariant: booking.tripVariant,
        hours: booking.hours,
        vehicleType: vehicle,
        pickup: {
          location: booking.origin,
          placeId: booking.originPlaceId,
          dateTime: booking.startDate || booking.pickupDateTime || new Date().toISOString(),
          terminal: booking.terminal,
        },
        drop: {
          location: booking.destination || booking.origin,
          placeId: booking.destinationPlaceId || booking.originPlaceId,
          dateTime: booking.startDate || booking.pickupDateTime || new Date().toISOString(),
        },
        passengers: booking.passengers || 1,
        luggage: booking.bags || 0,
        flight: booking.flight,
        stops: booking.stops,
        pricing: {
          distanceKm,
          basePrice: vp.basePrice ?? totalPrice,
          extraKmCharge: vp.extraKmCharge ?? 0,
          totalPrice,
        },
        ...(isGuest ? { guestName, guestPhone: `+91${guestPhone}` } : {}),
      };

      const created = await createBooking(bookingRequest);
      const bookingId = created.id;
      const tripCode = created.tripCode || created.id.slice(-8).toUpperCase();

      if (isTestUser) {
        router.replace({
          pathname: "/(app)/confirmed",
          params: { bookingId, tripCode, booking: params.booking },
        });
        return;
      }

      // Razorpay payment
      if (Platform.OS === "web") {
        let keyId = razorpayKeyId;
        if (!keyId) {
          const config = await getPaymentConfig();
          if (config.onlinePaymentAvailable && config.razorpayKeyId) {
            keyId = config.razorpayKeyId;
            setRazorpayKeyId(keyId);
          } else {
            setBookingError("Online payment is not available right now.");
            setIsBooking(false);
            return;
          }
        }
        if (typeof window !== "undefined" && !window.Razorpay) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://checkout.razorpay.com/v1/checkout.js";
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("Failed to load payment gateway"));
            document.head.appendChild(s);
          });
        }

        const order = await createPaymentOrder(bookingId, totalPrice);
        const razorpay = new window.Razorpay({
          key: keyId,
          amount: order.amount,
          currency: order.currency,
          name: "Yellow",
          description: `Trip ${tripCode}`,
          order_id: order.id,
          handler: async (response: any) => {
            try {
              await verifyPayment(
                response.razorpay_order_id,
                response.razorpay_payment_id,
                response.razorpay_signature,
                bookingId
              );
              router.replace({
                pathname: "/(app)/confirmed",
                params: { bookingId, tripCode, booking: params.booking },
              });
            } catch {
              setBookingError("Payment verification failed. Please contact support.");
              setIsBooking(false);
            }
          },
          prefill: {
            contact: isGuest ? `+91${guestPhone}` : user?.phone || "",
            name: isGuest ? guestName : user?.name || "",
          },
          theme: { color: YL.yellow },
          modal: {
            ondismiss: () => {
              setBookingError("Payment was cancelled. Your booking is saved — tap to retry.");
              setIsBooking(false);
            },
          },
        });
        razorpay.open();
        return;
      } else {
        setBookingError("Online payment is only available in the browser. Please open ridewithyellow.com.");
        setIsBooking(false);
      }
    } catch (err: any) {
      if (
        err?.message?.includes("Session expired") ||
        err?.message?.includes("User not found") ||
        err?.message?.includes("Not authenticated")
      ) {
        setAuthToken(null);
        logout();
        setBookingError("Session expired. Please login again.");
      } else {
        setBookingError(err?.message || "Something went wrong. Please try again.");
      }
      setIsBooking(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View>
          <Text style={styles.title}>Review Booking</Text>
          <Text style={styles.titleKn}>ಬುಕಿಂಗ್ ವಿವರ</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Ride type strip */}
        <View style={styles.rideStrip}>
          <Text style={styles.rideStripLabel}>{rideLabel(booking)}</Text>
          {distanceKm > 0 && (
            <View style={styles.distChip}>
              <Text style={styles.distText}>{distanceKm} km</Text>
            </View>
          )}
        </View>

        {/* Route */}
        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <View style={styles.routeDots}>
              <View style={styles.dotOrigin} />
              <View style={styles.routeLine} />
              <View style={styles.dotDest} />
            </View>
            <View style={styles.routeTexts}>
              <View style={styles.routeStop}>
                <Text style={styles.routeStopLabel}>FROM</Text>
                <Text style={styles.routeStopText} numberOfLines={2}>{routeFrom(booking)}</Text>
              </View>
              <View style={styles.routeDivider} />
              <View style={styles.routeStop}>
                <Text style={styles.routeStopLabel}>TO</Text>
                <Text style={styles.routeStopText} numberOfLines={2}>{routeTo(booking)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Trip details */}
        <View style={styles.detailCard}>
          {booking.startDate && (
            <DetailRow
              label="Date & Time"
              value={new Date(booking.startDate).toLocaleString("en-IN", {
                day: "2-digit", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit", hour12: true,
              })}
            />
          )}
          {booking.pickupDateTime && !booking.startDate && (
            <DetailRow
              label="Date & Time"
              value={new Date(booking.pickupDateTime).toLocaleString("en-IN", {
                day: "2-digit", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit", hour12: true,
              })}
            />
          )}
          <DetailRow label="Passengers" value={String(booking.passengers || 1)} />
          {(booking.bags ?? 0) > 0 && (
            <DetailRow label="Bags" value={String(booking.bags)} />
          )}
          {booking.flight?.flightNumber && (
            <DetailRow label="Flight" value={booking.flight.flightNumber} />
          )}
        </View>

        {/* Vehicle */}
        <View style={styles.vehicleCard}>
          <View style={styles.vehicleRow}>
            <View style={styles.vehicleCarBox}>
              <Text style={styles.vehicleCarEmoji}>🚗</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vehicleName}>{vehicleLabel(vehicle)}</Text>
              <Text style={styles.vehicleSub}>{vehicleSub(vehicle)}</Text>
            </View>
          </View>
        </View>

        {/* Pricing breakdown */}
        <View style={styles.pricingCard}>
          <Text style={styles.pricingTitle}>Fare Breakdown</Text>
          {vp.basePrice != null && vp.basePrice !== totalPrice && (
            <PricingRow label="Base fare" value={`₹${vp.basePrice.toLocaleString("en-IN")}`} />
          )}
          {(vp.extraKmCharge ?? 0) > 0 && (
            <PricingRow label="Extra km charge" value={`₹${vp.extraKmCharge.toLocaleString("en-IN")}`} />
          )}
          {booking.rideType === "hourly" && (
            <PricingRow label={`${booking.hours}h × ₹499 + GST`} value={`₹${totalPrice.toLocaleString("en-IN")}`} />
          )}
          <View style={styles.pricingDivider} />
          <View style={styles.pricingTotalRow}>
            <Text style={styles.pricingTotalLabel}>Total</Text>
            <Text style={styles.pricingTotalValue}>₹{totalPrice.toLocaleString("en-IN")}</Text>
          </View>
          <Text style={styles.pricingNote}>Tolls & GST included · Driver allowance included</Text>
        </View>

        {/* Guest booking toggle */}
        <Pressable
          style={styles.guestToggle}
          onPress={() => setIsGuest((v) => !v)}
        >
          <View style={[styles.checkbox, isGuest && styles.checkboxChecked]}>
            {isGuest && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.guestLabel}>Booking for someone else?</Text>
            <Text style={styles.guestSub}>Enter their name & number for driver coordination</Text>
          </View>
        </Pressable>

        {isGuest && (
          <View style={styles.guestFields}>
            <TextInput
              style={styles.guestInput}
              placeholder="Passenger name"
              placeholderTextColor={YL.ink3}
              value={guestName}
              onChangeText={setGuestName}
              autoCapitalize="words"
            />
            <View style={styles.phoneRow}>
              <View style={styles.phonePrefix}>
                <Text style={styles.phonePrefixText}>🇮🇳 +91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="10-digit mobile"
                placeholderTextColor={YL.ink3}
                value={guestPhone}
                onChangeText={setGuestPhone}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          </View>
        )}

        {bookingError && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{bookingError}</Text>
          </View>
        )}

        <Pressable
          style={[styles.cta, isBooking && styles.ctaLoading]}
          onPress={handleConfirm}
          disabled={isBooking}
        >
          {isBooking ? (
            <ActivityIndicator color={YL.yellow} />
          ) : (
            <Text style={styles.ctaText}>Pay ₹{totalPrice.toLocaleString("en-IN")} →</Text>
          )}
        </Pressable>

        <Text style={styles.secureNote}>🔒 Secured by Razorpay · 100% prepaid</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function PricingRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.pricingRow}>
      <Text style={styles.pricingLabel}>{label}</Text>
      <Text style={styles.pricingValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: YL.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12,
  },
  back: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  backText: { fontSize: 22, color: YL.ink },
  title: { fontSize: 20, fontWeight: "600", color: YL.ink, textAlign: "center" },
  titleKn: { fontSize: 11, color: YL.ink3, textAlign: "center" },

  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },

  rideStrip: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: YL.yellow, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  rideStripLabel: { fontSize: 13, fontWeight: "700", color: YL.ink, letterSpacing: 0.2 },
  distChip: { backgroundColor: YL.ink, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 3 },
  distText: { fontSize: 11, fontWeight: "600", color: YL.yellow },

  routeCard: {
    backgroundColor: YL.card, borderRadius: 16, borderWidth: 1, borderColor: YL.line, padding: 16,
  },
  routeRow: { flexDirection: "row", gap: 12 },
  routeDots: { width: 16, alignItems: "center", paddingTop: 4 },
  dotOrigin: { width: 10, height: 10, borderRadius: 5, backgroundColor: YL.ink },
  routeLine: { flex: 1, width: 1.5, backgroundColor: YL.line, marginVertical: 4 },
  dotDest: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: YL.ink },
  routeTexts: { flex: 1, gap: 0 },
  routeStop: { paddingVertical: 4 },
  routeStopLabel: { fontSize: 10, fontWeight: "600", color: YL.ink3, letterSpacing: 0.5, textTransform: "uppercase" },
  routeStopText: { fontSize: 14, fontWeight: "500", color: YL.ink, lineHeight: 20 },
  routeDivider: { height: 16 },

  detailCard: {
    backgroundColor: YL.card, borderRadius: 16, borderWidth: 1, borderColor: YL.line, overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: YL.line,
  },
  detailLabel: { fontSize: 13, color: YL.ink2 },
  detailValue: { fontSize: 13, fontWeight: "500", color: YL.ink, textAlign: "right", flex: 1, marginLeft: 16 },

  vehicleCard: {
    backgroundColor: YL.card, borderRadius: 16, borderWidth: 1, borderColor: YL.line, padding: 14,
  },
  vehicleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  vehicleCarBox: {
    width: 56, height: 56, borderRadius: 12, backgroundColor: YL.bg2,
    justifyContent: "center", alignItems: "center",
  },
  vehicleCarEmoji: { fontSize: 30 },
  vehicleName: { fontSize: 16, fontWeight: "600", color: YL.ink },
  vehicleSub: { fontSize: 12, color: YL.ink2, marginTop: 2 },

  pricingCard: {
    backgroundColor: YL.card, borderRadius: 16, borderWidth: 1, borderColor: YL.line, padding: 14, gap: 8,
  },
  pricingTitle: { fontSize: 12, fontWeight: "600", color: YL.ink3, textTransform: "uppercase", letterSpacing: 0.5 },
  pricingRow: { flexDirection: "row", justifyContent: "space-between" },
  pricingLabel: { fontSize: 13, color: YL.ink2 },
  pricingValue: { fontSize: 13, color: YL.ink },
  pricingDivider: { height: 1, backgroundColor: YL.line },
  pricingTotalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pricingTotalLabel: { fontSize: 15, fontWeight: "600", color: YL.ink },
  pricingTotalValue: { fontSize: 20, fontWeight: "700", color: YL.ink },
  pricingNote: { fontSize: 11, color: YL.ink3, lineHeight: 16 },

  guestToggle: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: YL.card, borderRadius: 14, borderWidth: 1, borderColor: YL.line, padding: 14,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: YL.line,
    justifyContent: "center", alignItems: "center", marginTop: 1,
  },
  checkboxChecked: { backgroundColor: YL.ink, borderColor: YL.ink },
  checkmark: { fontSize: 12, color: YL.yellow, fontWeight: "700" },
  guestLabel: { fontSize: 14, fontWeight: "500", color: YL.ink },
  guestSub: { fontSize: 12, color: YL.ink3, marginTop: 2 },

  guestFields: { gap: 10 },
  guestInput: {
    backgroundColor: YL.card, borderRadius: 14, borderWidth: 1, borderColor: YL.line,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: YL.ink,
  },
  phoneRow: { flexDirection: "row", gap: 8 },
  phonePrefix: {
    backgroundColor: YL.card, borderRadius: 14, borderWidth: 1, borderColor: YL.line,
    paddingHorizontal: 12, justifyContent: "center",
  },
  phonePrefixText: { fontSize: 14, color: YL.ink, fontWeight: "500" },
  phoneInput: {
    flex: 1, backgroundColor: YL.card, borderRadius: 14, borderWidth: 1, borderColor: YL.line,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: YL.ink,
  },

  errorCard: {
    backgroundColor: "#FEE2E2", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#FECACA",
  },
  errorText: { fontSize: 13, color: "#B91C1C", lineHeight: 18 },

  cta: {
    backgroundColor: YL.ink, borderRadius: 16, paddingVertical: 16,
    alignItems: "center", justifyContent: "center",
  },
  ctaLoading: { opacity: 0.7 },
  ctaText: { fontSize: 16, fontWeight: "600", color: YL.yellow },
  secureNote: { textAlign: "center", fontSize: 12, color: YL.ink3 },
});

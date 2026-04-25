import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { YL } from "../../constants/theme";

function rideLabel(b: any) {
  if (!b?.rideType) return "Ride";
  if (b.rideType === "airport") return b.tripType === "pickup" ? "Airport Pickup" : "Airport Drop";
  if (b.rideType === "outstation") return b.tripVariant === "round_trip" ? "Outstation · Round Trip" : "Outstation · One Way";
  if (b.rideType === "hourly") return `Hourly · ${b.hours}h`;
  return "Ride";
}

function routeFrom(b: any) {
  if (!b) return "";
  if (b.rideType === "airport" && b.tripType === "pickup") return "BLR Airport";
  return b.origin || "Pickup";
}

function routeTo(b: any) {
  if (!b) return "";
  if (b.rideType === "airport" && b.tripType === "drop") return "BLR Airport";
  if (b.rideType === "hourly") return `${b.hours}h from pickup`;
  return b.destination || "Destination";
}

function vehicleLabel(key: string) {
  return key === "yellowSky" ? "Yellow Sky" : "Yellow";
}

export default function ConfirmedScreen() {
  const params = useLocalSearchParams<{ bookingId: string; tripCode: string; booking: string }>();
  const bookingId = params.bookingId || "";
  const tripCode = params.tripCode || bookingId.slice(-8).toUpperCase();

  let booking: any = null;
  try {
    booking = JSON.parse(params.booking || "{}");
  } catch {}

  const totalPrice = booking?.vehiclePricing?.totalPrice ?? booking?.pricing?.totalPrice ?? 0;
  const vehicle = booking?.vehicle || "yellow";

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Success mark */}
        <View style={styles.successRing}>
          <View style={styles.successCircle}>
            <Text style={styles.successCheck}>✓</Text>
          </View>
        </View>

        <Text style={styles.headline}>Booking Confirmed!</Text>
        <Text style={styles.headlineKn}>ಬುಕಿಂಗ್ ಖಚಿತವಾಗಿದೆ</Text>

        {/* Booking reference card */}
        <View style={styles.refCard}>
          <Text style={styles.refLabel}>BOOKING REFERENCE</Text>
          <Text style={styles.refCode}>{tripCode}</Text>
          <Text style={styles.refSub}>
            Save this number · You&apos;ll receive SMS confirmation
          </Text>
        </View>

        {/* Ride summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryType}>{rideLabel(booking)}</Text>
            {totalPrice > 0 && (
              <View style={styles.paidChip}>
                <Text style={styles.paidText}>PAID ₹{totalPrice.toLocaleString("en-IN")}</Text>
              </View>
            )}
          </View>

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
              <View style={{ height: 12 }} />
              <View style={styles.routeStop}>
                <Text style={styles.routeStopLabel}>TO</Text>
                <Text style={styles.routeStopText} numberOfLines={2}>{routeTo(booking)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.vehicleRow}>
            <Text style={styles.vehicleEmoji}>🚗</Text>
            <Text style={styles.vehicleName}>{vehicleLabel(vehicle)}</Text>
            <Text style={styles.vehicleSub}>· Kia Carens Clavis EV</Text>
          </View>
        </View>

        {/* What happens next */}
        <View style={styles.nextCard}>
          <Text style={styles.nextTitle}>What happens next</Text>
          <View style={styles.nextItem}>
            <View style={styles.nextDot}><Text style={styles.nextDotText}>1</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nextLabel}>Partner assigned 60 min before pickup</Text>
              <Text style={styles.nextSub}>You&apos;ll get an SMS with driver name & number</Text>
            </View>
          </View>
          <View style={styles.nextItem}>
            <View style={styles.nextDot}><Text style={styles.nextDotText}>2</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nextLabel}>Track live on this app</Text>
              <Text style={styles.nextSub}>Driver location updates in My Trips</Text>
            </View>
          </View>
          <View style={styles.nextItem}>
            <View style={styles.nextDot}><Text style={styles.nextDotText}>3</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nextLabel}>Need help? We&apos;re here</Text>
              <Text style={styles.nextSub}>WhatsApp +91 98765 43210 anytime</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <Pressable
          style={styles.ctaPrimary}
          onPress={() => router.replace("/(app)/mytrips")}
        >
          <Text style={styles.ctaPrimaryText}>View My Trips →</Text>
        </Pressable>

        <Pressable
          style={styles.ctaSecondary}
          onPress={() => router.replace("/(app)/home")}
        >
          <Text style={styles.ctaSecondaryText}>Book Another Ride</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: YL.bg },
  content: { paddingHorizontal: 20, paddingBottom: 48, paddingTop: 24, gap: 16, alignItems: "stretch" },

  successRing: {
    alignSelf: "center", width: 80, height: 80, borderRadius: 40,
    backgroundColor: YL.leafSoft, justifyContent: "center", alignItems: "center",
  },
  successCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: YL.leaf, justifyContent: "center", alignItems: "center",
  },
  successCheck: { fontSize: 28, color: "#fff", fontWeight: "700" },

  headline: { fontSize: 26, fontWeight: "700", color: YL.ink, textAlign: "center", letterSpacing: -0.5 },
  headlineKn: { fontSize: 13, color: YL.ink3, textAlign: "center", marginTop: -8 },

  refCard: {
    backgroundColor: YL.yellow, borderRadius: 18, padding: 20, alignItems: "center", gap: 6,
  },
  refLabel: { fontSize: 10, fontWeight: "700", color: YL.ink, letterSpacing: 1, textTransform: "uppercase" },
  refCode: { fontSize: 32, fontWeight: "800", color: YL.ink, letterSpacing: 2 },
  refSub: { fontSize: 12, color: YL.ink, opacity: 0.65, textAlign: "center" },

  summaryCard: {
    backgroundColor: YL.card, borderRadius: 18, borderWidth: 1, borderColor: YL.line, padding: 16, gap: 14,
  },
  summaryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryType: { fontSize: 14, fontWeight: "600", color: YL.ink },
  paidChip: { backgroundColor: YL.leafSoft, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  paidText: { fontSize: 10, fontWeight: "700", color: YL.leaf, letterSpacing: 0.4 },

  routeRow: { flexDirection: "row", gap: 12 },
  routeDots: { width: 16, alignItems: "center", paddingTop: 4 },
  dotOrigin: { width: 10, height: 10, borderRadius: 5, backgroundColor: YL.ink },
  routeLine: { flex: 1, width: 1.5, backgroundColor: YL.line, marginVertical: 4 },
  dotDest: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: YL.ink },
  routeTexts: { flex: 1 },
  routeStop: {},
  routeStopLabel: { fontSize: 10, fontWeight: "600", color: YL.ink3, letterSpacing: 0.5, textTransform: "uppercase" },
  routeStopText: { fontSize: 14, fontWeight: "500", color: YL.ink, lineHeight: 20 },

  summaryDivider: { height: 1, backgroundColor: YL.line },
  vehicleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  vehicleEmoji: { fontSize: 22 },
  vehicleName: { fontSize: 14, fontWeight: "600", color: YL.ink },
  vehicleSub: { fontSize: 13, color: YL.ink2 },

  nextCard: {
    backgroundColor: YL.card, borderRadius: 18, borderWidth: 1, borderColor: YL.line, padding: 16, gap: 14,
  },
  nextTitle: { fontSize: 13, fontWeight: "600", color: YL.ink3, textTransform: "uppercase", letterSpacing: 0.4 },
  nextItem: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  nextDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: YL.yellow, justifyContent: "center", alignItems: "center",
  },
  nextDotText: { fontSize: 12, fontWeight: "700", color: YL.ink },
  nextLabel: { fontSize: 14, fontWeight: "500", color: YL.ink },
  nextSub: { fontSize: 12, color: YL.ink3, marginTop: 2 },

  ctaPrimary: {
    backgroundColor: YL.ink, borderRadius: 16, paddingVertical: 16,
    alignItems: "center",
  },
  ctaPrimaryText: { fontSize: 16, fontWeight: "600", color: YL.yellow },
  ctaSecondary: {
    backgroundColor: YL.card, borderRadius: 16, paddingVertical: 14,
    alignItems: "center", borderWidth: 1, borderColor: YL.line,
  },
  ctaSecondaryText: { fontSize: 15, fontWeight: "500", color: YL.ink },
});

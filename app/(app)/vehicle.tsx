import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { YL } from "../../constants/theme";

const VEHICLES = [
  {
    key: "yellow" as const,
    name: "Yellow",
    nameKn: "ಯೆಲ್ಲೋ",
    model: "Kia Carens Clavis EV",
    seats: 6,
    tags: ["AC", "Zero Emissions", "USB Charging"],
    recommended: true,
  },
  {
    key: "yellowSky" as const,
    name: "Yellow Sky",
    nameKn: "ಯೆಲ್ಲೋ ಸ್ಕೈ",
    model: "Kia Carens Clavis EV · Panoramic Sunroof",
    seats: 6,
    tags: ["AC", "Panoramic Sunroof", "USB Charging"],
    recommended: false,
  },
];

export default function VehicleScreen() {
  const params = useLocalSearchParams<{ booking: string }>();
  let booking: any = {};
  try {
    booking = JSON.parse(params.booking || "{}");
  } catch {}

  const pricing = booking.pricing || {};
  const vehicleOptions = pricing.vehicleOptions || {};

  function selectVehicle(key: "yellow" | "yellowSky") {
    const vp = vehicleOptions[key] || {};
    const updated = {
      ...booking,
      vehicle: key,
      vehiclePricing: vp,
    };
    router.push({ pathname: "/(app)/review", params: { booking: JSON.stringify(updated) } });
  }

  function rideLabel() {
    if (booking.rideType === "airport") {
      return booking.tripType === "pickup" ? "Airport Pickup" : "Airport Drop";
    }
    if (booking.rideType === "outstation") {
      return booking.tripVariant === "round_trip" ? "Outstation · Round Trip" : "Outstation · One Way";
    }
    if (booking.rideType === "hourly") {
      return `Hourly · ${booking.hours}h`;
    }
    return "Ride";
  }

  function routeSummary() {
    if (booking.rideType === "airport") {
      if (booking.tripType === "pickup") {
        return `BLR Airport → ${booking.destination || "Your location"}`;
      }
      return `${booking.origin || "Your location"} → BLR Airport`;
    }
    if (booking.rideType === "outstation") {
      return `${booking.origin || "Bengaluru"} → ${booking.destination || "Destination"}`;
    }
    if (booking.rideType === "hourly") {
      return `From ${booking.origin || "Pickup"}`;
    }
    return "";
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View>
          <Text style={styles.title}>Choose Vehicle</Text>
          <Text style={styles.titleKn}>ವಾಹನ ಆಯ್ಕೆ</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Trip summary strip */}
        <View style={styles.tripStrip}>
          <View style={styles.tripStripLeft}>
            <Text style={styles.tripStripLabel}>{rideLabel()}</Text>
            <Text style={styles.tripStripRoute} numberOfLines={1}>{routeSummary()}</Text>
          </View>
          {pricing.distanceKm > 0 && (
            <View style={styles.tripStripDistance}>
              <Text style={styles.tripStripDistText}>{pricing.distanceKm} km</Text>
            </View>
          )}
        </View>

        {/* Vehicle cards */}
        {VEHICLES.map((v) => {
          const vp = vehicleOptions[v.key] || {};
          const total = vp.totalPrice ?? pricing.totalPrice ?? 0;
          return (
            <Pressable key={v.key} style={styles.vehicleCard} onPress={() => selectVehicle(v.key)}>
              {v.recommended && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>RECOMMENDED</Text>
                </View>
              )}

              {/* Car illustration placeholder */}
              <View style={[styles.carIllustration, v.key === "yellowSky" && styles.carIllustrationSky]}>
                <Text style={styles.carEmoji}>🚗</Text>
                {v.key === "yellowSky" && (
                  <View style={styles.sunroofBadge}>
                    <Text style={styles.sunroofText}>☀️</Text>
                  </View>
                )}
              </View>

              <View style={styles.vehicleInfo}>
                <View style={styles.vehicleNameRow}>
                  <View>
                    <Text style={styles.vehicleName}>{v.name}</Text>
                    <Text style={styles.vehicleNameKn}>{v.nameKn}</Text>
                  </View>
                  <View style={styles.priceBox}>
                    <Text style={styles.priceText}>₹{total.toLocaleString("en-IN")}</Text>
                  </View>
                </View>

                <Text style={styles.vehicleModel}>{v.model}</Text>

                <View style={styles.tagsRow}>
                  {v.tags.map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{v.seats} Seats</Text>
                  </View>
                </View>
              </View>

              <View style={styles.selectRow}>
                <Text style={styles.selectText}>Select {v.name} →</Text>
              </View>
            </Pressable>
          );
        })}

        {/* Why Yellow */}
        <View style={styles.whyCard}>
          <Text style={styles.whyTitle}>Why Yellow?</Text>
          <View style={styles.whyGrid}>
            {[
              { icon: "⚡", text: "100% Electric" },
              { icon: "🌿", text: "Zero Emissions" },
              { icon: "👔", text: "Vetted Chauffeurs" },
              { icon: "📍", text: "Live Tracking" },
            ].map((w) => (
              <View key={w.text} style={styles.whyItem}>
                <Text style={styles.whyIcon}>{w.icon}</Text>
                <Text style={styles.whyText}>{w.text}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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

  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },

  tripStrip: {
    backgroundColor: YL.card, borderRadius: 14, borderWidth: 1, borderColor: YL.line,
    padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  tripStripLeft: { flex: 1, gap: 2 },
  tripStripLabel: { fontSize: 11, fontWeight: "600", color: YL.ink3, textTransform: "uppercase", letterSpacing: 0.4 },
  tripStripRoute: { fontSize: 14, fontWeight: "500", color: YL.ink },
  tripStripDistance: {
    backgroundColor: YL.bg2, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4,
  },
  tripStripDistText: { fontSize: 12, fontWeight: "600", color: YL.ink },

  vehicleCard: {
    backgroundColor: YL.card, borderRadius: 20, borderWidth: 1, borderColor: YL.line,
    overflow: "hidden",
  },
  recommendedBadge: {
    backgroundColor: YL.yellow, paddingHorizontal: 12, paddingVertical: 5,
    alignSelf: "flex-start", borderBottomRightRadius: 10,
  },
  recommendedText: { fontSize: 10, fontWeight: "700", color: YL.ink, letterSpacing: 0.5 },

  carIllustration: {
    backgroundColor: YL.bg2, height: 120, justifyContent: "center", alignItems: "center",
    position: "relative",
  },
  carIllustrationSky: { backgroundColor: YL.yellowSoft },
  carEmoji: { fontSize: 64 },
  sunroofBadge: {
    position: "absolute", top: 12, right: 16,
    backgroundColor: YL.yellow, borderRadius: 20, width: 32, height: 32,
    justifyContent: "center", alignItems: "center",
  },
  sunroofText: { fontSize: 16 },

  vehicleInfo: { padding: 16, gap: 8 },
  vehicleNameRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  vehicleName: { fontSize: 20, fontWeight: "700", color: YL.ink },
  vehicleNameKn: { fontSize: 11, color: YL.ink3, marginTop: 1 },
  priceBox: {
    backgroundColor: YL.ink, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
  },
  priceText: { fontSize: 16, fontWeight: "700", color: YL.yellow },

  vehicleModel: { fontSize: 12, color: YL.ink2 },

  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    backgroundColor: YL.bg2, borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  tagText: { fontSize: 11, color: YL.ink2 },

  selectRow: {
    borderTopWidth: 1, borderTopColor: YL.line,
    paddingVertical: 14, paddingHorizontal: 16, alignItems: "center",
  },
  selectText: { fontSize: 14, fontWeight: "600", color: YL.ink },

  whyCard: {
    backgroundColor: YL.card, borderRadius: 16, borderWidth: 1, borderColor: YL.line,
    padding: 16, gap: 12,
  },
  whyTitle: { fontSize: 13, fontWeight: "600", color: YL.ink },
  whyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  whyItem: { width: "45%", flexDirection: "row", alignItems: "center", gap: 8 },
  whyIcon: { fontSize: 20 },
  whyText: { fontSize: 12, color: YL.ink2, flex: 1 },
});

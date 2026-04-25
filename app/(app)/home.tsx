import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import YBrand from "../../components/YBrand";
import { useAuth } from "../../context/AuthContext";
import { YL } from "../../constants/theme";

const RIDE_TYPES = [
  {
    key: "airport",
    title: "Airport",
    titleKn: "ವಿಮಾನ ನಿಲ್ದಾಣ",
    desc: "Kempegowda International · BLR",
    fare: "from ₹1,399",
    route: "/(app)/airport",
  },
  {
    key: "outstation",
    title: "Outstation",
    titleKn: "ಹೊರ ನಗರ",
    desc: "Coorg · Mysuru · Ooty · Chikmagalur",
    fare: "₹32 / km",
    route: "/(app)/outstation",
  },
  {
    key: "hourly",
    title: "Hourly",
    titleKn: "ಗಂಟೆಗಳ ಬಾಡಿಗೆ",
    desc: "Within Bengaluru · 4h minimum",
    fare: "₹499 / hr",
    route: "/(app)/hourly",
  },
] as const;

export default function HomeScreen() {
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "YL";

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <YBrand size={24} />
        <Pressable
          style={styles.avatar}
          onPress={() => router.push("/(app)/profile")}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </Pressable>
      </View>

      {/* Greeting */}
      <View style={styles.greeting}>
        <View style={styles.greetRow}>
          <Text style={styles.greetKn}>ನಮಸ್ಕಾರ,</Text>
          <Text style={styles.greetName}>{(user?.name || "").split(" ")[0].toUpperCase() || "THERE"}</Text>
        </View>
        <Text style={styles.headline}>
          Where are you <Text style={styles.italic}>flying</Text>?
        </Text>
      </View>

      {/* Ride type cards */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.cards} showsVerticalScrollIndicator={false}>
        {RIDE_TYPES.map((rt, i) => (
          <Pressable
            key={rt.key}
            style={[styles.card, i === 0 && styles.cardFeatured]}
            onPress={() => router.push(rt.route as any)}
          >
            <View style={styles.cardTop}>
              <View style={styles.cardLeft}>
                <Text style={[styles.cardTitle, i === 0 && styles.cardTitleFeatured]}>{rt.title}</Text>
                <Text style={[styles.cardKn, i === 0 && styles.cardKnFeatured]}>{rt.titleKn}</Text>
              </View>
              <View style={[styles.fareChip, i === 0 && styles.fareChipFeatured]}>
                <Text style={[styles.fareText, i === 0 && styles.fareTextFeatured]}>{rt.fare}</Text>
              </View>
            </View>
            <Text style={[styles.cardDesc, i === 0 && styles.cardDescFeatured]}>{rt.desc}</Text>

            {/* Arrow */}
            <View style={[styles.arrow, i === 0 && styles.arrowFeatured]}>
              <Text style={[styles.arrowText, i === 0 && styles.arrowTextFeatured]}>→</Text>
            </View>
          </Pressable>
        ))}

        {/* Bottom nav row */}
        <View style={styles.navRow}>
          <Pressable style={styles.navBtn} onPress={() => router.push("/(app)/mytrips")}>
            <Text style={styles.navIcon}>📋</Text>
            <Text style={styles.navLabel}>My Trips</Text>
          </Pressable>
          <Pressable style={styles.navBtn} onPress={() => router.push("/(app)/profile")}>
            <Text style={styles.navIcon}>👤</Text>
            <Text style={styles.navLabel}>Profile</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: YL.bg },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: YL.yellow,
    justifyContent: "center", alignItems: "center",
    borderWidth: 1.5, borderColor: YL.yellowDeep + "66",
  },
  avatarText: { fontSize: 14, fontWeight: "600", color: YL.ink },

  greeting: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 },
  greetRow: { flexDirection: "row", alignItems: "baseline", gap: 10 },
  greetKn: { fontSize: 13, color: YL.ink3 },
  greetName: { fontSize: 11, color: YL.ink3, fontWeight: "600", letterSpacing: 0.5 },
  headline: { fontSize: 26, fontWeight: "600", color: YL.ink, letterSpacing: -0.8, marginTop: 4, lineHeight: 30 },
  italic: { fontStyle: "italic" },

  cards: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 12 },

  card: {
    backgroundColor: YL.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: YL.line,
    position: "relative",
  },
  cardFeatured: {
    backgroundColor: YL.yellow,
    borderColor: YL.yellowDeep + "44",
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  cardLeft: { gap: 2 },
  cardTitle: { fontSize: 18, fontWeight: "600", color: YL.ink, letterSpacing: -0.3 },
  cardTitleFeatured: { color: YL.ink },
  cardKn: { fontSize: 12, color: YL.ink3 },
  cardKnFeatured: { color: YL.ink, opacity: 0.65 },

  fareChip: {
    backgroundColor: YL.bg2, borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  fareChipFeatured: { backgroundColor: YL.ink },
  fareText: { fontSize: 12, fontWeight: "600", color: YL.ink },
  fareTextFeatured: { color: YL.yellow },

  cardDesc: { fontSize: 13, color: YL.ink2, lineHeight: 18 },
  cardDescFeatured: { color: YL.ink, opacity: 0.7 },

  arrow: {
    position: "absolute", right: 18, bottom: 18,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: YL.bg2, justifyContent: "center", alignItems: "center",
  },
  arrowFeatured: { backgroundColor: YL.ink },
  arrowText: { fontSize: 16, color: YL.ink },
  arrowTextFeatured: { color: YL.yellow },

  navRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  navBtn: {
    flex: 1, backgroundColor: YL.card, borderRadius: 16,
    borderWidth: 1, borderColor: YL.line,
    paddingVertical: 14, alignItems: "center", gap: 4,
  },
  navIcon: { fontSize: 22 },
  navLabel: { fontSize: 12, fontWeight: "500", color: YL.ink2 },
});

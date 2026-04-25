import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { YL } from "../../constants/theme";

const WHATSAPP_URL = "https://wa.me/919876543210?text=Hi%2C%20I%20wanted%20to%20book%20a%20Yellow%20ride%20but%20got%20an%20unavailability%20message.%20Can%20you%20help%3F";

export default function UnavailableScreen() {
  function openWhatsApp() {
    if (typeof window !== "undefined") {
      window.open(WHATSAPP_URL, "_blank");
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconRing}>
          <Text style={styles.icon}>📅</Text>
        </View>

        <Text style={styles.headline}>Not Available</Text>
        <Text style={styles.headlineKn}>ಲಭ್ಯವಿಲ್ಲ</Text>

        <Text style={styles.body}>
          We don&apos;t have a Yellow available for this slot right now.{"\n"}
          Our team can often arrange something — reach out on WhatsApp and we&apos;ll try our best.
        </Text>

        {/* Suggestions */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>You can also try</Text>
          <View style={styles.tipRow}>
            <Text style={styles.tipDot}>•</Text>
            <Text style={styles.tipText}>A different date or time</Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.tipDot}>•</Text>
            <Text style={styles.tipText}>Booking further in advance (we recommend 24h+)</Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.tipDot}>•</Text>
            <Text style={styles.tipText}>Checking back later — availability updates regularly</Text>
          </View>
        </View>

        {/* Actions */}
        <Pressable style={styles.whatsappBtn} onPress={openWhatsApp}>
          <Text style={styles.whatsappIcon}>💬</Text>
          <Text style={styles.whatsappText}>Chat on WhatsApp</Text>
        </Pressable>

        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Try a different slot</Text>
        </Pressable>

        <Pressable style={styles.homeBtn} onPress={() => router.replace("/(app)/home")}>
          <Text style={styles.homeBtnText}>Back to Home</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: YL.bg },
  content: {
    flex: 1, paddingHorizontal: 28, justifyContent: "center",
    alignItems: "center", gap: 14,
  },

  iconRing: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: YL.gulmoharSoft, justifyContent: "center", alignItems: "center",
    marginBottom: 4,
  },
  icon: { fontSize: 36 },

  headline: { fontSize: 26, fontWeight: "700", color: YL.ink, textAlign: "center" },
  headlineKn: { fontSize: 13, color: YL.ink3, textAlign: "center", marginTop: -8 },

  body: {
    fontSize: 14, color: YL.ink2, textAlign: "center", lineHeight: 22,
    maxWidth: 320,
  },

  tipsCard: {
    backgroundColor: YL.card, borderRadius: 16, borderWidth: 1, borderColor: YL.line,
    padding: 16, alignSelf: "stretch", gap: 8,
  },
  tipsTitle: { fontSize: 12, fontWeight: "600", color: YL.ink3, textTransform: "uppercase", letterSpacing: 0.4 },
  tipRow: { flexDirection: "row", gap: 8 },
  tipDot: { fontSize: 13, color: YL.ink3, lineHeight: 20 },
  tipText: { fontSize: 13, color: YL.ink2, lineHeight: 20, flex: 1 },

  whatsappBtn: {
    backgroundColor: "#25D366", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28,
    flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "stretch",
    justifyContent: "center",
  },
  whatsappIcon: { fontSize: 18 },
  whatsappText: { fontSize: 15, fontWeight: "600", color: "#fff" },

  backBtn: {
    paddingVertical: 12, alignSelf: "stretch", alignItems: "center",
  },
  backBtnText: { fontSize: 15, fontWeight: "500", color: YL.ink },

  homeBtn: {
    backgroundColor: YL.card, borderRadius: 14, borderWidth: 1, borderColor: YL.line,
    paddingVertical: 12, alignSelf: "stretch", alignItems: "center",
  },
  homeBtnText: { fontSize: 14, color: YL.ink2 },
});

import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { YL } from "../../constants/theme";

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.root}>
      {/* Hero card */}
      <View style={styles.hero}>
        {/* Logo mark */}
        <View style={styles.topRow}>
          <View style={styles.logoMark}>
            <Text style={styles.logoGlyph}>ಹ</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>100% ELECTRIC</Text>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        {/* SUV illustration */}
        <View style={styles.suvWrap}>
          <View style={styles.suvBody}>
            <View style={styles.suvRoof} />
            <View style={styles.suvWindscreen} />
          </View>
          <View style={styles.suvWheelsRow}>
            <View style={styles.wheel}><View style={styles.wheelInner} /></View>
            <View style={styles.wheel}><View style={styles.wheelInner} /></View>
          </View>
        </View>

        <Text style={styles.headline}>Arrive rested.{"\n"}Ride Yellow.</Text>
        <Text style={styles.headlineKn}>ವಿಶ್ರಾಂತಿಯಿಂದ ತಲುಪಿ · ಹಳದಿಯಲ್ಲಿ ಪ್ರಯಾಣಿಸಿ</Text>
        <Text style={styles.tagline}>
          Premium electric SUVs to & from Kempegowda International — flight-aware, zero-cancel.
        </Text>
      </View>

      {/* CTA */}
      <View style={styles.bottom}>
        <Pressable style={styles.ctaInk} onPress={() => router.push("/(onboarding)/phone")}>
          <Text style={styles.ctaInkText}>Get started</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/(onboarding)/phone")}>
          <Text style={styles.signInText}>
            Have an account? <Text style={styles.signInBold}>Sign in</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: YL.bg },

  hero: {
    flex: 1,
    margin: 16,
    backgroundColor: YL.yellow,
    borderRadius: 28,
    padding: 24,
    paddingBottom: 28,
    overflow: "hidden",
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logoMark: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: YL.ink,
    justifyContent: "center", alignItems: "center",
  },
  logoGlyph: { color: YL.yellow, fontSize: 18, fontWeight: "700" },
  badge: {
    backgroundColor: YL.ink, borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  badgeText: { color: YL.yellow, fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },

  suvWrap: { marginBottom: 16 },
  suvBody: {
    height: 60, backgroundColor: YL.ink, borderRadius: 12,
    marginHorizontal: 24, marginBottom: 0,
    position: "relative",
    justifyContent: "flex-end",
  },
  suvRoof: {
    position: "absolute", top: 0, left: "15%", right: "15%", bottom: "30%",
    backgroundColor: YL.yellow, borderTopLeftRadius: 14, borderTopRightRadius: 14,
    opacity: 0.9,
  },
  suvWindscreen: {
    position: "absolute", top: "10%", left: "18%", right: "18%", bottom: "35%",
    backgroundColor: YL.yellow, opacity: 0.6, borderRadius: 6,
  },
  suvWheelsRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 40, marginTop: -8,
  },
  wheel: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: YL.ink, justifyContent: "center", alignItems: "center",
  },
  wheelInner: { width: 14, height: 14, borderRadius: 7, backgroundColor: YL.yellow },

  headline: { fontSize: 40, fontWeight: "600", color: YL.ink, letterSpacing: -1.3, lineHeight: 44 },
  headlineKn: { fontSize: 14, color: YL.ink, opacity: 0.7, marginTop: 8 },
  tagline: { fontSize: 14, color: YL.ink, opacity: 0.75, lineHeight: 20, marginTop: 10 },

  bottom: { paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  ctaInk: {
    backgroundColor: YL.ink, borderRadius: 16,
    height: 56, justifyContent: "center", alignItems: "center",
  },
  ctaInkText: { color: "#fff", fontSize: 16, fontWeight: "600", letterSpacing: -0.2 },
  signInText: { color: YL.ink2, fontSize: 13.5, textAlign: "center" },
  signInBold: { color: YL.ink, fontWeight: "600" },
});

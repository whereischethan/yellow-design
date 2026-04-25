import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Pressable, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { YL } from "../../constants/theme";
import { sendOtp } from "../../lib/api";

export default function PhoneScreen() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const cleanPhone = phone.replace(/\s/g, "");
  const canContinue = cleanPhone.length >= 10;

  async function handleContinue() {
    if (!canContinue || loading) return;
    setError(null);
    setLoading(true);
    try {
      await sendOtp(cleanPhone, "+91");
      router.push({ pathname: "/(onboarding)/otp", params: { phone: cleanPhone } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Back */}
        <View style={styles.chrome}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.stepText}>1 / 2</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.headline}>What's your{"\n"}mobile number?</Text>
          <Text style={styles.headlineKn}>ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ</Text>
          <Text style={styles.sub}>We'll send a 6-digit OTP. Your partner reaches you on this number.</Text>

          {/* Field */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Mobile number</Text>
            <Pressable style={[styles.field, error && styles.fieldError]} onPress={() => inputRef.current?.focus()}>
              <View style={styles.dialCode}>
                <Text style={styles.flag}>🇮🇳</Text>
                <Text style={styles.dialText}>+91</Text>
              </View>
              <View style={styles.dividerV} />
              <TextInput
                ref={inputRef}
                style={[styles.input, Platform.OS === "web" && ({ outlineStyle: "none" } as any)]}
                placeholder="98451 23890"
                placeholderTextColor={YL.ink3}
                value={phone}
                onChangeText={(t) => { setPhone(t); setError(null); }}
                keyboardType="phone-pad"
                maxLength={15}
                onSubmitEditing={handleContinue}
                autoFocus
              />
            </Pressable>
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          {/* Privacy note */}
          <View style={styles.privacyCard}>
            <View style={styles.privacyIcon}>
              <Text style={styles.privacyEmoji}>🔒</Text>
            </View>
            <Text style={styles.privacyText}>We never share your number. Partner calls are masked.</Text>
          </View>

          <View style={{ flex: 1 }} />

          <Text style={styles.termsText}>
            By continuing, you agree to our <Text style={styles.termsLink}>Terms</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>

          <Pressable
            style={[styles.cta, (!canContinue || loading) && styles.ctaDisabled]}
            onPress={handleContinue}
            disabled={!canContinue || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.ctaText}>Send OTP →</Text>
            }
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: YL.bg },
  chrome: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 8, minHeight: 56,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: YL.bg2, justifyContent: "center", alignItems: "center",
  },
  backIcon: { fontSize: 24, color: YL.ink, marginTop: -2 },
  stepText: { fontSize: 11, color: YL.ink3, fontWeight: "600", letterSpacing: 0.3 },

  content: { flex: 1, paddingHorizontal: 20, paddingBottom: 20 },
  headline: { fontSize: 34, fontWeight: "600", color: YL.ink, letterSpacing: -1, lineHeight: 38, marginBottom: 6 },
  headlineKn: { fontSize: 14, color: YL.ink3, marginBottom: 10 },
  sub: { fontSize: 14.5, color: YL.ink2, lineHeight: 21, marginBottom: 28 },

  fieldWrap: { gap: 8, marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: "500", color: YL.ink2 },
  field: {
    height: 56, borderWidth: 1.5, borderColor: YL.line,
    borderRadius: 14, backgroundColor: YL.card,
    flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 12,
  },
  fieldError: { borderColor: "#EF4444" },
  dialCode: { flexDirection: "row", alignItems: "center", gap: 6 },
  flag: { fontSize: 18 },
  dialText: { fontSize: 17, fontWeight: "500", color: YL.ink },
  dividerV: { width: 1, height: 24, backgroundColor: YL.line },
  input: { flex: 1, fontSize: 17, color: YL.ink, padding: 0 },
  errorText: { fontSize: 12, color: "#EF4444", fontWeight: "500" },

  privacyCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: YL.leafSoft, borderRadius: 14, padding: 14,
  },
  privacyIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: YL.leaf, justifyContent: "center", alignItems: "center",
  },
  privacyEmoji: { fontSize: 14 },
  privacyText: { flex: 1, fontSize: 12.5, color: YL.ink2, lineHeight: 18 },

  termsText: { fontSize: 12, color: YL.ink3, textAlign: "center", marginBottom: 14, lineHeight: 18 },
  termsLink: { textDecorationLine: "underline" },

  cta: { height: 56, backgroundColor: YL.ink, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  ctaDisabled: { backgroundColor: YL.line },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "600", letterSpacing: -0.2 },
});

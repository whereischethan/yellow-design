import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Platform, Pressable,
  StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { YL } from "../../constants/theme";
import { resendOtp, verifyOtp } from "../../lib/api";

const OTP_LENGTH = 6;

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { login } = useAuth();

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(59);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const otp = digits.join("");
  const canVerify = otp.length === OTP_LENGTH;

  const handleInput = useCallback((text: string) => {
    const clean = text.replace(/\D/g, "").slice(0, OTP_LENGTH);
    setDigits(clean.split("").concat(Array(OTP_LENGTH - clean.length).fill("")));
    setError(null);
  }, []);

  async function handleVerify() {
    if (!canVerify || loading) return;
    setError(null);
    setLoading(true);
    try {
      const data = await verifyOtp(phone!, otp, "+91");
      login({
        phone: data.user.phone,
        name: data.user.name,
        role: data.user.role,
        isTestUser: otp === "000000",
      });
      router.replace("/(app)/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (countdown > 0) return;
    try {
      await resendOtp(phone!, "+91");
      setCountdown(59);
      setDigits(Array(OTP_LENGTH).fill(""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend");
    }
  }

  const activeIndex = digits.findIndex((d) => d === "");

  return (
    <SafeAreaView style={styles.root}>
      {/* Back / step */}
      <View style={styles.chrome}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.stepText}>2 / 2</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.headline}>Enter the code</Text>
        <Text style={styles.headlineKn}>ಕೋಡ್ ಅನ್ನು ನಮೂದಿಸಿ</Text>
        <Text style={styles.sub}>
          Sent to <Text style={styles.phoneText}>+91 {phone}</Text>{"  "}
          <Text style={styles.changeText} onPress={() => router.back()}>Change</Text>
        </Text>

        {/* OTP boxes */}
        <View style={styles.otpRow}>
          {digits.map((d, i) => (
            <Pressable
              key={i}
              style={[
                styles.otpBox,
                (d || i === activeIndex) && styles.otpBoxActive,
              ]}
              onPress={() => inputRef.current?.focus()}
            >
              {d ? (
                <Text style={styles.otpDigit}>{d}</Text>
              ) : i === activeIndex ? (
                <View style={styles.caret} />
              ) : null}
            </Pressable>
          ))}
        </View>

        {/* Hidden input */}
        <TextInput
          ref={inputRef}
          style={styles.hidden}
          value={otp}
          onChangeText={handleInput}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          autoFocus
          onSubmitEditing={handleVerify}
          caretHidden
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.resendRow}>
          <Text style={styles.resendHint}>Didn't receive the OTP?</Text>
          {countdown > 0 ? (
            <Text style={styles.timer}>0:{countdown.toString().padStart(2, "0")}</Text>
          ) : (
            <Pressable onPress={handleResend}>
              <Text style={styles.resendLink}>Resend</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.autoReadCard}>
          <Text style={styles.autoReadText}>Reading SMS automatically…</Text>
        </View>

        <View style={{ flex: 1 }} />

        <Pressable
          style={[styles.cta, (!canVerify || loading) && styles.ctaDisabled]}
          onPress={handleVerify}
          disabled={!canVerify || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.ctaText}>Verify & continue</Text>
          }
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: YL.bg },
  chrome: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 8, minHeight: 56,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: YL.bg2, justifyContent: "center", alignItems: "center" },
  backIcon: { fontSize: 24, color: YL.ink, marginTop: -2 },
  stepText: { fontSize: 11, color: YL.ink3, fontWeight: "600", letterSpacing: 0.3 },

  content: { flex: 1, paddingHorizontal: 20, paddingBottom: 20 },
  headline: { fontSize: 34, fontWeight: "600", color: YL.ink, letterSpacing: -1, lineHeight: 38, marginBottom: 6 },
  headlineKn: { fontSize: 14, color: YL.ink3, marginBottom: 10 },
  sub: { fontSize: 14.5, color: YL.ink2, lineHeight: 21, marginBottom: 28 },
  phoneText: { color: YL.ink, fontWeight: "500" },
  changeText: { color: YL.ink, fontWeight: "600", textDecorationLine: "underline" },

  otpRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  otpBox: {
    flex: 1, height: 64, borderRadius: 14,
    borderWidth: 1.5, borderColor: YL.line,
    backgroundColor: YL.card,
    justifyContent: "center", alignItems: "center",
  },
  otpBoxActive: { borderColor: YL.ink },
  otpDigit: { fontSize: 28, fontWeight: "600", color: YL.ink },
  caret: { width: 2, height: 28, backgroundColor: YL.ink },

  hidden: { position: "absolute", opacity: 0, height: 0, width: 0 },

  errorText: { fontSize: 12.5, color: "#EF4444", fontWeight: "500", marginBottom: 12 },

  resendRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  resendHint: { fontSize: 13.5, color: YL.ink3 },
  timer: { fontSize: 13, color: YL.ink3, fontVariant: ["tabular-nums"] },
  resendLink: { fontSize: 13.5, color: YL.ink, fontWeight: "600" },

  autoReadCard: {
    padding: 12, borderWidth: 1, borderStyle: "dashed", borderColor: YL.line,
    borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 8,
  },
  autoReadText: { fontSize: 12.5, color: YL.ink2 },

  cta: { height: 56, backgroundColor: YL.ink, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  ctaDisabled: { backgroundColor: YL.line },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "600", letterSpacing: -0.2 },
});

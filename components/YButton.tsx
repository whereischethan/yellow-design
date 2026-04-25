import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { YL } from "../constants/theme";

type Variant = "primary" | "ink" | "outline" | "soft";

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  size?: "md" | "lg";
}

export default function YButton({ children, onPress, variant = "primary", disabled, loading, size = "lg" }: Props) {
  const h = size === "lg" ? 56 : 48;
  const fs = size === "lg" ? 16 : 14.5;

  const bg = disabled
    ? YL.line
    : variant === "primary" ? YL.yellow
    : variant === "ink" ? YL.ink
    : variant === "outline" ? YL.card
    : YL.bg2;

  const color = disabled
    ? YL.ink3
    : variant === "ink" ? "#fff"
    : variant === "primary" ? YL.ink
    : YL.ink;

  const borderColor = variant === "outline" ? YL.ink : "transparent";

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      style={[styles.btn, { height: h, backgroundColor: bg, borderColor, borderWidth: variant === "outline" ? 1.5 : 0 }]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <View style={styles.inner}>
          {typeof children === "string" ? (
            <Text style={[styles.label, { fontSize: fs, color }]}>{children}</Text>
          ) : (
            children
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: "100%",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  inner: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontWeight: "600", letterSpacing: -0.2 },
});

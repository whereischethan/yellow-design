import { StyleSheet, Text, View } from "react-native";
import { YL } from "../constants/theme";

interface Props {
  size?: number;
  showKannada?: boolean;
}

export default function YBrand({ size = 22, showKannada = true }: Props) {
  return (
    <View style={styles.row}>
      <View style={[styles.logo, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.glyph, { fontSize: size * 0.54 }]}>ಹ</Text>
      </View>
      <View style={styles.col}>
        <Text style={[styles.name, { fontSize: size * 0.86 }]}>Yellow</Text>
        {showKannada && (
          <Text style={[styles.sub, { fontSize: size * 0.38 }]}>ಹಳದಿ · bengaluru</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: {
    backgroundColor: YL.yellow,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  glyph: { color: YL.ink, fontWeight: "600", lineHeight: undefined },
  col: { gap: 1 },
  name: { color: YL.ink, fontWeight: "600", letterSpacing: -0.5, lineHeight: undefined },
  sub: { color: YL.ink2, lineHeight: undefined },
});

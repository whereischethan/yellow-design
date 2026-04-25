import { router } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { YL } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import YBrand from "../../components/YBrand";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(user?.name || "");

  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "YL";

  function handleLogout() {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => { logout(); } },
    ]);
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.titleKn}>ನನ್ನ ಖಾತೆ</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity card */}
        <View style={styles.idCard}>
          <View style={styles.idTop}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              {editName ? (
                <TextInput
                  style={styles.nameInput}
                  value={name}
                  onChangeText={setName}
                  onBlur={() => setEditName(false)}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => setEditName(false)}
                />
              ) : (
                <Pressable onPress={() => setEditName(true)}>
                  <Text style={styles.idName}>{name || "Your Name"}</Text>
                  <Text style={styles.idEditHint}>Tap to edit ✎</Text>
                </Pressable>
              )}
              <Text style={styles.idPhone}>{user?.phone || ""}</Text>
            </View>
          </View>

          <View style={styles.idBrand}>
            <YBrand size={18} />
          </View>
        </View>

        {/* Account section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="📋"
              label="My Trips"
              labelKn="ನನ್ನ ಪ್ರಯಾಣಗಳು"
              onPress={() => router.push("/(app)/mytrips")}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="💬"
              label="Support"
              labelKn="ಸಹಾಯ"
              onPress={() => {
                const url = "https://wa.me/919876543210";
                if (typeof window !== "undefined") window.open(url, "_blank");
              }}
            />
          </View>
        </View>

        {/* About section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>About Yellow</Text>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutText}>
              Yellow is Bengaluru&apos;s premium electric chauffeur service.{"\n"}
              100% EV fleet · Vetted drivers · Zero emissions.
            </Text>
            <View style={styles.aboutTagRow}>
              {["⚡ EV Only", "🌿 Net Zero", "👔 Vetted"].map((tag) => (
                <View key={tag} style={styles.aboutTag}>
                  <Text style={styles.aboutTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Legal</Text>
          <View style={styles.menuCard}>
            <MenuItem icon="📄" label="Terms of Service" onPress={() => {}} />
            <View style={styles.menuDivider} />
            <MenuItem icon="🔒" label="Privacy Policy" onPress={() => {}} />
          </View>
        </View>

        {/* Logout */}
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>

        <Text style={styles.version}>ridewithyellow.com · v1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({
  icon, label, labelKn, onPress,
}: {
  icon: string; label: string; labelKn?: string; onPress: () => void;
}) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.menuLabel}>{label}</Text>
        {labelKn && <Text style={styles.menuKn}>{labelKn}</Text>}
      </View>
      <Text style={styles.menuArrow}>›</Text>
    </Pressable>
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

  content: { paddingHorizontal: 20, paddingBottom: 48, gap: 16 },

  idCard: {
    backgroundColor: YL.ink, borderRadius: 20, padding: 20, gap: 16,
  },
  idTop: { flexDirection: "row", gap: 14, alignItems: "center" },
  avatarLarge: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: YL.yellow, justifyContent: "center", alignItems: "center",
  },
  avatarText: { fontSize: 22, fontWeight: "700", color: YL.ink },
  idName: { fontSize: 20, fontWeight: "700", color: "#fff" },
  idEditHint: { fontSize: 11, color: YL.yellow, marginTop: 2, opacity: 0.8 },
  nameInput: {
    fontSize: 20, fontWeight: "700", color: "#fff",
    borderBottomWidth: 1, borderBottomColor: YL.yellow,
    paddingVertical: 2,
  },
  idPhone: { fontSize: 13, color: "#ffffff80", marginTop: 4 },
  idBrand: { alignSelf: "flex-end", opacity: 0.7 },

  section: { gap: 8 },
  sectionLabel: {
    fontSize: 11, fontWeight: "600", color: YL.ink3,
    letterSpacing: 0.5, textTransform: "uppercase", paddingLeft: 4,
  },
  menuCard: {
    backgroundColor: YL.card, borderRadius: 16, borderWidth: 1, borderColor: YL.line, overflow: "hidden",
  },
  menuDivider: { height: 1, backgroundColor: YL.line, marginHorizontal: 14 },
  menuItem: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14, gap: 12,
  },
  menuIcon: { fontSize: 20 },
  menuLabel: { fontSize: 15, fontWeight: "500", color: YL.ink },
  menuKn: { fontSize: 11, color: YL.ink3, marginTop: 1 },
  menuArrow: { fontSize: 20, color: YL.ink3 },

  aboutCard: {
    backgroundColor: YL.card, borderRadius: 16, borderWidth: 1, borderColor: YL.line, padding: 16, gap: 12,
  },
  aboutText: { fontSize: 13, color: YL.ink2, lineHeight: 20 },
  aboutTagRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  aboutTag: { backgroundColor: YL.bg2, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  aboutTagText: { fontSize: 12, color: YL.ink },

  logoutBtn: {
    backgroundColor: YL.card, borderRadius: 14, borderWidth: 1, borderColor: "#FECACA",
    paddingVertical: 14, alignItems: "center",
  },
  logoutText: { fontSize: 15, fontWeight: "500", color: "#B91C1C" },

  version: { textAlign: "center", fontSize: 12, color: YL.ink3 },
});

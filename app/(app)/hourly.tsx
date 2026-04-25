import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { YL } from "../../constants/theme";
import { LocationAutocomplete } from "../../components/location/LocationAutocomplete";

const PACKAGES = [
  { hours: 4, price: 2096, label: "Half Day" },
  { hours: 8, price: 4192, label: "Full Day" },
  { hours: 12, price: 6288, label: "Extended" },
] as const;

type HoursPkg = 4 | 8 | 12;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function defaultStart() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 180); // 3h from now
  d.setSeconds(0, 0);
  return d;
}

function formatDateTime(d: Date) {
  const day = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase();
  return `${day}, ${time}`;
}

function toInputValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromInputValue(s: string) {
  return s ? new Date(s) : null;
}

export default function HourlyScreen() {
  const [pkg, setPkg] = useState<HoursPkg>(4);
  const [startDate, setStartDate] = useState<Date>(defaultStart());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickupPlaceId, setPickupPlaceId] = useState<string>("");
  const [pickupAddress, setPickupAddress] = useState<string>("");
  const [passengers, setPassengers] = useState(1);
  const [bags, setBags] = useState(0);

  const webDateRef = useRef<any>(null);

  const selected = PACKAGES.find((p) => p.hours === pkg)!;

  function handleDateWeb(val: string) {
    const d = fromInputValue(val);
    if (d) setStartDate(d);
  }

  function proceed() {
    if (!pickupPlaceId || !pickupAddress) return;
    const booking = {
      rideType: "hourly",
      origin: pickupAddress,
      originPlaceId: pickupPlaceId,
      hours: pkg,
      startDate: startDate.toISOString(),
      passengers,
      bags,
      pricing: {
        rideType: "hourly",
        distanceKm: 0,
        durationMinutes: pkg * 60,
        hours: pkg,
        hourlyRate: 499,
        totalPrice: selected.price,
        vehicleOptions: {
          yellow: { basePrice: selected.price, totalPrice: selected.price },
          yellowSky: { basePrice: selected.price, totalPrice: selected.price },
        },
      },
    };
    router.push({ pathname: "/(app)/vehicle", params: { booking: JSON.stringify(booking) } });
  }

  const canProceed = !!pickupPlaceId;

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View>
          <Text style={styles.title}>Hourly</Text>
          <Text style={styles.titleKn}>ಗಂಟೆಗಳ ಬಾಡಿಗೆ</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Package selector */}
        <Text style={styles.sectionLabel}>Choose Package</Text>
        <View style={styles.pkgRow}>
          {PACKAGES.map((p) => (
            <Pressable
              key={p.hours}
              style={[styles.pkgCard, pkg === p.hours && styles.pkgCardSelected]}
              onPress={() => setPkg(p.hours)}
            >
              <Text style={[styles.pkgHours, pkg === p.hours && styles.pkgTextSelected]}>{p.hours}h</Text>
              <Text style={[styles.pkgLabel, pkg === p.hours && styles.pkgLabelSelected]}>{p.label}</Text>
              <View style={[styles.pkgPriceRow, pkg === p.hours && styles.pkgPriceRowSelected]}>
                <Text style={[styles.pkgPrice, pkg === p.hours && styles.pkgPriceSelected]}>₹{p.price.toLocaleString("en-IN")}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Inclusions */}
        <View style={styles.inclusionCard}>
          <Text style={styles.inclusionTitle}>What's included</Text>
          <View style={styles.inclusionRow}>
            <Text style={styles.inclusionDot}>•</Text>
            <Text style={styles.inclusionText}>Unlimited stops within Bengaluru city</Text>
          </View>
          <View style={styles.inclusionRow}>
            <Text style={styles.inclusionDot}>•</Text>
            <Text style={styles.inclusionText}>Professional EV chauffeur</Text>
          </View>
          <View style={styles.inclusionRow}>
            <Text style={styles.inclusionDot}>•</Text>
            <Text style={styles.inclusionText}>GST included · No hidden charges</Text>
          </View>
          <View style={styles.inclusionRow}>
            <Text style={styles.inclusionDot}>•</Text>
            <Text style={styles.inclusionText}>Starts from your pickup location</Text>
          </View>
        </View>

        {/* Pickup */}
        <Text style={styles.sectionLabel}>Pickup Location</Text>
        <LocationAutocomplete
          placeholder="Enter pickup address"
          value={pickupAddress}
          onLocationSelect={(place) => {
            setPickupPlaceId(place.placeId);
            setPickupAddress(place.description);
          }}
        />

        {/* Date & Time */}
        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Start Date & Time</Text>
        <Pressable
          style={styles.dateRow}
          onPress={() => {
            if (Platform.OS === "web") {
              webDateRef.current?.showPicker?.();
            } else {
              setShowTimePicker(true);
            }
          }}
        >
          <Text style={styles.dateIcon}>📅</Text>
          <Text style={styles.dateText}>{formatDateTime(startDate)}</Text>
          {Platform.OS === "web" && (
            <input
              ref={webDateRef}
              type="datetime-local"
              style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
              value={toInputValue(startDate)}
              onChange={(e) => handleDateWeb(e.target.value)}
            />
          )}
        </Pressable>

        {/* iOS time picker modal */}
        {Platform.OS === "ios" && showTimePicker && (
          <Modal transparent animationType="slide">
            <View style={styles.pickerOverlay}>
              <View style={styles.pickerSheet}>
                <View style={styles.pickerHeader}>
                  <Pressable onPress={() => setShowTimePicker(false)}>
                    <Text style={styles.pickerDone}>Done</Text>
                  </Pressable>
                </View>
                {/* Inline date input for iOS */}
                <View style={{ padding: 20 }}>
                  <Text style={styles.pickerHint}>Enter date and time:</Text>
                  <TextInput
                    style={styles.pickerInput}
                    value={toInputValue(startDate)}
                    onChangeText={(v) => { const d = fromInputValue(v); if (d) setStartDate(d); }}
                    placeholder="YYYY-MM-DDTHH:MM"
                    placeholderTextColor={YL.ink3}
                  />
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* Passengers & Bags */}
        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Passengers & Bags</Text>
        <View style={styles.stepperCard}>
          <StepperRow
            label="Passengers"
            labelKn="ಪ್ರಯಾಣಿಕರು"
            value={passengers}
            min={1}
            max={6}
            onDecrement={() => setPassengers((v) => Math.max(1, v - 1))}
            onIncrement={() => setPassengers((v) => Math.min(6, v + 1))}
          />
          <View style={styles.stepperDivider} />
          <StepperRow
            label="Check-in Bags"
            labelKn="ಲಗೇಜ್"
            value={bags}
            min={0}
            max={6}
            onDecrement={() => setBags((v) => Math.max(0, v - 1))}
            onIncrement={() => setBags((v) => Math.min(6, v + 1))}
          />
        </View>

        {/* Price summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{pkg} hours · ₹499/hr + GST</Text>
            <Text style={styles.summaryValue}>₹{selected.price.toLocaleString("en-IN")}</Text>
          </View>
          <Text style={styles.summaryNote}>Same price for Yellow & Yellow Sky · Choose vehicle next</Text>
        </View>

        <Pressable
          style={[styles.cta, !canProceed && styles.ctaDisabled]}
          onPress={proceed}
          disabled={!canProceed}
        >
          <Text style={[styles.ctaText, !canProceed && styles.ctaTextDisabled]}>
            Choose Vehicle →
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function StepperRow({
  label, labelKn, value, min, max, onDecrement, onIncrement,
}: {
  label: string; labelKn: string; value: number; min: number; max: number;
  onDecrement: () => void; onIncrement: () => void;
}) {
  return (
    <View style={styles.stepperRow}>
      <View>
        <Text style={styles.stepperLabel}>{label}</Text>
        <Text style={styles.stepperKn}>{labelKn}</Text>
      </View>
      <View style={styles.stepperControls}>
        <Pressable
          style={[styles.stepBtn, value <= min && styles.stepBtnDisabled]}
          onPress={onDecrement}
          disabled={value <= min}
        >
          <Text style={[styles.stepBtnText, value <= min && styles.stepBtnTextDisabled]}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>{value}</Text>
        <Pressable
          style={[styles.stepBtn, value >= max && styles.stepBtnDisabled]}
          onPress={onIncrement}
          disabled={value >= max}
        >
          <Text style={[styles.stepBtnText, value >= max && styles.stepBtnTextDisabled]}>+</Text>
        </Pressable>
      </View>
    </View>
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

  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 0 },

  sectionLabel: { fontSize: 12, fontWeight: "600", color: YL.ink3, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8, marginTop: 4 },

  pkgRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  pkgCard: {
    flex: 1, backgroundColor: YL.card, borderRadius: 16,
    borderWidth: 1.5, borderColor: YL.line,
    padding: 14, alignItems: "center", gap: 4,
  },
  pkgCardSelected: { backgroundColor: YL.yellow, borderColor: YL.yellowDeep + "66" },
  pkgHours: { fontSize: 22, fontWeight: "700", color: YL.ink },
  pkgLabel: { fontSize: 11, color: YL.ink3 },
  pkgLabelSelected: { color: YL.ink, opacity: 0.7 },
  pkgTextSelected: { color: YL.ink },
  pkgPriceRow: {
    marginTop: 6, backgroundColor: YL.bg2, borderRadius: 100,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  pkgPriceRowSelected: { backgroundColor: YL.ink },
  pkgPrice: { fontSize: 11, fontWeight: "600", color: YL.ink },
  pkgPriceSelected: { color: YL.yellow },

  inclusionCard: {
    backgroundColor: YL.leafSoft, borderRadius: 14, padding: 14, marginBottom: 16, gap: 5,
  },
  inclusionTitle: { fontSize: 12, fontWeight: "600", color: YL.leaf, marginBottom: 2 },
  inclusionRow: { flexDirection: "row", gap: 6 },
  inclusionDot: { fontSize: 12, color: YL.leaf, lineHeight: 18 },
  inclusionText: { fontSize: 12, color: YL.leaf, lineHeight: 18, flex: 1 },

  dateRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: YL.card, borderRadius: 14, borderWidth: 1, borderColor: YL.line,
    padding: 14, marginBottom: 4,
  },
  dateIcon: { fontSize: 18 },
  dateText: { fontSize: 14, color: YL.ink, fontWeight: "500" },

  pickerOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000040" },
  pickerSheet: { backgroundColor: YL.card, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  pickerHeader: { padding: 16, alignItems: "flex-end", borderBottomWidth: 1, borderBottomColor: YL.line },
  pickerDone: { fontSize: 15, fontWeight: "600", color: YL.ink },
  pickerHint: { fontSize: 13, color: YL.ink2, marginBottom: 8 },
  pickerInput: {
    borderWidth: 1, borderColor: YL.line, borderRadius: 10,
    padding: 12, fontSize: 15, color: YL.ink, backgroundColor: YL.bg,
  },

  stepperCard: {
    backgroundColor: YL.card, borderRadius: 16, borderWidth: 1, borderColor: YL.line,
    overflow: "hidden", marginBottom: 16,
  },
  stepperDivider: { height: 1, backgroundColor: YL.line, marginHorizontal: 14 },
  stepperRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14 },
  stepperLabel: { fontSize: 14, fontWeight: "500", color: YL.ink },
  stepperKn: { fontSize: 11, color: YL.ink3, marginTop: 1 },
  stepperControls: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: YL.ink, justifyContent: "center", alignItems: "center",
  },
  stepBtnDisabled: { backgroundColor: YL.bg2 },
  stepBtnText: { fontSize: 18, color: YL.yellow, lineHeight: 22 },
  stepBtnTextDisabled: { color: YL.ink3 },
  stepValue: { fontSize: 16, fontWeight: "600", color: YL.ink, minWidth: 24, textAlign: "center" },

  summaryCard: {
    backgroundColor: YL.card, borderRadius: 14, borderWidth: 1, borderColor: YL.line,
    padding: 14, marginBottom: 24, gap: 6,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 13, color: YL.ink2 },
  summaryValue: { fontSize: 17, fontWeight: "700", color: YL.ink },
  summaryNote: { fontSize: 11, color: YL.ink3 },

  cta: {
    backgroundColor: YL.ink, borderRadius: 16, paddingVertical: 16,
    alignItems: "center", justifyContent: "center",
  },
  ctaDisabled: { backgroundColor: YL.bg2 },
  ctaText: { fontSize: 16, fontWeight: "600", color: YL.yellow },
  ctaTextDisabled: { color: YL.ink3 },
});

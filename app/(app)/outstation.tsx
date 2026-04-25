import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LocationAutocomplete, LocationData } from "../../components/location/LocationAutocomplete";
import { YL } from "../../constants/theme";
import { fetchPricing } from "../../lib/api";

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}
function roundTo15(d: Date) {
  const n = new Date(d);
  n.setMinutes(Math.round(n.getMinutes() / 15) * 15, 0, 0);
  return n;
}
function toLocalDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function OutstationScreen() {
  const [pickup, setPickup] = useState<LocationData>({ description: "", placeId: "" });
  const [destination, setDestination] = useState<LocationData>({ description: "", placeId: "" });
  const [tripVariant, setTripVariant] = useState<"one_way" | "round_trip">("one_way");
  const [dateTime, setDateTime] = useState<Date | null>(null);
  const [dateSelected, setDateSelected] = useState(false);
  const [passengers, setPassengers] = useState(1);
  const [luggage, setLuggage] = useState(1);
  const [pricing, setPricing] = useState<any>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date");
  const [isWebClient, setIsWebClient] = useState(false);
  const [isIOSWeb, setIsIOSWeb] = useState(false);

  const dateRef = useRef<HTMLInputElement | null>(null);
  const timeRef = useRef<HTMLInputElement | null>(null);
  const today = new Date(); today.setHours(0, 0, 0, 0);

  useEffect(() => {
    if (Platform.OS === "web") {
      setIsWebClient(true);
      setIsIOSWeb(/iPhone|iPad|iPod/.test(navigator.userAgent));
    }
  }, []);

  const canContinue = pickup.placeId.length > 0 && destination.placeId.length > 0 && dateSelected && pricing !== null;

  const fetchPrice = useCallback(async (pu: LocationData, dest: LocationData, variant: "one_way" | "round_trip") => {
    if (!pu.placeId || !dest.placeId) return;
    setLoadingPricing(true);
    setPricingError(null);
    try {
      const result = await fetchPricing({
        rideType: "outstation",
        originPlaceId: pu.placeId,
        destinationPlaceId: dest.placeId,
        tripVariant: variant,
      });
      setPricing(result);
    } catch (err) {
      setPricing(null);
      setPricingError(err instanceof Error ? err.message : "Unable to calculate price");
    } finally {
      setLoadingPricing(false);
    }
  }, []);

  useEffect(() => { fetchPrice(pickup, destination, tripVariant); }, [pickup.placeId, destination.placeId, tripVariant]);

  const openPicker = (mode: "date" | "time") => {
    if (Platform.OS === "web") {
      if (mode === "date") (dateRef.current as any)?.showPicker?.();
      else (timeRef.current as any)?.showPicker?.();
      return;
    }
    setPickerMode(mode); setShowPicker(true);
  };

  const onNativeChange = (event: any, selected?: Date) => {
    setShowPicker(false);
    if (event.type === "dismissed" || !selected) return;
    const base = dateTime ?? roundTo15(new Date());
    const n = new Date(base);
    if (pickerMode === "date") { n.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate()); setDateSelected(true); }
    else n.setHours(selected.getHours(), selected.getMinutes());
    setDateTime(n);
  };

  function proceed() {
    if (!canContinue || !dateTime || !pricing) return;
    const booking = {
      rideType: "outstation",
      vehicle: "yellow",
      tripVariant,
      passengers, luggage,
      price: pricing.vehicleOptions?.yellow?.totalPrice ?? pricing.totalPrice,
      pricing: { distanceKm: pricing.distanceKm, basePrice: pricing.basePrice, extraKmCharge: pricing.extraKmCharge, totalPrice: pricing.totalPrice, vehicleOptions: pricing.vehicleOptions },
      pickup: { location: pickup.description, placeName: pickup.placeName, placeId: pickup.placeId, lat: pickup.lat, lng: pickup.lng, time: fmtTime(dateTime), dateTime: dateTime.toISOString() },
      drop: { location: destination.description, placeName: destination.placeName, placeId: destination.placeId, lat: destination.lat, lng: destination.lng, dateTime: dateTime.toISOString() },
      stops: [],
    };
    router.push({ pathname: "/(app)/vehicle", params: { booking: JSON.stringify(booking), journeyId: `${Date.now()}` } });
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.chrome}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backIcon}>‹</Text>
        </Pressable>
        <Text style={s.screenTitle}>Outstation</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="always">
          <View style={s.body}>

            {/* Trip variant */}
            <View style={s.tabRow}>
              {(["one_way", "round_trip"] as const).map((v) => (
                <Pressable key={v} style={[s.tab, tripVariant === v && s.tabActive]}
                  onPress={() => setTripVariant(v)}>
                  <Text style={[s.tabText, tripVariant === v && s.tabTextActive]}>
                    {v === "one_way" ? "One-way" : "Round trip"}
                  </Text>
                  {v === "one_way" && <Text style={[s.tabSub, tripVariant === v && s.tabSubActive]}>25% off</Text>}
                </Pressable>
              ))}
            </View>

            {/* Route card */}
            <View style={s.card}>
              <Text style={s.cardLabel}>ROUTE · ಮಾರ್ಗ</Text>
              <View style={s.routeWrap}>
                <View style={s.routeRow}>
                  <View style={s.dotCol}>
                    <View style={[s.dot, { backgroundColor: YL.ink }]} />
                    <View style={s.dash} />
                  </View>
                  <View style={s.routeContent}>
                    <Text style={s.routeLabel}>FROM · ಎಲ್ಲಿಂದ</Text>
                    <LocationAutocomplete placeholder="Bengaluru pickup address" value={pickup.description} onLocationSelect={setPickup} />
                  </View>
                </View>
                <View style={s.routeRow}>
                  <View style={s.dotCol}>
                    <View style={[s.dot, { backgroundColor: YL.yellow, borderWidth: 1.5, borderColor: YL.ink }]} />
                  </View>
                  <View style={s.routeContent}>
                    <Text style={s.routeLabel}>TO · ಎಲ್ಲಿಗೆ</Text>
                    <LocationAutocomplete placeholder="Destination city or address" value={destination.description} onLocationSelect={setDestination} />
                  </View>
                </View>
              </View>
            </View>

            {/* Popular destinations */}
            <View>
              <Text style={s.sectionLabel}>POPULAR FROM BENGALURU</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
                {["Coorg", "Mysuru", "Ooty", "Chikmagalur", "Pondicherry", "Goa"].map((city) => (
                  <Pressable key={city} style={s.destChip}
                    onPress={() => setDestination({ description: city + ", Karnataka", placeId: "", placeName: city })}>
                    <Text style={s.destChipText}>{city}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Date & time */}
            <View style={s.card}>
              <Text style={s.cardLabel}>DEPARTURE · ಹೊರಡುವ ಸಮಯ</Text>
              <View style={s.row}>
                <Pressable style={[s.inputField, { flex: 1.2 }]} onPress={() => !isIOSWeb && openPicker("date")}>
                  <Text style={s.fieldLabel}>DATE</Text>
                  <Text style={[s.fieldValue, !dateTime && { color: YL.ink3 }]}>{dateTime ? fmtDate(dateTime) : "Select date"}</Text>
                  {isWebClient && !isIOSWeb && (
                    <input ref={dateRef} type="date" min={toLocalDateString(today)}
                      style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" } as any}
                      value={dateTime ? toLocalDateString(dateTime) : ""}
                      onChange={(e: any) => {
                        if (!e.target.value) return;
                        const [y, m, d] = e.target.value.split("-");
                        const base = dateTime ?? roundTo15(new Date());
                        const n = new Date(base); n.setFullYear(+y, +m - 1, +d);
                        setDateTime(n); setDateSelected(true);
                      }} />
                  )}
                </Pressable>
                <Pressable style={[s.inputField, { flex: 1 }]} onPress={() => !isIOSWeb && openPicker("time")}>
                  <Text style={s.fieldLabel}>TIME</Text>
                  <Text style={[s.fieldValue, !dateTime && { color: YL.ink3 }]}>{dateTime ? fmtTime(dateTime) : "Select"}</Text>
                  {isWebClient && !isIOSWeb && (
                    <input ref={timeRef} type="time"
                      style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" } as any}
                      value={dateTime ? dateTime.toTimeString().slice(0, 5) : ""}
                      onChange={(e: any) => {
                        const [h, m] = e.target.value.split(":");
                        const base = dateTime ?? roundTo15(new Date());
                        const n = new Date(base); n.setHours(+h, +m);
                        setDateTime(roundTo15(n));
                      }} />
                  )}
                </Pressable>
                {isIOSWeb && (
                  <input type="datetime-local" min={toLocalDateString(today) + "T00:00"}
                    style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" } as any}
                    value={dateTime ? `${toLocalDateString(dateTime)}T${dateTime.toTimeString().slice(0, 5)}` : ""}
                    onChange={(e: any) => { if (!e.target.value) return; setDateTime(roundTo15(new Date(e.target.value))); setDateSelected(true); }} />
                )}
              </View>
            </View>

            {/* Passengers */}
            <View style={s.card}>
              <Text style={s.cardLabel}>PASSENGERS & BAGS</Text>
              <StepperRow label="Passengers" sub="ಪ್ರಯಾಣಿಕರು" value={passengers} min={1} max={6} onChange={setPassengers} />
              <View style={s.divider} />
              <StepperRow label="Bags" sub="ಚೀಲಗಳು" value={luggage} min={0} max={8} onChange={setLuggage} />
            </View>

            {/* Price */}
            {loadingPricing && (
              <View style={s.pricingRow}>
                <ActivityIndicator size="small" color={YL.yellow} />
                <Text style={s.pricingText}>Calculating fare…</Text>
              </View>
            )}
            {pricingError && <Text style={s.errorText}>{pricingError}</Text>}
            {pricing && !loadingPricing && (
              <View style={s.priceCard}>
                <View style={s.priceRow}>
                  <Text style={s.priceLabel}>Distance</Text>
                  <Text style={s.priceVal}>{pricing.distanceKm} km</Text>
                </View>
                <View style={s.priceRow}>
                  <Text style={s.priceLabel}>{tripVariant === "round_trip" ? "Round trip · ₹32/km × 2" : "One-way · ₹32/km × 0.75"}</Text>
                  <Text style={s.priceTotal}>₹{(pricing.vehicleOptions?.yellow?.totalPrice ?? pricing.totalPrice).toLocaleString("en-IN")}</Text>
                </View>
                <Text style={s.priceNote}>Tolls & GST included · Driver allowance included</Text>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={s.ctaWrap}>
          <Pressable style={[s.cta, (!canContinue || loadingPricing) && s.ctaDisabled]} onPress={proceed} disabled={!canContinue || loadingPricing}>
            <Text style={s.ctaText}>Choose vehicle →</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {Platform.OS === "android" && showPicker && (
        <DateTimePicker value={dateTime ?? new Date()} mode={pickerMode} is24Hour={false} display="default"
          minimumDate={pickerMode === "date" ? today : undefined} onChange={onNativeChange} />
      )}
      {Platform.OS === "ios" && (
        <Modal transparent visible={showPicker} animationType="slide" onRequestClose={() => setShowPicker(false)}>
          <View style={s.overlay}>
            <Pressable style={{ flex: 1 }} onPress={() => setShowPicker(false)} />
            <View style={s.sheet}>
              <View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>Select {pickerMode === "date" ? "Date" : "Time"}</Text>
                <Pressable onPress={() => setShowPicker(false)}><Text style={s.sheetDone}>Done</Text></Pressable>
              </View>
              <DateTimePicker value={dateTime ?? new Date()} mode={pickerMode} display="spinner" minuteInterval={15}
                minimumDate={pickerMode === "date" ? today : undefined}
                onChange={(_, d) => { if (d) { setDateTime(d); if (pickerMode === "date") setDateSelected(true); } }}
                textColor="black" style={{ width: "100%", height: 200 }} />
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

function StepperRow({ label, sub, value, min, max, onChange }: { label: string; sub: string; value: number; min: number; max: number; onChange(v: number): void }) {
  return (
    <View style={s.stepRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.stepLabel}>{label}</Text>
        <Text style={s.stepKn}>{sub}</Text>
      </View>
      <View style={s.stepControls}>
        <Pressable style={[s.stepBtn, value <= min && s.stepBtnOff]} onPress={() => value > min && onChange(value - 1)}>
          <Text style={[s.stepBtnTxt, value <= min && s.stepBtnTxtOff]}>−</Text>
        </Pressable>
        <Text style={s.stepVal}>{value}</Text>
        <Pressable style={[s.stepBtn, value >= max && s.stepBtnOff]} onPress={() => value < max && onChange(value + 1)}>
          <Text style={[s.stepBtnTxt, value >= max && s.stepBtnTxtOff]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: YL.bg },
  chrome: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, minHeight: 56 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: YL.bg2, justifyContent: "center", alignItems: "center" },
  backIcon: { fontSize: 24, color: YL.ink, marginTop: -2 },
  screenTitle: { fontSize: 16, fontWeight: "600", color: YL.ink },
  body: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  tabRow: { flexDirection: "row", gap: 8 },
  tab: { flex: 1, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: YL.card, borderWidth: 1.5, borderColor: YL.line, alignItems: "center", gap: 2 },
  tabActive: { backgroundColor: YL.yellow, borderColor: YL.ink },
  tabText: { fontSize: 14, fontWeight: "500", color: YL.ink2 },
  tabTextActive: { fontWeight: "600", color: YL.ink },
  tabSub: { fontSize: 11, color: YL.leaf, fontWeight: "600" },
  tabSubActive: { color: YL.ink, opacity: 0.7 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: YL.ink3, letterSpacing: 0.5, marginBottom: 8 },
  card: { backgroundColor: YL.card, borderRadius: 18, borderWidth: 1, borderColor: YL.line, padding: 16, gap: 10 },
  cardLabel: { fontSize: 11, fontWeight: "700", color: YL.ink3, letterSpacing: 0.5 },
  routeWrap: {},
  routeRow: { flexDirection: "row", alignItems: "stretch", minHeight: 52 },
  dotCol: { width: 24, alignItems: "center", paddingTop: 4 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dash: { flex: 1, width: 0, borderLeftWidth: 1.5, borderLeftColor: YL.line, borderStyle: "dashed", marginVertical: 4 },
  routeContent: { flex: 1, paddingBottom: 12, paddingLeft: 8, overflow: "visible" },
  routeLabel: { fontSize: 10.5, fontWeight: "700", color: YL.ink3, letterSpacing: 0.3, marginBottom: 3 },
  destChip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: YL.card, borderRadius: 100, borderWidth: 1, borderColor: YL.line },
  destChipText: { fontSize: 13, fontWeight: "500", color: YL.ink },
  row: { flexDirection: "row", gap: 10, position: "relative" },
  inputField: { backgroundColor: YL.bg2, borderRadius: 12, padding: 12, position: "relative" },
  fieldLabel: { fontSize: 10.5, fontWeight: "600", color: YL.ink3, letterSpacing: 0.3, marginBottom: 4 },
  fieldValue: { fontSize: 15, fontWeight: "600", color: YL.ink },
  divider: { height: 1, backgroundColor: YL.lineSoft },
  stepRow: { flexDirection: "row", alignItems: "center", paddingVertical: 2 },
  stepLabel: { fontSize: 15, fontWeight: "500", color: YL.ink },
  stepKn: { fontSize: 11.5, color: YL.ink3, marginTop: 1 },
  stepControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: YL.ink, justifyContent: "center", alignItems: "center" },
  stepBtnOff: { backgroundColor: YL.bg2 },
  stepBtnTxt: { fontSize: 20, fontWeight: "500", color: "#fff", lineHeight: 24 },
  stepBtnTxtOff: { color: YL.ink3 },
  stepVal: { width: 28, textAlign: "center", fontSize: 20, fontWeight: "600", color: YL.ink },
  pricingRow: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", padding: 14, backgroundColor: YL.yellowSoft, borderRadius: 14 },
  pricingText: { fontSize: 14, color: YL.ink2 },
  errorText: { fontSize: 12.5, color: "#EF4444", fontWeight: "500", paddingHorizontal: 4 },
  priceCard: { backgroundColor: YL.card, borderRadius: 16, borderWidth: 1, borderColor: YL.line, padding: 14, gap: 6 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceLabel: { fontSize: 13, color: YL.ink2 },
  priceVal: { fontSize: 13, color: YL.ink, fontWeight: "500" },
  priceTotal: { fontSize: 18, fontWeight: "700", color: YL.ink },
  priceNote: { fontSize: 11.5, color: YL.ink3, marginTop: 2 },
  ctaWrap: { padding: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: YL.lineSoft, backgroundColor: YL.bg },
  cta: { height: 56, backgroundColor: YL.ink, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  ctaDisabled: { backgroundColor: YL.line },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "600", letterSpacing: -0.2 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 10 },
  sheetTitle: { fontSize: 16, fontWeight: "600", color: YL.ink2 },
  sheetDone: { fontSize: 16, fontWeight: "700", color: YL.ink },
});

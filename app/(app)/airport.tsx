import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LocationAutocomplete, LocationData } from "../../components/location/LocationAutocomplete";
import { YL } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import {
  checkAvailability, checkBlocked, fetchFlight, fetchPricing,
  trackJourneyStage,
} from "../../lib/api";
import { BookingUI } from "../../types/booking-ui";

const BLR_AIRPORT_PLACE_ID = "ChIJLYXWgMIWrjsRaPq-dJ38diA";
const BLR_AIRPORT_NAME = "Kempegowda International Airport Bengaluru";
const BLR_AIRPORT_LAT = 13.1986;
const BLR_AIRPORT_LNG = 77.7066;

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}
function parseLocalTime(s: string) {
  const m = s.match(/(\d{2}):(\d{2})/);
  if (!m) return s;
  let h = parseInt(m[1], 10); const min = m[2];
  const ap = h >= 12 ? "pm" : "am"; h = h % 12 || 12;
  return `${h}:${min} ${ap}`;
}
function parseLocalDate(s: string) {
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}
function toFlightDate(s: string) { return new Date(s.replace(" ", "T")); }
function roundTo15(d: Date) {
  const n = new Date(d);
  n.setMinutes(Math.round(n.getMinutes() / 15) * 15, 0, 0);
  return n;
}
function toLocalDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AirportScreen() {
  const { user } = useAuth();
  const [tripType, setTripType] = useState<"pickup" | "drop">("drop");
  const [dateTime, setDateTime] = useState<Date | null>(null);
  const [dateSelected, setDateSelected] = useState(false);
  const [flightNo, setFlightNo] = useState("");
  const [flightData, setFlightData] = useState<any>(null);
  const [flightError, setFlightError] = useState<string | null>(null);
  const [loadingFlight, setLoadingFlight] = useState(false);
  const [locationData, setLocationData] = useState<LocationData>({ description: "", placeId: "" });
  const [stops, setStops] = useState<LocationData[]>([]);
  const [pricing, setPricing] = useState<any>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [passengers, setPassengers] = useState(1);
  const [luggage, setLuggage] = useState(1);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date");
  const [isWebClient, setIsWebClient] = useState(false);
  const [isIOSWeb, setIsIOSWeb] = useState(false);

  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const timeInputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const lastLookedUpRef = useRef("");
  const flightYRef = useRef(0);
  const today = new Date(); today.setHours(0, 0, 0, 0);

  useEffect(() => {
    if (Platform.OS === "web") {
      setIsWebClient(true);
      setIsIOSWeb(/iPhone|iPad|iPod/.test(navigator.userAgent));
    }
  }, []);

  const hasBlockingFlightError = flightNo.trim().length > 0 && flightError !== null;
  const canContinue = dateSelected && dateTime !== null && locationData.placeId.length > 0 && pricing !== null && !hasBlockingFlightError;

  const handleLocationSelect = useCallback(async (loc: LocationData) => {
    setLocationData(loc);
    setPricingError(null);
    if (!loc.placeId) { setPricing(null); return; }
    setLoadingPricing(true);
    try {
      const validStops = stops.filter(s => s.placeId).map(s => s.placeId);
      const result = await fetchPricing({
        rideType: "airport",
        tripType,
        ...(loc.lat != null && loc.lng != null ? { origin: `${loc.lat},${loc.lng}` } : {}),
        originPlaceId: loc.placeId,
        ...(validStops.length > 0 ? { stops: validStops } : {}),
      });
      setPricing(result);
    } catch (err) {
      setPricing(null);
      setPricingError(err instanceof Error ? err.message : "Unable to calculate price");
    } finally {
      setLoadingPricing(false);
    }
  }, [tripType, stops]);

  useEffect(() => { if (locationData.placeId) handleLocationSelect(locationData); }, [tripType]);
  useEffect(() => { if (locationData.placeId) handleLocationSelect(locationData); }, [stops]);

  const lookupFlight = useCallback(async () => {
    const cleaned = flightNo.replace(/\s+/g, "").toUpperCase();
    if (!cleaned || cleaned.length < 4) return;
    if (cleaned === lastLookedUpRef.current && flightData) return;
    if (!dateTime || !dateSelected) { setFlightError("Please select a date first"); return; }
    lastLookedUpRef.current = cleaned;
    setLoadingFlight(true);
    try {
      setFlightError(null);
      const flight = await fetchFlight(cleaned, dateTime);
      const isBLR = flight.from.code === "BLR" || flight.to.code === "BLR";
      if (!isBLR) { setFlightData(null); setFlightError("Only flights to or from BLR are supported"); return; }
      if (tripType === "pickup" && flight.to.code !== "BLR") { setFlightData(null); setFlightError("This flight departs from BLR. For airport pickup, enter an arriving flight."); return; }
      if (tripType === "drop" && flight.from.code !== "BLR") { setFlightData(null); setFlightError("This flight arrives at BLR. For airport drop, enter a departing flight."); return; }
      setFlightData(flight);
    } catch (err) {
      setFlightData(null);
      setFlightError(err instanceof Error ? err.message : "Flight not found");
    } finally {
      setLoadingFlight(false);
    }
  }, [flightNo, dateTime, dateSelected, tripType]);

  const openPicker = useCallback((mode: "date" | "time") => {
    if (Platform.OS === "web") {
      if (mode === "date") (dateInputRef.current as any)?.showPicker?.();
      if (mode === "time") (timeInputRef.current as any)?.showPicker?.();
      return;
    }
    setPickerMode(mode); setShowPicker(true);
  }, []);

  const onNativeChange = useCallback((event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (event.type === "dismissed" || !selectedDate) return;
    const base = dateTime ?? roundTo15(new Date());
    const n = new Date(base);
    if (pickerMode === "date") { n.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()); setDateSelected(true); }
    else n.setHours(selectedDate.getHours(), selectedDate.getMinutes());
    setDateTime(n);
  }, [dateTime, pickerMode]);

  function buildPayload(): BookingUI | null {
    if (!pricing || !dateTime) return null;
    let blrTerminal = "—";
    if (flightData) {
      if (flightData.from.code === "BLR") blrTerminal = flightData.from.terminal ?? "—";
      else if (flightData.to.code === "BLR") blrTerminal = flightData.to.terminal ?? "—";
    }
    return {
      rideType: "airport",
      vehicle: "yellow",
      tripType,
      passengers, luggage,
      price: pricing.vehicleOptions?.yellow?.totalPrice ?? pricing.totalPrice,
      pricing: { distanceKm: pricing.distanceKm, basePrice: pricing.basePrice, extraKmCharge: pricing.extraKmCharge, totalPrice: pricing.totalPrice, vehicleOptions: pricing.vehicleOptions },
      flight: flightData ? {
        airline: flightData.airline, flightNumber: flightNo,
        from: flightData.from.code, to: flightData.to.code,
        departureTime: parseLocalTime(flightData.from.scheduledTime),
        arrivalTime: parseLocalTime(flightData.to.scheduledTime),
        terminal: blrTerminal, status: flightData.status,
        date: fmtDate(dateTime), departureDate: parseLocalDate(flightData.from.scheduledTime),
        arrivalDate: parseLocalDate(flightData.to.scheduledTime),
      } : undefined,
      pickup: tripType === "drop"
        ? { location: locationData.description, placeName: locationData.placeName, placeId: locationData.placeId, lat: locationData.lat, lng: locationData.lng, time: fmtTime(dateTime), dateTime: dateTime.toISOString() }
        : { location: BLR_AIRPORT_NAME, placeId: BLR_AIRPORT_PLACE_ID, lat: BLR_AIRPORT_LAT, lng: BLR_AIRPORT_LNG, time: fmtTime(dateTime), dateTime: dateTime.toISOString() },
      drop: tripType === "drop"
        ? { location: BLR_AIRPORT_NAME, placeId: BLR_AIRPORT_PLACE_ID, lat: BLR_AIRPORT_LAT, lng: BLR_AIRPORT_LNG, dateTime: dateTime.toISOString() }
        : { location: locationData.description, placeName: locationData.placeName, placeId: locationData.placeId, lat: locationData.lat, lng: locationData.lng, dateTime: dateTime.toISOString() },
      stops: stops.filter(s => s.placeId).map(s => ({ location: s.description, placeName: s.placeName, placeId: s.placeId })),
    } as any;
  }

  const proceed = useCallback(async () => {
    if (!canContinue || !pricing || !dateTime) return;
    const bookingPayload = buildPayload();
    if (!bookingPayload) return;

    // Check pickup time warning for airport pickup
    if (tripType === "pickup" && flightData) {
      const flightArrival = toFlightDate(flightData.to.scheduledTime);
      const diff = (dateTime.getTime() - flightArrival.getTime()) / 60000;
      if (diff < -15 || diff > 60) {
        const msg = `Your flight lands at ${fmtTime(flightArrival)}. Are you sure you want pickup at ${fmtTime(dateTime)}?`;
        if (Platform.OS === "web") {
          if (!window.confirm(msg)) return;
        } else {
          const ok = await new Promise<boolean>(res => Alert.alert("Confirm Pickup Time", msg, [{ text: "Change", style: "cancel", onPress: () => res(false) }, { text: "Confirm", onPress: () => res(true) }]));
          if (!ok) return;
        }
      }
    }

    // 3-hour lead time
    const minLead = new Date(Date.now() + 3 * 60 * 60 * 1000);
    if (dateTime < minLead) {
      router.push({ pathname: "/(app)/unavailable", params: { reason: "lead_time_required", booking: JSON.stringify(bookingPayload) } });
      return;
    }

    let journeyId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    try {
      const tracked = await trackJourneyStage({ stage: "fare_check_started", page: "/airport", eventAt: new Date().toISOString(), metadata: { tripType: bookingPayload.tripType, fareAmount: bookingPayload.price, passengers, luggage } });
      journeyId = tracked.journeyId;
    } catch {}

    setCheckingAvailability(true);
    try {
      const blocked = await checkBlocked(dateTime.toISOString());
      if (blocked) { router.push({ pathname: "/(app)/unavailable", params: { reason: "blocked_slot", booking: JSON.stringify(bookingPayload) } }); return; }
      const avail = await checkAvailability(dateTime.toISOString());
      if (!avail.checkFailed && !avail.available) { router.push({ pathname: "/(app)/unavailable", params: { reason: "capacity_full", booking: JSON.stringify(bookingPayload) } }); return; }
    } finally {
      setCheckingAvailability(false);
    }

    router.push({ pathname: "/(app)/vehicle", params: { booking: JSON.stringify(bookingPayload), journeyId } });
  }, [canContinue, pricing, dateTime, tripType, flightData, passengers, luggage]);

  return (
    <SafeAreaView style={s.root}>
      <View style={s.chrome}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backIcon}>‹</Text>
        </Pressable>
        <Text style={s.screenTitle}>Airport ride</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="always" overScrollMode="never">
          <View style={s.body}>

            {/* Trip type tabs */}
            <View style={s.tabRow}>
              {(["drop", "pickup"] as const).map((t) => (
                <Pressable key={t} style={[s.tab, tripType === t && s.tabActive]} onPress={() => { setTripType(t); setFlightData(null); setFlightNo(""); setPricing(null); setPricingError(null); setStops([]); }}>
                  <Text style={[s.tabText, tripType === t && s.tabTextActive]}>
                    {t === "drop" ? "✈ To airport" : "✈ From airport"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Date & time */}
            <View style={s.card}>
              <Text style={s.cardLabel}>DATE & TIME</Text>
              <View style={s.row}>
                <Pressable style={[s.inputField, { flex: 1 }]} onPress={() => !isIOSWeb && openPicker("date")}>
                  <Text style={s.fieldLabel}>PICKUP DATE</Text>
                  <Text style={[s.fieldValue, !dateTime && { color: YL.ink3 }]}>{dateTime ? fmtDate(dateTime) : "Select date"}</Text>
                  {isWebClient && !isIOSWeb && (
                    <input ref={dateInputRef} type="date" min={toLocalDateString(today)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" } as any}
                      value={dateTime ? toLocalDateString(dateTime) : ""}
                      onChange={(e: any) => {
                        if (!e.target.value) return;
                        const [y, m, d] = e.target.value.split("-");
                        const base = dateTime ?? roundTo15(new Date());
                        const n = new Date(base); n.setFullYear(+y, +m - 1, +d);
                        if (n < today) return;
                        setDateTime(n); setDateSelected(true);
                      }} />
                  )}
                </Pressable>
                <Pressable style={[s.inputField, { flex: 1 }]} onPress={() => !isIOSWeb && openPicker("time")}>
                  <Text style={s.fieldLabel}>TIME</Text>
                  <Text style={[s.fieldValue, !dateTime && { color: YL.ink3 }]}>{dateTime ? fmtTime(dateTime) : "Select time"}</Text>
                  {isWebClient && !isIOSWeb && (
                    <input ref={timeInputRef} type="time" style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" } as any}
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
                  <input type="datetime-local" min={toLocalDateString(today) + "T00:00"} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" } as any}
                    value={dateTime ? `${toLocalDateString(dateTime)}T${dateTime.toTimeString().slice(0, 5)}` : ""}
                    onChange={(e: any) => { if (!e.target.value) return; const n = new Date(e.target.value); if (n < today) return; setDateTime(roundTo15(n)); setDateSelected(true); }} />
                )}
              </View>
            </View>

            {/* Flight */}
            <View style={s.card}>
              <Text style={s.cardLabel}>FLIGHT NUMBER (optional)</Text>
              <View style={[s.row, { alignItems: "center", gap: 8 }]} onLayout={e => { flightYRef.current = e.nativeEvent.layout.y; }}>
                <TextInput
                  style={[s.flightInput, Platform.OS === "web" && ({ outlineStyle: "none" } as any)]}
                  placeholder="e.g. AI 2814"
                  placeholderTextColor={YL.ink3}
                  value={flightNo}
                  autoCapitalize="characters"
                  onChangeText={(t) => { setFlightNo(t.toUpperCase()); setFlightData(null); setFlightError(null); lastLookedUpRef.current = ""; }}
                  onBlur={lookupFlight}
                  onKeyPress={(e) => { if (Platform.OS === "web" && (e.nativeEvent.key === "Enter" || e.nativeEvent.key === "Tab")) lookupFlight(); }}
                />
                {loadingFlight && <ActivityIndicator size="small" color={YL.yellow} />}
                {flightData && <Text style={s.flightSuccess}>✓ {flightData.airline}</Text>}
              </View>
              {flightError && <Text style={s.errorText}>{flightError}</Text>}
            </View>

            {/* Route */}
            <View style={s.card}>
              <Text style={s.cardLabel}>ROUTE</Text>
              <View style={s.routeWrap}>
                {/* Origin */}
                <View style={s.routeRow}>
                  <View style={s.dotCol}>
                    <View style={[s.dot, { backgroundColor: YL.ink }]} />
                    <View style={s.dash} />
                  </View>
                  <View style={s.routeContent}>
                    <Text style={s.routeLabel}>PICKUP</Text>
                    {tripType === "pickup" ? (
                      <>
                        <Text style={s.routeFixed}>BLR · Kempegowda International</Text>
                        <Text style={s.routeHint}>Terminal based on your flight</Text>
                      </>
                    ) : (
                      <LocationAutocomplete placeholder="Enter pickup address" value={locationData.description} onLocationSelect={handleLocationSelect} />
                    )}
                  </View>
                </View>
                {/* Stops */}
                {stops.map((stop, i) => (
                  <View key={i} style={s.routeRow}>
                    <View style={s.dotCol}>
                      <View style={[s.dot, { backgroundColor: YL.gulmohar }]} />
                      <View style={s.dash} />
                    </View>
                    <View style={[s.routeContent, { zIndex: 999 - i }]}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={s.routeLabel}>STOP {i + 1}</Text>
                        <Pressable onPress={() => setStops(p => p.filter((_, j) => j !== i))}>
                          <Text style={{ color: YL.ink3, fontSize: 18 }}>×</Text>
                        </Pressable>
                      </View>
                      <LocationAutocomplete placeholder="Enter stop location" value={stop.description} onLocationSelect={(loc) => setStops(p => { const u = [...p]; u[i] = loc; return u; })} />
                    </View>
                  </View>
                ))}
                {/* Destination */}
                <View style={s.routeRow}>
                  <View style={s.dotCol}>
                    <View style={[s.dot, { backgroundColor: YL.yellow, borderWidth: 1.5, borderColor: YL.ink }]} />
                  </View>
                  <View style={s.routeContent}>
                    <Text style={s.routeLabel}>DROP</Text>
                    {tripType === "drop" ? (
                      <>
                        <Text style={s.routeFixed}>BLR · Kempegowda International</Text>
                        <Text style={s.routeHint}>Terminal based on your flight</Text>
                      </>
                    ) : (
                      <LocationAutocomplete placeholder="Enter drop address" value={locationData.description} onLocationSelect={handleLocationSelect} />
                    )}
                  </View>
                </View>
              </View>
              {stops.length < 2 && (
                <Pressable style={s.addStopBtn} onPress={() => setStops(p => [...p, { description: "", placeId: "" }])}>
                  <Text style={s.addStopText}>+ Add a stop</Text>
                </Pressable>
              )}
            </View>

            {/* Passengers & luggage */}
            <View style={s.card}>
              <Text style={s.cardLabel}>PASSENGERS & BAGS</Text>
              <StepperRow label="Passengers" sub="ಪ್ರಯಾಣಿಕರು" value={passengers} min={1} max={6} onChange={setPassengers} />
              <View style={s.divider} />
              <StepperRow label="Bags" sub="ಚೀಲಗಳು" value={luggage} min={0} max={10} onChange={setLuggage} />
            </View>

            {/* Pricing */}
            {loadingPricing && (
              <View style={s.pricingLoading}>
                <ActivityIndicator size="small" color={YL.yellow} />
                <Text style={s.pricingLoadingText}>Calculating fare…</Text>
              </View>
            )}
            {pricingError && <Text style={s.errorText}>{pricingError}</Text>}
            {pricing && !loadingPricing && (
              <View style={s.priceChip}>
                <Text style={s.priceChipDist}>{pricing.distanceKm} km</Text>
                <Text style={s.priceChipAmt}>from ₹{(pricing.vehicleOptions?.yellow?.totalPrice ?? pricing.totalPrice).toLocaleString("en-IN")}</Text>
              </View>
            )}

          </View>
        </ScrollView>

        {/* CTA */}
        <View style={s.ctaWrap}>
          <Pressable
            style={[s.cta, (!canContinue || loadingPricing || checkingAvailability) && s.ctaDisabled]}
            onPress={proceed}
            disabled={!canContinue || loadingPricing || checkingAvailability}
          >
            {checkingAvailability
              ? <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><ActivityIndicator size="small" color="#fff" /><Text style={s.ctaText}>Checking availability…</Text></View>
              : <Text style={s.ctaText}>Choose vehicle →</Text>
            }
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Native pickers */}
      {Platform.OS === "android" && showPicker && (
        <DateTimePicker value={dateTime ?? new Date()} mode={pickerMode} is24Hour={false} display="default" minimumDate={pickerMode === "date" ? today : undefined} onChange={onNativeChange} />
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
              <DateTimePicker value={dateTime ?? new Date()} mode={pickerMode} display="spinner" minuteInterval={15} minimumDate={pickerMode === "date" ? today : undefined}
                onChange={(_, d) => { if (d) { setDateTime(d); if (pickerMode === "date") setDateSelected(true); } }} textColor="black" style={{ width: "100%", height: 200 }} />
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
        <Pressable style={[s.stepBtn, value <= min && s.stepBtnDisabled]} onPress={() => value > min && onChange(value - 1)}>
          <Text style={[s.stepBtnText, value <= min && s.stepBtnTextDisabled]}>−</Text>
        </Pressable>
        <Text style={s.stepValue}>{value}</Text>
        <Pressable style={[s.stepBtn, value >= max && s.stepBtnDisabled]} onPress={() => value < max && onChange(value + 1)}>
          <Text style={[s.stepBtnText, value >= max && s.stepBtnTextDisabled]}>+</Text>
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
  tab: { flex: 1, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: YL.card, borderWidth: 1.5, borderColor: YL.line, alignItems: "center" },
  tabActive: { backgroundColor: YL.yellow, borderColor: YL.ink },
  tabText: { fontSize: 14, fontWeight: "500", color: YL.ink2 },
  tabTextActive: { fontWeight: "600", color: YL.ink },
  card: { backgroundColor: YL.card, borderRadius: 18, borderWidth: 1, borderColor: YL.line, padding: 16, gap: 10 },
  cardLabel: { fontSize: 11, fontWeight: "700", color: YL.ink3, letterSpacing: 0.5 },
  row: { flexDirection: "row", gap: 12 },
  inputField: { backgroundColor: YL.bg2, borderRadius: 12, padding: 12, position: "relative" },
  fieldLabel: { fontSize: 10.5, fontWeight: "600", color: YL.ink3, letterSpacing: 0.3, marginBottom: 4 },
  fieldValue: { fontSize: 15, fontWeight: "600", color: YL.ink },
  flightInput: { flex: 1, fontSize: 16, fontWeight: "600", color: YL.ink, padding: 0, height: 28 },
  flightSuccess: { fontSize: 12, color: YL.leaf, fontWeight: "600" },
  errorText: { fontSize: 12.5, color: "#EF4444", fontWeight: "500" },
  routeWrap: { gap: 0 },
  routeRow: { flexDirection: "row", alignItems: "stretch", minHeight: 52 },
  dotCol: { width: 24, alignItems: "center", paddingTop: 4 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dash: { flex: 1, width: 0, borderLeftWidth: 1.5, borderLeftColor: YL.line, borderStyle: "dashed", marginVertical: 4 },
  routeContent: { flex: 1, paddingBottom: 12, paddingLeft: 8, overflow: "visible" },
  routeLabel: { fontSize: 10.5, fontWeight: "700", color: YL.ink3, letterSpacing: 0.3, marginBottom: 3 },
  routeFixed: { fontSize: 15, fontWeight: "500", color: YL.ink },
  routeHint: { fontSize: 11, color: YL.ink3, marginTop: 2 },
  addStopBtn: { flexDirection: "row", alignItems: "center", paddingTop: 4 },
  addStopText: { fontSize: 13, fontWeight: "600", color: YL.ink2 },
  divider: { height: 1, backgroundColor: YL.lineSoft },
  stepRow: { flexDirection: "row", alignItems: "center", paddingVertical: 2 },
  stepLabel: { fontSize: 15, fontWeight: "500", color: YL.ink },
  stepKn: { fontSize: 11.5, color: YL.ink3, marginTop: 1 },
  stepControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: YL.ink, justifyContent: "center", alignItems: "center" },
  stepBtnDisabled: { backgroundColor: YL.bg2 },
  stepBtnText: { fontSize: 20, fontWeight: "500", color: "#fff", lineHeight: 24 },
  stepBtnTextDisabled: { color: YL.ink3 },
  stepValue: { width: 28, textAlign: "center", fontSize: 20, fontWeight: "600", color: YL.ink },
  pricingLoading: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", padding: 14, backgroundColor: YL.yellowSoft, borderRadius: 14 },
  pricingLoadingText: { fontSize: 14, color: YL.ink2 },
  priceChip: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: YL.leafSoft, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  priceChipDist: { fontSize: 13, color: YL.leaf, fontWeight: "600" },
  priceChipAmt: { fontSize: 16, fontWeight: "700", color: YL.ink },
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

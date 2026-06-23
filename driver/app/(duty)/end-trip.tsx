import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YL, FONTS } from '@/constants/theme';
import { useDuty } from '@/context/DutyContext';
import { useDriverAuth } from '@/context/DriverAuthContext';
import { saveReading, updateBookingStatus } from '@/lib/api';
import { calcKwh, calcEfficiency, calcCo2Grams } from '@/lib/energy';

export default function EndTripScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bookings, currentBooking, addReading, readingByType } = useDuty();

  const booking = bookings.find((b) => b.id === id) ?? currentBooking;
  const bookingId = booking?.id ?? id ?? '';

  const tripStartReading =
    readingByType('trip_start', bookingId) ??
    readingByType('handoff', bookingId);

  const startOdo: number = (tripStartReading as any)?.odometer ?? 0;
  const startSoc: number = (tripStartReading as any)?.soc ?? 100;

  const [odometer, setOdometer] = useState('');
  const [soc, setSoc] = useState('');
  const [expenses, setExpenses] = useState('0');

  const endOdo = parseFloat(odometer) || 0;
  const endSoc = parseFloat(soc) || 0;

  const tripDistanceKm = endOdo > startOdo ? endOdo - startOdo : 0;
  const pricingDistanceKm: number =
    (booking?.pricing as any)?.distanceKm ?? tripDistanceKm ?? 0;
  const displayDistanceKm = tripDistanceKm > 0 ? tripDistanceKm : pricingDistanceKm;

  // Battery kWh: use vehicle data if available, fallback to Kia Carens EV (42 kWh)
  const { driver } = useDriverAuth()
  const batteryKwh = driver?.assignedVehicle?.isEv ? 42 : 0

  const kwh = useMemo(
    () => batteryKwh > 0 ? calcKwh(startSoc, endSoc > 0 ? endSoc : startSoc, batteryKwh) : 0,
    [startSoc, endSoc, batteryKwh],
  );
  const efficiency = useMemo(
    () => calcEfficiency(displayDistanceKm, kwh),
    [displayDistanceKm, kwh],
  );
  const co2Grams = useMemo(
    () => calcCo2Grams(displayDistanceKm),
    [displayDistanceKm],
  );

  const totalPrice: number =
    (booking?.pricing as any)?.totalPrice ?? 0;
  const tripCode = bookingId.slice(-6).toUpperCase();

  // Fare is only the driver's business when they collect it
  const driverCollects =
    Boolean((booking as any)?.driverCollect) && booking?.paymentStatus !== 'paid';

  const canSubmit = odometer.length > 0 && soc.length > 0;
  const [completing, setCompleting] = useState(false);

  async function handleSubmit() {
    if (!canSubmit || completing) return;
    const reading = {
      type: 'trip_end' as const,
      bookingId,
      odometer: endOdo,
      soc: endSoc,
    };
    try {
      await saveReading(reading);
    } catch (_) {}
    addReading({ ...reading, timestamp: new Date().toISOString() });
    if (driverCollects) {
      router.push(`/(duty)/payment?id=${bookingId}`);
      return;
    }
    // Pre-paid / billed rides: no collection step — complete the trip
    setCompleting(true);
    try {
      await updateBookingStatus(bookingId, 'completed');
    } catch (_) {}
    setCompleting(false);
    router.replace(`/(duty)/review-request?id=${bookingId}`);
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.safeTop, { height: insets.top, backgroundColor: YL.bg }]} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>End Trip</Text>
          <View style={styles.tripCodePill}>
            <Text style={styles.tripCodeText}>{tripCode}</Text>
          </View>
        </View>

        {/* Trip-end readings */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>TRIP END READINGS</Text>
        </View>

        <View style={styles.readingsCard}>
          <View style={styles.readingRow}>
            <View style={styles.readingField}>
              <Text style={styles.readingLabel}>Odometer (km)</Text>
              <TextInput
                style={styles.readingInput}
                value={odometer}
                onChangeText={setOdometer}
                keyboardType="numeric"
                placeholder="e.g. 45230"
                placeholderTextColor={YL.ink3}
              />
            </View>
            <View style={styles.readingDivider} />
            <View style={styles.readingField}>
              <Text style={styles.readingLabel}>Battery SoC (%)</Text>
              <TextInput
                style={styles.readingInput}
                value={soc}
                onChangeText={setSoc}
                keyboardType="numeric"
                placeholder="e.g. 62"
                placeholderTextColor={YL.ink3}
              />
            </View>
          </View>

          {tripDistanceKm > 0 && (
            <View style={styles.deltaBanner}>
              <Text style={styles.deltaText}>
                {tripDistanceKm.toFixed(1)} km this trip
              </Text>
            </View>
          )}
        </View>

        {/* Energy summary dark card */}
        <View style={styles.energyCard}>
          <Text style={styles.energyEyebrow}>ENERGY THIS TRIP</Text>
          <View style={styles.energyGrid}>
            <View style={styles.energyStat}>
              <Text style={styles.energyStatLabel}>Distance</Text>
              <Text style={[styles.energyStatValue, styles.energyValueYellow]}>
                {displayDistanceKm.toFixed(1)} km
              </Text>
            </View>
            <View style={styles.energyStat}>
              <Text style={styles.energyStatLabel}>kWh used</Text>
              <Text style={styles.energyStatValue}>
                {kwh.toFixed(2)} kWh
              </Text>
            </View>
            <View style={styles.energyStat}>
              <Text style={styles.energyStatLabel}>Efficiency</Text>
              <Text style={styles.energyStatValue}>
                {efficiency.toFixed(1)} km/kWh
              </Text>
            </View>
          </View>
          <View style={styles.co2Row}>
            <Text style={styles.co2Icon}>🌿</Text>
            <Text style={styles.co2Text}>
              {(co2Grams / 1000).toFixed(2)} kg CO₂ avoided
            </Text>
          </View>
        </View>

        {/* Fare card — only when the driver collects payment */}
        {driverCollects ? (
          <View style={styles.fareCard}>
            <Text style={styles.fareEyebrow}>FARE TO COLLECT</Text>
            <Text style={styles.fareAmount}>₹{totalPrice.toLocaleString('en-IN')}</Text>
          </View>
        ) : null}

        {/* Expenses */}
        <View style={styles.expensesCard}>
          <View style={styles.expensesRow}>
            <View style={styles.expensesLabelCol}>
              <Text style={styles.expensesLabel}>Tolls / Parking</Text>
              <Text style={styles.expensesNote}>Will be reimbursed</Text>
            </View>
            <TextInput
              style={styles.expensesInput}
              value={expenses}
              onChangeText={setExpenses}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={YL.ink3}
            />
          </View>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.collectButton, (!canSubmit || completing) && styles.collectButtonDisabled]}
          disabled={!canSubmit || completing}
          onPress={handleSubmit}
        >
          <Text
            style={[
              styles.collectButtonText,
              (!canSubmit || completing) && styles.collectButtonTextDisabled,
            ]}
          >
            {completing ? 'Completing…' : driverCollects ? 'Collect payment →' : 'Complete trip ✓'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: YL.bg,
  },
  safeTop: {},
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 22,
    color: YL.ink,
  },
  tripCodePill: {
    backgroundColor: YL.yellow,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tripCodeText: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: YL.ink,
  },
  sectionHeader: {
    marginTop: 4,
  },
  sectionLabel: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: YL.ink3,
    letterSpacing: 0.8,
  },
  readingsCard: {
    backgroundColor: YL.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: YL.line,
    overflow: 'hidden',
  },
  readingRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 0,
  },
  readingField: {
    flex: 1,
    gap: 6,
  },
  readingDivider: {
    width: 1,
    backgroundColor: YL.line,
    marginHorizontal: 12,
  },
  readingLabel: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: YL.ink3,
    letterSpacing: 0.5,
  },
  readingInput: {
    fontFamily: FONTS.monoMedium,
    fontSize: 20,
    color: YL.ink,
    paddingVertical: 4,
  },
  deltaBanner: {
    backgroundColor: YL.bg2,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: YL.line,
  },
  deltaText: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: YL.ink2,
  },
  energyCard: {
    backgroundColor: YL.ink,
    borderRadius: 16,
    padding: 20,
  },
  energyEyebrow: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  energyGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  energyStat: {
    flex: 1,
    gap: 4,
  },
  energyStatLabel: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.4,
  },
  energyStatValue: {
    fontFamily: FONTS.monoMedium,
    fontSize: 18,
    color: '#FFFFFF',
  },
  energyValueYellow: {
    color: YL.yellow,
  },
  co2Row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 12,
  },
  co2Icon: {
    fontSize: 16,
  },
  co2Text: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: YL.leaf,
  },
  fareCard: {
    backgroundColor: YL.yellow,
    borderRadius: 16,
    padding: 16,
  },
  fareEyebrow: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: YL.ink,
    opacity: 0.6,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  fareAmount: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 36,
    color: YL.ink,
  },
  expensesCard: {
    backgroundColor: YL.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: YL.line,
    padding: 16,
    marginBottom: 4,
  },
  expensesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expensesLabelCol: {
    flex: 1,
    gap: 2,
  },
  expensesLabel: {
    fontFamily: FONTS.display,
    fontSize: 15,
    color: YL.ink,
  },
  expensesNote: {
    fontFamily: FONTS.display,
    fontSize: 12,
    color: YL.ink3,
  },
  expensesInput: {
    fontFamily: FONTS.monoMedium,
    fontSize: 18,
    color: YL.ink,
    textAlign: 'right',
    minWidth: 80,
    paddingVertical: 4,
  },
  bottomBar: {
    backgroundColor: YL.card,
    borderTopWidth: 1,
    borderTopColor: YL.line,
    padding: 16,
  },
  collectButton: {
    backgroundColor: YL.ink,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  collectButtonDisabled: {
    backgroundColor: YL.line,
  },
  collectButtonText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 16,
    color: YL.yellow,
  },
  collectButtonTextDisabled: {
    color: YL.ink3,
  },
});

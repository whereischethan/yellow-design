import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YL, FONTS } from '@/constants/theme';
import { useDuty } from '@/context/DutyContext';
import { useDriverAuth } from '@/context/DriverAuthContext';
import { saveReading } from '@/lib/api';
import { calcKwh, calcEfficiency, calcCo2Grams } from '@/lib/energy';

export default function CloseDutyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookings, readings, addReading, readingByType } = useDuty()
  const { driver } = useDriverAuth()
  const batteryKwh = driver?.assignedVehicle?.isEv ? 42 : 0;

  const [odometer, setOdometer] = useState('');
  const [soc, setSoc] = useState('');

  const endOdo = parseFloat(odometer) || 0;
  const endSoc = parseFloat(soc) || 0;

  const completedBookings = bookings.filter(
    (b) => (b as any).status === 'completed',
  );

  const daySummary = useMemo(() => {
    let totalKm = 0;
    let totalKwh = 0;

    for (const b of bookings) {
      const startReading =
        readingByType('trip_start', b.id) ?? readingByType('handoff', b.id);
      const endReading = readingByType('trip_end', b.id);

      const startOdo: number = (startReading as any)?.odometer ?? 0;
      const endOdoR: number = (endReading as any)?.odometer ?? 0;
      const startSoc: number = (startReading as any)?.soc ?? 100;
      const endSocR: number = (endReading as any)?.soc ?? startSoc;

      if (endOdoR > startOdo) totalKm += endOdoR - startOdo;
      if (batteryKwh > 0) totalKwh += calcKwh(startSoc, endSocR, batteryKwh);
    }

    const avgEff = totalKwh > 0 ? totalKm / totalKwh : 0;
    return { totalKm, totalKwh, avgEff };
  }, [bookings, readings]);

  const totalCo2Grams = useMemo(
    () => calcCo2Grams(daySummary.totalKm),
    [daySummary.totalKm],
  );

  const batteryStatus = useMemo(() => {
    if (endSoc >= 60)
      return {
        text: 'Good — charged enough for tomorrow',
        color: YL.leaf,
        bg: YL.leafSoft,
      };
    if (endSoc >= 30)
      return {
        text: 'Moderate — consider charging tonight',
        color: YL.yellowDeep,
        bg: YL.yellowSoft,
      };
    if (endSoc > 0)
      return {
        text: 'Low — please charge before next shift',
        color: YL.gulmohar,
        bg: YL.gulmoharSoft,
      };
    return null;
  }, [endSoc]);

  const canSubmit = odometer.length > 0 && soc.length > 0;

  async function handleSignOff() {
    if (!canSubmit) return;
    const reading = {
      type: 'close_duty' as const,
      odometer: endOdo,
      soc: endSoc,
    };
    try {
      await saveReading(reading);
    } catch (_) {}
    addReading(reading);
    router.replace('/(duty)/signed-off');
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.safeTop, { height: insets.top }]} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.headerTitle}>Close Duty</Text>

        {/* Day summary card */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionLabel}>TODAY'S SUMMARY</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{completedBookings.length}</Text>
              <Text style={styles.statLabel}>Trips completed</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>
                {daySummary.totalKm.toFixed(1)} km
              </Text>
              <Text style={styles.statLabel}>Total distance</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>
                {daySummary.totalKwh.toFixed(2)} kWh
              </Text>
              <Text style={styles.statLabel}>Total kWh</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>
                {daySummary.avgEff.toFixed(1)} km/kWh
              </Text>
              <Text style={styles.statLabel}>Avg efficiency</Text>
            </View>
          </View>
        </View>

        {/* CO₂ dark card */}
        <View style={styles.co2Card}>
          <Text style={styles.co2Value}>
            🌿 {(totalCo2Grams / 1000).toFixed(2)} kg
          </Text>
          <Text style={styles.co2Label}>CO₂ avoided today</Text>
        </View>

        {/* Closing readings */}
        <Text style={styles.sectionLabel}>CLOSING READINGS</Text>

        <View style={styles.readingsCard}>
          <View style={styles.readingRow}>
            <View style={styles.readingField}>
              <Text style={styles.readingLabel}>Odometer (km)</Text>
              <TextInput
                style={styles.readingInput}
                value={odometer}
                onChangeText={setOdometer}
                keyboardType="numeric"
                placeholder="e.g. 48500"
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
                placeholder="e.g. 55"
                placeholderTextColor={YL.ink3}
              />
            </View>
          </View>

          {batteryStatus && (
            <View
              style={[
                styles.batteryStatus,
                { backgroundColor: batteryStatus.bg },
              ]}
            >
              <Text
                style={[styles.batteryStatusText, { color: batteryStatus.color }]}
              >
                {batteryStatus.text}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.signOffButton, !canSubmit && styles.signOffButtonDisabled]}
          disabled={!canSubmit}
          onPress={handleSignOff}
        >
          <Text
            style={[
              styles.signOffButtonText,
              !canSubmit && styles.signOffButtonTextDisabled,
            ]}
          >
            Sign off
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
  safeTop: {
    backgroundColor: YL.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 22,
    color: YL.ink,
    marginBottom: 8,
  },
  sectionLabel: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: YL.ink3,
    letterSpacing: 0.8,
  },
  summaryCard: {
    backgroundColor: YL.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: YL.line,
    padding: 20,
    gap: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCell: {
    width: '46%',
    gap: 2,
  },
  statValue: {
    fontFamily: FONTS.monoMedium,
    fontSize: 20,
    color: YL.ink,
  },
  statLabel: {
    fontFamily: FONTS.display,
    fontSize: 12,
    color: YL.ink3,
  },
  co2Card: {
    backgroundColor: YL.ink,
    borderRadius: 16,
    padding: 20,
    gap: 6,
  },
  co2Value: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 36,
    color: YL.yellow,
  },
  co2Label: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
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
  batteryStatus: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: YL.line,
  },
  batteryStatusText: {
    fontFamily: FONTS.display,
    fontSize: 13,
  },
  bottomBar: {
    backgroundColor: YL.card,
    borderTopWidth: 1,
    borderTopColor: YL.line,
    padding: 16,
  },
  signOffButton: {
    backgroundColor: YL.ink,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signOffButtonDisabled: {
    backgroundColor: YL.line,
  },
  signOffButtonText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 16,
    color: YL.yellow,
  },
  signOffButtonTextDisabled: {
    color: YL.ink3,
  },
});

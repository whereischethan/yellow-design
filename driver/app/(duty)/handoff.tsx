import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { YL, FONTS } from '@/constants/theme'
import { useDuty, DutyReading } from '@/context/DutyContext'
import { saveReading } from '@/lib/api'
import { estimatedRangeKm } from '@/lib/energy'

export default function HandoffScreen() {
  const { addReading } = useDuty()
  const [odo, setOdo] = useState('')
  const [soc, setSoc] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const odoNum = parseFloat(odo)
  const socNum = parseFloat(soc)
  const bothFilled = odo.trim().length > 0 && soc.trim().length > 0 && !isNaN(odoNum) && !isNaN(socNum)
  const rangeKm = !isNaN(socNum) && soc.trim().length > 0 ? estimatedRangeKm(socNum) : null

  async function handleSave() {
    if (!bothFilled) return
    setSaving(true)
    setError(null)
    try {
      const reading: DutyReading = {
        type: 'handoff',
        odometer: odoNum,
        soc: socNum,
        timestamp: new Date().toISOString(),
      }
      await saveReading({ type: 'handoff', odometer: odoNum, soc: socNum })
      addReading(reading)
      router.replace('/(duty)/roster')
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(duty)/clock-in')} hitSlop={12}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Vehicle Handoff</Text>
        </View>

        {/* Instruction card */}
        <View style={styles.instructionCard}>
          <Text style={styles.instructionText}>
            Record your starting odometer and battery level before your first trip.
          </Text>
        </View>

        {/* Readings section */}
        <Text style={styles.sectionEyebrow}>OPENING READINGS</Text>

        <View style={styles.readingRow}>
          {/* Odometer card */}
          <View style={[styles.readingCard, styles.readingCardHalf]}>
            <Text style={styles.readingLabel}>ODOMETER</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.readingInput}
                value={odo}
                onChangeText={setOdo}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={YL.ink3}
                maxLength={7}
              />
              <Text style={styles.unitText}>km</Text>
            </View>
          </View>

          {/* Battery card */}
          <View style={[styles.readingCard, styles.readingCardHalf]}>
            <Text style={styles.readingLabel}>BATTERY SOC</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.readingInput}
                value={soc}
                onChangeText={(v) => {
                  const n = parseFloat(v)
                  if (v === '' || (n >= 0 && n <= 100)) setSoc(v)
                }}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={YL.ink3}
                maxLength={3}
              />
              <Text style={styles.unitText}>%</Text>
            </View>
          </View>
        </View>

        {/* Range projection chip */}
        {rangeKm !== null && (
          <View style={styles.rangeChip}>
            <Text style={styles.rangeChipText}>≈ {rangeKm} km estimated range</Text>
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Submit button */}
        <TouchableOpacity
          style={[styles.primaryBtn, (!bothFilled || saving) && styles.primaryBtnDisabled]}
          onPress={handleSave}
          disabled={!bothFilled || saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Save &amp; view roster</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: YL.bg,
  },
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  backBtn: {
    padding: 4,
  },
  backArrow: {
    fontFamily: FONTS.mono,
    fontSize: 20,
    color: YL.ink,
  },
  title: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 22,
    color: YL.ink,
  },
  instructionCard: {
    backgroundColor: YL.yellowSoft,
    borderWidth: 1,
    borderColor: YL.yellowDeep,
    borderRadius: 12,
    padding: 16,
  },
  instructionText: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: YL.ink2,
    lineHeight: 20,
  },
  sectionEyebrow: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    color: YL.ink3,
  },
  readingRow: {
    flexDirection: 'row',
    gap: 12,
  },
  readingCard: {
    backgroundColor: YL.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: YL.line,
    padding: 16,
  },
  readingCardHalf: {
    flex: 1,
  },
  readingLabel: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    color: YL.ink3,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  readingInput: {
    fontFamily: FONTS.mono,
    fontSize: 28,
    color: YL.ink,
    flex: 1,
    padding: 0,
  },
  unitText: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: YL.ink3,
    paddingBottom: 3,
  },
  rangeChip: {
    backgroundColor: YL.leafSoft,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  rangeChipText: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: YL.leaf,
  },
  errorText: {
    fontFamily: FONTS.display,
    fontSize: 13,
    color: YL.gulmohar,
  },
  primaryBtn: {
    backgroundColor: YL.ink,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryBtnDisabled: {
    opacity: 0.4,
  },
  primaryBtnText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
})

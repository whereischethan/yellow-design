import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native'
import RNDateTimePicker from '@react-native-community/datetimepicker'
import { YL, FONTS } from '../constants/theme'
import { fmtDateTimeIST } from '../lib/ist'

interface Props {
  value: Date
  onChange: (date: Date) => void
  minimumDate?: Date
  label?: string
  mode?: 'datetime' | 'date'
}

function formatDisplay(date: Date): string {
  return fmtDateTimeIST(date.toISOString())
}

export default function DateTimePicker({ value, onChange, minimumDate, label, mode = 'datetime' }: Props) {
  const [showDate, setShowDate] = useState(false)
  const [showTime, setShowTime] = useState(false)
  const [tempDate, setTempDate] = useState(value)

  // Effective minimum: caller's minimumDate or right now
  const minDate = minimumDate || new Date()

  const handleDateChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') setShowDate(false)
    if (selected) {
      setTempDate(selected)
      if (mode === 'datetime' && Platform.OS === 'android') setShowTime(true)
      if (mode === 'date') onChange(selected)
    }
  }

  const handleTimeChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') setShowTime(false)
    if (selected) {
      // Clamp: if the resulting datetime is before minDate, snap forward to minDate
      const clamped = selected < minDate ? minDate : selected
      onChange(clamped)
      setTempDate(clamped)
    }
  }

  const handlePress = () => {
    setTempDate(value)
    setShowDate(true)
  }

  return (
    <View>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <Pressable style={styles.fieldBox} onPress={handlePress}>
        <Text style={styles.value}>{formatDisplay(value)}</Text>
      </Pressable>

      {showDate && (
        <RNDateTimePicker
          mode="date"
          value={tempDate}
          minimumDate={minDate}
          onChange={handleDateChange}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        />
      )}

      {showTime && mode === 'datetime' && (
        <RNDateTimePicker
          mode="time"
          value={tempDate}
          minimumDate={minDate}
          onChange={handleTimeChange}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minuteInterval={15}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  label: {
    fontFamily: FONTS.display,
    fontSize: 12,
    color: YL.ink2,
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  fieldBox: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: YL.line,
    backgroundColor: YL.card,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  value: {
    fontFamily: FONTS.display,
    fontSize: 15,
    color: YL.ink,
  },
})

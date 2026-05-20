import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native'
import RNDateTimePicker from '@react-native-community/datetimepicker'
import { YL, FONTS } from '../constants/theme'

interface Props {
  value: Date
  onChange: (date: Date) => void
  minimumDate?: Date
  label?: string
  mode?: 'datetime' | 'date'
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDisplay(date: Date): string {
  const day = DAYS[date.getDay()]
  const d = date.getDate()
  const mon = MONTHS[date.getMonth()]
  const h = date.getHours()
  const m = date.getMinutes().toString().padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${day}, ${d} ${mon} · ${h12}:${m} ${ampm}`
}

export default function DateTimePicker({ value, onChange, minimumDate, label, mode = 'datetime' }: Props) {
  const [showDate, setShowDate] = useState(false)
  const [showTime, setShowTime] = useState(false)
  const [tempDate, setTempDate] = useState(value)

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
      onChange(selected)
      setTempDate(selected)
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
          minimumDate={minimumDate || new Date()}
          onChange={handleDateChange}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        />
      )}

      {showTime && mode === 'datetime' && (
        <RNDateTimePicker
          mode="time"
          value={tempDate}
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

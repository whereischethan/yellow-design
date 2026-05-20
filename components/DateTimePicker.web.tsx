import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { YL, FONTS } from '../constants/theme'

interface Props {
  value: Date
  onChange: (date: Date) => void
  minimumDate?: Date
  label?: string
  mode?: 'datetime' | 'date'
}

function toLocalISO(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toLocalDateISO(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export default function DateTimePicker({ value, onChange, minimumDate, label, mode = 'datetime' }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (!v) return
    if (mode === 'date') {
      const [y, m, d] = v.split('-').map(Number)
      const result = new Date(value)
      result.setFullYear(y, m - 1, d)
      onChange(result)
    } else {
      onChange(new Date(v))
    }
  }

  const inputType = mode === 'date' ? 'date' : 'datetime-local'
  const inputValue = mode === 'date' ? toLocalDateISO(value) : toLocalISO(value)
  const inputMin = minimumDate
    ? (mode === 'date' ? toLocalDateISO(minimumDate) : toLocalISO(minimumDate))
    : undefined

  return (
    <View>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.fieldBox}>
        {/* @ts-ignore — web-only */}
        <input
          type={inputType}
          value={inputValue}
          min={inputMin}
          onChange={handleChange}
          style={{
            border: 'none',
            backgroundColor: 'transparent',
            fontFamily: FONTS.display,
            fontSize: 15,
            fontWeight: '500',
            color: YL.ink,
            padding: 0,
            width: '100%',
            minWidth: 0,
            outline: 'none',
            cursor: 'pointer',
            display: 'block',
          } as React.CSSProperties}
        />
      </View>
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
})

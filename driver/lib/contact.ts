import { Linking } from 'react-native'

// Phones are stored as digits with country code (e.g. 919876543210),
// but guest phones entered by admin may be bare 10-digit numbers.
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 ? `91${digits}` : digits
}

export function callPhone(phone: string) {
  Linking.openURL(`tel:+${normalizePhone(phone)}`)
}

export function openWhatsApp(phone: string, message: string) {
  Linking.openURL(`https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`)
}

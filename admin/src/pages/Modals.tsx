import React from 'react'
import ReactDOM from 'react-dom'
import type { Driver, Vehicle, Customer, Booking } from '../types'
import { createBooking, createDriver, createVehicle, calcPricing, patchBooking } from '../api'
import { YL, Icons, Stack, Button, Input, Avatar, Mono, ModalShell, ModalHeader, Stepper, FieldLabel, TilePicker, FormInput, DateTimePicker, DatePicker, toISTISO, fromISTISO, formatPhone } from '../components/ui'

const PLACES_KEY = (import.meta as any).env?.VITE_GOOGLE_API_KEY || ''
const BLR_CENTER = { latitude: 12.9716, longitude: 77.5946 }

interface PlaceSuggestion { placeId: string; description: string }

export function PlacesInput({ label, value, onChange, onSelect, required }: {
  label: string
  value: string
  onChange: (v: string) => void
  onSelect: (s: PlaceSuggestion) => void
  required?: boolean
}) {
  const [suggestions, setSuggestions] = React.useState<PlaceSuggestion[]>([])
  const [open, setOpen] = React.useState(false)
  const [anchor, setAnchor] = React.useState<{ top: number; left: number; width: number } | null>(null)
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateAnchor = () => {
    if (!wrapperRef.current) return
    // Walk up the DOM to find the nearest element WITHOUT a CSS transform so
    // we can compute viewport-relative coordinates ourselves. getBoundingClientRect
    // already gives viewport coords, but position:fixed children of a transformed
    // ancestor are positioned relative to that ancestor — so we portal the dropdown
    // to document.body to escape transforms entirely.
    const rect = wrapperRef.current.getBoundingClientRect()
    setAnchor({ top: rect.bottom + window.scrollY + 2, left: rect.left + window.scrollX, width: rect.width })
  }

  const fetchSuggestions = async (text: string) => {
    if (text.length < 2) { setSuggestions([]); setOpen(false); return }
    try {
      const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': PLACES_KEY,
          'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text',
        },
        body: JSON.stringify({
          input: text,
          locationBias: { circle: { center: BLR_CENTER, radius: 50000 } },
          includedRegionCodes: ['in'],
        }),
      })
      const data = await res.json()
      const items: PlaceSuggestion[] = (data.suggestions || [])
        .map((s: any) => ({ placeId: s.placePrediction?.placeId, description: s.placePrediction?.text?.text }))
        .filter((s: PlaceSuggestion) => s.placeId && s.description)
      setSuggestions(items)
      if (items.length > 0) { updateAnchor(); setOpen(true) } else { setOpen(false) }
    } catch {
      setSuggestions([]); setOpen(false)
    }
  }

  const handleChange = (v: string) => {
    onChange(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 280)
  }

  const handleSelect = (s: PlaceSuggestion) => {
    onChange(s.description)
    onSelect(s)
    setSuggestions([])
    setOpen(false)
  }

  const dropdown = open && suggestions.length > 0 && anchor
    ? ReactDOM.createPortal(
        <div style={{
          position: 'absolute',
          top: anchor.top,
          left: anchor.left,
          width: anchor.width,
          background: YL.card,
          border: `1px solid ${YL.line}`,
          borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          zIndex: 9999,
          maxHeight: 220,
          overflow: 'auto',
        }}>
          {suggestions.map(s => (
            <button key={s.placeId} onMouseDown={(e) => { e.preventDefault(); handleSelect(s) }} style={{
              width: '100%', padding: '9px 12px', display: 'block', textAlign: 'left',
              background: 'transparent', border: 'none', borderBottom: `1px solid ${YL.line}`,
              cursor: 'pointer', fontSize: 12.5, color: YL.ink,
              fontFamily: '"Bricolage Grotesque", system-ui',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = YL.bg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              {s.description}
            </button>
          ))}
        </div>,
        document.body
      )
    : null

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <FormInput
        label={label} required={required}
        placeholder="Area, street, Bangalore"
        value={value}
        onChange={(e: any) => handleChange(e.target.value)}
        icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.pin}</span>}
      />
      {dropdown}
    </div>
  )
}

// ─── New Booking Modal ─────────────────────────────────────────────────────

interface CreateBookingModalProps {
  open: boolean
  onClose: () => void
  drivers: Driver[]
  customers?: Customer[]
  onCreated?: (booking?: Booking) => void
  editBooking?: Booking | null
  onEdited?: () => void
}

export function CreateBookingModal({ open, onClose, drivers, customers = [], onCreated, editBooking, onEdited }: CreateBookingModalProps) {
  const [step, setStep] = React.useState(0)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')

  // Step 0 - Customer
  const [customerQuery, setCustomerQuery] = React.useState('')
  const [pickedCustomer, setPickedCustomer] = React.useState<Customer | null>(null)
  const [guestName, setGuestName] = React.useState('')
  const [guestPhone, setGuestPhone] = React.useState('')
  const [guestCountryCode, setGuestCountryCode] = React.useState('+91')
  const [countryDropOpen, setCountryDropOpen] = React.useState(false)
  const [countrySearch, setCountrySearch] = React.useState('')
  const [countryAnchor, setCountryAnchor] = React.useState<{ top: number; left: number } | null>(null)
  const countryBtnRef = React.useRef<HTMLButtonElement>(null)
  const [isGuest, setIsGuest] = React.useState(false)

  React.useEffect(() => {
    if (!countryDropOpen) return
    const close = () => setCountryDropOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [countryDropOpen])

  const COUNTRY_CODES = [
    { code: '+91', flag: '🇮🇳', name: 'India' },
    { code: '+1', flag: '🇺🇸', name: 'United States' },
    { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
    { code: '+971', flag: '🇦🇪', name: 'UAE' },
    { code: '+65', flag: '🇸🇬', name: 'Singapore' },
    { code: '+93', flag: '🇦🇫', name: 'Afghanistan' },
    { code: '+355', flag: '🇦🇱', name: 'Albania' },
    { code: '+213', flag: '🇩🇿', name: 'Algeria' },
    { code: '+376', flag: '🇦🇩', name: 'Andorra' },
    { code: '+244', flag: '🇦🇴', name: 'Angola' },
    { code: '+54', flag: '🇦🇷', name: 'Argentina' },
    { code: '+374', flag: '🇦🇲', name: 'Armenia' },
    { code: '+61', flag: '🇦🇺', name: 'Australia' },
    { code: '+43', flag: '🇦🇹', name: 'Austria' },
    { code: '+994', flag: '🇦🇿', name: 'Azerbaijan' },
    { code: '+1242', flag: '🇧🇸', name: 'Bahamas' },
    { code: '+973', flag: '🇧🇭', name: 'Bahrain' },
    { code: '+880', flag: '🇧🇩', name: 'Bangladesh' },
    { code: '+375', flag: '🇧🇾', name: 'Belarus' },
    { code: '+32', flag: '🇧🇪', name: 'Belgium' },
    { code: '+501', flag: '🇧🇿', name: 'Belize' },
    { code: '+229', flag: '🇧🇯', name: 'Benin' },
    { code: '+975', flag: '🇧🇹', name: 'Bhutan' },
    { code: '+591', flag: '🇧🇴', name: 'Bolivia' },
    { code: '+387', flag: '🇧🇦', name: 'Bosnia & Herzegovina' },
    { code: '+267', flag: '🇧🇼', name: 'Botswana' },
    { code: '+55', flag: '🇧🇷', name: 'Brazil' },
    { code: '+673', flag: '🇧🇳', name: 'Brunei' },
    { code: '+359', flag: '🇧🇬', name: 'Bulgaria' },
    { code: '+226', flag: '🇧🇫', name: 'Burkina Faso' },
    { code: '+257', flag: '🇧🇮', name: 'Burundi' },
    { code: '+855', flag: '🇰🇭', name: 'Cambodia' },
    { code: '+237', flag: '🇨🇲', name: 'Cameroon' },
    { code: '+1', flag: '🇨🇦', name: 'Canada' },
    { code: '+238', flag: '🇨🇻', name: 'Cape Verde' },
    { code: '+236', flag: '🇨🇫', name: 'Central African Republic' },
    { code: '+235', flag: '🇹🇩', name: 'Chad' },
    { code: '+56', flag: '🇨🇱', name: 'Chile' },
    { code: '+86', flag: '🇨🇳', name: 'China' },
    { code: '+57', flag: '🇨🇴', name: 'Colombia' },
    { code: '+269', flag: '🇰🇲', name: 'Comoros' },
    { code: '+242', flag: '🇨🇬', name: 'Congo' },
    { code: '+243', flag: '🇨🇩', name: 'Congo (DRC)' },
    { code: '+506', flag: '🇨🇷', name: 'Costa Rica' },
    { code: '+385', flag: '🇭🇷', name: 'Croatia' },
    { code: '+53', flag: '🇨🇺', name: 'Cuba' },
    { code: '+357', flag: '🇨🇾', name: 'Cyprus' },
    { code: '+420', flag: '🇨🇿', name: 'Czech Republic' },
    { code: '+45', flag: '🇩🇰', name: 'Denmark' },
    { code: '+253', flag: '🇩🇯', name: 'Djibouti' },
    { code: '+1767', flag: '🇩🇲', name: 'Dominica' },
    { code: '+1809', flag: '🇩🇴', name: 'Dominican Republic' },
    { code: '+593', flag: '🇪🇨', name: 'Ecuador' },
    { code: '+20', flag: '🇪🇬', name: 'Egypt' },
    { code: '+503', flag: '🇸🇻', name: 'El Salvador' },
    { code: '+240', flag: '🇬🇶', name: 'Equatorial Guinea' },
    { code: '+291', flag: '🇪🇷', name: 'Eritrea' },
    { code: '+372', flag: '🇪🇪', name: 'Estonia' },
    { code: '+268', flag: '🇸🇿', name: 'Eswatini' },
    { code: '+251', flag: '🇪🇹', name: 'Ethiopia' },
    { code: '+679', flag: '🇫🇯', name: 'Fiji' },
    { code: '+358', flag: '🇫🇮', name: 'Finland' },
    { code: '+33', flag: '🇫🇷', name: 'France' },
    { code: '+241', flag: '🇬🇦', name: 'Gabon' },
    { code: '+220', flag: '🇬🇲', name: 'Gambia' },
    { code: '+995', flag: '🇬🇪', name: 'Georgia' },
    { code: '+49', flag: '🇩🇪', name: 'Germany' },
    { code: '+233', flag: '🇬🇭', name: 'Ghana' },
    { code: '+30', flag: '🇬🇷', name: 'Greece' },
    { code: '+1473', flag: '🇬🇩', name: 'Grenada' },
    { code: '+502', flag: '🇬🇹', name: 'Guatemala' },
    { code: '+224', flag: '🇬🇳', name: 'Guinea' },
    { code: '+245', flag: '🇬🇼', name: 'Guinea-Bissau' },
    { code: '+592', flag: '🇬🇾', name: 'Guyana' },
    { code: '+509', flag: '🇭🇹', name: 'Haiti' },
    { code: '+504', flag: '🇭🇳', name: 'Honduras' },
    { code: '+36', flag: '🇭🇺', name: 'Hungary' },
    { code: '+354', flag: '🇮🇸', name: 'Iceland' },
    { code: '+62', flag: '🇮🇩', name: 'Indonesia' },
    { code: '+98', flag: '🇮🇷', name: 'Iran' },
    { code: '+964', flag: '🇮🇶', name: 'Iraq' },
    { code: '+353', flag: '🇮🇪', name: 'Ireland' },
    { code: '+972', flag: '🇮🇱', name: 'Israel' },
    { code: '+39', flag: '🇮🇹', name: 'Italy' },
    { code: '+1876', flag: '🇯🇲', name: 'Jamaica' },
    { code: '+81', flag: '🇯🇵', name: 'Japan' },
    { code: '+962', flag: '🇯🇴', name: 'Jordan' },
    { code: '+7', flag: '🇰🇿', name: 'Kazakhstan' },
    { code: '+254', flag: '🇰🇪', name: 'Kenya' },
    { code: '+686', flag: '🇰🇮', name: 'Kiribati' },
    { code: '+850', flag: '🇰🇵', name: 'North Korea' },
    { code: '+82', flag: '🇰🇷', name: 'South Korea' },
    { code: '+965', flag: '🇰🇼', name: 'Kuwait' },
    { code: '+996', flag: '🇰🇬', name: 'Kyrgyzstan' },
    { code: '+856', flag: '🇱🇦', name: 'Laos' },
    { code: '+371', flag: '🇱🇻', name: 'Latvia' },
    { code: '+961', flag: '🇱🇧', name: 'Lebanon' },
    { code: '+266', flag: '🇱🇸', name: 'Lesotho' },
    { code: '+231', flag: '🇱🇷', name: 'Liberia' },
    { code: '+218', flag: '🇱🇾', name: 'Libya' },
    { code: '+423', flag: '🇱🇮', name: 'Liechtenstein' },
    { code: '+370', flag: '🇱🇹', name: 'Lithuania' },
    { code: '+352', flag: '🇱🇺', name: 'Luxembourg' },
    { code: '+261', flag: '🇲🇬', name: 'Madagascar' },
    { code: '+265', flag: '🇲🇼', name: 'Malawi' },
    { code: '+60', flag: '🇲🇾', name: 'Malaysia' },
    { code: '+960', flag: '🇲🇻', name: 'Maldives' },
    { code: '+223', flag: '🇲🇱', name: 'Mali' },
    { code: '+356', flag: '🇲🇹', name: 'Malta' },
    { code: '+692', flag: '🇲🇭', name: 'Marshall Islands' },
    { code: '+222', flag: '🇲🇷', name: 'Mauritania' },
    { code: '+230', flag: '🇲🇺', name: 'Mauritius' },
    { code: '+52', flag: '🇲🇽', name: 'Mexico' },
    { code: '+691', flag: '🇫🇲', name: 'Micronesia' },
    { code: '+373', flag: '🇲🇩', name: 'Moldova' },
    { code: '+377', flag: '🇲🇨', name: 'Monaco' },
    { code: '+976', flag: '🇲🇳', name: 'Mongolia' },
    { code: '+382', flag: '🇲🇪', name: 'Montenegro' },
    { code: '+212', flag: '🇲🇦', name: 'Morocco' },
    { code: '+258', flag: '🇲🇿', name: 'Mozambique' },
    { code: '+95', flag: '🇲🇲', name: 'Myanmar' },
    { code: '+264', flag: '🇳🇦', name: 'Namibia' },
    { code: '+674', flag: '🇳🇷', name: 'Nauru' },
    { code: '+977', flag: '🇳🇵', name: 'Nepal' },
    { code: '+31', flag: '🇳🇱', name: 'Netherlands' },
    { code: '+64', flag: '🇳🇿', name: 'New Zealand' },
    { code: '+505', flag: '🇳🇮', name: 'Nicaragua' },
    { code: '+227', flag: '🇳🇪', name: 'Niger' },
    { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
    { code: '+389', flag: '🇲🇰', name: 'North Macedonia' },
    { code: '+47', flag: '🇳🇴', name: 'Norway' },
    { code: '+968', flag: '🇴🇲', name: 'Oman' },
    { code: '+92', flag: '🇵🇰', name: 'Pakistan' },
    { code: '+680', flag: '🇵🇼', name: 'Palau' },
    { code: '+507', flag: '🇵🇦', name: 'Panama' },
    { code: '+675', flag: '🇵🇬', name: 'Papua New Guinea' },
    { code: '+595', flag: '🇵🇾', name: 'Paraguay' },
    { code: '+51', flag: '🇵🇪', name: 'Peru' },
    { code: '+63', flag: '🇵🇭', name: 'Philippines' },
    { code: '+48', flag: '🇵🇱', name: 'Poland' },
    { code: '+351', flag: '🇵🇹', name: 'Portugal' },
    { code: '+974', flag: '🇶🇦', name: 'Qatar' },
    { code: '+40', flag: '🇷🇴', name: 'Romania' },
    { code: '+7', flag: '🇷🇺', name: 'Russia' },
    { code: '+250', flag: '🇷🇼', name: 'Rwanda' },
    { code: '+1869', flag: '🇰🇳', name: 'Saint Kitts & Nevis' },
    { code: '+1758', flag: '🇱🇨', name: 'Saint Lucia' },
    { code: '+1784', flag: '🇻🇨', name: 'Saint Vincent' },
    { code: '+685', flag: '🇼🇸', name: 'Samoa' },
    { code: '+378', flag: '🇸🇲', name: 'San Marino' },
    { code: '+239', flag: '🇸🇹', name: 'São Tomé & Príncipe' },
    { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
    { code: '+221', flag: '🇸🇳', name: 'Senegal' },
    { code: '+381', flag: '🇷🇸', name: 'Serbia' },
    { code: '+248', flag: '🇸🇨', name: 'Seychelles' },
    { code: '+232', flag: '🇸🇱', name: 'Sierra Leone' },
    { code: '+386', flag: '🇸🇮', name: 'Slovenia' },
    { code: '+677', flag: '🇸🇧', name: 'Solomon Islands' },
    { code: '+252', flag: '🇸🇴', name: 'Somalia' },
    { code: '+27', flag: '🇿🇦', name: 'South Africa' },
    { code: '+211', flag: '🇸🇸', name: 'South Sudan' },
    { code: '+34', flag: '🇪🇸', name: 'Spain' },
    { code: '+94', flag: '🇱🇰', name: 'Sri Lanka' },
    { code: '+249', flag: '🇸🇩', name: 'Sudan' },
    { code: '+597', flag: '🇸🇷', name: 'Suriname' },
    { code: '+46', flag: '🇸🇪', name: 'Sweden' },
    { code: '+41', flag: '🇨🇭', name: 'Switzerland' },
    { code: '+963', flag: '🇸🇾', name: 'Syria' },
    { code: '+886', flag: '🇹🇼', name: 'Taiwan' },
    { code: '+992', flag: '🇹🇯', name: 'Tajikistan' },
    { code: '+255', flag: '🇹🇿', name: 'Tanzania' },
    { code: '+66', flag: '🇹🇭', name: 'Thailand' },
    { code: '+670', flag: '🇹🇱', name: 'Timor-Leste' },
    { code: '+228', flag: '🇹🇬', name: 'Togo' },
    { code: '+676', flag: '🇹🇴', name: 'Tonga' },
    { code: '+1868', flag: '🇹🇹', name: 'Trinidad & Tobago' },
    { code: '+216', flag: '🇹🇳', name: 'Tunisia' },
    { code: '+90', flag: '🇹🇷', name: 'Turkey' },
    { code: '+993', flag: '🇹🇲', name: 'Turkmenistan' },
    { code: '+688', flag: '🇹🇻', name: 'Tuvalu' },
    { code: '+256', flag: '🇺🇬', name: 'Uganda' },
    { code: '+380', flag: '🇺🇦', name: 'Ukraine' },
    { code: '+598', flag: '🇺🇾', name: 'Uruguay' },
    { code: '+998', flag: '🇺🇿', name: 'Uzbekistan' },
    { code: '+678', flag: '🇻🇺', name: 'Vanuatu' },
    { code: '+379', flag: '🇻🇦', name: 'Vatican City' },
    { code: '+58', flag: '🇻🇪', name: 'Venezuela' },
    { code: '+84', flag: '🇻🇳', name: 'Vietnam' },
    { code: '+967', flag: '🇾🇪', name: 'Yemen' },
    { code: '+260', flag: '🇿🇲', name: 'Zambia' },
    { code: '+263', flag: '🇿🇼', name: 'Zimbabwe' },
  ]

  // Booking category
  const [bookingCategory, setBookingCategory] = React.useState<'airport' | 'outstation' | 'hourly'>('airport')

  // Step 1 - Airport trip
  const [tripType, setTripType] = React.useState<'drop' | 'pickup'>('drop')
  const [terminal, setTerminal] = React.useState<'T1' | 'T2'>('T2')
  const [address, setAddress] = React.useState('')
  const [addressPlaceId, setAddressPlaceId] = React.useState('')
  const [stops, setStops] = React.useState<Array<{ address: string; placeId: string }>>([])
  const [dateTime, setDateTime] = React.useState('')
  const [flightNumber, setFlightNumber] = React.useState('')
  const [passengers, setPassengers] = React.useState('1')

  // Step 1 - Outstation
  const [outstationOrigin, setOutstationOrigin] = React.useState('')
  const [outstationOriginPlaceId, setOutstationOriginPlaceId] = React.useState('')
  const [outstationDest, setOutstationDest] = React.useState('')
  const [outstationDestPlaceId, setOutstationDestPlaceId] = React.useState('')
  const [outstationTripKind, setOutstationTripKind] = React.useState<'oneway' | 'round'>('round')
  const [outstationReturnDate, setOutstationReturnDate] = React.useState('')

  // Step 1 - Hourly
  const [hourlyPickup, setHourlyPickup] = React.useState('')
  const [hourlyPickupPlaceId, setHourlyPickupPlaceId] = React.useState('')
  const [hourlyDuration, setHourlyDuration] = React.useState(8)



  // Step 2 - Vehicle
  const [vehicleType, setVehicleType] = React.useState('yellowSky')
  const [assignedDriverId, setAssignedDriverId] = React.useState('')

  // Pricing
  const [pricingResult, setPricingResult] = React.useState<any>(null)
  const [pricingLoading, setPricingLoading] = React.useState(false)

  // Fare override
  const [fareEditMode, setFareEditMode] = React.useState(false)
  const [overrideFare, setOverrideFare] = React.useState('')
  const [overrideGst, setOverrideGst] = React.useState('')
  const [overrideToll, setOverrideToll] = React.useState('')
  const [overrideDiscount, setOverrideDiscount] = React.useState('')
  const [overrideTotalDraft, setOverrideTotalDraft] = React.useState<string | null>(null)
  const [sendSms, setSendSms] = React.useState(true)

  const overrideFareNum = parseFloat(overrideFare) || 0
  const overrideGstNum = parseFloat(overrideGst) || 0
  const overrideTollNum = parseFloat(overrideToll) || 0
  const overrideDiscountNum = parseFloat(overrideDiscount) || 0
  const overrideTotal = Math.max(0, overrideFareNum + overrideGstNum + overrideTollNum - overrideDiscountNum)

  const stepNames = ['Customer', 'Trip details', 'Vehicle', 'Confirm']

  React.useEffect(() => {
    if (!open) return
    if (editBooking) {
      const b = editBooking
      const cat: 'airport' | 'outstation' | 'hourly' =
        b.tripType === 'pickup' || b.tripType === 'drop' ? 'airport'
        : b.tripType === 'outstation' ? 'outstation' : 'hourly'
      setBookingCategory(cat)
      setStops([])
      setAssignedDriverId('')
      if (cat === 'airport') {
        setTripType(b.tripType as 'drop' | 'pickup')
        const nonAirport = b.tripType === 'drop' ? b.pickup : b.drop
        const airport = b.tripType === 'drop' ? b.drop : b.pickup
        setAddress(nonAirport?.placeName ?? nonAirport?.location ?? '')
        setAddressPlaceId(nonAirport?.placeId ?? '')
        setTerminal(((airport as any)?.terminal ?? 'T2') as 'T1' | 'T2')
      } else if (cat === 'outstation') {
        setOutstationOrigin(b.pickup?.placeName ?? b.pickup?.location ?? '')
        setOutstationOriginPlaceId(b.pickup?.placeId ?? '')
        setOutstationDest(b.drop?.placeName ?? b.drop?.location ?? '')
        setOutstationDestPlaceId(b.drop?.placeId ?? '')
        setOutstationTripKind(((b as any).tripKind ?? 'round') as 'oneway' | 'round')
        setOutstationReturnDate(b.drop?.dateTime ? toISTISO(new Date(b.drop.dateTime)) : '')
      } else {
        setHourlyPickup(b.pickup?.placeName ?? b.pickup?.location ?? '')
        setHourlyPickupPlaceId(b.pickup?.placeId ?? '')
        setHourlyDuration((b as any).durationHours ?? 8)
      }
      setDateTime(b.pickup?.dateTime ? toISTISO(new Date(b.pickup.dateTime)) : '')
      setFlightNumber(b.flight?.flightNumber ?? '')
      setPassengers(String(b.passengers ?? 1))
      setVehicleType(b.vehicleType ?? 'yellowSky')
      if (b.guestPhone) {
        setIsGuest(true)
        setGuestName(b.guestName ?? '')
        setGuestPhone(b.guestPhone)
        setGuestCountryCode('+91')
      } else {
        setIsGuest(false)
        setPickedCustomer(null)
        setGuestName('')
        setGuestPhone('')
      }
      if (b.pricing) {
        setFareEditMode(true)
        setOverrideFare(String(b.pricing.fareBeforeTax ?? b.pricing.basePrice ?? 0))
        setOverrideGst(String(b.pricing.gst ?? 0))
        setOverrideToll(String((b.pricing as any).toll ?? 0))
        setOverrideDiscount(String((b.pricing as any).discount ?? 0))
        setPricingResult(b.pricing)
      } else {
        setFareEditMode(false)
        setOverrideFare(''); setOverrideGst(''); setOverrideToll(''); setOverrideDiscount('')
        setPricingResult(null)
      }
      setStep(0)
      setError('')
    } else {
      setStep(0); setCustomerQuery(''); setPickedCustomer(null); setIsGuest(false)
      setGuestName(''); setGuestPhone(''); setGuestCountryCode('+91')
      setBookingCategory('airport')
      setAddress(''); setAddressPlaceId(''); setStops([]); setDateTime('')
      setFlightNumber(''); setPassengers('1')
      setOutstationOrigin(''); setOutstationOriginPlaceId(''); setOutstationDest(''); setOutstationDestPlaceId('')
      setOutstationTripKind('round'); setOutstationReturnDate('')
      setHourlyPickup(''); setHourlyPickupPlaceId(''); setHourlyDuration(8)
      setPricingResult(null); setError(''); setFareEditMode(false); setOverrideFare(''); setOverrideGst(''); setOverrideToll(''); setOverrideDiscount('')
      setSendSms(true)
    }
  }, [open])

  const matched = customerQuery
    ? customers.filter(c =>
        (c.name || '').toLowerCase().includes(customerQuery.toLowerCase()) ||
        c.phone.includes(customerQuery))
    : customers.slice(0, 6)

  const availableDrivers = drivers.filter(d => d.status === 'available')

  const fetchFare = async () => {
    setPricingLoading(true)
    try {
      let result: any
      if (bookingCategory === 'airport') {
        if (!addressPlaceId) { setPricingLoading(false); return }
        const stopPlaceIds = stops.filter(s => s.placeId).map(s => s.placeId)
        result = await calcPricing({ originPlaceId: addressPlaceId, tripType: 'airport', stopPlaceIds })
      } else if (bookingCategory === 'outstation') {
        if (!outstationOriginPlaceId) { setFareEditMode(true); setPricingLoading(false); return }
        result = await calcPricing({
          originPlaceId: outstationOriginPlaceId,
          destPlaceId: outstationDestPlaceId || undefined,
          tripType: 'outstation',
        })
      } else {
        result = await calcPricing({ tripType: 'hourly', durationHours: hourlyDuration })
      }
      setPricingResult(result)
      setOverrideFare(String(result.fareBeforeTax ?? result.basePrice ?? 0))
      setOverrideGst(String(result.gst ?? 0))
      setOverrideToll(String(result.toll ?? 0))
    } catch {
      setPricingResult(null)
      setFareEditMode(true)
    } finally {
      setPricingLoading(false)
    }
  }

  // Fetch fare when reaching confirm step
  const goToStep = (n: number) => {
    setStep(n)
    if (n === 3 && !pricingResult) fetchFare()
  }

  const handleEdit = async () => {
    if (!editBooking) return
    setSaving(true); setError('')
    try {
      let pickupObj: any, dropObj: any, tripTypeStr: string
      if (bookingCategory === 'airport') {
        pickupObj = tripType === 'drop'
          ? { placeName: address, location: address, placeId: addressPlaceId || undefined, dateTime: fromISTISO(dateTime).toISOString() }
          : { placeName: `BLR Airport T${terminal}`, location: 'Kempegowda International Airport', dateTime: fromISTISO(dateTime).toISOString(), terminal }
        dropObj = tripType === 'drop'
          ? { placeName: `BLR Airport T${terminal}`, location: 'Kempegowda International Airport', terminal }
          : { placeName: address, location: address, placeId: addressPlaceId || undefined }
        tripTypeStr = tripType
      } else if (bookingCategory === 'outstation') {
        pickupObj = { placeName: outstationOrigin, location: outstationOrigin, placeId: outstationOriginPlaceId || undefined, dateTime: fromISTISO(dateTime).toISOString() }
        dropObj = {
          placeName: outstationDest, location: outstationDest, placeId: outstationDestPlaceId || undefined,
          ...(outstationTripKind === 'round' && outstationReturnDate ? { dateTime: fromISTISO(outstationReturnDate).toISOString() } : {}),
        }
        tripTypeStr = 'outstation'
      } else {
        pickupObj = { placeName: hourlyPickup, location: hourlyPickup, placeId: hourlyPickupPlaceId || undefined, dateTime: fromISTISO(dateTime).toISOString() }
        dropObj = { placeName: hourlyPickup, location: hourlyPickup, placeId: hourlyPickupPlaceId || undefined }
        tripTypeStr = 'hourly'
      }
      await patchBooking(editBooking.id, {
        tripType: tripTypeStr,
        vehicleType,
        passengerCount: Number(passengers),
        pickup: pickupObj,
        drop: dropObj,
        flight: bookingCategory === 'airport' && flightNumber ? { flightNumber, ...(editBooking.flight ?? {}) } : null,
        ...(editBooking.guestPhone ? { guestName, guestPhone } : {}),
        price: overrideTotal || pricingResult?.totalPrice || undefined,
      })
      onEdited?.()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    setSaving(true); setError('')
    try {
      let pickupObj: any, dropObj: any, tripTypeStr: string

      if (bookingCategory === 'airport') {
        pickupObj = tripType === 'drop'
          ? { placeName: address, location: address, placeId: addressPlaceId, dateTime: fromISTISO(dateTime).toISOString() }
          : { placeName: `BLR Airport T${terminal}`, location: 'Kempegowda International Airport', dateTime: fromISTISO(dateTime).toISOString(), terminal }
        dropObj = tripType === 'drop'
          ? { placeName: `BLR Airport T${terminal}`, location: 'Kempegowda International Airport', terminal }
          : { placeName: address, location: address, placeId: addressPlaceId }
        tripTypeStr = tripType
      } else if (bookingCategory === 'outstation') {
        pickupObj = { placeName: outstationOrigin, location: outstationOrigin, placeId: outstationOriginPlaceId, dateTime: fromISTISO(dateTime).toISOString() }
        dropObj = {
          placeName: outstationDest, location: outstationDest, placeId: outstationDestPlaceId,
          ...(outstationTripKind === 'round' && outstationReturnDate ? { dateTime: fromISTISO(outstationReturnDate).toISOString() } : {}),
        }
        tripTypeStr = 'outstation'
      } else {
        pickupObj = { placeName: hourlyPickup, location: hourlyPickup, placeId: hourlyPickupPlaceId, dateTime: fromISTISO(dateTime).toISOString() }
        dropObj = { placeName: hourlyPickup, location: hourlyPickup, placeId: hourlyPickupPlaceId }
        tripTypeStr = 'hourly'
      }

      const assignedDriver = assignedDriverId ? drivers.find(d => d.id === assignedDriverId) : undefined

      const pricing = fareEditMode
        ? {
            distanceKm: pricingResult?.distanceKm ?? 0,
            fareBeforeTax: overrideFareNum,
            gst: overrideGstNum,
            toll: overrideTollNum,
            discount: overrideDiscountNum || undefined,
            basePrice: overrideFareNum,
            totalPrice: overrideTotal,
          }
        : pricingResult
        ? {
            distanceKm: pricingResult.distanceKm,
            fareBeforeTax: pricingResult.fareBeforeTax,
            gst: pricingResult.gst,
            toll: pricingResult.toll ?? 0,
            basePrice: pricingResult.basePrice,
            totalPrice: pricingResult.totalPrice,
          }
        : { distanceKm: 0, basePrice: 0, totalPrice: 0 }

      const stopLocs = bookingCategory === 'airport'
        ? stops.filter(s => s.placeId).map(s => ({ location: s.address, placeName: s.address, placeId: s.placeId }))
        : []

      const created = await createBooking({
        tripType: tripTypeStr,
        vehicleType,
        passengers: parseInt(passengers),
        pickup: pickupObj,
        drop: dropObj,
        stops: stopLocs.length ? stopLocs : undefined,
        flight: bookingCategory === 'airport' && flightNumber ? { flightNumber, airline: '' } : null,
        ...(bookingCategory === 'hourly' ? { durationHours: hourlyDuration } : {}),
        ...(bookingCategory === 'outstation' ? { tripKind: outstationTripKind } : {}),
        pricing,
        userId: pickedCustomer?.id,
        guestName: isGuest ? guestName : undefined,
        guestPhone: isGuest ? `${guestCountryCode.replace('+', '')}${guestPhone.replace(/\s/g, '')}` : undefined,
        assignedDriver: assignedDriver ? { id: assignedDriver.id, name: assignedDriver.name, phone: assignedDriver.phone, plate: assignedDriver.plate, vehicle: assignedDriver.vehicle } : undefined,
        assignedVehicle: assignedDriver?.plate ? { licensePlate: assignedDriver.plate, make: '', model: assignedDriver.vehicle ?? '' } : undefined,
        sendSms,
      })
      onCreated?.(created?.booking)
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell open={open} onClose={onClose} width={720}>
      <ModalHeader title={editBooking ? `Edit booking · ${editBooking.tripCode}` : 'New booking'} subtitle={editBooking ? 'Changes take effect immediately' : 'Create on behalf of customer or as guest'} onClose={onClose}/>
      <Stepper steps={stepNames} current={step}/>

      <div style={{ padding: 24, overflow: 'auto', flex: 1, minHeight: 0 }}>
        {step === 0 && editBooking && (
          <Stack gap={16}>
            <FieldLabel>Customer</FieldLabel>
            {editBooking.guestPhone ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormInput label="Guest name" placeholder="Full name" value={guestName} onChange={(e: any) => setGuestName(e.target.value)}/>
                <FormInput label="Phone" value={guestPhone} onChange={(e: any) => setGuestPhone(e.target.value)}/>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: YL.bg, borderRadius: 10, border: `1px solid ${YL.line}` }}>
                <Avatar name={editBooking.userName || editBooking.userPhone || '?'} size={36}/>
                <Stack gap={3}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: YL.ink }}>{editBooking.userName || '—'}</div>
                  <Mono size={11} color={YL.ink2}>{editBooking.userPhone}</Mono>
                </Stack>
              </div>
            )}
          </Stack>
        )}
        {step === 0 && !editBooking && (
          <Stack gap={16}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant={!isGuest ? 'primary' : 'secondary'} onClick={() => setIsGuest(false)} size="sm">Existing customer</Button>
              <Button variant={isGuest ? 'primary' : 'secondary'} onClick={() => setIsGuest(true)} size="sm">Guest booking</Button>
            </div>
            {!isGuest ? (
              <>
                <FormInput
                  label="Search customer" required
                  placeholder="Name or phone…"
                  value={customerQuery}
                  onChange={(e: any) => setCustomerQuery(e.target.value)}
                  icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.search}</span>}
                />
                <div style={{ background: YL.bg, border: `1px solid ${YL.line}`, borderRadius: 10, maxHeight: 240, overflow: 'auto' }}>
                  {matched.length === 0 ? (
                    <div style={{ padding: 28, textAlign: 'center', color: YL.ink2, fontSize: 12.5 }}>No customers match.</div>
                  ) : matched.map(c => (
                    <button key={c.id} onClick={() => setPickedCustomer(c)} style={{
                      width: '100%', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 11,
                      background: pickedCustomer?.id === c.id ? YL.yellow : 'transparent',
                      border: 'none', borderBottom: `1px solid ${YL.line}`, cursor: 'pointer', textAlign: 'left',
                    }}>
                      <Avatar name={c.name || c.phone} size={28}/>
                      <Stack gap={2} style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: YL.ink }}>{c.name || '—'}</div>
                        <Mono size={11} color={YL.ink2}>{formatPhone(c.phone)} · {c.trip_count} trips</Mono>
                      </Stack>
                      {pickedCustomer?.id === c.id && <span style={{ color: YL.ink, fontSize: 14 }}>✓</span>}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormInput label="Guest name" placeholder="Full name" value={guestName} onChange={(e: any) => setGuestName(e.target.value)}/>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: YL.ink2, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Phone</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ position: 'relative' }}>
                      <button
                        ref={countryBtnRef}
                        type="button"
                        onClick={() => {
                          const rect = countryBtnRef.current?.getBoundingClientRect()
                          if (rect) setCountryAnchor({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX })
                          setCountryDropOpen(o => !o)
                          setCountrySearch('')
                        }}
                        style={{ height: 38, border: `1.5px solid ${YL.line}`, borderRadius: 8, padding: '0 8px', fontFamily: 'inherit', fontSize: 12, color: YL.ink, background: YL.bg, cursor: 'pointer', outline: 'none', whiteSpace: 'nowrap' }}
                      >
                        {(() => { const c = COUNTRY_CODES.find(c => c.code === guestCountryCode); return c ? `${c.flag} ${c.code}` : guestCountryCode })()} ▾
                      </button>
                      {countryDropOpen && countryAnchor && ReactDOM.createPortal(
                        <div
                          onMouseDown={e => e.stopPropagation()}
                          style={{ position: 'absolute', top: countryAnchor.top, left: countryAnchor.left, zIndex: 99999, background: YL.card, border: `1.5px solid ${YL.line}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', width: 200 }}
                        >
                          <div style={{ padding: '8px 8px 4px' }}>
                            <input
                              autoFocus
                              type="text"
                              placeholder="Search…"
                              value={countrySearch}
                              onChange={e => setCountrySearch(e.target.value)}
                              style={{ width: '100%', boxSizing: 'border-box', height: 30, border: `1.5px solid ${YL.line}`, borderRadius: 6, padding: '0 8px', fontFamily: 'inherit', fontSize: 12, color: YL.ink, background: YL.bg, outline: 'none' }}
                            />
                          </div>
                          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                            {COUNTRY_CODES.filter(c => `${c.name} ${c.code}`.toLowerCase().includes(countrySearch.toLowerCase())).map((c, i) => (
                              <div
                                key={`${c.code}-${i}`}
                                onClick={() => { setGuestCountryCode(c.code); setCountryDropOpen(false) }}
                                style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 13, color: YL.ink, background: c.code === guestCountryCode ? YL.bg : 'transparent', display: 'flex', gap: 8, alignItems: 'center' }}
                                onMouseEnter={e => (e.currentTarget.style.background = YL.bg)}
                                onMouseLeave={e => (e.currentTarget.style.background = c.code === guestCountryCode ? YL.bg : 'transparent')}
                              >
                                <span>{c.flag}</span>
                                <span style={{ flex: 1 }}>{c.name}</span>
                                <span style={{ color: YL.ink2, fontFamily: '"JetBrains Mono", monospace', fontSize: 11 }}>{c.code}</span>
                              </div>
                            ))}
                          </div>
                        </div>,
                        document.body
                      )}
                    </div>
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={e => setGuestPhone(e.target.value)}
                      placeholder="number"
                      style={{ flex: 1, height: 38, border: `1.5px solid ${YL.line}`, borderRadius: 8, padding: '0 10px', fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: YL.ink, background: YL.card, outline: 'none' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </Stack>
        )}

        {step === 1 && (
          <Stack gap={16}>
            {/* Booking category */}
            <div style={{ display: 'flex', gap: 6 }}>
              {([['airport', 'Airport'], ['outstation', 'Outstation'], ['hourly', 'Hourly']] as const).map(([val, label]) => (
                <button key={val} onClick={() => { setBookingCategory(val); setPricingResult(null) }} style={{ padding: '6px 14px', borderRadius: 8, border: `1.5px solid ${bookingCategory === val ? YL.ink : YL.line}`, background: bookingCategory === val ? YL.ink : YL.bg, color: bookingCategory === val ? YL.yellow : YL.ink, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>{label}</button>
              ))}
            </div>

            {/* ── Airport ── */}
            {bookingCategory === 'airport' && (
              <>
                <div style={{ display: 'flex', gap: 6 }}>
                  {([['drop', '← Drop to airport'], ['pickup', 'Pickup from airport →']] as const).map(([val, label]) => (
                    <button key={val} onClick={() => setTripType(val)} style={{ padding: '6px 14px', borderRadius: 8, border: `1.5px solid ${tripType === val ? YL.yellowDeep : YL.line}`, background: tripType === val ? YL.yellow : YL.bg, color: YL.ink, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>{label}</button>
                  ))}
                </div>
                <PlacesInput
                  label={tripType === 'drop' ? 'Pickup address' : 'Drop address'}
                  required
                  value={address}
                  onChange={(v) => { setAddress(v); setAddressPlaceId(''); setPricingResult(null) }}
                  onSelect={(s) => { setAddress(s.description); setAddressPlaceId(s.placeId) }}
                />
                {stops.map((stop, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <PlacesInput
                        label={`Stop ${i + 1}`}
                        value={stop.address}
                        onChange={(v) => setStops(s => s.map((x, idx) => idx === i ? { ...x, address: v, placeId: '' } : x))}
                        onSelect={(sel) => setStops(s => s.map((x, idx) => idx === i ? { address: sel.description, placeId: sel.placeId } : x))}
                      />
                    </div>
                    <button
                      onClick={() => { setStops(s => s.filter((_, idx) => idx !== i)); setPricingResult(null) }}
                      style={{ height: 38, padding: '0 10px', background: YL.bg, border: `1.5px solid ${YL.line}`, borderRadius: 8, cursor: 'pointer', color: YL.ink2, fontSize: 16, fontFamily: 'inherit', marginBottom: 0 }}
                      title="Remove stop"
                    >×</button>
                  </div>
                ))}
                <button
                  onClick={() => setStops(s => [...s, { address: '', placeId: '' }])}
                  style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: YL.ink2, fontSize: 12, cursor: 'pointer', padding: '2px 0', fontFamily: 'inherit', letterSpacing: 0.2 }}
                >＋ Add stop</button>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: YL.ink2, marginRight: 4 }}>Terminal</span>
                  {(['T1', 'T2'] as const).map(t => (
                    <button key={t} onClick={() => setTerminal(t)} style={{ padding: '6px 14px', borderRadius: 8, border: `1.5px solid ${terminal === t ? YL.yellowDeep : YL.line}`, background: terminal === t ? YL.yellow : YL.bg, color: YL.ink, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>{t}</button>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <DateTimePicker label="Date & time" required value={dateTime} onChange={setDateTime}/>
                  <FormInput label="Flight number" hint="optional" placeholder="6E 184" value={flightNumber}
                    onChange={(e: any) => setFlightNumber(e.target.value)}
                    icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.flight}</span>}/>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FormInput label="Passengers" type="number" placeholder="1" value={passengers} onChange={(e: any) => setPassengers(e.target.value)}/>
                </div>
              </>
            )}

            {/* ── Outstation ── */}
            {bookingCategory === 'outstation' && (
              <>
                <div style={{ display: 'flex', gap: 6 }}>
                  {([['round', 'Round trip'], ['oneway', 'One-way']] as const).map(([val, label]) => (
                    <button key={val} onClick={() => setOutstationTripKind(val)} style={{ padding: '6px 14px', borderRadius: 8, border: `1.5px solid ${outstationTripKind === val ? YL.ink : YL.line}`, background: outstationTripKind === val ? YL.ink : YL.bg, color: outstationTripKind === val ? YL.yellow : YL.ink, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>{label}</button>
                  ))}
                </div>
                <PlacesInput label="Origin (pickup)" required
                  value={outstationOrigin}
                  onChange={(v) => { setOutstationOrigin(v); setOutstationOriginPlaceId(''); setPricingResult(null) }}
                  onSelect={(s) => { setOutstationOrigin(s.description); setOutstationOriginPlaceId(s.placeId) }}
                />
                <PlacesInput label="Destination (drop)" required
                  value={outstationDest}
                  onChange={(v) => { setOutstationDest(v); setOutstationDestPlaceId(''); setPricingResult(null) }}
                  onSelect={(s) => { setOutstationDest(s.description); setOutstationDestPlaceId(s.placeId) }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <DateTimePicker label="Departure date & time" required value={dateTime} onChange={setDateTime}/>
                  {outstationTripKind === 'round' && (
                    <DateTimePicker label="Return date & time" required value={outstationReturnDate} onChange={setOutstationReturnDate}/>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FormInput label="Passengers" type="number" placeholder="1" value={passengers} onChange={(e: any) => setPassengers(e.target.value)}/>
                </div>
              </>
            )}

            {/* ── Hourly ── */}
            {bookingCategory === 'hourly' && (
              <>
                <PlacesInput label="Pickup location" required
                  value={hourlyPickup}
                  onChange={(v) => { setHourlyPickup(v); setHourlyPickupPlaceId(''); setPricingResult(null) }}
                  onSelect={(s) => { setHourlyPickup(s.description); setHourlyPickupPlaceId(s.placeId) }}
                />
                <Stack gap={8}>
                  <FieldLabel required>Duration</FieldLabel>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="number" min={1} max={24}
                      value={hourlyDuration}
                      onChange={e => { setHourlyDuration(Math.max(1, parseInt(e.target.value) || 1)); setPricingResult(null) }}
                      style={{ width: 72, height: 38, border: `1.5px solid ${YL.line}`, borderRadius: 8, padding: '0 10px', fontFamily: '"JetBrains Mono", monospace', fontSize: 16, color: YL.ink, background: YL.card, outline: 'none', textAlign: 'center' }}
                    />
                    <span style={{ fontSize: 13.5, color: YL.ink2 }}>hours</span>
                  </div>
                </Stack>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <DateTimePicker label="Start date & time" required value={dateTime} onChange={setDateTime}/>
                  <FormInput label="Passengers" type="number" placeholder="1" value={passengers} onChange={(e: any) => setPassengers(e.target.value)}/>
                </div>
              </>
            )}
          </Stack>
        )}

        {step === 2 && (
          <Stack gap={16}>
            <Stack gap={8}>
              <FieldLabel required>Vehicle class</FieldLabel>
              {bookingCategory === 'airport' && (
                <TilePicker value={vehicleType} onChange={setVehicleType} options={[
                  { value: 'yellowSky', label: 'Yellow Sky', desc: 'Kia Carens Clavis · 6 seats' },
                ]}/>
              )}
              {bookingCategory === 'outstation' && (
                <TilePicker value={vehicleType} onChange={setVehicleType} options={[
                  { value: 'yellowSky',   label: 'Yellow Sky',   desc: 'Kia Carens Clavis · 6 seats' },
                  { value: 'yellowEarth', label: 'Yellow Earth',  desc: 'Long-distance · 4 seats' },
                  { value: 'sedan',       label: 'Sedan',         desc: 'Economy · 4 seats' },
                  { value: 'suv',         label: 'SUV',           desc: 'Premium · 6 seats' },
                ]}/>
              )}
              {bookingCategory === 'hourly' && (
                <TilePicker value={vehicleType} onChange={setVehicleType} options={[
                  { value: 'yellowSky', label: 'Yellow Sky', desc: 'Kia Carens Clavis · 6 seats' },
                  { value: 'sedan',     label: 'Sedan',      desc: 'Economy · 4 seats' },
                ]}/>
              )}
            </Stack>
            <Stack gap={8}>
              <FieldLabel hint="optional">Assign driver now</FieldLabel>
              <div style={{ background: YL.bg, border: `1px solid ${YL.line}`, borderRadius: 10, maxHeight: 200, overflow: 'auto' }}>
                <button onClick={() => setAssignedDriverId('')} style={{
                  width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                  background: assignedDriverId === '' ? YL.yellowSoft : 'transparent',
                  border: 'none', borderBottom: `1px solid ${YL.line}`, cursor: 'pointer', textAlign: 'left',
                }}>
                  <Mono size={11.5} color={YL.ink2}>Leave blank — auto-dispatch later</Mono>
                </button>
                {availableDrivers.map(d => (
                  <button key={d.id} onClick={() => setAssignedDriverId(d.id)} style={{
                    width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                    background: assignedDriverId === d.id ? YL.yellow : 'transparent',
                    border: 'none', borderBottom: `1px solid ${YL.line}`, cursor: 'pointer', textAlign: 'left',
                  }}>
                    <Avatar name={d.name} size={26}/>
                    <Stack gap={2} style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: YL.ink }}>{d.name}</div>
                      <Mono size={10.5} color={YL.ink2}>{d.plate}</Mono>
                    </Stack>
                    <span style={{ fontSize: 11, color: YL.greenInk }}>● Available</span>
                  </button>
                ))}
              </div>
            </Stack>
          </Stack>
        )}

        {step === 3 && (
          <Stack gap={16}>
            <FieldLabel>Booking summary</FieldLabel>
            <div style={{ background: YL.bg, border: `1px solid ${YL.line}`, borderRadius: 10, overflow: 'hidden' }}>
              {(() => {
                const fmtDt = (s: string) => { if (!s) return '—'; const ist = toISTISO(new Date(s)); const [dp,tp] = ist.split('T'); const [y,mo,d] = dp.split('-').map(Number); const [h,mi] = tp.split(':').map(Number); const ap = h>=12?'PM':'AM'; const MONS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${d} ${MONS[mo-1]} ${y} · ${h%12||12}:${String(mi).padStart(2,'0')} ${ap}` }
                const vehicleLabel: Record<string,string> = { yellowSky: 'Yellow Sky', yellowEarth: 'Yellow Earth', sedan: 'Sedan', suv: 'SUV' }
                const baseRows: [string, string][] = [
                  ['Customer', pickedCustomer ? pickedCustomer.name || pickedCustomer.phone : (isGuest ? guestName || 'Guest' : '—')],
                  ['Phone', pickedCustomer ? formatPhone(pickedCustomer.phone) : (isGuest ? `${guestCountryCode} ${guestPhone}` : '—')],
                ]
                if (bookingCategory === 'airport') baseRows.push(
                  ['Type', 'Airport transfer'],
                  ['Direction', tripType === 'drop' ? `Drop → BLR ${terminal}` : `Pickup ← BLR ${terminal}`],
                  ['Address', address || '—'],
                  ...stops.filter(s => s.address).map((s, i) => [`Stop ${i + 1}`, s.address] as [string,string]),
                  ['Date & time', fmtDt(dateTime)],
                  ...( flightNumber ? [['Flight', flightNumber] as [string,string]] : []),
                  ['Passengers', `${passengers} pax`],
                )
                if (bookingCategory === 'outstation') baseRows.push(
                  ['Type', `Outstation · ${outstationTripKind === 'round' ? 'Round trip' : 'One-way'}`],
                  ['Origin', outstationOrigin || '—'],
                  ['Destination', outstationDest || '—'],
                  ['Departure', fmtDt(dateTime)],
                  ...( outstationTripKind === 'round' ? [['Return', fmtDt(outstationReturnDate)] as [string,string]] : []),
                  ['Passengers', `${passengers} pax`],
                )
                if (bookingCategory === 'hourly') baseRows.push(
                  ['Type', 'Hourly rental'],
                  ['Pickup', hourlyPickup || '—'],
                  ['Duration', `${hourlyDuration} hours`],
                  ['Start', fmtDt(dateTime)],
                  ['Passengers', `${passengers} pax`],
                )
                baseRows.push(
                  ['Vehicle', vehicleLabel[vehicleType] ?? vehicleType],
                  ...( assignedDriverId ? [['Driver', drivers.find(d => d.id === assignedDriverId)?.name || '—'] as [string,string]] : []),
                )
                return baseRows
              })().map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '10px 14px', borderBottom: `1px solid ${YL.line}`, fontSize: 12.5 }}>
                  <span style={{ color: YL.ink2, flexShrink: 0, minWidth: 90 }}>{k}</span>
                  <span style={{ color: YL.ink, fontWeight: 500, textAlign: 'right', wordBreak: 'break-word' }}>{v}</span>
                </div>
              ))}
              <div style={{ padding: 14, background: YL.yellow }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Stack gap={3}>
                    <div style={{ fontSize: 11, color: YL.ink2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      {fareEditMode ? 'Custom fare' : 'Estimated fare'}
                    </div>
                    {!fareEditMode && pricingLoading && <div style={{ fontSize: 11, color: YL.ink2 }}>Calculating…</div>}
                    {!fareEditMode && pricingResult && <div style={{ fontSize: 11, color: YL.ink2 }}>{pricingResult.distanceKm > 0 ? `${pricingResult.distanceKm} km · incl. GST` : `${hourlyDuration}h package · incl. GST`}</div>}
                    {!fareEditMode && !pricingResult && !pricingLoading && (
                      <div style={{ fontSize: 11, color: YL.ink2 }}>
                        {bookingCategory === 'airport' && !addressPlaceId && 'Select address from dropdown for auto-fare'}
                        {bookingCategory === 'outstation' && 'Enter origin + destination for auto-fare'}
                      </div>
                    )}
                  </Stack>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Mono size={22} weight={600}>
                      {fareEditMode
                        ? `₹${overrideTotal.toLocaleString('en-IN')}`
                        : pricingLoading ? '…' : pricingResult ? `₹${pricingResult.totalPrice.toLocaleString('en-IN')}` : '—'}
                    </Mono>
                    <button
                      onClick={() => setFareEditMode(m => !m)}
                      style={{ fontSize: 11, fontWeight: 600, color: YL.ink, background: 'rgba(0,0,0,0.08)', border: 'none', borderRadius: 6, padding: '4px 9px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0.2, whiteSpace: 'nowrap' }}
                    >{fareEditMode ? 'Use calc' : 'Edit fare'}</button>
                  </div>
                </div>
                {fareEditMode && (() => {
                  const isAirport = bookingCategory === 'airport'
                  // GST is on (fare + toll); discount only reduces the final total
                  const recalcFromFare = (fare: string, toll: string) => {
                    const f = parseFloat(fare) || 0
                    const t = isAirport ? 0 : (parseFloat(toll) || 0)
                    return { gst: String(Math.round(Math.max(0, f + t) * 0.05)) }
                  }
                  // Back-calculate fare from a typed total (total = fare + gst + toll - discount)
                  const recalcFromTotal = (total: string, disc: string, toll: string) => {
                    const tot = parseFloat(total) || 0
                    const d = parseFloat(disc) || 0
                    const tl = isAirport ? 0 : (parseFloat(toll) || 0)
                    const fare = Math.max(0, Math.round((tot + d) / 1.05 - tl))
                    // Exact remainder so fare + gst + toll - discount = typed total exactly
                    const gst = Math.max(0, tot + d - fare - tl)
                    return { fare: String(fare), gst: String(gst) }
                  }
                  const fields = [
                    { label: 'Fare (ex-tax)', value: overrideFare, set: (v: string) => { const r = recalcFromFare(v, overrideToll); setOverrideFare(v); setOverrideGst(r.gst) }, minus: false },
                    { label: 'GST', value: overrideGst, set: setOverrideGst, minus: false },
                    ...(isAirport ? [] : [{ label: 'Toll', value: overrideToll, set: (v: string) => { const r = recalcFromFare(overrideFare, v); setOverrideToll(v); setOverrideGst(r.gst) }, minus: false }]),
                    { label: 'Discount', value: overrideDiscount, set: setOverrideDiscount, minus: true },
                  ]
                  return (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${fields.length}, 1fr)`, gap: 8 }}>
                        {fields.map(({ label, value, set, minus }) => (
                          <div key={label}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: minus ? YL.redInk : YL.ink2, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
                            <div style={{ position: 'relative' }}>
                              <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: minus ? YL.redInk : YL.ink2, pointerEvents: 'none' }}>{minus ? '−₹' : '₹'}</span>
                              <input type="number" min={0} value={value} onChange={e => set(e.target.value)}
                                style={{ width: '100%', height: 34, border: `1.5px solid ${minus && parseFloat(value) > 0 ? 'rgba(200,50,50,0.35)' : 'rgba(0,0,0,0.15)'}`, borderRadius: 7, padding: '0 8px 0 24px', fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: minus && parseFloat(value) > 0 ? YL.redInk : YL.ink, background: minus && parseFloat(value) > 0 ? 'rgba(255,220,220,0.5)' : 'rgba(255,255,255,0.6)', outline: 'none', boxSizing: 'border-box' }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Editable total — back-calculates fare */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: YL.ink, textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }}>Total</div>
                        <div style={{ position: 'relative', width: 120 }}>
                          <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: YL.ink, pointerEvents: 'none' }}>₹</span>
                          <input
                            type="number" min={0}
                            value={overrideTotalDraft !== null ? overrideTotalDraft : (overrideTotal > 0 ? String(overrideTotal) : '')}
                            onFocus={() => setOverrideTotalDraft(overrideTotal > 0 ? String(overrideTotal) : '')}
                            onChange={e => { setOverrideTotalDraft(e.target.value); const r = recalcFromTotal(e.target.value, overrideDiscount, overrideToll); setOverrideFare(r.fare); setOverrideGst(r.gst) }}
                            onBlur={() => setOverrideTotalDraft(null)}
                            style={{ width: '100%', height: 34, border: '1.5px solid rgba(0,0,0,0.25)', borderRadius: 7, padding: '0 8px 0 24px', fontFamily: '"JetBrains Mono", monospace', fontSize: 13, fontWeight: 600, color: YL.ink, background: 'rgba(255,255,255,0.8)', outline: 'none', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div style={{ fontSize: 10.5, color: YL.ink2 }}>← type total to back-calculate fare</div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: YL.bg, borderRadius: 10, border: `1px solid ${YL.line}` }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: YL.ink }}>Send SMS to customer</div>
                <div style={{ fontSize: 11, color: YL.ink2, marginTop: 2 }}>Confirmation SMS on booking creation</div>
              </div>
              <button
                onClick={() => setSendSms(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 11px', borderRadius: 7, border: `1.5px solid ${sendSms ? YL.leaf : YL.line}`, background: sendSms ? YL.greenSoft : YL.bg, cursor: 'pointer', fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit', color: sendSms ? YL.greenInk : YL.ink3 }}
              >
                <span style={{ width: 6, height: 6, borderRadius: 999, background: sendSms ? YL.leaf : YL.ink3 }}/>
                {sendSms ? 'ON' : 'OFF'}
              </button>
            </div>
            {error && <div style={{ padding: '10px 14px', background: YL.redSoft, color: YL.redInk, borderRadius: 8, fontSize: 12.5 }}>{error}</div>}
          </Stack>
        )}
      </div>

      <div style={{ padding: '14px 24px', borderTop: `1px solid ${YL.line}`, background: YL.bg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11.5, color: YL.ink2, whiteSpace: 'nowrap' }}>Step {step + 1} of {stepNames.length}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {step > 0 && <Button variant="secondary" onClick={() => setStep(s => s - 1)}>Back</Button>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          {step < stepNames.length - 1 ? (
            <Button variant="primary" onClick={() => goToStep(step + 1)} disabled={step === 0 && !editBooking && !pickedCustomer && !isGuest}>Continue</Button>
          ) : (
            <Button variant="primary" onClick={editBooking ? handleEdit : handleCreate} disabled={saving}>{saving ? (editBooking ? 'Saving…' : 'Creating…') : (editBooking ? 'Save changes' : 'Create booking')}</Button>
          )}
        </div>
      </div>
    </ModalShell>
  )
}

// ─── Add Driver Modal ──────────────────────────────────────────────────────

interface AddDriverModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
  vehicles?: Vehicle[]
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function FileUploadRow({ label, hint, value, onChange }: {
  label: string; hint: string; value: string; onChange: (v: string) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const hasFile = !!value

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: hasFile ? YL.greenSoft : YL.bg, border: `1px dashed ${hasFile ? YL.leaf : YL.line}`, borderRadius: 10 }}>
      <input ref={inputRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
        onChange={async e => {
          const file = e.target.files?.[0]
          if (file) { const b64 = await fileToBase64(file); onChange(b64) }
        }}
      />
      <Stack gap={3} style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: YL.ink, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11.5, color: hasFile ? YL.greenInk : YL.ink2 }}>
          {hasFile ? `✓ ${file_display_name(value)}` : `${hint} · PDF or JPG, max 5 MB`}
        </div>
      </Stack>
      <button onClick={() => inputRef.current?.click()} style={{ padding: '6px 12px', background: hasFile ? YL.leaf : YL.card, color: hasFile ? 'white' : YL.ink, border: `1px solid ${hasFile ? YL.leaf : YL.line}`, borderRadius: 6, cursor: 'pointer', fontSize: 11.5, fontWeight: 500 }}>
        {hasFile ? 'Change' : 'Upload'}
      </button>
    </div>
  )
}

function file_display_name(dataUrl: string): string {
  try { return dataUrl.length > 30 ? 'File ready' : dataUrl } catch { return 'File ready' }
}

export function AddDriverModal({ open, onClose, onCreated, vehicles = [] }: AddDriverModalProps) {
  const [step, setStep] = React.useState(0)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')

  const [name, setName] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [selectedVehicleId, setSelectedVehicleId] = React.useState('')
  const [photoUrl, setPhotoUrl] = React.useState('')
  const [docLicense, setDocLicense] = React.useState('')
  const [docAadhaar, setDocAadhaar] = React.useState('')
  const [docPan, setDocPan] = React.useState('')
  const [docPolice, setDocPolice] = React.useState('')
  const [licenseNo, setLicenseNo] = React.useState('')
  const [licenseExp, setLicenseExp] = React.useState('')
  const [bankHolder, setBankHolder] = React.useState('')
  const [bankIfsc, setBankIfsc] = React.useState('')
  const [bankAccount, setBankAccount] = React.useState('')
  const [bankUpi, setBankUpi] = React.useState('')
  const photoInputRef = React.useRef<HTMLInputElement>(null)

  const stepNames = ['Personal', 'Documents', 'Vehicle & Bank']

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId)

  React.useEffect(() => {
    if (open) {
      setStep(0); setName(''); setPhone(''); setSelectedVehicleId(''); setError('')
      setPhotoUrl(''); setDocLicense(''); setDocAadhaar(''); setDocPan(''); setDocPolice('')
      setLicenseNo(''); setLicenseExp('')
      setBankHolder(''); setBankIfsc(''); setBankAccount(''); setBankUpi('')
    }
  }, [open])

  const handleCreate = async () => {
    setSaving(true); setError('')
    try {
      await createDriver({
        name, phone,
        plate: selectedVehicle?.plate ?? null,
        vehicle: selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : null,
        photo_url: photoUrl || null,
        doc_license: docLicense || null,
        doc_aadhaar: docAadhaar || null,
        doc_pan: docPan || null,
        doc_police: docPolice || null,
        license_no: licenseNo || null,
        license_exp: licenseExp || null,
        bank_holder: bankHolder || null,
        bank_ifsc: bankIfsc || null,
        bank_account: bankAccount || null,
        bank_upi: bankUpi || null,
      })
      onCreated()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell open={open} onClose={onClose} width={720}>
      <ModalHeader title="Add driver" subtitle="Onboard a new driver to the Yellow fleet" onClose={onClose}/>
      <Stepper steps={stepNames} current={step}/>

      <div style={{ padding: 24, overflow: 'auto', flex: 1, minHeight: 0 }}>
        {step === 0 && (
          <Stack gap={16}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                onClick={() => photoInputRef.current?.click()}
                style={{ width: 72, height: 72, borderRadius: 999, background: photoUrl ? 'transparent' : YL.bg, border: `2px dashed ${photoUrl ? YL.leaf : YL.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: YL.ink3, cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}
              >
                {photoUrl
                  ? <img src={photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 999 }} />
                  : <span style={{ width: 22, height: 22, display: 'flex' }}>{Icons.drivers}</span>
                }
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={async e => {
                  const file = e.target.files?.[0]
                  if (file) { const b64 = await fileToBase64(file); setPhotoUrl(b64) }
                }}
              />
              <Stack gap={4}>
                <div style={{ fontSize: 13, color: YL.ink, fontWeight: 500 }}>Profile photo</div>
                <div style={{ fontSize: 11.5, color: YL.ink2 }}>Used in the customer app.</div>
                <button onClick={() => photoInputRef.current?.click()} style={{ marginTop: 4, width: 'fit-content', padding: '6px 12px', background: YL.yellow, color: YL.ink, border: `1px solid ${YL.yellowDeep}`, borderRadius: 6, cursor: 'pointer', fontSize: 11.5, fontWeight: 600 }}>
                  {photoUrl ? 'Change photo' : 'Upload photo'}
                </button>
              </Stack>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormInput label="Full name" required placeholder="As per Aadhaar" value={name} onChange={(e: any) => setName(e.target.value)}/>
              <FormInput label="Phone" required placeholder="+91 …" value={phone} onChange={(e: any) => setPhone(e.target.value)}
                icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.phone}</span>}/>
            </div>
          </Stack>
        )}

        {step === 1 && (
          <Stack gap={16}>
            <div style={{ fontSize: 12, color: YL.ink2, lineHeight: 1.5, background: YL.yellowSoft, padding: '10px 14px', borderRadius: 8, border: `1px solid ${YL.yellowDeep}` }}>
              All documents must be valid for at least 90 days. Driver cannot go live until KYC clears.
            </div>
            <FileUploadRow label="Driving license" hint="Front + back" value={docLicense} onChange={setDocLicense}/>
            <FileUploadRow label="Aadhaar card" hint="Front + back" value={docAadhaar} onChange={setDocAadhaar}/>
            <FileUploadRow label="PAN card" hint="Front" value={docPan} onChange={setDocPan}/>
            <FileUploadRow label="Police verification" hint="PVC certificate" value={docPolice} onChange={setDocPolice}/>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormInput label="License number" required placeholder="KA01 20230012345" value={licenseNo} onChange={(e: any) => setLicenseNo(e.target.value)}/>
              <FormInput label="License expiry" required placeholder="YYYY-MM-DD" value={licenseExp} onChange={(e: any) => setLicenseExp(e.target.value)}/>
            </div>
          </Stack>
        )}

        {step === 2 && (
          <Stack gap={16}>
            <div>
              <FieldLabel>Assign vehicle</FieldLabel>
              <select
                value={selectedVehicleId}
                onChange={e => setSelectedVehicleId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${YL.line}`, borderRadius: 8, background: YL.card, color: YL.ink, fontSize: 13, outline: 'none' }}
              >
                <option value="">— No vehicle yet —</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.plate} · {v.make} {v.model}</option>
                ))}
              </select>
            </div>
            <div style={{ height: 1, background: YL.line, margin: '4px 0' }}/>
            <FieldLabel>Bank details (for payouts)</FieldLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormInput label="Account holder" placeholder="Full name on account" value={bankHolder} onChange={(e: any) => setBankHolder(e.target.value)}/>
              <FormInput label="IFSC" placeholder="HDFC0001234" value={bankIfsc} onChange={(e: any) => setBankIfsc(e.target.value)}/>
            </div>
            <FormInput label="Account number" placeholder="••••• 1234" value={bankAccount} onChange={(e: any) => setBankAccount(e.target.value)}/>
            <FormInput label="UPI ID" hint="for fast settlements" placeholder="name@bank" value={bankUpi} onChange={(e: any) => setBankUpi(e.target.value)}/>
            {error && <div style={{ padding: '10px 14px', background: YL.redSoft, color: YL.redInk, borderRadius: 8, fontSize: 12.5 }}>{error}</div>}
          </Stack>
        )}
      </div>

      <div style={{ padding: '14px 24px', borderTop: `1px solid ${YL.line}`, background: YL.bg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11.5, color: YL.ink2, whiteSpace: 'nowrap' }}>Step {step + 1} of {stepNames.length}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {step > 0 && <Button variant="secondary" onClick={() => setStep(s => s - 1)}>Back</Button>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          {step < stepNames.length - 1 ? (
            <Button variant="primary" onClick={() => setStep(s => s + 1)} disabled={step === 0 && (!name || !phone)}>Continue</Button>
          ) : (
            <Button variant="primary" onClick={handleCreate} disabled={saving}>{saving ? 'Saving…' : 'Add driver'}</Button>
          )}
        </div>
      </div>
    </ModalShell>
  )
}

// ─── Add Vehicle Modal ─────────────────────────────────────────────────────

interface AddVehicleModalProps {
  open: boolean
  onClose: () => void
  drivers: Driver[]
  onCreated: () => void
}

export function AddVehicleModal({ open, onClose, drivers, onCreated }: AddVehicleModalProps) {
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')

  const [plate, setPlate] = React.useState('')
  const [make, setMake] = React.useState('Kia')
  const [model, setModel] = React.useState('Carens Clavis')
  const [year, setYear] = React.useState('2024')
  const [color, setColor] = React.useState('Yellow')
  const [classKey, setClassKey] = React.useState('yellowSky')
  const [insuranceExpiry, setInsuranceExpiry] = React.useState('')
  const [fcExpiry, setFcExpiry] = React.useState('')
  const [driverId, setDriverId] = React.useState('')
  const [driverQuery, setDriverQuery] = React.useState('')

  React.useEffect(() => {
    if (open) { setPlate(''); setError(''); setDriverId(''); setDriverQuery(''); setInsuranceExpiry(''); setFcExpiry('') }
  }, [open])

  const matchedDrivers = driverQuery
    ? drivers.filter(d => d.name.toLowerCase().includes(driverQuery.toLowerCase()) || d.phone.includes(driverQuery))
    : drivers.filter(d => d.status === 'available')

  const handleCreate = async () => {
    setSaving(true); setError('')
    try {
      await createVehicle({
        plate: plate.toUpperCase(),
        make, model,
        year: parseInt(year),
        color,
        type: classKey,
        class_key: classKey,
        is_ev: 1,
        insurance_expiry: insuranceExpiry || null,
        fc_expiry: fcExpiry || null,
        driver_id: driverId || null,
        soc: 80, odometer: 0,
      })
      onCreated()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell open={open} onClose={onClose} width={680}>
      <ModalHeader title="Add vehicle" subtitle="Register a new car to the Yellow fleet" onClose={onClose}/>

      <div style={{ padding: 24, overflow: 'auto', flex: 1, minHeight: 0 }}>
        <Stack gap={18}>
          <Stack gap={8}>
            <FieldLabel required>Vehicle class</FieldLabel>
            <TilePicker value={classKey} onChange={setClassKey} options={[
              { value: 'yellowSky',   label: 'Yellow Sky',   desc: 'Airport transfers' },
              { value: 'yellowEarth', label: 'Yellow Earth', desc: 'Outstation / long-distance' },
            ]}/>
          </Stack>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormInput label="Make" required placeholder="Kia, Tata, Toyota…" value={make} onChange={(e: any) => setMake(e.target.value)}/>
            <FormInput label="Model" required placeholder="Carens Clavis, Nexon…" value={model} onChange={(e: any) => setModel(e.target.value)}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <FormInput label="Year" required placeholder="2024" value={year} onChange={(e: any) => setYear(e.target.value)} type="number"/>
            <FormInput label="Color" required placeholder="Yellow" value={color} onChange={(e: any) => setColor(e.target.value)}/>
            <FormInput label="Plate number" required placeholder="KA 01 EV 4521" value={plate} onChange={(e: any) => setPlate(e.target.value)}/>
          </div>

          <div style={{ height: 1, background: YL.line }}/>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <DatePicker label="Insurance expiry" value={insuranceExpiry} onChange={setInsuranceExpiry} placeholder="Not set"/>
            <DatePicker label="FC expiry" value={fcExpiry} onChange={setFcExpiry} placeholder="FC expiry"/>
          </div>

          <div style={{ height: 1, background: YL.line }}/>

          <Stack gap={8}>
            <FieldLabel hint="optional">Assign to driver</FieldLabel>
            <Input value={driverQuery} onChange={(e: any) => setDriverQuery(e.target.value)}
              placeholder="Search driver…"
              icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.search}</span>}/>
            <div style={{ background: YL.bg, border: `1px solid ${YL.line}`, borderRadius: 8, maxHeight: 180, overflow: 'auto' }}>
              <button onClick={() => setDriverId('')} style={{ width: '100%', padding: '9px 12px', display: 'flex', alignItems: 'center', background: driverId === '' ? YL.yellowSoft : 'transparent', border: 'none', borderBottom: `1px solid ${YL.line}`, cursor: 'pointer', textAlign: 'left' }}>
                <Mono size={11.5} color={YL.ink2}>No driver — unassigned</Mono>
              </button>
              {matchedDrivers.map(d => (
                <button key={d.id} onClick={() => setDriverId(d.id)} style={{
                  width: '100%', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 9,
                  background: driverId === d.id ? YL.yellow : 'transparent',
                  border: 'none', borderBottom: `1px solid ${YL.line}`, cursor: 'pointer', textAlign: 'left',
                }}>
                  <Avatar name={d.name} size={24}/>
                  <Stack gap={1} style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: YL.ink }}>{d.name}</div>
                    <Mono size={10.5} color={YL.ink2}>{formatPhone(d.phone)}</Mono>
                  </Stack>
                  <span style={{ fontSize: 11, color: d.status === 'available' ? YL.greenInk : YL.ink3 }}>● {d.status}</span>
                </button>
              ))}
            </div>
          </Stack>

          {error && <div style={{ padding: '10px 14px', background: YL.redSoft, color: YL.redInk, borderRadius: 8, fontSize: 12.5 }}>{error}</div>}
        </Stack>
      </div>

      <div style={{ padding: '14px 24px', borderTop: `1px solid ${YL.line}`, background: YL.bg, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleCreate} disabled={saving || !plate || !make || !model}>
          {saving ? 'Adding…' : 'Add to fleet'}
        </Button>
      </div>
    </ModalShell>
  )
}


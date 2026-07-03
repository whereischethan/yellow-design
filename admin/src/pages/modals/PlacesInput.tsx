import React from 'react'
import ReactDOM from 'react-dom'
import { YL, Icons, FormInput } from '../../components/ui'

const PLACES_KEY = (import.meta as any).env?.VITE_GOOGLE_API_KEY || ''
const BLR_CENTER = { latitude: 12.9716, longitude: 77.5946 }

export interface PlaceSuggestion { placeId: string; description: string }

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

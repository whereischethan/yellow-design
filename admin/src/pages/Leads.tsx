import React from 'react'
import type { Lead, Booking } from '../types'
import { patchLead, createBooking, downloadCSV } from '../api'
import { YL, Icons, Mono, Stack, Button, Chip, PageHeader, Avatar, fmtDate, fmtTime, fmtINR, useIsMobile, formatPhone, telPhone, getISTComponents, fromISTISO } from '../components/ui'

function mapsUrl(loc: { placeName?: string; location?: string; lat?: number; lng?: number; placeId?: string } | null | undefined): string | null {
  if (!loc) return null
  if (loc.lat != null && loc.lng != null) return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`
  if (loc.placeId) return `https://www.google.com/maps/place/?q=place_id:${loc.placeId}`
  const name = loc.placeName || loc.location
  return name ? `https://www.google.com/maps/search/${encodeURIComponent(name)}` : null
}

const minutesUntil = (iso: string) => Math.round((new Date(iso).getTime() - Date.now()) / 60000)
const fmtAge = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (m < 60 * 24) return `${Math.round(m / 60)}h ago`
  return `${Math.round(m / (60 * 24))}d ago`
}
const fmtUntil = (iso: string) => {
  const m = minutesUntil(iso)
  if (m < 0) return 'past'
  if (m < 60) return `in ${m} min`
  if (m < 60 * 24) return `in ${Math.round(m / 60)} hr`
  return `in ${Math.round(m / (60 * 24))} d`
}

const LEAD_STATUS: Record<string, { bg: string; fg: string; dot?: string; label: string }> = {
  new:       { bg: YL.yellow,    fg: YL.ink,      dot: YL.gulmohar, label: 'New' },
  called:    { bg: '#fbeec0',    fg: '#7a5d18',                     label: 'Called' },
  converted: { bg: YL.greenSoft, fg: YL.greenInk,                   label: 'Converted' },
  lost:      { bg: YL.line,      fg: YL.ink2,                       label: 'Lost' },
}

function LeadStatusPill({ status }: { status: string }) {
  const s = LEAD_STATUS[status] ?? LEAD_STATUS.new
  return (
    <span style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, padding: '4px 8px', background: s.bg, color: s.fg, borderRadius: 4, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {s.dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: s.dot }}/>}
      {s.label}
    </span>
  )
}

function LeadDrawer({ lead, onClose, onMark, onConvert, isMobile }: { lead: Lead | null; onClose: () => void; onMark: (l: Lead, status: string) => void; onConvert: (l: Lead) => void; isMobile: boolean }) {
  if (!lead) return null
  const pastPickup = lead.pickup_time ? minutesUntil(lead.pickup_time) < 0 : false
  const phone = lead.user_phone ?? ''
  const name = lead.user_name ?? 'Unknown'
  const canConvert = !!(lead.pickup && lead.drop && (lead.pricing?.totalPrice ?? lead.price))

  const drawerStyle: React.CSSProperties = isMobile
    ? { position: 'fixed', left: 0, right: 0, bottom: 60, top: 0, background: YL.card, zIndex: 200, display: 'flex', flexDirection: 'column', animation: 'yl-slide-up 200ms ease' }
    : { position: 'absolute', top: 0, right: 0, bottom: 0, width: 480, background: YL.card, zIndex: 100, display: 'flex', flexDirection: 'column', boxShadow: '-12px 0 32px rgba(43,39,32,0.10)' }

  return (
    <>
      <div onClick={onClose} style={{ position: isMobile ? 'fixed' : 'absolute', inset: 0, background: 'rgba(43,39,32,0.18)', zIndex: isMobile ? 199 : 90 }}/>
      <div style={drawerStyle}>
        <div style={{ padding: '20px 24px 18px', borderBottom: `1px solid ${YL.line}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <Stack gap={6}>
              <div style={{ fontSize: 11, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Quote lead</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: YL.ink, letterSpacing: -0.4, fontFamily: '"Bricolage Grotesque", system-ui' }}>{fmtINR(lead.price)}</div>
              <LeadStatusPill status={lead.status}/>
            </Stack>
            <button onClick={onClose} style={{ width: 32, height: 32, border: `1px solid ${YL.line}`, background: YL.bg, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: YL.ink2 }}>
              <span style={{ width: 16, height: 16, display: 'flex' }}>{Icons.close}</span>
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name={name} size={40}/>
            <Stack gap={3} style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: YL.ink, fontWeight: 500 }}>{name}</div>
              {phone && <Mono size={12} color={YL.ink2}>{formatPhone(phone)}</Mono>}
            </Stack>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          <div style={{ fontSize: 11, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginBottom: 10 }}>Trip details</div>
          <div style={{ background: YL.bg, border: `1px solid ${YL.line}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <Stack gap={10}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: YL.leaf, flexShrink: 0 }}/>
                {mapsUrl(lead.pickup)
                  ? <a href={mapsUrl(lead.pickup)!} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: YL.ink, textDecoration: 'underline', textDecorationColor: YL.ink3, textUnderlineOffset: 3 }}>{lead.pickup?.placeName || lead.pickup?.location || '—'}</a>
                  : <span style={{ fontSize: 13, color: YL.ink }}>{lead.pickup?.placeName || lead.pickup?.location || '—'}</span>
                }
              </div>
              {(lead.stops ?? []).map((stop, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: YL.yellowDeep, flexShrink: 0 }}/>
                  {mapsUrl(stop)
                    ? <a href={mapsUrl(stop)!} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: YL.ink, textDecoration: 'underline', textDecorationColor: YL.ink3, textUnderlineOffset: 3 }}>{stop.placeName || stop.location}</a>
                    : <span style={{ fontSize: 13, color: YL.ink }}>{stop.placeName || stop.location}</span>
                  }
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: YL.gulmohar, flexShrink: 0 }}/>
                {mapsUrl(lead.drop)
                  ? <a href={mapsUrl(lead.drop)!} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: YL.ink, textDecoration: 'underline', textDecorationColor: YL.ink3, textUnderlineOffset: 3 }}>{lead.drop?.placeName || lead.drop?.location || 'BLR Airport'}</a>
                  : <span style={{ fontSize: 13, color: YL.ink }}>{lead.drop?.placeName || lead.drop?.location || 'BLR Airport'}</span>
                }
              </div>
            </Stack>
            {lead.pickup_time && (
              <div style={{ borderTop: `1px dashed ${YL.line}`, marginTop: 10, paddingTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Stack gap={3}>
                  <div style={{ fontSize: 10.5, color: YL.ink3, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Pickup time</div>
                  <Mono size={12.5} weight={500}>{fmtDate(lead.pickup_time)} · {fmtTime(lead.pickup_time)}</Mono>
                  <div style={{ fontSize: 10.5, color: pastPickup ? YL.gulmohar : YL.ink2 }}>{fmtUntil(lead.pickup_time)}</div>
                </Stack>
                {lead.flight && (
                  <Stack gap={3}>
                    <div style={{ fontSize: 10.5, color: YL.ink3, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Flight</div>
                    <Mono size={12.5} weight={500}>{lead.flight}</Mono>
                  </Stack>
                )}
              </div>
            )}
          </div>

          {lead.pricing && (
            <>
              <div style={{ fontSize: 11, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginBottom: 10 }}>Pricing breakdown</div>
              <div style={{ background: YL.bg, border: `1px solid ${YL.line}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <Stack gap={8}>
                  {lead.pricing.distanceKm != null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <span style={{ color: YL.ink2 }}>Distance</span>
                      <Mono size={12.5} weight={500}>{lead.pricing.distanceKm} km</Mono>
                    </div>
                  )}
                  {lead.pricing.breakdown?.kmFare && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <span style={{ color: YL.ink2 }}>Km fare</span>
                      <Mono size={12.5} weight={500}>{lead.pricing.breakdown.kmFare}</Mono>
                    </div>
                  )}
                  {lead.pricing.breakdown?.distanceFare && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <span style={{ color: YL.ink2 }}>Distance fare</span>
                      <Mono size={12.5} weight={500}>{lead.pricing.breakdown.distanceFare}</Mono>
                    </div>
                  )}
                  {lead.pricing.breakdown?.tripCharge && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <span style={{ color: YL.ink2 }}>Trip charge</span>
                      <Mono size={12.5} weight={500}>{lead.pricing.breakdown.tripCharge}</Mono>
                    </div>
                  )}
                  {lead.pricing.breakdown?.driverBata && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <span style={{ color: YL.ink2 }}>Driver bata</span>
                      <Mono size={12.5} weight={500}>{lead.pricing.breakdown.driverBata}</Mono>
                    </div>
                  )}
                  {lead.pricing.breakdown?.gst && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <span style={{ color: YL.ink2 }}>GST</span>
                      <Mono size={12.5} weight={500}>{lead.pricing.breakdown.gst}</Mono>
                    </div>
                  )}
                  {lead.pricing.breakdown?.toll && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <span style={{ color: YL.ink2 }}>Toll</span>
                      <Mono size={12.5} weight={500}>{lead.pricing.breakdown.toll}</Mono>
                    </div>
                  )}
                  <div style={{ borderTop: `1px solid ${YL.line}`, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: YL.ink, fontWeight: 600 }}>Total</span>
                    <Mono size={13} weight={700}>{fmtINR(lead.price)}</Mono>
                  </div>
                </Stack>
              </div>
            </>
          )}

          <div style={{ fontSize: 11, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginBottom: 10 }}>Activity</div>
          <Stack gap={10} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
              <span style={{ color: YL.ink2 }}>Quote shown</span>
              <Stack gap={2} style={{ alignItems: 'flex-end' }}>
                <Mono size={12} weight={500}>{fmtDate(lead.quoted_at)} · {fmtTime(lead.quoted_at)}</Mono>
                <span style={{ fontSize: 10.5, color: YL.ink3 }}>{fmtAge(lead.quoted_at)}</span>
              </Stack>
            </div>
            {!lead.pricing && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                <span style={{ color: YL.ink2 }}>Quoted price</span>
                <Mono size={12.5} weight={600}>{fmtINR(lead.price)}</Mono>
              </div>
            )}
            {lead.trip_code && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                <span style={{ color: YL.ink2 }}>Booking</span>
                <Mono size={12.5} weight={500} color={YL.greenInk}>{lead.trip_code} ✓</Mono>
              </div>
            )}
          </Stack>

          {lead.caller_note && (
            <>
              <div style={{ fontSize: 11, color: YL.ink2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginBottom: 10 }}>Last call note</div>
              <div style={{ background: '#fbeec0', border: '1px solid #e9d488', borderRadius: 8, padding: '12px 14px', fontSize: 12.5, color: YL.ink, lineHeight: 1.5, fontStyle: 'italic' }}>
                "{lead.caller_note}"
              </div>
            </>
          )}
        </div>

        <div style={{ padding: '14px 24px', borderTop: `1px solid ${YL.line}`, background: YL.bg, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lead.status !== 'converted' && lead.status !== 'lost' && canConvert && (
            <Button variant="primary" onClick={() => onConvert(lead)} style={{ justifyContent: 'center' }}>
              Convert to booking
            </Button>
          )}
          {lead.status !== 'converted' && lead.status !== 'lost' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {phone && (
                <a href={`tel:${telPhone(phone)}`} style={{ textDecoration: 'none' }}>
                  <Button variant="secondary" icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.phone}</span>} style={{ width: '100%', justifyContent: 'center' }}>
                    Call {name.split(' ')[0]}
                  </Button>
                </a>
              )}
              {phone && (
                <a href={`https://wa.me/${telPhone(phone).replace('+', '')}?text=${encodeURIComponent(`Hi ${name.split(' ')[0]}, this is Yellow. Following up on your ride quote.`)}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <Button variant="ghost" icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.whatsapp}</span>} style={{ width: '100%', justifyContent: 'center' }}>WhatsApp</Button>
                </a>
              )}
              <Button variant="ghost" onClick={() => onMark(lead, 'called')} style={{ gridColumn: '1 / -1' }}>Mark as called</Button>
            </div>
          )}
          {(lead.status === 'converted' || lead.status === 'lost') && (
            <div style={{ fontSize: 12, color: YL.ink3, textAlign: 'center' }}>
              {lead.status === 'converted' ? `Converted${lead.trip_code ? ` · ${lead.trip_code}` : ''}` : 'Marked as lost'}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

interface Props {
  leads: Lead[]
  bookings: Booking[]
  onUpdate: (l: Lead) => void
  onBookingCreated?: (b: Booking) => void
}

export default function LeadsPage({ leads, bookings: _bookings, onUpdate, onBookingCreated }: Props) {
  const isMobile = useIsMobile()
  const [filter, setFilter] = React.useState<'open' | 'converted' | 'lost' | 'all'>('open')
  const [openLead, setOpenLead] = React.useState<Lead | null>(null)
  const [showDupes, setShowDupes] = React.useState(false)
  const [converting, setConverting] = React.useState(false)

  const counts = {
    open:      leads.filter(l => l.status === 'new' || l.status === 'called').length,
    converted: leads.filter(l => l.status === 'converted').length,
    lost:      leads.filter(l => l.status === 'lost').length,
    all:       leads.length,
  }

  const filtered = filter === 'all' ? leads
    : filter === 'open' ? leads.filter(l => l.status === 'new' || l.status === 'called')
    : leads.filter(l => l.status === filter)

  const sorted = [...filtered].sort((a, b) =>
    filter === 'open' && a.pickup_time && b.pickup_time
      ? new Date(a.pickup_time).getTime() - new Date(b.pickup_time).getTime()
      : new Date(b.quoted_at).getTime() - new Date(a.quoted_at).getTime()
  )

  // Deduplication: within each (phone, pickup day) group, keep only the most recently quoted lead
  const { display: displayLeads, dupeCount } = React.useMemo(() => {
    const byQuotedDesc = [...filtered].sort((a, b) => new Date(b.quoted_at).getTime() - new Date(a.quoted_at).getTime())
    const seen = new Set<string>()
    const dupeIds = new Set<string>()
    for (const lead of byQuotedDesc) {
      const day = lead.pickup_time ? lead.pickup_time.slice(0, 10) : 'notime'
      const key = `${lead.user_phone ?? lead.user_id}|${day}|${lead.trip_type ?? ''}`
      if (seen.has(key)) { dupeIds.add(lead.id) } else { seen.add(key) }
    }
    return { display: showDupes ? sorted : sorted.filter(l => !dupeIds.has(l.id)), dupeCount: dupeIds.size }
  }, [filtered, sorted, showDupes])

  const handleMark = async (lead: Lead, status: string) => {
    try {
      const res = await patchLead(lead.id, { status })
      onUpdate(res.lead)
      setOpenLead(prev => prev?.id === lead.id ? { ...prev, status: status as Lead['status'] } : prev)
    } catch {}
  }

  const handleConvert = async (lead: Lead) => {
    setConverting(true)
    try {
      const pickup = lead.pickup ? { ...lead.pickup, dateTime: lead.pickup_time ?? new Date().toISOString() } : null
      const pricing = lead.pricing?.totalPrice != null ? lead.pricing : { totalPrice: lead.price, distanceKm: lead.pricing?.distanceKm ?? 0, basePrice: lead.price, extraKmCharge: 0 }
      const body: any = {
        tripType: lead.trip_type || 'drop',
        vehicleType: 'yellowSky',
        passengers: 1,
        pickup,
        drop: lead.drop,
        pricing,
        userId: lead.user_id,
        ...(lead.flight ? { flight: { flightNumber: lead.flight } } : {}),
      }
      const r: any = await createBooking(body)
      await patchLead(lead.id, { status: 'converted', trip_code: r.booking.tripCode })
      const updatedLead = { ...lead, status: 'converted' as const, trip_code: r.booking.tripCode }
      onUpdate(updatedLead)
      setOpenLead(null)
      onBookingCreated?.(r.booking)
    } catch (e: any) {
      alert(`Failed to convert: ${e.message}`)
    } finally {
      setConverting(false)
    }
  }

  const istToday = getISTComponents(new Date().toISOString())!
  const todayStartIST = fromISTISO(`${istToday.y}-${String(istToday.mo+1).padStart(2,'0')}-${String(istToday.d).padStart(2,'0')}T00:00`)
  const todayLeads = leads.filter(l => new Date(l.quoted_at) >= todayStartIST)
  const convertedToday = todayLeads.filter(l => l.status === 'converted').length
  const lostToday = todayLeads.filter(l => l.status === 'lost').length
  const convRate = (convertedToday + lostToday) > 0 ? Math.round((convertedToday / (convertedToday + lostToday)) * 100) : 0

  const summaryCards = [
    { label: 'Open leads',      value: counts.open,       hint: 'Not yet called',        accent: YL.yellow },
    { label: 'Called today',    value: todayLeads.filter(l => l.status === 'called').length, hint: 'Awaiting decision', accent: '#c89a2c' },
    { label: 'Converted today', value: convertedToday,    hint: `${convRate}% close rate`, accent: YL.leaf },
    { label: 'Lost today',      value: lostToday,         hint: 'Pickup time passed',    accent: YL.ink3 },
  ]

  return (
    <div style={{ flex: 1, overflow: 'auto', background: YL.bg, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <PageHeader
        title="Leads"
        subtitle={isMobile ? `${counts.open} open · ${convertedToday} converted` : "Customers who saw a price quote but didn't book — call them before pickup time."}
        actions={!isMobile ? <>
          <Button variant="secondary" icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.download}</span>} onClick={() => downloadCSV(filtered.map(l => ({
            id: l.id, status: l.status, trip_type: l.trip_type,
            user_name: l.user_name ?? '', user_phone: l.user_phone ?? '',
            pickup: l.pickup?.location ?? '', drop: l.drop?.location ?? '',
            pickup_time: l.pickup_time ?? '', price: l.price,
            flight: l.flight ?? '', caller_note: l.caller_note ?? '',
            trip_code: l.trip_code ?? '', quoted_at: l.quoted_at,
          })), `leads-${new Date().toISOString().slice(0,10)}.csv`)}>Export CSV</Button>
        </> : undefined}
      />

      <div style={{ padding: isMobile ? '14px 16px 0' : '20px 28px 0' }}>
        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 14, marginBottom: 14 }}>
          {summaryCards.map(c => (
            <div key={c.label} style={{ background: YL.card, border: `1px solid ${YL.line}`, borderRadius: 12, padding: isMobile ? '12px 12px 10px' : '16px 16px 14px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.accent }}/>
              <div style={{ fontSize: isMobile ? 10.5 : 11.5, color: YL.ink2, fontWeight: 500 }}>{c.label}</div>
              <div style={{ marginTop: 6, fontSize: isMobile ? 22 : 28, fontWeight: 600, color: YL.ink, letterSpacing: -0.6, lineHeight: 1, fontFamily: '"Bricolage Grotesque", system-ui' }}>{c.value}</div>
              <div style={{ marginTop: 6, fontSize: 11, color: YL.ink3 }}>{c.hint}</div>
            </div>
          ))}
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto', alignItems: 'center', flexWrap: 'wrap' }}>
          {([['open', 'Open'], ['converted', 'Converted'], ['lost', 'Lost'], ['all', 'All']] as const).map(([k, l]) => (
            <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>
              {l} <Mono size={11} color={filter === k ? YL.yellow : YL.ink2}>{counts[k]}</Mono>
            </Chip>
          ))}
          {dupeCount > 0 && (
            <button onClick={() => setShowDupes(p => !p)} style={{ marginLeft: 4, fontSize: 11.5, color: YL.ink2, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
              {showDupes ? 'Hide duplicates' : `+${dupeCount} duplicate${dupeCount > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>

      {!isMobile && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 2.4fr 110px 160px 110px', gap: 16, padding: '10px 28px 10px 31px', background: YL.bg, borderTop: `1px solid ${YL.line}`, borderBottom: `1px solid ${YL.line}`, fontSize: 11, color: YL.ink2, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>
          <div>Customer</div><div>Route</div><div>Quote</div><div>Quoted at</div><div>Status</div>
        </div>
      )}

      <div style={{ flex: 1 }}>
        {converting && <div style={{ padding: '10px 28px', background: YL.yellowSoft, fontSize: 12.5, color: YL.ink }}>Converting lead to booking…</div>}
        {displayLeads.length === 0 ? (
          <div style={{ padding: '60px 28px', textAlign: 'center', color: YL.ink2, fontSize: 13 }}>No leads in this view.</div>
        ) : isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {displayLeads.map(lead => {
              const past = lead.pickup_time ? minutesUntil(lead.pickup_time) < 0 : false
              const urgency = lead.status === 'new' && lead.pickup_time && minutesUntil(lead.pickup_time) > 0 && minutesUntil(lead.pickup_time) < 180
              return (
                <div key={lead.id} onClick={() => setOpenLead(lead)} style={{
                  padding: '14px 16px', borderBottom: `1px solid ${YL.line}`, background: YL.card,
                  cursor: 'pointer', borderLeft: urgency ? `3px solid ${YL.gulmohar}` : '3px solid transparent',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Avatar name={lead.user_name || lead.user_phone || '?'} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, color: YL.ink, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.user_name || '—'}</div>
                      <Mono size={11} color={YL.ink2}>{formatPhone(lead.user_phone)}</Mono>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Mono size={13} weight={700}>{fmtINR(lead.price)}</Mono>
                      <LeadStatusPill status={lead.status} />
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5, color: YL.ink, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: lead.trip_type === 'pickup' ? YL.leaf : YL.gulmohar, flexShrink: 0 }}/>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {lead.pickup?.placeName || '—'} → {lead.drop?.placeName || 'BLR Airport'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 11, color: YL.ink3 }}>
                    {lead.pickup_time && (
                      <Mono size={10.5} color={past || urgency ? YL.gulmohar : YL.ink2}>
                        {fmtDate(lead.pickup_time)} · {fmtTime(lead.pickup_time)}
                      </Mono>
                    )}
                    <Mono size={10.5} color={YL.ink3}>{fmtAge(lead.quoted_at)}</Mono>
                  </div>
                </div>
              )
            })}
          </div>
        ) : displayLeads.map(lead => {
          const past = lead.pickup_time ? minutesUntil(lead.pickup_time) < 0 : false
          const urgency = lead.status === 'new' && lead.pickup_time && minutesUntil(lead.pickup_time) > 0 && minutesUntil(lead.pickup_time) < 180
          return (
            <div key={lead.id} onClick={() => setOpenLead(lead)} style={{
              display: 'grid', gridTemplateColumns: '1.4fr 2.4fr 110px 160px 110px',
              gap: 16, padding: '14px 28px', alignItems: 'center',
              borderBottom: `1px solid ${YL.line}`, background: YL.card,
              cursor: 'pointer', transition: 'background 120ms',
              borderLeft: urgency ? `3px solid ${YL.gulmohar}` : '3px solid transparent',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = YL.bg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = YL.card)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                <Avatar name={lead.user_name || lead.user_phone || '?'} size={30}/>
                <Stack gap={2} style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: YL.ink, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.user_name || '—'}</div>
                  <Mono size={11} color={YL.ink2}>{formatPhone(lead.user_phone)}</Mono>
                </Stack>
              </div>
              <Stack gap={3}>
                <div style={{ fontSize: 12.5, color: YL.ink, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: lead.trip_type === 'pickup' ? YL.leaf : YL.gulmohar, flexShrink: 0 }}/>
                  {lead.pickup?.placeName || '—'} → {lead.drop?.placeName || 'BLR Airport'}
                </div>
                {lead.pickup_time && (
                  <Mono size={10.5} color={past || urgency ? YL.gulmohar : YL.ink2}>
                    {fmtDate(lead.pickup_time)} · {fmtTime(lead.pickup_time)}
                  </Mono>
                )}
                {lead.flight && <Mono size={10.5} color={YL.ink2}>{lead.flight}</Mono>}
                {lead.pricing?.distanceKm != null && <Mono size={10.5} color={YL.ink3}>{lead.pricing.distanceKm} km</Mono>}
              </Stack>
              <Mono size={13} weight={600}>{fmtINR(lead.price)}</Mono>
              <Stack gap={2}>
                <Mono size={11.5} weight={500}>{fmtDate(lead.quoted_at)} · {fmtTime(lead.quoted_at)}</Mono>
                <Mono size={10.5} color={YL.ink3}>{fmtAge(lead.quoted_at)}</Mono>
              </Stack>
              <LeadStatusPill status={lead.status}/>
            </div>
          )
        })}
      </div>

      <LeadDrawer lead={openLead} onClose={() => setOpenLead(null)} onMark={handleMark} onConvert={handleConvert} isMobile={isMobile}/>
    </div>
  )
}

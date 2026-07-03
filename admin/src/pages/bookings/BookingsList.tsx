import React from 'react'
import type { Booking, BookingFilter } from '../../types'
import { downloadCSV } from '../../api'
import { YL, Icons, Button, PageHeader, fmtDate, useIsMobile } from '../../components/ui'
import { FilterBar } from './FilterBar'
import { BookingCard } from './BookingCard'
import { BookingRow } from './BookingRow'

function getTripType(b: Booking): string {
  if (b.tripType === 'hourly') return 'Hourly'
  if (b.tripType === 'outstation') return 'Outstation'
  if (b.tripType === 'drop') return 'Airport Drop'
  return 'Airport Pickup'
}

interface BookingsListProps {
  bookings: Booking[]
  onOpen: (b: Booking) => void
  onNewBooking?: () => void
  initialFilters?: BookingFilter
  onClearFilters?: () => void
}

export function BookingsList({ bookings, onOpen, onNewBooking, initialFilters, onClearFilters }: BookingsListProps) {
  const isMobile = useIsMobile()
  const [statusFilter, setStatusFilter] = React.useState<string[]>(initialFilters?.statuses ?? [])
  const [search, setSearch] = React.useState('')
  const [tripType, setTripType] = React.useState('all')
  const [paymentFilter, setPaymentFilter] = React.useState<'paid' | 'unpaid' | ''>(
    (initialFilters?.paymentStatus as 'paid' | 'unpaid' | '') ?? ''
  )
  const [tripCategoryFilter] = React.useState<string>(initialFilters?.tripType ?? '')
  const [dateFrom] = React.useState<string>(initialFilters?.dateFrom ?? '')
  const [dateTo] = React.useState<string>(initialFilters?.dateTo ?? '')
  const [isTodayFilter] = React.useState<boolean>(initialFilters?.isToday ?? false)

  const clearAllFilters = () => {
    setStatusFilter([])
    setPaymentFilter('')
    setSearch('')
    setTripType('all')
    onClearFilters?.()
  }

  const counts: Record<string, number> = React.useMemo(() => {
    const c: Record<string, number> = { total: bookings.length }
    bookings.forEach(b => { c[b.status] = (c[b.status] || 0) + 1 })
    return c
  }, [bookings])

  const STATUS_ORDER: Record<string, number> = { pending: 0, confirmed: 1, assigned: 2, arrived: 3, in_progress: 4, completed: 5, cancelled: 6 }

  const filtered = bookings.filter(b => {
    if (statusFilter.length && !statusFilter.includes(b.status)) return false
    if (tripType !== 'all' && b.tripType !== tripType) return false
    if (paymentFilter === 'paid' && b.paymentStatus !== 'paid') return false
    if (paymentFilter === 'unpaid' && b.paymentStatus === 'paid') return false
    if (tripCategoryFilter && getTripType(b) !== tripCategoryFilter) return false
    if (isTodayFilter && b.pickup?.dateTime && fmtDate(b.pickup.dateTime) !== 'Today') return false
    if (dateFrom && b.pickup?.dateTime && b.pickup.dateTime < dateFrom) return false
    if (dateTo && b.pickup?.dateTime && b.pickup.dateTime >= dateTo) return false
    if (search) {
      const q = search.toLowerCase()
      const hay = [b.tripCode, b.guestName, b.guestPhone, b.userName, b.userPhone, b.assignedDriver?.name, b.flight?.flightNumber].filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  }).sort((a, b) => {
    const pa = STATUS_ORDER[a.status] ?? 5
    const pb = STATUS_ORDER[b.status] ?? 5
    if (pa !== pb) return pa - pb
    if (pa >= 5) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    return new Date(a.pickup?.dateTime ?? 0).getTime() - new Date(b.pickup?.dateTime ?? 0).getTime()
  })

  const hasActiveFilters = initialFilters?.source || statusFilter.length > 0 || paymentFilter || tripCategoryFilter || dateFrom || isTodayFilter

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: YL.bg }}>
      <PageHeader title="Bookings" subtitle={`${filtered.length} of ${bookings.length}`}
        actions={<>
          {!isMobile && <Button variant="secondary" icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.download}</span>} onClick={() => downloadCSV(filtered.map(b => ({
            trip_code: b.tripCode, status: b.status, trip_type: b.tripType, vehicle: b.vehicleType,
            pickup_time: b.pickup?.dateTime ?? '', pickup: b.pickup?.location ?? '',
            drop: b.drop?.location ?? '', passengers: b.passengers,
            flight: b.flight?.flightNumber ?? '', driver: b.assignedDriver?.name ?? '',
            guest_name: b.guestName ?? '', guest_phone: b.guestPhone ?? '',
            price: b.pricing?.totalPrice ?? '', payment_status: b.paymentStatus ?? '',
            created_at: b.createdAt,
          })), `bookings-${new Date().toISOString().slice(0,10)}.csv`)}>Export CSV</Button>}
          <Button variant="primary" onClick={onNewBooking} icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.plus}</span>}>{isMobile ? '+' : 'New booking'}</Button>
        </>}/>
      {hasActiveFilters && initialFilters?.source && (
        <div style={{ padding: '8px 16px', background: YL.yellow, borderBottom: `1px solid ${YL.yellowDeep}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: YL.ink, opacity: 0.6 }}>FROM {initialFilters.source.toUpperCase()}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: YL.ink, flex: 1 }}>
            {initialFilters.sourceLabel ?? 'Filtered view'}
          </span>
          <button
            onClick={clearAllFilters}
            style={{ fontSize: 12, color: YL.ink, background: 'rgba(43,39,32,0.12)', border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 500 }}
          >
            Clear ×
          </button>
        </div>
      )}
      <FilterBar statusFilter={statusFilter} setStatusFilter={setStatusFilter} search={search} setSearch={setSearch} tripType={tripType} setTripType={setTripType} paymentFilter={paymentFilter} setPaymentFilter={setPaymentFilter} counts={counts}/>
      {!isMobile && (
        <div style={{ display: 'grid', gridTemplateColumns: '110px 110px 95px 1fr 165px 145px 90px 28px', gap: 16, padding: '10px 28px', background: YL.bg, borderBottom: `1px solid ${YL.line}`, fontSize: 11, color: YL.ink2, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>
          <div>Trip code</div><div>Status</div><div>Pickup</div><div>Route</div><div>Passenger</div><div>Driver</div><div style={{ textAlign: 'right' }}>Price</div><div/>
        </div>
      )}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '60px 28px', textAlign: 'center', color: YL.ink2, fontSize: 14 }}>No bookings match the current filters.</div>
        ) : filtered.map(b => isMobile
          ? <BookingCard key={b.id} b={b} onClick={onOpen}/>
          : <BookingRow key={b.id} b={b} onClick={onOpen}/>
        )}
      </div>
    </div>
  )
}

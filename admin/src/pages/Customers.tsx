import React from 'react'
import type { Customer, Booking } from '../types'
import {
  YL, Icons, Mono, Input, Button, PageHeader, Avatar, fmtDate, Stack,
  ModalShell, ModalHeader, STATUS_STYLE,
} from '../components/ui'
import { patchCustomer, getCustomerBookings } from '../api'

interface Props {
  customers: Customer[]
  onUpdate: (c: Customer) => void
}

function CustomerDrawer({
  customer, onClose, onUpdate,
}: {
  customer: Customer | null
  onClose: () => void
  onUpdate: (c: Customer) => void
}) {
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')
  const [bookings, setBookings] = React.useState<Booking[] | null>(null)
  const [loadingBookings, setLoadingBookings] = React.useState(false)
  const [tab, setTab] = React.useState<'profile' | 'rides'>('profile')

  React.useEffect(() => {
    if (!customer) return
    setName(customer.name || '')
    setEmail(customer.email || '')
    setError('')
    setBookings(null)
    setTab('profile')
  }, [customer?.id])

  React.useEffect(() => {
    if (!customer || tab !== 'rides') return
    if (bookings !== null) return
    setLoadingBookings(true)
    getCustomerBookings(customer.id)
      .then((r: any) => setBookings(r.bookings))
      .catch(() => setBookings([]))
      .finally(() => setLoadingBookings(false))
  }, [tab, customer?.id])

  const handleSave = async () => {
    if (!customer) return
    setSaving(true)
    setError('')
    try {
      const r: any = await patchCustomer(customer.id, { name: name.trim() || null, email: email.trim() || null })
      onUpdate({ ...customer, name: r.customer.name, email: r.customer.email })
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const changed = name !== (customer?.name || '') || email !== (customer?.email || '')

  if (!customer) return null

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '9px 16px', cursor: 'pointer', fontFamily: '"Bricolage Grotesque", system-ui',
    fontSize: 13, fontWeight: active ? 600 : 400, color: active ? YL.ink : YL.ink3,
    borderBottom: active ? `2.5px solid ${YL.ink}` : '2.5px solid transparent',
    background: 'transparent', border: 'none', borderBottom: active ? `2.5px solid ${YL.ink}` : '2.5px solid transparent',
  })

  return (
    <ModalShell open={!!customer} onClose={onClose} width={520}>
      <ModalHeader
        title={customer.name || customer.phone}
        subtitle={`Joined ${fmtDate(customer.created_at)} · ${customer.trip_count} ride${customer.trip_count !== 1 ? 's' : ''}`}
        onClose={onClose}
      />

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${YL.line}`, paddingLeft: 20, background: YL.card }}>
        <button style={tabStyle(tab === 'profile')} onClick={() => setTab('profile')}>Profile</button>
        <button style={tabStyle(tab === 'rides')} onClick={() => setTab('rides')}>
          Rides {customer.trip_count > 0 ? `(${customer.trip_count})` : ''}
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {tab === 'profile' && (
          <Stack gap={20}>
            {/* Phone (read-only) */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: YL.ink2, marginBottom: 6 }}>PHONE</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: YL.bg, borderRadius: 10, border: `1px solid ${YL.line}` }}>
                <span style={{ width: 14, height: 14, display: 'flex', color: YL.ink3 }}>{Icons.phone}</span>
                <Mono size={13}>{customer.phone}</Mono>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: YL.ink3, fontFamily: 'inherit' }}>read-only</span>
              </div>
            </div>

            {/* Name */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: YL.ink2, marginBottom: 6 }}>NAME</div>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Customer name"
                style={{ width: '100%', boxSizing: 'border-box', height: 40, padding: '0 12px', border: `1.5px solid ${YL.line}`, borderRadius: 10, fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 14, color: YL.ink, background: YL.card, outline: 'none' }}
              />
            </div>

            {/* Email */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: YL.ink2, marginBottom: 6 }}>EMAIL</div>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@example.com"
                type="email"
                style={{ width: '100%', boxSizing: 'border-box', height: 40, padding: '0 12px', border: `1.5px solid ${YL.line}`, borderRadius: 10, fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 14, color: YL.ink, background: YL.card, outline: 'none' }}
              />
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: YL.redSoft, border: `1px solid #FECACA`, borderRadius: 10, fontSize: 13, color: YL.redInk }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button variant="primary" onClick={handleSave} disabled={saving || !changed}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </Stack>
        )}

        {tab === 'rides' && (
          <div>
            {loadingBookings ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: YL.ink3, fontSize: 13 }}>Loading rides…</div>
            ) : !bookings || bookings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: YL.ink3, fontSize: 13 }}>No rides yet.</div>
            ) : (
              <Stack gap={10}>
                {bookings.map((b: Booking) => {
                  const s = STATUS_STYLE[b.status] || { bg: YL.bg, fg: YL.ink3, label: b.status }
                  const price = b.pricing?.totalPrice ? `₹${b.pricing.totalPrice.toLocaleString('en-IN')}` : '—'
                  const pickup = b.pickup?.placeName || b.pickup?.location || '—'
                  const drop = b.drop?.placeName || b.drop?.location || '—'
                  return (
                    <div key={b.id} style={{ padding: '14px 16px', background: YL.bg, borderRadius: 12, border: `1px solid ${YL.line}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Mono size={11.5} color={YL.ink3}>{b.tripCode || b.id.slice(0, 8).toUpperCase()}</Mono>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: s.fg, background: s.bg, padding: '2px 8px', borderRadius: 6 }}>{s.label}</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: YL.ink }}>{price}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 12.5, color: YL.ink, marginBottom: 2 }}>{pickup}</div>
                      <div style={{ fontSize: 12, color: YL.ink3 }}>→ {drop}</div>
                      <div style={{ fontSize: 11, color: YL.ink3, marginTop: 6 }}>{fmtDate(b.createdAt)}</div>
                    </div>
                  )
                })}
              </Stack>
            )}
          </div>
        )}
      </div>
    </ModalShell>
  )
}

export default function Customers({ customers, onUpdate }: Props) {
  const [search, setSearch] = React.useState('')
  const [selected, setSelected] = React.useState<Customer | null>(null)

  const filtered = customers.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (c.name || '').toLowerCase().includes(q) || c.phone.includes(q) || (c.email || '').toLowerCase().includes(q)
  })

  return (
    <div style={{ flex: 1, overflow: 'hidden', background: YL.bg, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} registered`}
        actions={
          <Input
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
            placeholder="Search name, phone or email"
            icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.search}</span>}
            style={{ width: 280 }}
          />
        }
      />

      {/* Column headers */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1.8fr 150px 80px 120px 120px 36px',
        gap: 12, padding: '10px 28px',
        borderBottom: `1px solid ${YL.line}`, fontSize: 11, color: YL.ink2,
        fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0,
        background: YL.bg,
      }}>
        <div>Customer</div><div>Phone</div><div>Rides</div><div>Joined</div><div>Email</div><div/>
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {filtered.map(c => (
          <div
            key={c.id}
            onClick={() => setSelected(c)}
            style={{
              display: 'grid', gridTemplateColumns: '1.8fr 150px 80px 120px 120px 36px',
              gap: 12, padding: '13px 28px', alignItems: 'center',
              borderBottom: `1px solid ${YL.line}`, background: YL.card,
              cursor: 'pointer', transition: 'background 100ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = YL.bg)}
            onMouseLeave={e => (e.currentTarget.style.background = YL.card)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={c.name || c.phone} size={30} />
              <div style={{ fontSize: 13.5, color: YL.ink, fontWeight: 500 }}>{c.name || <span style={{ color: YL.ink3, fontStyle: 'italic' }}>No name</span>}</div>
            </div>
            <Mono size={12}>{c.phone}</Mono>
            <Mono size={13} weight={600}>{c.trip_count}</Mono>
            <Mono size={11.5} color={YL.ink2}>{fmtDate(c.created_at)}</Mono>
            <span style={{ fontSize: 12, color: YL.ink2 }}>{c.email || '—'}</span>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span style={{ width: 16, height: 16, display: 'flex', color: YL.ink3 }}>{Icons.edit}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: '48px 28px', textAlign: 'center', color: YL.ink3, fontSize: 13 }}>
            No customers found.
          </div>
        )}
      </div>

      <CustomerDrawer
        customer={selected}
        onClose={() => setSelected(null)}
        onUpdate={c => { onUpdate(c); setSelected(null) }}
      />
    </div>
  )
}

import React from 'react'
import type { Invoice } from '../types'
import { getInvoices, openInvoice } from '../api'
import { YL, Mono, Button, PageHeader, Icons, Input, useIsMobile, formatPhone, getISTComponents } from '../components/ui'

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function fmtDate(dt: string): string {
  try {
    const c = getISTComponents(dt)
    if (!c) return dt
    return `${c.d} ${MONTHS_SHORT[c.mo]} ${c.y}`
  } catch { return dt }
}

function PayBadge({ status, method, razorpayPaymentId }: { status: string; method: string | null; razorpayPaymentId: string | null }) {
  const paid = status === 'paid'
  const label = paid
    ? razorpayPaymentId ? 'Paid · Razorpay'
    : method === 'upi' ? 'Paid · UPI'
    : method === 'cash' ? 'Paid · Cash'
    : 'Paid'
    : 'Pending'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 999, fontSize: 11,
      fontWeight: 500, lineHeight: 1,
      background: paid ? YL.greenSoft : YL.yellowSoft,
      color: paid ? YL.greenInk : YL.ink,
    }}>
      {label}
    </span>
  )
}

export default function InvoicesPage() {
  const isMobile = useIsMobile()
  const [invoices, setInvoices] = React.useState<Invoice[]>([])
  const [total, setTotal]       = React.useState(0)
  const [offset, setOffset]     = React.useState(0)
  const [search, setSearch]     = React.useState('')
  const [loading, setLoading]   = React.useState(true)

  const load = React.useCallback(async (off: number, q: string) => {
    setLoading(true)
    try {
      const r: any = await getInvoices(off, q)
      setInvoices(r.invoices)
      setTotal(r.total)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load(0, '') }, [load])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setSearch(q)
    setOffset(0)
    load(0, q)
  }

  const PAGE_SIZE = 50

  return (
    <div style={{ flex: 1, overflow: 'auto', background: YL.bg, display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Invoices"
        subtitle={`${total} total invoices`}
        actions={
          <Input
            value={search}
            onChange={handleSearch}
            placeholder={isMobile ? 'Search…' : 'Search invoice no, trip, customer…'}
            icon={Icons.search}
            style={{ width: isMobile ? 140 : 260 }}
          />
        }
      />

      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, color: YL.ink2, fontSize: 13 }}>
            Loading invoices…
          </div>
        ) : invoices.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, color: YL.ink3, fontSize: 13 }}>
            {search ? 'No invoices match your search.' : 'No invoices generated yet.'}
          </div>
        ) : isMobile ? (
          <div>
            {invoices.map(inv => (
              <div key={inv.id} style={{ padding: '13px 16px', borderBottom: `1px solid ${YL.line}`, background: YL.card, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Mono size={12.5} weight={600}>{inv.invoiceNo}</Mono>
                  <PayBadge status={inv.paymentStatus} method={inv.paymentMethod} razorpayPaymentId={inv.razorpayPaymentId} />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: YL.ink }}>{inv.customerName || '—'}</div>
                    <Mono size={11} color={YL.ink3}>{inv.tripCode}</Mono>
                  </div>
                  <Mono size={14} weight={700}>₹{inv.amount.toLocaleString('en-IN')}</Mono>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: YL.ink3 }}>{fmtDate(inv.generatedAt)}</span>
                  <Button size="sm" variant="secondary" icon={Icons.download} onClick={() => openInvoice(inv.tripCode)}>View</Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${YL.line}` }}>
                {['Invoice No', 'Date', 'Trip Code', 'Customer', 'Amount', 'Payment', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left',
                    fontFamily: '"Bricolage Grotesque", system-ui',
                    fontSize: 11, fontWeight: 700, letterSpacing: 0.8,
                    textTransform: 'uppercase', color: YL.ink3,
                    background: YL.bg,
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} style={{ borderBottom: `1px solid ${YL.line}` }}>
                  <td style={{ padding: '12px 16px' }}>
                    <Mono size={12.5} weight={600}>{inv.invoiceNo}</Mono>
                  </td>
                  <td style={{ padding: '12px 16px', color: YL.ink2, fontSize: 12.5 }}>
                    {fmtDate(inv.generatedAt)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Mono size={12}>{inv.tripCode}</Mono>
                  </td>
                  <td style={{ padding: '12px 16px', color: YL.ink, fontSize: 13 }}>
                    <div style={{ fontWeight: 500 }}>{inv.customerName || '—'}</div>
                    {inv.customerPhone && <div style={{ fontSize: 11.5, color: YL.ink3, fontFamily: '"JetBrains Mono", monospace', marginTop: 1 }}>{formatPhone(inv.customerPhone)}</div>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Mono size={13} weight={600}>₹{inv.amount.toLocaleString('en-IN')}</Mono>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <PayBadge status={inv.paymentStatus} method={inv.paymentMethod} razorpayPaymentId={inv.razorpayPaymentId} />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={Icons.download}
                      onClick={() => openInvoice(inv.tripCode)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div style={{ padding: '12px 24px', borderTop: `1px solid ${YL.line}`, display: 'flex', alignItems: 'center', gap: 12, background: YL.bg }}>
          <Button
            size="sm" variant="secondary" icon={Icons.chevLeft}
            disabled={offset === 0}
            onClick={() => { const o = Math.max(0, offset - PAGE_SIZE); setOffset(o); load(o, search) }}
          >Prev</Button>
          <span style={{ fontSize: 12, color: YL.ink2 }}>
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
          </span>
          <Button
            size="sm" variant="secondary"
            disabled={offset + PAGE_SIZE >= total}
            onClick={() => { const o = offset + PAGE_SIZE; setOffset(o); load(o, search) }}
          >Next {Icons.chevRight}</Button>
        </div>
      )}
    </div>
  )
}

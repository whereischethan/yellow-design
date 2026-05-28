import type { PrismaClient } from '@prisma/client'

// ─── Financial year + quarter helpers ────────────────────────────────────────

function getFY(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1 // 1-based
  // FY starts in April; if before April, FY started previous calendar year
  const fyStart = month >= 4 ? year : year - 1
  const fyEnd = (fyStart + 1) % 100
  return `${fyStart % 100}${String(fyEnd).padStart(2, '0')}`
}

function getQuarter(date: Date): number {
  const month = date.getMonth() + 1 // 1-based
  // Q1=Apr–Jun, Q2=Jul–Sep, Q3=Oct–Dec, Q4=Jan–Mar
  if (month >= 4 && month <= 6)  return 1
  if (month >= 7 && month <= 9)  return 2
  if (month >= 10 && month <= 12) return 3
  return 4
}

export async function getInvoiceCounter(prisma: PrismaClient, seriesPrefix = ''): Promise<string> {
  const now = new Date()
  // Use a distinct fy key for custom invoices so they have their own sequence
  const fy = (seriesPrefix ? seriesPrefix + '-' : '') + getFY(now)
  const quarter = getQuarter(now)

  const counter = await prisma.$transaction(async (tx) => {
    const existing = await tx.invoiceCounter.findUnique({ where: { fy_quarter: { fy, quarter } } })
    if (existing) {
      return tx.invoiceCounter.update({
        where: { fy_quarter: { fy, quarter } },
        data: { lastSeq: { increment: 1 } },
      })
    }
    const seedRow = !seriesPrefix
      ? await tx.pricingConfig.findUnique({ where: { key: 'invoice_start_seq' } })
      : null
    const seed = seedRow ? Math.max(0, parseInt(seedRow.value) || 0) : 0
    return tx.invoiceCounter.create({ data: { fy, quarter, lastSeq: seed + 1 } })
  })

  const baseFy = getFY(now)
  const label = seriesPrefix ? `YL-${seriesPrefix}` : 'YL'
  return `${label}/${baseFy}/Q${quarter}/${String(counter.lastSeq).padStart(5, '0')}`
}

// ─── Company config ───────────────────────────────────────────────────────────

export const COMPANY_KEYS = [
  'company_name', 'company_gstin', 'company_address',
  'company_sac_code', 'company_phone', 'company_email',
  'invoice_base_url', 'invoice_start_seq',
]

export async function getCompanyConfig(prisma: PrismaClient): Promise<Record<string, string>> {
  const rows = await prisma.pricingConfig.findMany({ where: { key: { in: COMPANY_KEYS } } })
  const cfg: Record<string, string> = {
    company_name: 'Yellow Cabs',
    company_gstin: '',
    company_address: 'Bengaluru, Karnataka',
    company_sac_code: '996412',
    company_phone: '',
    company_email: '',
    invoice_base_url: 'http://localhost:3001',
    invoice_start_seq: '0',
  }
  for (const { key, value } of rows) cfg[key] = value
  return cfg
}

// ─── HTML generator ───────────────────────────────────────────────────────────

function fmt(n: number | undefined | null): string {
  if (n == null) return '—'
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

function fmtDate(dt: string | Date | null | undefined): string {
  if (!dt) return '—'
  try {
    return new Date(dt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
    })
  } catch { return String(dt) }
}

function fmtTime(dt: string | null | undefined): string {
  if (!dt) return ''
  try {
    return new Date(dt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
  } catch { return '' }
}

function fmtPhone(phone: string | null | undefined): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (!digits) return phone
  // India: 10-digit bare, 12-digit with 91 prefix, or 11-digit with leading 0
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  if (digits.length === 11 && digits.startsWith('0')) {
    const d = digits.slice(1); return `+91 ${d.slice(0, 5)} ${d.slice(5)}`
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    const d = digits.slice(2); return `+91 ${d.slice(0, 5)} ${d.slice(5)}`
  }
  // US/Canada: 11 digits starting with 1
  if (digits.length === 11 && digits.startsWith('1')) return `+1 ${digits.slice(1,4)} ${digits.slice(4,7)} ${digits.slice(7)}`
  // UAE: 12 digits starting with 971
  if (digits.length === 12 && digits.startsWith('971')) return `+971 ${digits.slice(3,5)} ${digits.slice(5,8)} ${digits.slice(8)}`
  // UK: 12 digits starting with 44
  if (digits.length === 12 && digits.startsWith('44')) return `+44 ${digits.slice(2,6)} ${digits.slice(6)}`
  // Any other — ensure + prefix
  return `+${digits}`
}

function tripTypeLabel(type: string | null | undefined): string {
  if (!type) return 'Cab Service'
  if (type === 'pickup') return 'Airport Pickup'
  if (type === 'drop')   return 'Airport Drop'
  if (type === 'outstation') return 'Outstation Trip'
  if (type === 'hourly') return 'Hourly Rental'
  return 'Cab Service'
}

export interface InvoiceOverrides {
  amount?: number
  driverName?: string | null
  vehiclePlate?: string | null
  customerName?: string | null
  pickupLocation?: string | null
  dropLocation?: string | null
  pickupDateTime?: string | null
  distanceKm?: number | null
  toll?: number | null
  discount?: number | null
  stops?: string[] | null
}

export function generateInvoiceHtml(
  booking: any,
  invoiceNo: string,
  invoiceDate: Date,
  company: Record<string, string>,
  user?: { name?: string | null; phone?: string | null } | null,
  overrides?: InvoiceOverrides,
): string {
  const pickup   = booking.pickup   ? (typeof booking.pickup === 'string'   ? JSON.parse(booking.pickup)   : booking.pickup)   : null
  const drop     = booking.drop     ? (typeof booking.drop === 'string'     ? JSON.parse(booking.drop)     : booking.drop)     : null
  const pricing  = booking.pricing  ? (typeof booking.pricing === 'string'  ? JSON.parse(booking.pricing)  : booking.pricing)  : null
  const driver   = booking.assignedDriver   ? (typeof booking.assignedDriver === 'string'   ? JSON.parse(booking.assignedDriver)   : booking.assignedDriver)   : null
  const vehicle  = booking.assignedVehicle  ? (typeof booking.assignedVehicle === 'string'  ? JSON.parse(booking.assignedVehicle)  : booking.assignedVehicle)  : null
  const flight   = booking.flight   ? (typeof booking.flight === 'string'   ? JSON.parse(booking.flight)   : booking.flight)   : null

  // Prefer parsed JSON fields (server model) or already-parsed (admin buildBooking)
  const pickupParsed  = booking.pickupJson  ? JSON.parse(booking.pickupJson)  : pickup
  const dropParsed    = booking.dropJson    ? JSON.parse(booking.dropJson)    : drop
  const pricingParsed = booking.pricingJson ? JSON.parse(booking.pricingJson) : pricing
  const driverParsed  = booking.assignedDriverJson  ? JSON.parse(booking.assignedDriverJson)  : driver
  const vehicleParsed = booking.assignedVehicleJson ? JSON.parse(booking.assignedVehicleJson) : vehicle
  const flightParsed  = booking.flightJson  ? JSON.parse(booking.flightJson)  : flight
  const stopsParsed: any[] = overrides?.stops != null
    ? overrides.stops.map(s => ({ placeName: s }))
    : (() => { try { return JSON.parse(booking.stopsJson || '[]') } catch { return [] } })()

  const customerName  = overrides?.customerName ?? user?.name ?? booking.guestName ?? booking.userName ?? 'Customer'
  const customerPhone = user?.phone ?? booking.guestPhone ?? booking.userPhone ?? ''
  const customerGstin = booking.customerGstin ?? ''
  const customerGstName = booking.customerGstName ?? ''

  const toll       = overrides?.toll ?? pricingParsed?.toll ?? 0
  const discount   = overrides?.discount ?? pricingParsed?.discount ?? 0
  const total      = overrides?.amount ?? booking.price ?? 0
  const distanceKm = overrides?.distanceKm ?? pricingParsed?.distanceKm ?? null

  // Tolls are included in the base fare — GST is charged on the full amount (fare + toll).
  // Always reverse-calculate taxable from the final total so toll is included in the GST base.
  let taxable: number, cgst: number, sgst: number
  taxable = Math.round(total / 1.05)
  cgst    = Math.round(taxable * 0.025)
  sgst    = Math.round(taxable * 0.025)

  const sac = company.company_sac_code || '996412'
  const serviceDesc = tripTypeLabel(booking.tripType)
  const durationMins = pricingParsed?.durationMinutes || (parseFloat((pricingParsed?.breakdown?.hours ?? '0')) * 60) || 0
  const durationHrs  = durationMins ? (durationMins / 60 % 1 === 0 ? `${durationMins/60}` : (durationMins/60).toFixed(1)) : null
  const hourlyDesc   = durationHrs ? `${serviceDesc} · ${durationHrs} hrs · Unlimited kms (Bangalore)` : `${serviceDesc} · Unlimited kms (Bangalore)`

  const isPaid = booking.paymentStatus === 'paid' || booking.paymentStatus === 'Paid'
  const paymentLine = isPaid ? 'Paid' : 'Unpaid'

  const addressLines = (company.company_address || '').split('|').map(l => l.trim()).filter(Boolean)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Invoice ${invoiceNo}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Bricolage Grotesque',system-ui,sans-serif;background:#F6F3EB;color:#2B2720;min-height:100vh;padding:32px 16px}
  .page{max-width:720px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 40px rgba(43,39,32,0.12)}
  .header{background:#FFD84A;padding:24px 32px;display:flex;justify-content:space-between;align-items:flex-start;gap:24}
  .header-left{display:flex;flex-direction:column;gap:4}
  .company-name{font-size:22px;font-weight:700;letter-spacing:-0.5px;color:#2B2720}
  .company-sub{font-size:12px;color:#5a5246;line-height:1.5}
  .header-right{text-align:right;flex-shrink:0}
  .invoice-label{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#5a5246;margin-bottom:6px}
  .invoice-no{font-family:'JetBrains Mono',monospace;font-size:17px;font-weight:600;color:#2B2720;letter-spacing:-0.3px}
  .invoice-date{font-size:12px;color:#5a5246;margin-top:4px}
  .body{padding:28px 32px;display:flex;flex-direction:column;gap:22px}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px}
  .section-label{font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#9E9A91;margin-bottom:8px}
  .info-name{font-size:15px;font-weight:600;color:#2B2720;margin-bottom:2px}
  .info-line{font-size:12.5px;color:#736E65;line-height:1.5}
  .mono{font-family:'JetBrains Mono',monospace;font-size:12px;color:#2B2720}
  .divider{height:1px;background:#E2DDD7}
  .route-row{display:flex;gap:12px;align-items:flex-start}
  .route-dot{width:8px;height:8px;border-radius:50%;background:#FFD84A;border:2px solid #2B2720;flex-shrink:0;margin-top:4px}
  .route-dot.drop{background:#2B2720}
  .route-line{width:1px;background:#E2DDD7;margin:2px 0 2px 3px;flex-shrink:0;height:20px;align-self:center}
  .route-label{font-size:10px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:#9E9A91;margin-bottom:1px}
  .route-place{font-size:13.5px;font-weight:500;color:#2B2720}
  .route-time{font-size:11.5px;color:#9E9A91;font-family:'JetBrains Mono',monospace}
  .driver-row{display:flex;gap:12px;align-items:center;background:#F6F3EB;borderRadius:10px;padding:10px 14px;border-radius:10px}
  .driver-avatar{width:36px;height:36px;border-radius:50%;background:#2B2720;color:#FFD84A;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0}
  .driver-name{font-size:13.5px;font-weight:600;color:#2B2720}
  .driver-sub{font-size:12px;color:#736E65;font-family:'JetBrains Mono',monospace;margin-top:1px}
  table{width:100%;border-collapse:collapse;font-size:12.5px}
  thead th{text-align:left;padding:8px 10px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9E9A91;border-bottom:2px solid #E2DDD7}
  thead th:last-child,thead th:nth-last-child(2),thead th:nth-last-child(3){text-align:right}
  tbody td{padding:10px 10px;border-bottom:1px solid #F6F3EB;vertical-align:top}
  tbody td:last-child,tbody td:nth-last-child(2),tbody td:nth-last-child(3){text-align:right;font-family:'JetBrains Mono',monospace;color:#2B2720}
  .total-row td{padding:12px 10px;font-weight:700;border-top:2px solid #2B2720;border-bottom:none;font-size:14px}
  .total-row td:last-child{font-size:17px;font-family:'JetBrains Mono',monospace;color:#2B2720}
  .total-line{display:flex;justify-content:flex-end;align-items:baseline;gap:16px;padding:12px 10px 0;border-top:2px solid #2B2720;margin-top:4px}
  .total-label{font-size:14px;font-weight:700;color:#2B2720}
  .total-amount{font-size:19px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#2B2720}
  .payment-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;background:#D4F4CD;color:#2B6B24;font-size:11.5px;font-weight:600}
  .payment-badge.pending{background:#FFF0A8;color:#5a5246}
  .footer{padding:16px 32px;border-top:1px solid #E2DDD7;display:flex;align-items:center;justify-content:space-between;gap:12;flex-wrap:wrap}
  .footer-note{font-size:11px;color:#9E9A91}
  .print-btn{padding:8px 18px;background:#2B2720;color:#FFD84A;border:none;border-radius:8px;font-family:'Bricolage Grotesque',system-ui;font-size:13px;font-weight:600;cursor:pointer;letter-spacing:-0.2px}
  @media print{
    *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
    @page{margin:12mm;size:A4 portrait}
    body{background:#fff!important;padding:0!important;margin:0!important}
    .page{border-radius:0!important;box-shadow:none!important;max-width:100%!important;min-height:auto!important}
    .header{background:#FFD84A!important;-webkit-print-color-adjust:exact!important}
    .print-btn{display:none!important}
    .footer{justify-content:flex-start!important}
  }
  @media(max-width:540px){
    .two-col{grid-template-columns:1fr}
    .header{flex-direction:column;gap:12}
    .header-right{text-align:left}
    thead th:nth-child(2),thead th:nth-child(3),thead th:nth-child(4),tbody td:nth-child(2),tbody td:nth-child(3),tbody td:nth-child(4){display:none}
  }
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <div class="company-name">${escHtml(company.company_name || 'Yellow')}</div>
      ${company.company_gstin ? `<div class="company-sub">GSTIN: <span style="font-family:'JetBrains Mono',monospace">${escHtml(company.company_gstin)}</span></div>` : ''}
      ${addressLines.map(l => `<div class="company-sub">${escHtml(l)}</div>`).join('')}
      ${company.company_phone ? `<div class="company-sub">${escHtml(fmtPhone(company.company_phone))}</div>` : ''}
      ${company.company_email ? `<div class="company-sub">${escHtml(company.company_email)}</div>` : ''}
    </div>
    <div class="header-right">
      <div class="invoice-label">Tax Invoice${overrides ? ' · <span style="color:#C0392B;font-weight:700">Customer Copy</span>' : ''}</div>
      <div class="invoice-no">${escHtml(invoiceNo)}</div>
      <div class="invoice-date">${fmtDate(invoiceDate)}</div>
      <div class="invoice-date mono" style="margin-top:6px">${escHtml(booking.tripCode ?? '')}</div>
    </div>
  </div>

  <div class="body">
    <!-- Bill to + Trip details -->
    <div class="two-col">
      <div>
        <div class="section-label">Bill To</div>
        <div class="info-name">${escHtml(customerName)}</div>
        ${customerPhone ? `<div class="info-line">${escHtml(fmtPhone(customerPhone))}</div>` : ''}
        ${customerGstin ? `<div class="info-line" style="margin-top:4px">GSTIN: <span style="font-family:'JetBrains Mono',monospace;font-size:11.5px">${escHtml(customerGstin)}</span></div>` : ''}
        ${customerGstName ? `<div class="info-line">${escHtml(customerGstName)}</div>` : ''}
      </div>
      <div>
        <div class="section-label">Trip Details</div>
        <div class="info-name">${escHtml(serviceDesc)}</div>
        <div class="info-line">${overrides?.pickupDateTime ? fmtDate(overrides.pickupDateTime) : pickupParsed?.dateTime ? fmtDate(pickupParsed.dateTime) : fmtDate(booking.createdAt)}</div>
        ${booking.passengers ? `<div class="info-line">${booking.passengers} passenger${booking.passengers > 1 ? 's' : ''}</div>` : ''}
      </div>
    </div>

    <div class="divider"></div>

    <!-- Route -->
    <div>
      <div class="section-label">Route</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${(pickupParsed || overrides?.pickupLocation) ? (() => {
    const pName = overrides?.pickupLocation ?? pickupParsed?.placeName ?? pickupParsed?.location ?? '—'
    const pTime = overrides?.pickupDateTime ?? pickupParsed?.dateTime
    return `
        <div class="route-row">
          <div style="display:flex;flex-direction:column;align-items:center;padding-top:4px">
            <div class="route-dot"></div>
          </div>
          <div>
            <div class="route-label">Pickup${pickupParsed?.terminal ? ` · ${pickupParsed.terminal}` : ''}</div>
            <div class="route-place">${escHtml(pName)}</div>
            ${pTime ? `<div class="route-time">${fmtTime(pTime)}</div>` : ''}
          </div>
        </div>`
  })() : ''}
        ${stopsParsed.map((s: any, i: number) => `
        <div class="route-row">
          <div style="display:flex;flex-direction:column;align-items:center;padding-top:4px">
            <div class="route-dot" style="background:#F6F3EB;border-color:#9E9A91"></div>
          </div>
          <div>
            <div class="route-label">Stop ${i + 1}</div>
            <div class="route-place" style="font-size:13px;color:#736E65">${escHtml(s.placeName ?? s.location ?? '—')}</div>
          </div>
        </div>`).join('')}
        ${(dropParsed || overrides?.dropLocation) ? (() => {
    const dName = overrides?.dropLocation ?? dropParsed?.placeName ?? dropParsed?.location ?? '—'
    return `
        <div class="route-row">
          <div style="display:flex;flex-direction:column;align-items:center;padding-top:4px">
            <div class="route-dot drop"></div>
          </div>
          <div>
            <div class="route-label">Drop${dropParsed?.terminal ? ` · ${dropParsed.terminal}` : ''}</div>
            <div class="route-place">${escHtml(dName)}</div>
          </div>
        </div>`
  })() : ''}
        ${distanceKm ? `<div class="info-line" style="margin-top:4px;font-family:'JetBrains Mono',monospace;font-size:11.5px">${Number(distanceKm).toFixed(1)} km</div>` : ''}
        ${flightParsed?.flightNumber ? `<div class="info-line" style="margin-top:4px">Flight: <span style="font-family:'JetBrains Mono',monospace">${escHtml(flightParsed.flightNumber)}</span>${flightParsed.airline ? ` · ${escHtml(flightParsed.airline)}` : ''}</div>` : ''}
      </div>
    </div>

    ${(driverParsed || overrides?.driverName) ? (() => {
    const dName = overrides?.driverName ?? driverParsed?.name ?? '—'
    const vPlate = overrides?.vehiclePlate ?? vehicleParsed?.licensePlate ?? driverParsed?.plate ?? ''
    const vDesc = (!overrides?.vehiclePlate && vehicleParsed) ? ` · ${escHtml(vehicleParsed.make ?? '')} ${escHtml(vehicleParsed.model ?? '')}` : ''
    return `
    <div class="driver-row">
      <div class="driver-avatar">${dName.charAt(0).toUpperCase()}</div>
      <div style="flex:1">
        <div class="driver-name">${escHtml(dName)}</div>
        <div class="driver-sub">${escHtml(vPlate)}${vDesc}</div>
      </div>
      <img src="https://yellow-design-admin.web.app/logo.png" alt="Yellow" style="height:28px;width:auto;object-fit:contain;opacity:0.85;flex-shrink:0" onerror="this.style.display='none'"/>
    </div>`
  })() : ''}

    <div class="divider"></div>

    <!-- Tax table -->
    <div>
      <div class="section-label">Invoice Summary</div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>SAC</th>
            <th>Taxable Value</th>
            <th>CGST @2.5%</th>
            <th>SGST @2.5%</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${escHtml(booking.tripType === 'hourly' ? hourlyDesc : serviceDesc)}</td>
            <td class="mono">${escHtml(sac)}</td>
            <td>${fmt(taxable)}</td>
            <td>${fmt(cgst)}</td>
            <td>${fmt(sgst)}</td>
            <td>${fmt(taxable + cgst + sgst)}</td>
          </tr>
          ${discount > 0 ? `
          <tr>
            <td style="color:#C0392B">Discount</td>
            <td class="mono">—</td>
            <td style="color:#C0392B">−${fmt(discount)}</td>
            <td>—</td>
            <td>—</td>
            <td style="color:#C0392B">−${fmt(discount)}</td>
          </tr>` : ''}
        </tbody>
      </table>
      <div class="total-line">
        <span class="total-label">Total</span>
        <span class="total-amount">${fmt(total)}</span>
      </div>
    </div>

    <!-- Payment status -->
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <span class="payment-badge${!isPaid ? ' pending' : ''}">${escHtml(paymentLine)}</span>
      ${company.company_gstin ? `<span style="font-size:11.5px;color:#9E9A91">Place of supply: Karnataka (29)</span>` : ''}
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-note">This is a computer-generated invoice and does not require a physical signature.</div>
    <button class="print-btn" id="printBtn" onclick="printNow()">Print / Download PDF</button>
  </div>
</div>
<script>
function printNow(){
  var btn=document.getElementById('printBtn');
  btn.disabled=true;btn.textContent='Preparing…';
  document.fonts.ready.then(function(){
    window.focus();
    setTimeout(function(){
      window.print();
      btn.disabled=false;btn.textContent='Print / Download PDF';
    },200);
  });
}
</script>
</body>
</html>`
}

function escHtml(str: string | null | undefined): string {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

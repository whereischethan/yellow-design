// MSG91 per-status template IDs (same as yellow repo — shared account)
// Required env var: MSG91_AUTHKEY
// Optional overrides per status: MSG91_TEMPLATE_BOOKING_CONFIRMED, etc.

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || process.env.MSG91_AUTHKEY || ''
const MSG91_API_URL = 'https://control.msg91.com/api/v5'

const TEMPLATES = {
  confirmed:   process.env.MSG91_TEMPLATE_BOOKING_CONFIRMED || '6999c84d21d6b66257071e75',
  assigned:    process.env.MSG91_TEMPLATE_DRIVER_ASSIGNED   || '6999c9eccd3fb8d6180552e2',
  in_progress: process.env.MSG91_TEMPLATE_DRIVER_EN_ROUTE   || '6999c88151f0c1e631041be5',
  arrived:     process.env.MSG91_TEMPLATE_DRIVER_ARRIVED    || '6999c9bee436aea5e50c8023',
  completed:   process.env.MSG91_TEMPLATE_TRIP_COMPLETED    || '6999c899fd432b5bf30c9482',
  cancelled:   process.env.MSG91_TEMPLATE_BOOKING_CANCELLED || '6999c9934754a485b805bb87',
} as Record<string, string>

async function sendTemplate(
  phone: string,
  templateId: string,
  variables: Record<string, string>,
): Promise<void> {
  if (!MSG91_AUTH_KEY || !templateId) return

  const res = await fetch(`${MSG91_API_URL}/flow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authkey: MSG91_AUTH_KEY },
    body: JSON.stringify({
      template_id: templateId,
      short_url: '0',
      recipients: [{ mobiles: phone.replace(/\D/g, ''), ...variables }],
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[SMS] Failed for ${phone} (${templateId}): ${res.status} ${body}`)
  }
}

export interface SmsContext {
  tripType?: string       // 'pickup' | 'drop'
  pickupDateTime?: string // ISO string, used for confirmed template
  driverName?: string
  vehiclePlate?: string
}

export async function sendStatusSms(
  phone: string,
  tripCode: string,
  status: string,
  ctx: SmsContext = {},
): Promise<void> {
  const templateId = TEMPLATES[status]
  if (!templateId) return

  const tripLabel = ctx.tripType === 'pickup' ? 'Airport Pickup' : 'Airport Drop'

  let variables: Record<string, string>

  switch (status) {
    case 'confirmed': {
      const dt = ctx.pickupDateTime
        ? new Date(ctx.pickupDateTime).toLocaleString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true,
            timeZone: 'Asia/Kolkata',
          })
        : '—'
      // Template: "Your {var1} on {var2} is confirmed. Trip {var3}"
      variables = { var1: tripLabel, var2: dt, var3: tripCode }
      break
    }
    case 'assigned':
      // Template: "Yellow: {var1} {var2} assigned for your trip {var3}."
      variables = {
        var1: (ctx.driverName || 'your driver').slice(0, 30),
        var2: ctx.vehiclePlate ? `(${ctx.vehiclePlate})` : '',
        var3: tripCode,
      }
      break
    case 'in_progress':
      // Template: "Yellow: {var1} is on the way in {var2} ({var3}). Be ready!"
      variables = {
        var1: (ctx.driverName || 'YOUR DRIVER').toUpperCase().slice(0, 30),
        var2: 'YELLOW SKY',
        var3: ctx.vehiclePlate || tripCode,
      }
      break
    case 'arrived':
      // Template: "Your Yellow has arrived! Look for {var1}."
      variables = { var1: ctx.vehiclePlate || tripCode }
      break
    case 'completed':
      // Template: "Trip {var1} complete. Thank you for riding with us!"
      variables = { var1: tripCode }
      break
    case 'cancelled':
      // Template: "Trip {var1} cancelled. {var2}"
      variables = { var1: tripCode, var2: 'Contact support for queries.' }
      break
    default:
      return
  }

  await sendTemplate(phone, templateId, variables)
}

export async function sendInvoiceSms(phone: string, tripCode: string, invoiceUrl: string): Promise<void> {
  const templateId = process.env.MSG91_TEMPLATE_INVOICE_LINK
  if (!templateId) return
  await sendTemplate(phone, templateId, { var1: tripCode, var2: invoiceUrl })
}

export function collectPhones(
  userPhone: string | null | undefined,
  guestPhone: string | null | undefined,
): string[] {
  const phones = new Set<string>()
  if (userPhone) phones.add(userPhone)
  if (guestPhone) phones.add(guestPhone)
  return [...phones]
}

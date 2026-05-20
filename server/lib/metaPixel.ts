/**
 * Meta Conversions API helper
 *
 * Sends server-side events to Meta for deduplication with the browser pixel.
 * All calls are fire-and-forget — failures are logged but never thrown.
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
 */

import { createHash } from 'crypto'

const PIXEL_ID  = process.env.META_PIXEL_ID     || '971659905581728'
const TOKEN     = process.env.META_ACCESS_TOKEN || ''
const API_VER   = 'v21.0'
const ENDPOINT  = `https://graph.facebook.com/${API_VER}/${PIXEL_ID}/events`

/** SHA-256 hash for PII normalisation required by Meta */
function hash(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

/** Normalise phone to e164 digits only, then hash */
function hashPhone(phone: string | null | undefined): string | undefined {
  if (!phone) return undefined
  const digits = phone.replace(/\D/g, '')
  return createHash('sha256').update(digits).digest('hex')
}

export interface MetaEventOptions {
  /** Visitor phone (will be normalised + hashed) */
  phone?: string | null
  /** Visitor email (will be lowercased + hashed) */
  email?: string | null
  /** INR amount for Purchase events */
  value?: number
  /** Full URL of the page that triggered the event */
  eventSourceUrl?: string
  /** Raw User-Agent string from the client request */
  userAgent?: string
  /** fbp cookie forwarded from client */
  fbp?: string
  /** Event ID for deduplication with browser pixel */
  eventId?: string
  /** Extra custom_data fields */
  customData?: Record<string, unknown>
}

/**
 * Send one event to the Meta Conversions API (non-blocking).
 *
 * @param eventName  Standard event name, e.g. 'Purchase', 'Lead', 'InitiateCheckout'
 * @param options    User + context data for match quality
 */
export function sendMetaEvent(
  eventName: string,
  options: MetaEventOptions = {},
): void {
  if (!TOKEN) {
    console.warn('[MetaPixel] META_ACCESS_TOKEN not set — skipping event:', eventName)
    return
  }

  const now = Math.floor(Date.now() / 1000)

  const userData: Record<string, unknown> = {}
  if (options.phone)     userData.ph  = hashPhone(options.phone)
  if (options.email)     userData.em  = hash(options.email)
  if (options.userAgent) userData.client_user_agent = options.userAgent
  if (options.fbp)       userData.fbp = options.fbp

  const customData: Record<string, unknown> = { ...(options.customData ?? {}) }
  if (options.value !== undefined) {
    customData.value    = options.value
    customData.currency = 'INR'
  }

  const event: Record<string, unknown> = {
    event_name:       eventName,
    event_time:       now,
    action_source:    'website',
    event_source_url: options.eventSourceUrl ?? 'https://book.ridewithyellow.com',
    user_data:        userData,
    custom_data:      Object.keys(customData).length ? customData : undefined,
  }

  if (options.eventId) event.event_id = options.eventId

  const body = JSON.stringify({ data: [event] })

  fetch(`${ENDPOINT}?access_token=${TOKEN}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
    .then(async (r) => {
      if (!r.ok) {
        const text = await r.text().catch(() => '')
        console.error(`[MetaPixel] ${eventName} failed (${r.status}):`, text)
      } else {
        console.log(`[MetaPixel] ✓ ${eventName} sent`)
      }
    })
    .catch((err) => console.error(`[MetaPixel] ${eventName} error:`, err))
}

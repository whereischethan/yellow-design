/**
 * Browser-side Meta Pixel (fbq) helper.
 *
 * Safe to import on native — all calls are no-ops when `window.fbq` is absent.
 * For deduplication with the Conversions API, always pass a matching `eventID`.
 *
 * Deduplication contract:
 *   browser eventID        ↔  server metaPixel.ts eventId
 *   -------------------------------------------------
 *   `lead_<leadId>`        ↔  `lead_<leadId>`
 *   `checkout_<leadId>`    ↔  `checkout_<leadId>`
 *   `purchase_<bookingId>` ↔  `purchase_<bookingId>`
 *   `reg_<userId>`         ↔  `reg_<userId>`
 */

function fbq(method: string, event: string, data?: object, options?: { eventID?: string }): void {
  if (typeof window === 'undefined') return
  const w = window as any
  if (typeof w.fbq !== 'function') return
  w.fbq(method, event, data ?? {}, options ?? {})
}

// ─── Standard events ──────────────────────────────────────────────────────────

/** User saw a priced vehicle card — top-of-funnel content view */
export function pixelViewContent(params: { value: number; eventID?: string }): void {
  fbq('track', 'ViewContent',
    { content_type: 'product', value: params.value, currency: 'INR' },
    params.eventID ? { eventID: params.eventID } : undefined,
  )
}

/** User submitted route details and got a quote (lead captured) */
export function pixelLead(params: { value: number; eventID?: string }): void {
  fbq('track', 'Lead',
    { value: params.value, currency: 'INR' },
    params.eventID ? { eventID: params.eventID } : undefined,
  )
}

/**
 * User initiated checkout — fires twice:
 *  1. `vehicle.tsx` (vehicle selected, eventID matched to server Lead)
 *  2. `review.tsx` (user on review page, highest pre-payment intent)
 */
export function pixelInitiateCheckout(params: { value: number; eventID?: string }): void {
  fbq('track', 'InitiateCheckout',
    { value: params.value, currency: 'INR', num_items: 1 },
    params.eventID ? { eventID: params.eventID } : undefined,
  )
}

/** Payment succeeded and booking confirmed — matches server Purchase event exactly */
export function pixelPurchase(params: { value: number; bookingId: string }): void {
  fbq('track', 'Purchase',
    { value: params.value, currency: 'INR' },
    { eventID: `purchase_${params.bookingId}` },
  )
}

/** User completed onboarding by saving their name — matches server CompleteRegistration */
export function pixelCompleteRegistration(params: { userId: string }): void {
  fbq('track', 'CompleteRegistration',
    {},
    { eventID: `reg_${params.userId}` },
  )
}

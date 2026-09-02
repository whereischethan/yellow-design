/**
 * Browser-side Google Ads conversion tracking (gtag.js) helper.
 *
 * Safe to import on native — all calls are no-ops when `window.gtag` is absent.
 * Mirrors the lib/pixel.ts pattern used for Meta Pixel.
 *
 * Placeholders below must be replaced once the Google Ads conversion actions
 * exist — same IDs must also be updated in app/+html.tsx's gtag.js loader.
 */

const GOOGLE_ADS_ID = 'AW-XXXXXXXXX' // TODO: replace with real Google Ads conversion ID
const LEAD_CONVERSION_LABEL = 'REPLACE_ME_LEAD' // TODO: replace with real "Lead" conversion label
const PURCHASE_CONVERSION_LABEL = 'REPLACE_ME_PURCHASE' // TODO: replace with real "Purchase" conversion label

function gtagEvent(sendTo: string, params: object): void {
  if (typeof window === 'undefined') return
  const w = window as any
  if (typeof w.gtag !== 'function') return
  w.gtag('event', 'conversion', { send_to: sendTo, ...params })
}

/** Customer submitted route details and got a quote (lead captured) */
export function gtagLead(params: { value: number; leadId?: string }): void {
  gtagEvent(`${GOOGLE_ADS_ID}/${LEAD_CONVERSION_LABEL}`, {
    value: params.value,
    currency: 'INR',
    ...(params.leadId ? { transaction_id: params.leadId } : {}),
  })
}

/** Payment succeeded and booking confirmed */
export function gtagPurchase(params: { value: number; bookingId: string }): void {
  gtagEvent(`${GOOGLE_ADS_ID}/${PURCHASE_CONVERSION_LABEL}`, {
    value: params.value,
    currency: 'INR',
    transaction_id: params.bookingId,
  })
}

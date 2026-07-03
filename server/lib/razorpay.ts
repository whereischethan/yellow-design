// Thin wrapper around Razorpay's REST API (Basic-auth fetch calls).

function keyId(): string {
  return process.env.RAZORPAY_KEY_ID || ''
}

function keySecret(): string {
  return process.env.RAZORPAY_KEY_SECRET || ''
}

export function razorpayConfigured(): boolean {
  return Boolean(keyId() && keySecret())
}

function basicAuth(): string {
  return 'Basic ' + Buffer.from(`${keyId()}:${keySecret()}`).toString('base64')
}

export async function razorpayFetch(path: string, init: { method?: string; body?: any } = {}): Promise<globalThis.Response> {
  const headers: Record<string, string> = { 'Authorization': basicAuth() }
  if (init.body !== undefined) headers['Content-Type'] = 'application/json'
  return fetch(`https://api.razorpay.com${path}`, {
    method: init.method ?? 'GET',
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  })
}

/** Create a payment link. Returns the raw fetch Response so callers keep their error handling. */
export function createPaymentLink(body: Record<string, any>): Promise<globalThis.Response> {
  return razorpayFetch('/v1/payment_links', { method: 'POST', body })
}

/** Fetch a payment link's current state. */
export function fetchPaymentLink(linkId: string): Promise<globalThis.Response> {
  return razorpayFetch(`/v1/payment_links/${linkId}`)
}

/** Best-effort cancel of an unpaid payment link — never throws. */
export function cancelPaymentLink(linkId: string): Promise<globalThis.Response | null> {
  return razorpayFetch(`/v1/payment_links/${linkId}/cancel`, { method: 'POST' }).catch(() => null)
}

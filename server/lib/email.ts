import nodemailer from 'nodemailer'

function getTransport() {
  const url = process.env.SMTP_URL
  if (url) return nodemailer.createTransport(url)

  const host = process.env.SMTP_HOST
  if (!host) return null

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    } : undefined,
  })
}

export async function sendInvoiceEmail(to: string, invoiceNo: string, tripCode: string, html: string): Promise<void> {
  const transport = getTransport()
  if (!transport) throw new Error('Email not configured — set SMTP_URL or SMTP_HOST in environment variables')

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@ridewithyellow.com'

  await transport.sendMail({
    from,
    to,
    subject: `Invoice ${invoiceNo} — Yellow`,
    html,
    // Plain text fallback
    text: `Your invoice ${invoiceNo} for trip ${tripCode} is attached. Open this email in a browser to view the full invoice.`,
  })
}

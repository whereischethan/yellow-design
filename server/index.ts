import express from 'express'
import cors from 'cors'
import path from 'path'

// Load .env from server directory
const envPath = path.join(__dirname, '.env')
try { require('dotenv').config({ path: envPath }) } catch {}
// Also try project root .env
try { require('dotenv').config() } catch {}

import authRouter from './routes/auth'
import userRouter from './routes/user'
import pricingRouter from './routes/pricing'
import bookingsRouter from './routes/bookings'
import flightsRouter from './routes/flights'
import adminRouter from './routes/admin'
import invoicesRouter from './routes/invoices'
import { seedPricingDefaults } from './db'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({
  limit: '20mb',
  verify: (req: any, _res, buf) => { req.rawBody = buf },
}))

app.use('/auth', authRouter)
app.use('/user', userRouter)
app.use('/pricing', pricingRouter)
app.use('/bookings', bookingsRouter)
app.use('/flights', flightsRouter)
app.use('/admin', adminRouter)
app.use('/invoices', invoicesRouter)

// Serve built admin SPA in production
app.use('/ops', express.static(path.join(__dirname, '../../admin/dist')))

app.get('/health', (_req, res) => res.json({ ok: true, service: 'yellow-design-api' }))

seedPricingDefaults().catch(console.error)

app.listen(PORT, () => {
  console.log(`Yellow API running on http://localhost:${PORT}`)
  if (!process.env.MSG91_AUTH_KEY) console.log('  [dev] MSG91 not configured — OTP will be logged to console')
  if (!process.env.GOOGLE_MAPS_KEY) console.log('  [dev] Google Maps not configured — using distance stub (28km)')
})

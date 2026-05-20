import { Router, Request, Response } from 'express'

const router = Router()

const FLIGHT_API_KEY = process.env.FLIGHT_API_KEY || ''

router.get('/lookup', async (req: Request, res: Response) => {
  const { flight_number, date } = req.query as { flight_number: string; date: string }
  if (!flight_number) return res.status(400).json({ error: 'flight_number required' })

  if (!FLIGHT_API_KEY) {
    return res.json({
      flightNumber: flight_number.toUpperCase(),
      airline: 'IndiGo',
      departure: date ? `${date}T20:00:00+05:30` : new Date().toISOString(),
      arrival: date ? `${date}T22:00:00+05:30` : new Date().toISOString(),
      status: 'scheduled',
      terminal: 'T2',
      gate: '',
    })
  }

  try {
    // AeroDataBox via RapidAPI
    const iata = flight_number.toUpperCase().replace(/\s/g, '')
    const url = `https://aerodatabox.p.rapidapi.com/flights/number/${iata}${date ? `/${date}` : ''}`
    const apiRes = await fetch(url, {
      headers: {
        'x-rapidapi-host': 'aerodatabox.p.rapidapi.com',
        'x-rapidapi-key': FLIGHT_API_KEY,
      },
    })

    if (apiRes.status === 404) return res.status(404).json({ error: 'Flight not found' })
    if (!apiRes.ok) return res.status(502).json({ error: 'Flight lookup failed' })

    const data = await apiRes.json() as any
    const flight = Array.isArray(data) ? data[0] : data

    return res.json({
      flightNumber: flight?.number ?? flight_number,
      airline: flight?.airline?.name ?? '',
      departure: flight?.departure?.scheduledTime?.local ?? flight?.departure?.scheduledTime?.utc ?? '',
      arrival: flight?.arrival?.revisedTime?.local ?? flight?.arrival?.scheduledTime?.local ?? flight?.arrival?.scheduledTime?.utc ?? '',
      status: flight?.status ?? 'scheduled',
      terminal: flight?.arrival?.terminal ?? '',
      gate: flight?.arrival?.gate ?? '',
    })
  } catch {
    return res.status(500).json({ error: 'Flight lookup failed' })
  }
})

export default router

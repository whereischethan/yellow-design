import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_prod'

export interface AuthRequest extends Request {
  userId?: string
}

export interface DriverRequest extends Request {
  driverId?: string
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string }
    req.userId = payload.userId
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireDriver(req: DriverRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { role: string; driverId: string }
    if (payload.role !== 'driver') {
      return res.status(403).json({ error: 'Driver access required' })
    }
    req.driverId = payload.driverId
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m' })
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' })
}

export function signDriverToken(driverId: string, phone: string): string {
  return jwt.sign({ role: 'driver', driverId, phone }, JWT_SECRET, { expiresIn: '15h' })
}

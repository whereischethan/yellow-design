import { randomBytes } from 'crypto'
import prisma from './prisma'

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function randomCode(len = 6): string {
  const bytes = randomBytes(len)
  return Array.from(bytes).map(b => ALPHABET[b % ALPHABET.length]).join('')
}

export async function genTripCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = `YLW-${randomCode()}`
    const exists = await prisma.booking.findFirst({ where: { tripCode: code }, select: { id: true } })
    if (!exists) return code
  }
  throw new Error('Failed to generate unique trip code after 10 attempts')
}

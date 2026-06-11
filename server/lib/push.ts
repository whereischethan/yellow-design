// Expo Push API — no FCM/APNs server credentials needed for Expo-managed tokens.
// Tokens are registered by the apps via POST /user/push-token and /driver/push-token.

import prisma from './prisma'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const CHUNK_SIZE = 100

export interface PushMessage {
  title: string
  body: string
  data?: Record<string, unknown>
}

export async function sendPushToOwner(
  ownerType: 'user' | 'driver',
  ownerId: string,
  msg: PushMessage,
): Promise<void> {
  try {
    const tokens = await prisma.pushToken.findMany({ where: { ownerType, ownerId } })
    if (!tokens.length) return

    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
      const chunk = tokens.slice(i, i + CHUNK_SIZE)
      const messages = chunk.map(t => ({
        to: t.token,
        title: msg.title,
        body: msg.body,
        data: msg.data ?? {},
        sound: 'default',
      }))

      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        console.error(`[PUSH] Send failed for ${ownerType}:${ownerId}: ${res.status} ${body}`)
        continue
      }

      const result = await res.json().catch(() => null) as any
      const tickets: any[] = result?.data ?? []
      const deadTokens = tickets
        .map((t, idx) => (t?.details?.error === 'DeviceNotRegistered' ? chunk[idx]?.token : null))
        .filter((t): t is string => t != null)
      if (deadTokens.length) {
        await prisma.pushToken.deleteMany({ where: { token: { in: deadTokens } } })
        console.log(`[PUSH] Pruned ${deadTokens.length} dead token(s)`)
      }
    }
  } catch (e) {
    console.error(`[PUSH] Error for ${ownerType}:${ownerId}:`, e)
  }
}

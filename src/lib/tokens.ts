import crypto from 'crypto'
import { prisma } from './db'

const RESET_TOKEN_EXPIRY_MINUTES = 60

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  // Invalidate any existing unused tokens for this user
  await prisma.passwordReset.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  })

  const token = generateSecureToken()
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000)

  await prisma.passwordReset.create({
    data: { userId, token, expiresAt },
  })

  return token
}

export async function consumePasswordResetToken(
  token: string
): Promise<{ userId: string } | null> {
  const record = await prisma.passwordReset.findUnique({
    where: { token },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  })

  if (!record) return null
  if (record.usedAt) return null // already used
  if (record.expiresAt < new Date()) return null // expired

  // Mark as used immediately to prevent replay attacks
  await prisma.passwordReset.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  })

  return { userId: record.userId }
}

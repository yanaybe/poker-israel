import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { createPasswordResetToken } from '@/lib/tokens'
import { sendPasswordResetEmail } from '@/lib/email'
import { logger } from '@/lib/logger'

const Schema = z.object({
  email: z.string().email('אימייל לא תקין').toLowerCase().trim(),
})

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'אימייל לא תקין' }, { status: 422 })
  }

  const { email } = parsed.data

  // Always return 200 regardless of whether email exists — prevents email enumeration attacks
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, isBanned: true },
  })

  if (user && !user.isBanned) {
    try {
      const token = await createPasswordResetToken(user.id)
      await sendPasswordResetEmail(email, token)
    } catch (err) {
      logger.error({ err }, 'Password reset email error')
      // Don't expose email sending failures to the client
    }
  }

  return NextResponse.json({
    message: 'אם כתובת האימייל רשומה במערכת, נשלח אליה קישור לאיפוס סיסמה',
  })
}

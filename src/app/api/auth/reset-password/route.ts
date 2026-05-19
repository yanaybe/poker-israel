import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { consumePasswordResetToken } from '@/lib/tokens'

const Schema = z.object({
  token: z.string().min(1, 'טוקן חסר'),
  password: z
    .string()
    .min(8, 'הסיסמה חייבת להכיל לפחות 8 תווים')
    .max(128)
    .regex(/[A-Z]/, 'הסיסמה חייבת להכיל לפחות אות גדולה אחת')
    .regex(/[0-9]/, 'הסיסמה חייבת להכיל לפחות ספרה אחת'),
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
    return NextResponse.json(
      { error: 'נתונים לא תקינים', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { token, password } = parsed.data

  const result = await consumePasswordResetToken(token)
  if (!result) {
    return NextResponse.json(
      { error: 'הקישור לאיפוס הסיסמה לא תקין או פג תוקפו' },
      { status: 400 }
    )
  }

  const hashed = await bcrypt.hash(password, 12)

  // Update password and increment tokenVersion to invalidate all existing sessions
  await prisma.user.update({
    where: { id: result.userId },
    data: {
      password: hashed,
      tokenVersion: { increment: 1 },
    },
  })

  return NextResponse.json({ message: 'הסיסמה שונתה בהצלחה' })
}

import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { ISRAELI_CITIES } from '@/types/index'

const RegisterSchema = z.object({
  name: z.string().min(2, 'שם קצר מדי').max(100, 'שם ארוך מדי').trim(),
  email: z.string().email('אימייל לא תקין').toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'הסיסמה חייבת להכיל לפחות 8 תווים')
    .max(128, 'סיסמה ארוכה מדי')
    .regex(/[A-Z]/, 'הסיסמה חייבת להכיל לפחות אות גדולה אחת')
    .regex(/[0-9]/, 'הסיסמה חייבת להכיל לפחות ספרה אחת'),
  age: z
    .number({ invalid_type_error: 'גיל לא תקין' })
    .int()
    .min(18, 'יש להיות בן 18 ומעלה להירשם לפלטפורמה')
    .max(120)
    .nullable()
    .optional(),
  city: z.enum(ISRAELI_CITIES as [string, ...string[]]).nullable().optional(),
  skillLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'PRO']).default('BEGINNER'),
})

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
  }

  const result = RegisterSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'נתונים לא תקינים', details: result.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { name, email, password, age, city, skillLevel } = result.data

  try {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'כתובת האימייל כבר רשומה במערכת' }, { status: 409 })
    }

    // Work factor 12 is the 2025 recommendation for production bcrypt hashing
    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        age: age ?? null,
        city: city ?? null,
        skillLevel,
      },
    })

    return NextResponse.json({ id: user.id, name: user.name, email: user.email }, { status: 201 })
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'שגיאה פנימית' }, { status: 500 })
  }
}

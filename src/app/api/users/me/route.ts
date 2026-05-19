import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ISRAELI_CITIES } from '@/types/index'
import { logger } from '@/lib/logger'

// 5MB base64 limit. Base64 encoding adds ~33% overhead, so 5MB string ≈ ~3.75MB image.
// This is a temporary ceiling until images are migrated to Cloudinary/S3.
const MAX_IMAGE_BASE64_BYTES = 5_000_000

const UpdateProfileSchema = z.object({
  name: z.string().min(2, 'שם קצר מדי').max(100, 'שם ארוך מדי').trim().optional(),
  age: z
    .number({ invalid_type_error: 'גיל לא תקין' })
    .int()
    .min(18, 'יש להיות בן 18 ומעלה')
    .max(120)
    .nullable()
    .optional(),
  city: z.enum(ISRAELI_CITIES as [string, ...string[]]).nullable().optional(),
  skillLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'PRO']).optional(),
  image: z.string().nullable().optional(),
})

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
  }

  const parsed = UpdateProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'נתונים לא תקינים', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { name, age, city, skillLevel, image } = parsed.data

  // Enforce image size limit to prevent DB bloat from large base64 payloads
  if (image && image.length > MAX_IMAGE_BASE64_BYTES) {
    return NextResponse.json(
      { error: 'התמונה גדולה מדי. גודל מקסימלי: 5MB' },
      { status: 413 }
    )
  }

  try {
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(age !== undefined && { age }),
        ...(city !== undefined && { city }),
        ...(skillLevel !== undefined && { skillLevel }),
        ...(image !== undefined && { image }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        age: true,
        city: true,
        skillLevel: true,
        image: true,
      },
    })

    return NextResponse.json(user)
  } catch (err) {
    logger.error({ err }, 'Update user error')
    return NextResponse.json({ error: 'שגיאה בעדכון הפרופיל' }, { status: 500 })
  }
}

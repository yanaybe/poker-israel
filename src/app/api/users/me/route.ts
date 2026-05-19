// TODO [HIGH][Security]:
// No backend validation on PATCH /api/users/me body.
// `name` could be empty string or 10,000 characters.
// `age` could be negative, 0, or 999.
// `image` could be a 50MB base64 string — no size limit enforced.
// Fix: Add Zod schema validation:
//   name: z.string().min(2).max(100)
//   age: z.number().int().min(18).max(120).nullable()
//   image: z.string().max(5_000_000).nullable() (5MB base64 limit until S3 migration)
// Risk: Invalid data stored in DB; potential OOM from huge image strings.

// TODO [HIGH][Security]:
// Image is stored as base64 string in the database. This is a critical scalability
// and performance anti-pattern:
//   1. Every user query includes potentially megabytes of base64 image data
//   2. DB backups are massive
//   3. Every API response includes the full image — no CDN optimization possible
// Fix: Accept image upload via multipart/form-data, upload to Cloudinary or S3,
// store only the URL in the image field.
// Risk: DB performance degrades as users upload profile photos.

// TODO [MEDIUM][Backend]:
// No validation that the city provided is in the approved ISRAELI_CITIES list.
// A user could set their city to any string, including XSS payloads.
// Fix: Validate city against ISRAELI_CITIES enum, or sanitize with DOMPurify.
// Risk: XSS injection via user-provided city name displayed in game cards.

// TODO [MEDIUM][Security]:
// No rate limiting on profile updates. A user can script rapid PATCH requests
// to test XSS payloads or flood the DB with updates.
// Fix: Rate limit: max 10 profile updates per hour per user.
// Risk: Automated probing or database flooding.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  try {
    const { name, age, city, skillLevel, image } = await req.json()
    // TODO [HIGH][Security]: Add Zod validation here before DB write.
    // TODO [HIGH][Security]: Enforce image size limit before storing base64.
    // TODO [HIGH][Backend]: Replace base64 storage — upload to Cloudinary/S3 instead.

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name && { name }),
        age: age ?? null,
        city: city ?? null,
        ...(skillLevel && { skillLevel }),
        image: image ?? null,
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
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ error: 'שגיאה בעדכון הפרופיל' }, { status: 500 })
  }
}

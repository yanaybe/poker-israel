import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const BanSchema = z.object({
  action: z.enum(['ban', 'unban']),
  reason: z.string().min(5, 'נא לספק סיבה').max(500).trim().optional(),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })
  if (!session.user.isAdmin) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  // Admins cannot ban themselves
  if (params.id === session.user.id) {
    return NextResponse.json({ error: 'לא ניתן לבצע פעולה על עצמך' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
  }

  const parsed = BanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'נתונים לא תקינים', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { action, reason } = parsed.data

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, isAdmin: true },
  })
  if (!target) return NextResponse.json({ error: 'המשתמש לא נמצא' }, { status: 404 })

  // Prevent banning other admins
  if (target.isAdmin && action === 'ban') {
    return NextResponse.json({ error: 'לא ניתן להשעות אדמין' }, { status: 403 })
  }

  if (action === 'ban') {
    if (!reason) {
      return NextResponse.json({ error: 'נא לספק סיבה להשעייה' }, { status: 422 })
    }
    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        isBanned: true,
        banReason: reason,
        bannedAt: new Date(),
        tokenVersion: { increment: 1 },
      },
      select: { id: true, isBanned: true, banReason: true, bannedAt: true },
    })
    return NextResponse.json(updated)
  }

  // unban
  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { isBanned: false, banReason: null, bannedAt: null },
    select: { id: true, isBanned: true },
  })
  return NextResponse.json(updated)
}

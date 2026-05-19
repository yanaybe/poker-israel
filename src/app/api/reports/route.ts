import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const VALID_REASONS = ['SPAM', 'FAKE_GAME', 'HARASSMENT', 'INAPPROPRIATE', 'SCAM', 'OTHER'] as const

const ReportSchema = z.object({
  reason: z.enum(VALID_REASONS, { errorMap: () => ({ message: 'סיבה לא תקינה' }) }),
  details: z.string().max(1000, 'פרטים ארוכים מדי').trim().optional().nullable(),
  targetUserId: z.string().cuid().optional(),
  targetGameId: z.string().cuid().optional(),
}).refine(
  (d) => d.targetUserId || d.targetGameId,
  { message: 'יש לציין משתמש או משחק לדיווח' }
)

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
  }

  const parsed = ReportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'נתונים לא תקינים', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { reason, details, targetUserId, targetGameId } = parsed.data

  // Cannot report yourself
  if (targetUserId && targetUserId === session.user.id) {
    return NextResponse.json({ error: 'לא ניתן לדווח על עצמך' }, { status: 400 })
  }

  // Verify targets exist
  if (targetUserId) {
    const user = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } })
    if (!user) return NextResponse.json({ error: 'המשתמש לא נמצא' }, { status: 404 })
  }

  if (targetGameId) {
    const game = await prisma.game.findUnique({ where: { id: targetGameId }, select: { id: true } })
    if (!game) return NextResponse.json({ error: 'המשחק לא נמצא' }, { status: 404 })
  }

  // Prevent duplicate pending reports from the same reporter
  const existing = await prisma.report.findFirst({
    where: {
      reporterId: session.user.id,
      targetUserId: targetUserId ?? null,
      targetGameId: targetGameId ?? null,
      status: 'PENDING',
    },
  })
  if (existing) {
    return NextResponse.json({ error: 'כבר שלחת דיווח על זה בעבר' }, { status: 409 })
  }

  const report = await prisma.report.create({
    data: {
      reporterId: session.user.id,
      targetUserId: targetUserId ?? null,
      targetGameId: targetGameId ?? null,
      reason,
      details: details ?? null,
    },
    select: { id: true, reason: true, status: true, createdAt: true },
  })

  return NextResponse.json(report, { status: 201 })
}

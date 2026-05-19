import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const JoinSchema = z.object({
  message: z.string().max(500, 'ההודעה ארוכה מדי').optional().nullable(),
})

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const parsed = JoinSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'נתונים לא תקינים', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { message } = parsed.data

  // Check ban status before any DB writes
  const requestingUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isBanned: true },
  })
  if (requestingUser?.isBanned) {
    return NextResponse.json({ error: 'החשבון הושעה' }, { status: 403 })
  }

  // Atomic capacity check + request creation in a single transaction.
  // This prevents two simultaneous requests from both reading "not full"
  // and both getting PENDING status (overbooking race condition).
  try {
    const result = await prisma.$transaction(async (tx) => {
      const game = await tx.game.findUnique({ where: { id: params.id } })
      if (!game) return { error: 'משחק לא נמצא', status: 404 }
      if (game.status === 'CANCELLED') return { error: 'המשחק בוטל', status: 400 }
      if (game.dateTime < new Date()) return { error: 'המשחק כבר התקיים', status: 400 }
      if (game.hostId === session.user.id) {
        return { error: 'אינך יכול לבקש להצטרף למשחק שלך', status: 400 }
      }

      const existing = await tx.gameRequest.findUnique({
        where: { gameId_userId: { gameId: params.id, userId: session.user.id } },
      })
      if (existing) return { error: 'כבר שלחת בקשה למשחק זה', status: 409 }

      const isFull = game.status === 'FULL' || game.currentPlayers >= game.maxPlayers
      const requestStatus = isFull ? 'WAITLIST' : 'PENDING'

      const request = await tx.gameRequest.create({
        data: {
          gameId: params.id,
          userId: session.user.id,
          message: message ?? null,
          status: requestStatus,
        },
      })

      return { request, requestStatus }
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json(result.request, { status: 201 })
  } catch (err) {
    console.error('Join request error:', err)
    return NextResponse.json({ error: 'שגיאה בשליחת הבקשה' }, { status: 500 })
  }
}

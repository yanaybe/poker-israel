import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const ApprovalSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], { required_error: 'סטטוס לא תקין' }),
})

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; requestId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
  }

  const parsed = ApprovalSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'סטטוס לא תקין' }, { status: 400 })
  }

  const { status } = parsed.data

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const game = await tx.game.findUnique({ where: { id: params.id } })
      if (!game) return { error: 'משחק לא נמצא', httpStatus: 404 }
      if (game.hostId !== session.user.id) return { error: 'אין הרשאה', httpStatus: 403 }

      // Validate that requestId belongs to this gameId — prevents cross-game manipulation
      const request = await tx.gameRequest.findUnique({
        where: { id: params.requestId, gameId: params.id },
        select: { userId: true, status: true },
      })
      if (!request) return { error: 'בקשה לא נמצאה', httpStatus: 404 }

      const prevStatus = request.status

      const updatedRequest = await tx.gameRequest.update({
        where: { id: params.requestId },
        data: { status },
      })

      if (status === 'APPROVED') {
        const updatedGame = await tx.game.update({
          where: { id: params.id },
          data: { currentPlayers: { increment: 1 } },
        })
        if (updatedGame.currentPlayers >= updatedGame.maxPlayers) {
          await tx.game.update({ where: { id: params.id }, data: { status: 'FULL' } })
        }
      } else if (status === 'REJECTED' && prevStatus === 'APPROVED') {
        // Decrement with floor of 1 (host always counts as 1 player)
        const currentGame = await tx.game.findUnique({
          where: { id: params.id },
          select: { currentPlayers: true },
        })
        const newCount = Math.max(1, (currentGame?.currentPlayers ?? 1) - 1)
        await tx.game.update({
          where: { id: params.id },
          data: { currentPlayers: newCount, status: 'OPEN' },
        })

        // Promote first person on waitlist to PENDING
        const nextWaiting = await tx.gameRequest.findFirst({
          where: { gameId: params.id, status: 'WAITLIST' },
          orderBy: { createdAt: 'asc' },
        })
        if (nextWaiting) {
          await tx.gameRequest.update({
            where: { id: nextWaiting.id },
            data: { status: 'PENDING' },
          })
          await tx.notification.create({
            data: {
              userId: nextWaiting.userId,
              type: 'WAITLIST_PROMOTED',
              message: `⭐ נפל מקום ב"${game.title}" — הבקשה שלך עברה לממתין לאישור!`,
              gameId: params.id,
            },
          })
        }
      }

      // Notify the requesting user
      await tx.notification.create({
        data: {
          userId: request.userId,
          type: status === 'APPROVED' ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED',
          message:
            status === 'APPROVED'
              ? `✅ הבקשתך להצטרף ל"${game.title}" אושרה!`
              : `❌ הבקשתך להצטרף ל"${game.title}" נדחתה`,
          gameId: params.id,
        },
      })

      return { request: updatedRequest }
    })

    if ('error' in updated) {
      return NextResponse.json({ error: updated.error }, { status: updated.httpStatus })
    }

    return NextResponse.json(updated.request)
  } catch (err) {
    console.error('Request approval error:', err)
    return NextResponse.json({ error: 'שגיאה בעדכון הבקשה' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; requestId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  const game = await prisma.game.findUnique({ where: { id: params.id } })
  if (!game) return NextResponse.json({ error: 'משחק לא נמצא' }, { status: 404 })
  if (game.hostId !== session.user.id) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const { status } = await req.json()
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return NextResponse.json({ error: 'סטטוס לא תקין' }, { status: 400 })
  }

  // Fetch request BEFORE updating to capture previous status and userId
  const request = await prisma.gameRequest.findUnique({
    where: { id: params.requestId },
    select: { userId: true, status: true },
  })
  if (!request) return NextResponse.json({ error: 'בקשה לא נמצאה' }, { status: 404 })

  const prevStatus = request.status

  const updated = await prisma.gameRequest.update({
    where: { id: params.requestId },
    data: { status },
  })

  if (status === 'APPROVED') {
    await prisma.game.update({
      where: { id: params.id },
      data: { currentPlayers: { increment: 1 } },
    })
    const refreshed = await prisma.game.findUnique({ where: { id: params.id } })
    if (refreshed && refreshed.currentPlayers >= refreshed.maxPlayers) {
      await prisma.game.update({ where: { id: params.id }, data: { status: 'FULL' } })
    }
  } else if (status === 'REJECTED' && prevStatus === 'APPROVED') {
    await prisma.game.update({
      where: { id: params.id },
      data: { currentPlayers: { decrement: 1 }, status: 'OPEN' },
    })
  }

  // Notify the requesting user
  await prisma.notification.create({
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

  return NextResponse.json(updated)
}

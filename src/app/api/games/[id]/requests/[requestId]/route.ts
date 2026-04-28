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

  const updated = await prisma.gameRequest.update({
    where: { id: params.requestId },
    data: { status },
  })

  // Update player count when approved/rejected
  if (status === 'APPROVED') {
    await prisma.game.update({
      where: { id: params.id },
      data: { currentPlayers: { increment: 1 } },
    })

    // Auto-set to FULL if reached max
    const refreshed = await prisma.game.findUnique({ where: { id: params.id } })
    if (refreshed && refreshed.currentPlayers >= refreshed.maxPlayers) {
      await prisma.game.update({ where: { id: params.id }, data: { status: 'FULL' } })
    }
  } else if (status === 'REJECTED') {
    // Decrement only if was previously approved
    const prev = await prisma.gameRequest.findUnique({ where: { id: params.requestId } })
    if (prev?.status === 'APPROVED') {
      await prisma.game.update({
        where: { id: params.id },
        data: { currentPlayers: { decrement: 1 }, status: 'OPEN' },
      })
    }
  }

  return NextResponse.json(updated)
}

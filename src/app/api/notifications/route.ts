import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ count: 0, pendingRequests: [], notifications: [] })
  }

  const [pendingRequests, notifications] = await Promise.all([
    prisma.gameRequest.findMany({
      where: { game: { hostId: session.user.id }, status: 'PENDING' },
      include: {
        user: { select: { id: true, name: true, image: true } },
        game: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
  ])

  const unreadNotifs = notifications.filter((n) => !n.read).length
  const count = pendingRequests.length + unreadNotifs

  return NextResponse.json({
    count,
    pendingRequests: pendingRequests.map((r) => ({
      id: r.id,
      gameId: r.game.id,
      gameName: r.game.title,
      message: r.message,
      createdAt: r.createdAt.toISOString(),
      user: r.user,
    })),
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      message: n.message,
      gameId: n.gameId,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
  })
}

export async function PATCH() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ ok: false })

  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  })

  return NextResponse.json({ ok: true })
}

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  const game = await prisma.game.findUnique({
    where: { id: params.id },
    include: {
      host: {
        select: {
          id: true, name: true, image: true, city: true, skillLevel: true, canHostUntil: true,
          _count: { select: { strikes: true, gamesHosted: true } },
          ratingsReceived: { select: { score: true } },
        },
      },
      requests: {
        include: {
          user: { select: { id: true, name: true, image: true, city: true, skillLevel: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      ratings: { select: { id: true, raterId: true, score: true, createdAt: true } },
    },
  })

  if (!game) return NextResponse.json({ error: 'משחק לא נמצא' }, { status: 404 })

  // Address reveal: hidden until 2h before for approved players; host always sees it
  const isHost = session?.user?.id === game.hostId
  const hoursUntilGame = (game.dateTime.getTime() - Date.now()) / 3600000
  let locationRevealed = isHost

  if (!locationRevealed && session?.user?.id) {
    const approved = await prisma.gameRequest.findFirst({
      where: { gameId: params.id, userId: session.user.id, status: 'APPROVED' },
    })
    locationRevealed = !!approved && hoursUntilGame <= 2
  }

  // Backward compat: if no neighborhood, always expose location
  const hasNeighborhood = !!game.neighborhood

  // Compute host stats
  const hostId = game.hostId
  const [allRatings, pastGames] = await Promise.all([
    prisma.gameRating.findMany({ where: { hostId }, select: { score: true } }),
    prisma.game.findMany({
      where: { hostId, dateTime: { lt: new Date() } },
      include: { requests: { where: { status: 'APPROVED' }, select: { userId: true } } },
    }),
  ])

  const avgRating = allRatings.length > 0
    ? Math.round((allRatings.reduce((s, r) => s + r.score, 0) / allRatings.length) * 10) / 10
    : null

  const playerCount: Record<string, number> = {}
  pastGames.forEach((g) => g.requests.forEach((r) => {
    playerCount[r.userId] = (playerCount[r.userId] ?? 0) + 1
  }))
  const uniquePlayers = Object.keys(playerCount).length
  const returning = Object.values(playerCount).filter((c) => c > 1).length
  const returnRate = uniquePlayers >= 3 ? Math.round((returning / uniquePlayers) * 100) : null

  const { ratingsReceived: _, ...hostWithoutRaw } = game.host

  return NextResponse.json({
    ...game,
    host: { ...hostWithoutRaw, avgRating },
    location: (!hasNeighborhood || locationRevealed) ? game.location : null,
    locationRevealed: !hasNeighborhood || locationRevealed,
    hostStats: {
      gamesHosted: game.host._count.gamesHosted,
      lateStrikes: game.host._count.strikes,
      avgRating,
      returnRate,
      totalRatings: allRatings.length,
    },
  })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  const game = await prisma.game.findUnique({ where: { id: params.id } })
  if (!game) return NextResponse.json({ error: 'משחק לא נמצא' }, { status: 404 })
  if (game.hostId !== session.user.id) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const body = await req.json()

  if (body.status === 'CANCELLED') {
    await prisma.game.update({ where: { id: params.id }, data: { status: 'CANCELLED' } })

    // Issue a strike if cancelling < 3h before game time
    const hoursUntilGame = (new Date(game.dateTime).getTime() - Date.now()) / 3600000
    if (hoursUntilGame < 3) {
      await prisma.strike.create({ data: { userId: session.user.id, gameId: params.id } })

      // Count strikes in last 60 days
      const since = new Date(Date.now() - 60 * 24 * 3600000)
      const recentStrikes = await prisma.strike.count({
        where: { userId: session.user.id, createdAt: { gte: since } },
      })

      if (recentStrikes >= 3) {
        const suspendUntil = new Date(Date.now() + 30 * 24 * 3600000)
        await prisma.user.update({
          where: { id: session.user.id },
          data: { canHostUntil: suspendUntil },
        })
      }
    }

    // Notify all approved players the game was cancelled
    const approvedRequests = await prisma.gameRequest.findMany({
      where: { gameId: params.id, status: 'APPROVED' },
      select: { userId: true },
    })
    if (approvedRequests.length > 0) {
      await prisma.notification.createMany({
        data: approvedRequests.map((r) => ({
          userId: r.userId,
          type: 'GAME_CANCELLED',
          message: `❌ המשחק "${game.title}" בוטל על ידי המארח`,
          gameId: params.id,
        })),
      })
    }

    return NextResponse.json({ status: 'CANCELLED' })
  }

  const updated = await prisma.game.update({
    where: { id: params.id },
    data: {
      ...(body.title && { title: body.title }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.status && { status: body.status }),
      ...(body.maxPlayers && { maxPlayers: parseInt(body.maxPlayers) }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  const game = await prisma.game.findUnique({ where: { id: params.id } })
  if (!game) return NextResponse.json({ error: 'משחק לא נמצא' }, { status: 404 })
  if (game.hostId !== session.user.id) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  await prisma.game.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}

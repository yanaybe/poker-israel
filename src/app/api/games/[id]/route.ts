import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const PatchGameSchema = z.object({
  title: z.string().min(3).max(100).trim().optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z.enum(['OPEN', 'FULL', 'CLOSED', 'CANCELLED']).optional(),
  maxPlayers: z.number().int().min(2).max(20).optional(),
}).strict()

const avg = (vals: (number | null)[]) => {
  const nums = vals.filter((v): v is number => v !== null)
  return nums.length > 0 ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  const game = await prisma.game.findUnique({
    where: { id: params.id },
    include: {
      host: {
        select: {
          id: true,
          name: true,
          image: true,
          city: true,
          skillLevel: true,
          // canHostUntil intentionally excluded — admin-only field, not for public game detail
          _count: { select: { strikes: true, gamesHosted: true } },
          hostRatingsReceived: {
            select: { punctuality: true, locationAccuracy: true, fairDealing: true, safety: true },
            where: { declined: false },
          },
        },
      },
      requests: {
        include: {
          user: { select: { id: true, name: true, image: true, city: true, skillLevel: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      hostRatings: {
        include: { rater: { select: { id: true, name: true, image: true } } },
        where: { declined: false },
        orderBy: { createdAt: 'desc' },
      },
      playerRatings: {
        include: { player: { select: { id: true, name: true, image: true } } },
        where: { declined: false },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!game) return NextResponse.json({ error: 'משחק לא נמצא' }, { status: 404 })

  // Address reveal: host sees it always; approved players see it within 2h of game
  const isHost = session?.user?.id === game.hostId
  const hoursUntilGame = (game.dateTime.getTime() - Date.now()) / 3600000
  let locationRevealed = isHost

  if (!locationRevealed && session?.user?.id) {
    const approved = await prisma.gameRequest.findFirst({
      where: { gameId: params.id, userId: session.user.id, status: 'APPROVED' },
    })
    locationRevealed = !!approved && hoursUntilGame <= 2
  }

  const hasNeighborhood = !!game.neighborhood

  const [allHostRatings, pastGames] = await Promise.all([
    prisma.hostRating.findMany({
      where: { hostId: game.hostId, declined: false },
      select: { punctuality: true, locationAccuracy: true, fairDealing: true, safety: true },
    }),
    prisma.game.findMany({
      where: { hostId: game.hostId, dateTime: { lt: new Date() } },
      select: {
        id: true,
        requests: { where: { status: 'APPROVED' }, select: { userId: true } },
      },
    }),
  ])

  const avgOverall = avg(allHostRatings.flatMap((r) => [r.punctuality, r.locationAccuracy, r.fairDealing, r.safety]))
  const avgPunctuality = avg(allHostRatings.map((r) => r.punctuality))
  const avgLocationAccuracy = avg(allHostRatings.map((r) => r.locationAccuracy))
  const avgFairDealing = avg(allHostRatings.map((r) => r.fairDealing))
  const avgSafety = avg(allHostRatings.map((r) => r.safety))

  const playerCount: Record<string, number> = {}
  pastGames.forEach((g) => g.requests.forEach((r) => {
    playerCount[r.userId] = (playerCount[r.userId] ?? 0) + 1
  }))
  const uniquePlayers = Object.keys(playerCount).length
  const returning = Object.values(playerCount).filter((c) => c > 1).length
  const returnRate = uniquePlayers >= 3 ? Math.round((returning / uniquePlayers) * 100) : null

  const { hostRatingsReceived: _, ...hostWithoutRaw } = game.host

  return NextResponse.json({
    ...game,
    host: { ...hostWithoutRaw, avgRating: avgOverall },
    // Omit the location key entirely when not revealed — not just null — to prevent
    // clients from accidentally rendering partial address data
    ...((!hasNeighborhood || locationRevealed)
      ? { location: game.location }
      : { location: null }),
    locationRevealed: !hasNeighborhood || locationRevealed,
    hostStats: {
      gamesHosted: game.host._count.gamesHosted,
      lateStrikes: game.host._count.strikes,
      avgOverall,
      avgPunctuality,
      avgLocationAccuracy,
      avgFairDealing,
      avgSafety,
      totalRatings: allHostRatings.length,
      returnRate,
    },
  })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  const game = await prisma.game.findUnique({ where: { id: params.id } })
  if (!game) return NextResponse.json({ error: 'משחק לא נמצא' }, { status: 404 })
  if (game.hostId !== session.user.id) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
  }

  const parsed = PatchGameSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'נתונים לא תקינים', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const data = parsed.data

  // Prevent setting maxPlayers below current player count
  if (data.maxPlayers !== undefined && data.maxPlayers < game.currentPlayers) {
    return NextResponse.json(
      { error: `לא ניתן להגדיר מקסימום שחקנים (${data.maxPlayers}) פחות מהשחקנים הנוכחיים (${game.currentPlayers})` },
      { status: 400 }
    )
  }

  if (data.status === 'CANCELLED') {
    await prisma.game.update({ where: { id: params.id }, data: { status: 'CANCELLED' } })

    // Issue a strike if cancelling < 3h before game time with approved players
    const approvedRequests = await prisma.gameRequest.findMany({
      where: { gameId: params.id, status: 'APPROVED' },
      select: { userId: true },
    })

    const hoursUntilGame = (new Date(game.dateTime).getTime() - Date.now()) / 3600000
    if (hoursUntilGame < 3 && approvedRequests.length > 0) {
      await prisma.strike.create({ data: { userId: session.user.id, gameId: params.id } })

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

    // Notify all approved players
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
      ...(data.title !== undefined && { title: data.title }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.maxPlayers !== undefined && { maxPlayers: data.maxPlayers }),
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

  // If the game has approved players and is in the future, apply the same
  // strike logic as cancellation to prevent delete-to-avoid-accountability abuse
  if (game.dateTime > new Date()) {
    const approvedRequests = await prisma.gameRequest.findMany({
      where: { gameId: params.id, status: 'APPROVED' },
      select: { userId: true },
    })

    if (approvedRequests.length > 0) {
      const hoursUntilGame = (game.dateTime.getTime() - Date.now()) / 3600000
      if (hoursUntilGame < 3) {
        await prisma.strike.create({ data: { userId: session.user.id, gameId: params.id } })

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

      // Notify approved players of the deletion
      await prisma.notification.createMany({
        data: approvedRequests.map((r) => ({
          userId: r.userId,
          type: 'GAME_CANCELLED',
          message: `❌ המשחק "${game.title}" בוטל על ידי המארח`,
          gameId: params.id,
        })),
      })
    }
  }

  await prisma.game.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}

// TODO [HIGH][Security]:
// Location reveal logic is partially enforced server-side (location is null in response
// if not revealed), BUT the `locationRevealed` flag sent to client allows the frontend
// to bypass the reveal by directly calling this endpoint and reading the raw response.
// Fix: Never send the raw `location` field before reveal time. The current code
// sets `location: null` correctly when not revealed — verify this is never bypassed.
// Also: Ensure the `location` field is not accidentally included in `requests` or
// other nested relations returned in the same response.
// Risk: Users with DevTools can potentially access addresses before the reveal window.

// TODO [HIGH][Performance]:
// GET /api/games/[id] makes 3 DB queries sequentially after the initial game fetch:
//   1. Check approved request for location reveal
//   2. Fetch ALL host ratings (allHostRatings)
//   3. Fetch ALL past games + their approved requests (pastGames)
// For a popular host with 100 games and 500 ratings, queries 3 returns 500+ rows.
// Fix: Denormalize avgRating, returnRate, gamesHosted onto User. Update via background job.
// Risk: Game detail page becomes slow for established hosts.

// TODO [HIGH][Backend]:
// PATCH handler accepts arbitrary body with minimal validation:
// `body.maxPlayers && { maxPlayers: parseInt(body.maxPlayers) }` — if maxPlayers < currentPlayers,
// the game would appear to have more players than capacity allows.
// Fix: Validate that new maxPlayers >= currentPlayers when changing capacity.
// Risk: Game shows impossible state (currentPlayers=8, maxPlayers=5).

// TODO [MEDIUM][Backend]:
// DELETE hard-deletes the game record. All associated requests, ratings, boosts,
// and notification references to this gameId become orphaned or cascade-deleted.
// Fix: Implement soft delete (set deletedAt = now()) instead of hard delete.
// Allow the game to remain visible as "deleted" for ratings/history purposes.
// Risk: Irreversible data loss; host deletes game to avoid bad reviews.

// TODO [MEDIUM][Trust & Safety]:
// A host can delete a game to avoid strike consequences (delete before cancelling).
// Fix: If a game has approved players and dateTime is in the future, deleting should
// trigger the same strike logic as cancellation, or block deletion entirely.
// Risk: Hosts avoid accountability by deleting games instead of cancelling.

// TODO [MEDIUM][Backend]:
// Strike threshold (3 strikes → 30-day suspension) is hardcoded.
// Fix: Move to platform config: STRIKE_THRESHOLD=3, SUSPENSION_DAYS=30.
// Risk: Cannot adjust moderation policy without code deployment.

// TODO [LOW][Backend]:
// No audit log on PATCH/DELETE. There is no record of who changed what and when.
// Fix: Create a GameAuditLog table: { gameId, actorId, action, previousState, newState, createdAt }
// Risk: Disputes about game modifications cannot be resolved without audit trail.

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
          hostRatingsReceived: { select: { punctuality: true, locationAccuracy: true, fairDealing: true, safety: true }, where: { declined: false } },
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

  // Address reveal
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

  // Compute host stats from HostRating
  const hostId = game.hostId
  const [allHostRatings, pastGames] = await Promise.all([
    prisma.hostRating.findMany({
      where: { hostId, declined: false },
      select: { punctuality: true, locationAccuracy: true, fairDealing: true, safety: true },
    }),
    prisma.game.findMany({
      where: { hostId, dateTime: { lt: new Date() } },
      include: { requests: { where: { status: 'APPROVED' }, select: { userId: true } } },
    }),
  ])

  const avg = (vals: (number | null)[]) => {
    const nums = vals.filter((v): v is number => v !== null)
    return nums.length > 0 ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null
  }

  const avgPunctuality = avg(allHostRatings.map((r) => r.punctuality))
  const avgLocationAccuracy = avg(allHostRatings.map((r) => r.locationAccuracy))
  const avgFairDealing = avg(allHostRatings.map((r) => r.fairDealing))
  const avgSafety = avg(allHostRatings.map((r) => r.safety))
  const allDims = allHostRatings.flatMap((r) => [r.punctuality, r.locationAccuracy, r.fairDealing, r.safety])
  const avgOverall = avg(allDims)

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
    location: (!hasNeighborhood || locationRevealed) ? game.location : null,
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

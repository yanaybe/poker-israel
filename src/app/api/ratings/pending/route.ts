// TODO [HIGH][Performance]:
// This endpoint has O(n²) complexity in memory:
//   1. Fetches all approved game requests for user (could be hundreds)
//   2. Fetches all hosted games (could be hundreds)
//   3. Fetches all existing host ratings the user has given
//   4. Fetches all existing player ratings the user has given
//   5. Builds Sets in memory and does nested loops to find intersection
//
// This could be rewritten as a single SQL query:
//   SELECT games missing ratings FROM approved_requests
//   WHERE NOT EXISTS (SELECT 1 FROM host_ratings WHERE ...)
//
// Fix: Use Prisma with a nested `where: { NOT: { hostRatings: { some: { raterId: uid } } } }`
// or raw SQL with LEFT JOIN + IS NULL pattern.
// Risk: Slow for active users; 4 DB round-trips on every ratings page load.

// TODO [MEDIUM][UX]:
// No time limit on pending ratings. A game from 2 years ago still generates a
// pending rating task. This is both UX noise and performance overhead.
// Fix: Only show pending ratings for games in the last 30 days.
// Add: game: { dateTime: { gte: thirtyDaysAgo, lt: now } }
// Risk: Users are asked to rate games from long ago — they won't remember.

// TODO [MEDIUM][Backend]:
// No rate limiting on this endpoint. It's called on every games page load
// (via useEffect in GamesPage) for authenticated users.
// Fix: Cache the result in Redis with a 2-minute TTL per user.
// Or move the pending ratings count into the notifications API response.
// Risk: Extra DB load on every page navigation for authenticated users.

// TODO [LOW][UX]:
// tasks is typed as `object[]` — completely loses type safety downstream.
// Fix: Define a PendingRatingTask type and use it throughout.
// Risk: Frontend receives unexpected shapes — runtime crashes.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json([])

  const now = new Date()
  const uid = session.user.id

  // TODO [HIGH][Performance]: Replace these 4 parallel queries + in-memory join
  // with a single optimized SQL query using LEFT JOIN / NOT EXISTS pattern.
  // Games where user was approved player and hasn't rated host yet
  const [approvedRequests, hostedGames, existingHostRatings, existingPlayerRatings] = await Promise.all([
    prisma.gameRequest.findMany({
      where: { userId: uid, status: 'APPROVED', game: { dateTime: { lt: now } } },
      include: { game: { select: { id: true, title: true, dateTime: true, hostId: true, host: { select: { id: true, name: true, image: true } } } } },
    }),
    prisma.game.findMany({
      where: { hostId: uid, dateTime: { lt: now } },
      include: {
        requests: {
          where: { status: 'APPROVED' },
          include: { user: { select: { id: true, name: true, image: true } } },
        },
      },
    }),
    prisma.hostRating.findMany({ where: { raterId: uid }, select: { gameId: true } }),
    prisma.playerRating.findMany({ where: { raterId: uid }, select: { gameId: true, playerId: true } }),
  ])

  const ratedHostGames = new Set(existingHostRatings.map((r) => r.gameId))
  const ratedPlayers = new Set(existingPlayerRatings.map((r) => `${r.gameId}:${r.playerId}`))

  const tasks: object[] = []

  // Pending: rate host
  for (const req of approvedRequests) {
    if (!ratedHostGames.has(req.game.id)) {
      tasks.push({
        type: 'RATE_HOST',
        gameId: req.game.id,
        gameTitle: req.game.title,
        gameDate: req.game.dateTime.toISOString(),
        host: req.game.host,
      })
    }
  }

  // Pending: rate players
  for (const game of hostedGames) {
    for (const req of game.requests) {
      if (!ratedPlayers.has(`${game.id}:${req.user.id}`)) {
        tasks.push({
          type: 'RATE_PLAYER',
          gameId: game.id,
          gameTitle: game.title,
          gameDate: game.dateTime.toISOString(),
          player: req.user,
        })
      }
    }
  }

  return NextResponse.json(tasks)
}

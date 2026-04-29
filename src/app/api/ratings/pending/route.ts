import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json([])

  const now = new Date()
  const uid = session.user.id

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

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      email: true,
      age: true,
      city: true,
      skillLevel: true,
      image: true,
      canHostUntil: true,
      createdAt: true,
      _count: {
        select: {
          gamesHosted: true,
          gameRequests: true,
          strikes: true,
        },
      },
    },
  })

  if (!user) return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 })

  const avg = (vals: (number | null)[]) => {
    const nums = vals.filter((v): v is number => v !== null)
    return nums.length > 0 ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null
  }

  const [hostRatings, playerRatings, pastGames] = await Promise.all([
    prisma.hostRating.findMany({
      where: { hostId: params.id, declined: false },
      select: { punctuality: true, locationAccuracy: true, fairDealing: true, safety: true },
    }),
    prisma.playerRating.findMany({
      where: { playerId: params.id, declined: false },
      select: { behavior: true, punctuality: true, payment: true },
    }),
    prisma.game.findMany({
      where: { hostId: params.id, dateTime: { lt: new Date() } },
      include: { requests: { where: { status: 'APPROVED' }, select: { userId: true } } },
    }),
  ])

  const playerCount: Record<string, number> = {}
  pastGames.forEach((g) => g.requests.forEach((r) => {
    playerCount[r.userId] = (playerCount[r.userId] ?? 0) + 1
  }))
  const uniquePlayers = Object.keys(playerCount).length
  const returning = Object.values(playerCount).filter((c) => c > 1).length
  const returnRate = uniquePlayers >= 3 ? Math.round((returning / uniquePlayers) * 100) : null

  const hostStats = {
    gamesHosted: user._count.gamesHosted,
    lateStrikes: user._count.strikes,
    avgOverall: avg(hostRatings.flatMap((r) => [r.punctuality, r.locationAccuracy, r.fairDealing, r.safety])),
    avgPunctuality: avg(hostRatings.map((r) => r.punctuality)),
    avgLocationAccuracy: avg(hostRatings.map((r) => r.locationAccuracy)),
    avgFairDealing: avg(hostRatings.map((r) => r.fairDealing)),
    avgSafety: avg(hostRatings.map((r) => r.safety)),
    totalRatings: hostRatings.length,
    returnRate,
  }

  const playerStats = {
    avgOverall: avg(playerRatings.flatMap((r) => [r.behavior, r.punctuality, r.payment])),
    avgBehavior: avg(playerRatings.map((r) => r.behavior)),
    avgPunctuality: avg(playerRatings.map((r) => r.punctuality)),
    avgPayment: avg(playerRatings.map((r) => r.payment)),
    totalRatings: playerRatings.length,
  }

  return NextResponse.json({ ...user, hostStats, playerStats })
}

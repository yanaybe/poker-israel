// TODO [HIGH][Security]:
// This endpoint exposes user email addresses to anyone — no authentication required.
// Email is personally identifiable information and should never be public.
// Fix: Remove `email: true` from the select, or gate the endpoint behind auth
// and only return email to the user themselves.
// Risk: All user email addresses are publicly scrapeable via /api/users/[id].

// TODO [HIGH][Security]:
// canHostUntil (suspension date) is returned in the public API response.
// This leaks the fact that a user is suspended and when the suspension ends.
// Fix: Remove canHostUntil from public profile response. Only the user themselves
// and admins should see suspension details.
// Risk: Privacy violation; suspended users are publicly labelled.

// TODO [HIGH][Performance]:
// This endpoint makes 3 parallel DB queries + in-memory computation every time
// a profile is viewed. For popular hosts, this runs constantly.
// Fix: Denormalize avgRating, totalRatings, returnRate onto the User model.
// Update these fields via background job when new ratings arrive.
// Risk: Profile page is slow for hosts with many ratings.

// TODO [HIGH][Trust & Safety]:
// No authentication required. Anyone can view any user's full profile including
// hosting history, rating breakdown, and city location.
// Fix: Public profiles should only show public fields. Viewing more detail
// (email, age, contact) should require authentication.
// Risk: Data harvesting for targeting or doxxing purposes.

// TODO [MEDIUM][Backend]:
// pastGames includes ALL games ever hosted — no limit. A host with 500 past games
// has all their game data + approved requests loaded to compute returnRate.
// Fix: Only fetch last 12 months of games for returnRate calculation.
// Or store returnRate as a denormalized field on User.
// Risk: O(all_past_games) query on every profile view.

// TODO [LOW][UX]:
// No "private profile" setting. Some hosts may not want their rating history,
// return rate, or strike count visible publicly.
// Fix: Add User.profileVisibility enum: PUBLIC | PLAYERS_ONLY | PRIVATE

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      // TODO [HIGH][Security]: Remove email from public profile response.
      email: true,
      age: true,
      city: true,
      skillLevel: true,
      image: true,
      // TODO [HIGH][Security]: Remove canHostUntil from public response.
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

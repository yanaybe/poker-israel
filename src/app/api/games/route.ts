// TODO [HIGH][Performance]:
// GET /api/games returns ALL games in the database with no pagination.
// The query includes full host data + ALL host ratings for each game.
// At 1,000 games with 50 ratings each, this fetches 50,000 rating rows per request.
// Fix: Add cursor-based pagination (?cursor=lastId&limit=20).
// Add a pre-computed avgRating column on User to avoid joining all ratings.
// Risk: This endpoint will time out / OOM as the game count grows.

// TODO [HIGH][Performance]:
// hostRatingsReceived is included in every game's host data to compute avgRating.
// This is an N+1 pattern at the dataset level — fetching ratings for every host.
// Fix: Store a denormalized avgRating and ratingCount on User (updated via trigger
// or background job when new ratings are submitted).
// Risk: O(total_ratings) data transferred on every games list load.

// TODO [HIGH][Backend]:
// Client-side filtering: frontend receives all games and filters by city/gameType/stakes/status.
// This means ALL game data is sent over the network even when 90% is filtered out.
// Fix: Move all filtering to the DB query (already partially done with WHERE clause,
// but stakes and the full city filtering are client-side in GameFilters component).
// Risk: Network bandwidth waste; will be slow on mobile data connections.

// TODO [HIGH][Backend]:
// No authentication required for GET /api/games — this is correct for discovery,
// but there's no rate limiting. A bot can scrape all game data including host names,
// cities, and schedules.
// Fix: Add rate limiting (100 req/min per IP) and consider omitting sensitive fields
// (exact location) from unauthenticated responses.
// Risk: Data scraping, competitive intelligence, host targeting.

// TODO [MEDIUM][Backend]:
// No validation on POST body fields. `parseInt(buyIn)` where buyIn is undefined
// returns NaN. `parseInt("999999999999")` stores an absurd value. No max/min checks.
// Fix: Add Zod schema for game creation with proper bounds:
// buyIn: z.number().int().min(0).max(100000)
// maxPlayers: z.number().int().min(2).max(20)
// dateTime: z.string().datetime().refine(d => new Date(d) > new Date(), 'Must be future')
// Risk: Invalid data types and out-of-bounds values stored in DB.

// TODO [MEDIUM][Performance]:
// No caching layer. Every page load by every user hits the database.
// Fix: Cache the games list in Redis with a 60-second TTL. Invalidate on game
// creation, update, or deletion. Use Next.js unstable_cache or a Redis client.
// Risk: Database load scales linearly with active users — bottleneck at ~100 concurrent.

// TODO [MEDIUM][UX]:
// No "upcoming only" filter. By default, past games are included in results unless
// the frontend explicitly filters. Users see games that already happened.
// Fix: Add default filter: dateTime >= now() unless includePast=true is specified.
// Risk: Bad UX — game list cluttered with past/expired games.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isPremiumHost, getMonthlyPostCount, FREE_GAME_LIMIT } from '@/lib/premium'

export async function GET(req: Request) {
  // TODO [HIGH][Backend]: Add pagination params parsing here.
  // const limit = parseInt(searchParams.get('limit') ?? '20')
  // const cursor = searchParams.get('cursor') ?? undefined
  const { searchParams } = new URL(req.url)
  const hostId = searchParams.get('hostId')
  const city = searchParams.get('city')
  const gameType = searchParams.get('gameType')
  const status = searchParams.get('status')
  const joinedUserId = searchParams.get('joinedUserId')

  type HostRatingDim = { punctuality: number | null; locationAccuracy: number | null; fairDealing: number | null; safety: number | null }
  const hostSelect = {
    id: true, name: true, image: true, city: true, skillLevel: true,
    _count: { select: { strikes: true, gamesHosted: true } },
    hostRatingsReceived: { select: { punctuality: true, locationAccuracy: true, fairDealing: true, safety: true }, where: { declined: false } },
    subscription: { select: { status: true, currentPeriodEnd: true } },
  }

  const now = new Date()
  const addAvgRating = <T extends { host: { hostRatingsReceived: HostRatingDim[]; subscription: { status: string; currentPeriodEnd: Date } | null }; boost?: { boostedUntil: Date } | null }>(games: T[]) => {
    const withMeta = games.map(({ host: { hostRatingsReceived, subscription, ...host }, boost, ...g }) => {
      const vals = hostRatingsReceived.flatMap((r) => [r.punctuality, r.locationAccuracy, r.fairDealing, r.safety]).filter((v): v is number => v !== null)
      const avgRating = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null
      const isPremium = !!subscription && subscription.status === 'active' && subscription.currentPeriodEnd > now
      const isBoosted = !!boost && boost.boostedUntil > now
      return { ...g, boost: isBoosted ? { boostedUntil: boost!.boostedUntil.toISOString() } : null, host: { ...host, avgRating, isPremium } }
    })
    // Boosted games first, then by dateTime
    return withMeta.sort((a, b) => {
      if (a.boost && !b.boost) return -1
      if (!a.boost && b.boost) return 1
      return 0
    })
  }

  // Return games where a specific user has an approved request
  if (joinedUserId) {
    const requestStatus = searchParams.get('requestStatus') ?? 'APPROVED'
    const requests = await prisma.gameRequest.findMany({
      where: { userId: joinedUserId, status: requestStatus },
      include: {
        game: {
          include: {
            host: { select: hostSelect },
            boost: { select: { boostedUntil: true } },
            _count: { select: { requests: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(addAvgRating(requests.map((r) => r.game)))
  }

  const where: Record<string, unknown> = {}
  if (hostId) where.hostId = hostId
  if (city) where.city = city
  if (gameType) where.gameType = gameType
  if (status) where.status = status

  const games = await prisma.game.findMany({
    where,
    include: {
      host: { select: hostSelect },
      boost: { select: { boostedUntil: true } },
      _count: { select: { requests: true } },
    },
    orderBy: { dateTime: 'asc' },
  })

  return NextResponse.json(addAvgRating(games))
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })
  }

  const [host, premium, monthlyCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { canHostUntil: true } }),
    isPremiumHost(session.user.id),
    getMonthlyPostCount(session.user.id),
  ])
  if (host?.canHostUntil && host.canHostUntil > new Date()) {
    const until = host.canHostUntil.toLocaleDateString('he-IL')
    return NextResponse.json(
      { error: `אינך יכול לפרסם משחקים עד ${until} עקב ביטולים מרובים` },
      { status: 403 }
    )
  }
  if (!premium && monthlyCount >= FREE_GAME_LIMIT) {
    return NextResponse.json({ error: 'הגעת לגבול 3 משחקים בחודש', code: 'UPGRADE_REQUIRED' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const {
      title, neighborhood, location, city, dateTime, buyIn, gameType, stakes,
      houseFeeType, houseFee, houseFeePct, houseFeeMax,
      maxPlayers, currentPlayers, notes,
      stackMin, stackMax, rebuyType, rebuyCap, gamePace, vibeTags, expectedDuration,
      hasFood, hasDrinks,
    } = body

    if (!title || !location || !city || !dateTime || !gameType || !stakes || !maxPlayers) {
      return NextResponse.json({ error: 'חסרים שדות חובה' }, { status: 400 })
    }

    // TODO [MEDIUM][Security]: buyIn: parseInt(buyIn) — if buyIn is undefined or
    // a non-numeric string, this produces NaN which Prisma may accept or reject
    // inconsistently. Always validate numeric fields before parseInt.
    // TODO [MEDIUM][Security]: No bounds checking. buyIn could be -1 or 999999999.
    // Add: if (parsedBuyIn < 0 || parsedBuyIn > 100000) return 400
    // TODO [MEDIUM][Security]: dateTime is not validated as a future date.
    // A game can be created with a past dateTime, polluting the games list.
    const game = await prisma.game.create({
      data: {
        hostId: session.user.id,
        title,
        neighborhood: neighborhood ?? null,
        location,
        city,
        dateTime: new Date(dateTime),
        buyIn: parseInt(buyIn),
        gameType,
        stakes,
        houseFeeType: houseFeeType ?? null,
        houseFee: houseFee ?? null,
        houseFeePct: houseFeePct ?? null,
        houseFeeMax: houseFeeMax ?? null,
        maxPlayers: parseInt(maxPlayers),
        currentPlayers: currentPlayers ?? 1,
        notes: notes ?? null,
        stackMin: stackMin ? parseInt(stackMin) : null,
        stackMax: stackMax ? parseInt(stackMax) : null,
        rebuyType: rebuyType ?? null,
        rebuyCap: rebuyType === 'CAPPED' && rebuyCap ? parseInt(rebuyCap) : null,
        gamePace: gamePace ?? null,
        vibeTags: vibeTags ?? null,
        expectedDuration: expectedDuration ? parseFloat(expectedDuration) : null,
        hasFood: hasFood ?? false,
        hasDrinks: hasDrinks ?? false,
      },
      include: {
        host: { select: { id: true, name: true, image: true, city: true, skillLevel: true } },
      },
    })

    return NextResponse.json(game, { status: 201 })
  } catch (error) {
    console.error('Create game error:', error)
    return NextResponse.json({ error: 'שגיאה ביצירת המשחק' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isPremiumHost, getMonthlyPostCount, FREE_GAME_LIMIT } from '@/lib/premium'
import { ISRAELI_CITIES, STAKES_OPTIONS } from '@/types/index'

const CreateGameSchema = z.object({
  title: z.string().min(3, 'כותרת קצרה מדי').max(100, 'כותרת ארוכה מדי').trim(),
  neighborhood: z.string().max(100).trim().optional().nullable(),
  location: z.string().min(2, 'נא להזין כתובת').max(300, 'כתובת ארוכה מדי').trim(),
  city: z.enum(ISRAELI_CITIES as [string, ...string[]], { errorMap: () => ({ message: 'עיר לא חוקית' }) }),
  dateTime: z.string().datetime({ message: 'תאריך לא תקין' }).refine(
    (d) => new Date(d) > new Date(),
    { message: 'תאריך המשחק חייב להיות בעתיד' }
  ),
  buyIn: z.number({ invalid_type_error: 'ביי-אין לא תקין' }).int().min(0).max(100000),
  gameType: z.enum(['CASH', 'TOURNAMENT', 'SIT_AND_GO'], { errorMap: () => ({ message: 'סוג משחק לא תקין' }) }),
  stakes: z.enum(STAKES_OPTIONS as [string, ...string[]], { errorMap: () => ({ message: 'סטייקס לא תקין' }) }),
  houseFeeType: z.enum(['FLAT', 'PERCENTAGE', 'NONE']).optional().nullable(),
  houseFee: z.number().int().min(0).max(10000).optional().nullable(),
  houseFeePct: z.number().min(0).max(50).optional().nullable(),
  houseFeeMax: z.number().int().min(0).max(10000).optional().nullable(),
  maxPlayers: z.number({ invalid_type_error: 'מספר שחקנים לא תקין' }).int().min(2).max(20),
  notes: z.string().max(2000, 'הערות ארוכות מדי').optional().nullable(),
  stackMin: z.number().int().min(0).max(1000000).optional().nullable(),
  stackMax: z.number().int().min(0).max(1000000).optional().nullable(),
  rebuyType: z.enum(['UNLIMITED', 'CAPPED', 'NONE']).optional().nullable(),
  rebuyCap: z.number().int().min(1).max(100).optional().nullable(),
  gamePace: z.enum(['FAST', 'NORMAL', 'SLOW']).optional().nullable(),
  vibeTags: z.string().max(500).optional().nullable(),
  expectedDuration: z.number().min(0.5).max(24).optional().nullable(),
  hasFood: z.boolean().default(false),
  hasDrinks: z.boolean().default(false),
})

type HostRatingDim = {
  punctuality: number | null
  locationAccuracy: number | null
  fairDealing: number | null
  safety: number | null
}

const hostSelect = {
  id: true, name: true, image: true, city: true, skillLevel: true,
  _count: { select: { strikes: true, gamesHosted: true } },
  hostRatingsReceived: {
    select: { punctuality: true, locationAccuracy: true, fairDealing: true, safety: true },
    where: { declined: false },
  },
  subscription: { select: { status: true, currentPeriodEnd: true } },
}

function addAvgRating<T extends {
  host: {
    hostRatingsReceived: HostRatingDim[]
    subscription: { status: string; currentPeriodEnd: Date } | null
  }
  boost?: { boostedUntil: Date } | null
}>(games: T[], now: Date) {
  const withMeta = games.map(({ host: { hostRatingsReceived, subscription, ...host }, boost, ...g }) => {
    const vals = hostRatingsReceived
      .flatMap((r) => [r.punctuality, r.locationAccuracy, r.fairDealing, r.safety])
      .filter((v): v is number => v !== null)
    const avgRating = vals.length > 0
      ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
      : null
    const isPremium = !!subscription && subscription.status === 'active' && subscription.currentPeriodEnd > now
    const isBoosted = !!boost && boost.boostedUntil > now
    return {
      ...g,
      boost: isBoosted ? { boostedUntil: boost!.boostedUntil.toISOString() } : null,
      host: { ...host, avgRating, isPremium },
    }
  })
  return withMeta.sort((a, b) => {
    if (a.boost && !b.boost) return -1
    if (!a.boost && b.boost) return 1
    return 0
  })
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const hostId = searchParams.get('hostId')
  const city = searchParams.get('city')
  const gameType = searchParams.get('gameType')
  const status = searchParams.get('status')
  const joinedUserId = searchParams.get('joinedUserId')
  const now = new Date()

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
    return NextResponse.json(addAvgRating(requests.map((r) => r.game), now))
  }

  const where: Record<string, unknown> = {}
  if (hostId) where.hostId = hostId
  if (city && (ISRAELI_CITIES as string[]).includes(city)) where.city = city
  if (gameType && ['CASH', 'TOURNAMENT', 'SIT_AND_GO'].includes(gameType)) where.gameType = gameType
  if (status && ['OPEN', 'FULL', 'CLOSED', 'CANCELLED'].includes(status)) where.status = status

  const games = await prisma.game.findMany({
    where,
    include: {
      host: { select: hostSelect },
      boost: { select: { boostedUntil: true } },
      _count: { select: { requests: true } },
    },
    orderBy: { dateTime: 'asc' },
  })

  return NextResponse.json(addAvgRating(games, now))
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
  }

  const parsed = CreateGameSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'נתונים לא תקינים', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const data = parsed.data

  const [host, premium, monthlyCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canHostUntil: true, isBanned: true },
    }),
    isPremiumHost(session.user.id),
    getMonthlyPostCount(session.user.id),
  ])

  if (host?.isBanned) {
    return NextResponse.json({ error: 'החשבון הושעה' }, { status: 403 })
  }

  if (host?.canHostUntil && host.canHostUntil > new Date()) {
    const until = host.canHostUntil.toLocaleDateString('he-IL')
    return NextResponse.json(
      { error: `אינך יכול לפרסם משחקים עד ${until} עקב ביטולים מרובים` },
      { status: 403 }
    )
  }

  if (!premium && monthlyCount >= FREE_GAME_LIMIT) {
    return NextResponse.json(
      { error: 'הגעת לגבול 3 משחקים בחודש', code: 'UPGRADE_REQUIRED' },
      { status: 403 }
    )
  }

  try {
    const game = await prisma.game.create({
      data: {
        hostId: session.user.id,
        title: data.title,
        neighborhood: data.neighborhood ?? null,
        location: data.location,
        city: data.city,
        dateTime: new Date(data.dateTime),
        buyIn: data.buyIn,
        gameType: data.gameType,
        stakes: data.stakes,
        houseFeeType: data.houseFeeType ?? null,
        houseFee: data.houseFee ?? null,
        houseFeePct: data.houseFeePct ?? null,
        houseFeeMax: data.houseFeeMax ?? null,
        maxPlayers: data.maxPlayers,
        currentPlayers: 1,
        notes: data.notes ?? null,
        stackMin: data.stackMin ?? null,
        stackMax: data.stackMax ?? null,
        rebuyType: data.rebuyType ?? null,
        rebuyCap: data.rebuyType === 'CAPPED' ? (data.rebuyCap ?? null) : null,
        gamePace: data.gamePace ?? null,
        vibeTags: data.vibeTags ?? null,
        expectedDuration: data.expectedDuration ?? null,
        hasFood: data.hasFood,
        hasDrinks: data.hasDrinks,
      },
      include: {
        host: { select: { id: true, name: true, image: true, city: true, skillLevel: true } },
      },
    })

    return NextResponse.json(game, { status: 201 })
  } catch (err) {
    console.error('Create game error:', err)
    return NextResponse.json({ error: 'שגיאה ביצירת המשחק' }, { status: 500 })
  }
}

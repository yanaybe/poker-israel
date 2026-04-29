import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const hostId = searchParams.get('hostId')
  const city = searchParams.get('city')
  const gameType = searchParams.get('gameType')
  const status = searchParams.get('status')
  const joinedUserId = searchParams.get('joinedUserId')

  // Return games where a specific user has an approved request
  if (joinedUserId) {
    const requestStatus = searchParams.get('requestStatus') ?? 'APPROVED'
    const requests = await prisma.gameRequest.findMany({
      where: { userId: joinedUserId, status: requestStatus },
      include: {
        game: {
          include: {
            host: {
              select: {
                id: true, name: true, image: true, city: true, skillLevel: true,
                _count: { select: { strikes: true, gamesHosted: true } },
              },
            },
            _count: { select: { requests: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(requests.map((r) => r.game))
  }

  const where: Record<string, unknown> = {}
  if (hostId) where.hostId = hostId
  if (city) where.city = city
  if (gameType) where.gameType = gameType
  if (status) where.status = status

  const games = await prisma.game.findMany({
    where,
    include: {
      host: {
        select: {
          id: true, name: true, image: true, city: true, skillLevel: true,
          _count: { select: { strikes: true, gamesHosted: true } },
        },
      },
      _count: { select: { requests: true } },
    },
    orderBy: { dateTime: 'asc' },
  })

  return NextResponse.json(games)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })
  }

  const host = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { canHostUntil: true },
  })
  if (host?.canHostUntil && host.canHostUntil > new Date()) {
    const until = host.canHostUntil.toLocaleDateString('he-IL')
    return NextResponse.json(
      { error: `אינך יכול לפרסם משחקים עד ${until} עקב ביטולים מרובים` },
      { status: 403 }
    )
  }

  try {
    const body = await req.json()
    const { title, location, city, dateTime, buyIn, gameType, stakes, houseFeeType, houseFee, houseFeePct, houseFeeMax, maxPlayers, currentPlayers, notes } = body

    if (!title || !location || !city || !dateTime || !gameType || !stakes || !maxPlayers) {
      return NextResponse.json({ error: 'חסרים שדות חובה' }, { status: 400 })
    }

    const game = await prisma.game.create({
      data: {
        hostId: session.user.id,
        title,
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

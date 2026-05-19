import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ISRAELI_CITIES } from '@/types/index'

const VALID_GAME_TYPES = ['CASH', 'TOURNAMENT', 'SIT_AND_GO'] as const
const LFG_EXPIRY_DAYS = 7

const CreateLfgSchema = z.object({
  city: z.enum(ISRAELI_CITIES as [string, ...string[]], { errorMap: () => ({ message: 'עיר לא חוקית' }) }),
  availableText: z.string().min(5, 'תיאור קצר מדי').max(500, 'תיאור ארוך מדי').trim(),
  buyIn: z.number({ invalid_type_error: 'ביי-אין לא תקין' }).int().min(0).max(100000).nullable().optional(),
  gameTypes: z
    .array(z.enum(VALID_GAME_TYPES))
    .max(3)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v.join(',') : null)),
  notes: z.string().max(500, 'הערות ארוכות מדי').trim().optional().nullable(),
})

const userSelect = {
  id: true,
  name: true,
  image: true,
  skillLevel: true,
  city: true,
  playerRatingsReceived: {
    select: { behavior: true, punctuality: true, payment: true },
    where: { declined: false },
  },
}

function withRating<T extends {
  playerRatingsReceived: { behavior: number | null; punctuality: number | null; payment: number | null }[]
}>(user: T) {
  const { playerRatingsReceived, ...rest } = user
  const vals = playerRatingsReceived
    .flatMap((r) => [r.behavior, r.punctuality, r.payment])
    .filter((v): v is number => v !== null)
  const avgRating = vals.length > 0
    ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
    : null
  return { ...rest, avgRating, totalRatings: playerRatingsReceived.length }
}

const LFG_PAGE_LIMIT = 20
const LFG_MAX_LIMIT = 50

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const city = searchParams.get('city')
  const cursor = searchParams.get('cursor')
  const limitParam = parseInt(searchParams.get('limit') ?? String(LFG_PAGE_LIMIT), 10)
  const limit = Math.min(isNaN(limitParam) || limitParam < 1 ? LFG_PAGE_LIMIT : limitParam, LFG_MAX_LIMIT)
  const now = new Date()

  const cityFilter = city && (ISRAELI_CITIES as string[]).includes(city) ? city : undefined

  let cursorData: { id: string; createdAt: string } | null = null
  if (cursor) {
    try {
      cursorData = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
    } catch {
      return NextResponse.json({ error: 'cursor לא תקין' }, { status: 400 })
    }
  }

  const cursorWhere = cursorData
    ? {
        OR: [
          { createdAt: { lt: new Date(cursorData.createdAt) } },
          { createdAt: { equals: new Date(cursorData.createdAt) }, id: { gt: cursorData.id } },
        ],
      }
    : {}

  const posts = await prisma.lfgPost.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { gt: now },
      ...(cityFilter ? { city: cityFilter } : {}),
      ...cursorWhere,
    },
    include: { user: { select: userSelect } },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    take: limit + 1,
  })

  const hasMore = posts.length > limit
  const page = posts.slice(0, limit)
  const last = page[page.length - 1]
  const nextCursor = hasMore && last
    ? Buffer.from(JSON.stringify({ id: last.id, createdAt: last.createdAt.toISOString() }), 'utf8').toString('base64url')
    : null

  return NextResponse.json({
    posts: page.map(({ user, ...post }) => ({ ...post, user: withRating(user) })),
    nextCursor,
  })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
  }

  const parsed = CreateLfgSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'נתונים לא תקינים', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const data = parsed.data

  // Close any existing active post before creating a new one
  await prisma.lfgPost.updateMany({
    where: { userId: session.user.id, status: 'ACTIVE' },
    data: { status: 'CLOSED' },
  })

  const expiresAt = new Date(Date.now() + LFG_EXPIRY_DAYS * 24 * 3600000)

  const post = await prisma.lfgPost.create({
    data: {
      userId: session.user.id,
      city: data.city,
      availableText: data.availableText,
      buyIn: data.buyIn ?? null,
      gameTypes: data.gameTypes ?? null,
      notes: data.notes ?? null,
      expiresAt,
    },
    include: { user: { select: userSelect } },
  })

  return NextResponse.json({ ...post, user: withRating(post.user) }, { status: 201 })
}

// TODO [HIGH][Backend]:
// GET /api/lfg has no pagination. Returns ALL active LFG posts for a city.
// Fix: Add pagination: ?page=1&limit=20
// Risk: At scale, returns unbounded number of posts.

// TODO [HIGH][Backend]:
// POST /api/lfg has no rate limiting. A user can create unlimited LFG posts
// (the old one is closed, a new one created — but this can be scripted).
// Fix: Rate limit: max 5 LFG post creations per user per day.
// Risk: LFG feed spamming with bot-generated posts.

// TODO [HIGH][Backend]:
// No backend validation of POST body. city, availableText, buyIn, gameTypes
// are all accepted without type/bounds checking.
// Fix: Add Zod schema:
//   city: z.enum(ISRAELI_CITIES)
//   availableText: z.string().min(10).max(500)
//   buyIn: z.number().int().min(0).max(100000).nullable()
// Risk: Invalid data stored; potential XSS via unvalidated availableText.

// TODO [MEDIUM][UX]:
// 7-day LFG post expiry is hardcoded. Should be configurable.
// Fix: Move to platform config or environment variable.
// Risk: Cannot adjust expiry without code deployment.

// TODO [MEDIUM][Backend]:
// No notification to existing LFG posters when a matching game is created.
// The most valuable feature would be: "A 1/2 cash game was just posted in your city!"
// Fix: On game creation, query active LFG posts by city + gameType and notify them.
// Risk: LFG feature is disconnected from game creation — misses its core value proposition.

// TODO [MEDIUM][Trust & Safety]:
// No moderation of LFG post content. Users could post offensive or inappropriate
// "available text" that other users see.
// Fix: Implement content moderation (keyword filter or ML-based) on POST.
// Risk: Inappropriate content visible to all users in a city.

// TODO [LOW][UX]:
// LFG posts only filterable by city — no filtering by gameType, buyIn range, or skill level.
// Fix: Add server-side filtering for gameType and buyIn range.
// Risk: Discovery is imprecise — players find wrong game types.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

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

function withRating<T extends { playerRatingsReceived: { behavior: number | null; punctuality: number | null; payment: number | null }[] }>(user: T) {
  const { playerRatingsReceived, ...rest } = user
  const vals = playerRatingsReceived.flatMap((r) => [r.behavior, r.punctuality, r.payment]).filter((v): v is number => v !== null)
  const avgRating = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null
  return { ...rest, avgRating, totalRatings: playerRatingsReceived.length }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const city = searchParams.get('city')
  const now = new Date()

  const posts = await prisma.lfgPost.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { gt: now },
      ...(city ? { city } : {}),
    },
    include: { user: { select: userSelect } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(posts.map(({ user, ...post }) => ({ ...post, user: withRating(user) })))
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  const { city, availableText, buyIn, gameTypes, notes } = await req.json()
  if (!city || !availableText?.trim()) return NextResponse.json({ error: 'עיר וזמינות הם שדות חובה' }, { status: 400 })

  // Close any existing active post before creating a new one
  await prisma.lfgPost.updateMany({
    where: { userId: session.user.id, status: 'ACTIVE' },
    data: { status: 'CLOSED' },
  })

  const expiresAt = new Date(Date.now() + 7 * 24 * 3600000)

  const post = await prisma.lfgPost.create({
    data: {
      userId: session.user.id,
      city,
      availableText: availableText.trim(),
      buyIn: buyIn ? parseInt(buyIn) : null,
      gameTypes: gameTypes ?? null,
      notes: notes?.trim() ?? null,
      expiresAt,
    },
    include: { user: { select: userSelect } },
  })

  return NextResponse.json({ ...post, user: withRating(post.user) }, { status: 201 })
}

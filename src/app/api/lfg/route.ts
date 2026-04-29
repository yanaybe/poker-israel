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

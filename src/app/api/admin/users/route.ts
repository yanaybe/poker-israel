import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })
  if (!session.user.isAdmin) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get('cursor')
  const limit = 50

  const users = await prisma.user.findMany({
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      isAdmin: true,
      isBanned: true,
      banReason: true,
      bannedAt: true,
      skillLevel: true,
      city: true,
      _count: { select: { gamesHosted: true, gameRequests: true } },
    },
  })

  const hasMore = users.length > limit
  const page = users.slice(0, limit)

  return NextResponse.json({
    users: page,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  })
}

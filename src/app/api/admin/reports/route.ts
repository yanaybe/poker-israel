import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })
  if (!session.user.isAdmin) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'PENDING'
  const cursor = searchParams.get('cursor')
  const limit = 50

  const validStatuses = ['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED']
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'סטטוס לא תקין' }, { status: 400 })
  }

  const reports = await prisma.report.findMany({
    where: { status },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: 'desc' },
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      targetUser: { select: { id: true, name: true, email: true } },
      targetGame: { select: { id: true, title: true, city: true } },
    },
  })

  const hasMore = reports.length > limit
  const page = reports.slice(0, limit)

  return NextResponse.json({
    reports: page,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  })
}

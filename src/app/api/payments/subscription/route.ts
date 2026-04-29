import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isPremiumHost, getMonthlyPostCount, FREE_GAME_LIMIT } from '@/lib/premium'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ isPremium: false, monthlyCount: 0, limit: FREE_GAME_LIMIT })

  const userId = session.user.id
  const [premium, monthlyCount, sub] = await Promise.all([
    isPremiumHost(userId),
    getMonthlyPostCount(userId),
    prisma.subscription.findUnique({ where: { userId }, select: { status: true, currentPeriodEnd: true } }),
  ])

  return NextResponse.json({
    isPremium: premium,
    monthlyCount,
    limit: FREE_GAME_LIMIT,
    subscription: sub ?? null,
  })
}

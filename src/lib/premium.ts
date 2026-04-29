import { prisma } from '@/lib/db'

export async function isPremiumHost(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { status: true, currentPeriodEnd: true },
  })
  return !!sub && sub.status === 'active' && sub.currentPeriodEnd > new Date()
}

export async function getMonthlyPostCount(userId: string): Promise<number> {
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  return prisma.game.count({ where: { hostId: userId, createdAt: { gte: monthStart } } })
}

export const FREE_GAME_LIMIT = 3

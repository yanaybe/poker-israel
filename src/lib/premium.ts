// TODO [HIGH][Architecture]:
// isPremiumHost and getMonthlyPostCount each make separate DB queries.
// In the games POST route, both are called in Promise.all() — good — but
// they could be combined into a single query fetching both subscription and count.
// Fix: Create a getUserPremiumStatus(userId) function that returns
// { isPremium, monthlyCount } in a single transaction.
// Risk: Extra DB round-trips add latency on every game creation attempt.

// TODO [HIGH][Scalability]:
// FREE_GAME_LIMIT is a hardcoded magic number (3). Changing it requires a
// code deployment. Cannot offer promotional limits (e.g., "first month unlimited").
// Fix: Move limit to a platform config table or environment variable.
// Fetch the limit value from config at runtime.
// Risk: Cannot adjust business model without code changes.

// TODO [MEDIUM][UX]:
// No function to tell the user HOW MANY free games they have left this month.
// The limit is only enforced on creation — there's no proactive "2 of 3 used" UI.
// Fix: Export a getRemainingFreeGames(userId) helper and surface the count in
// the create-game page and profile page.
// Risk: Users hit the wall unexpectedly, creating frustration and support requests.

// TODO [MEDIUM][Backend]:
// getMonthlyPostCount uses calendar month start (1st of month at 00:00).
// This means a host can post 3 games on Jan 31 and 3 more on Feb 1 — 6 games
// within 2 days. A rolling 30-day window would be more fair.
// Fix: Change monthStart to `new Date(Date.now() - 30 * 24 * 3600000)`.
// Risk: Free tier limit easily gamed by posting on month boundaries.

// TODO [LOW][Analytics]:
// No tracking of premium conversion funnel: who hits the free limit, what they do next.
// Fix: Log a 'FREE_LIMIT_HIT' event to analytics on every 403 UPGRADE_REQUIRED response.
// Risk: Cannot measure premium conversion rate or optimize the upgrade flow.

import { prisma } from '@/lib/db'

// TODO [MEDIUM][Performance]: Consider caching premium status in Redis with a
// short TTL (5 minutes) to avoid hitting the DB on every game creation check.
export async function isPremiumHost(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { status: true, currentPeriodEnd: true },
  })
  return !!sub && sub.status === 'active' && sub.currentPeriodEnd > new Date()
}

// TODO [MEDIUM][Backend]: Switch from calendar month to rolling 30-day window.
// Current: resets on 1st of month. Better: count games in last 30 days.
export async function getMonthlyPostCount(userId: string): Promise<number> {
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  return prisma.game.count({ where: { hostId: userId, createdAt: { gte: monthStart } } })
}

// TODO [HIGH][Scalability]: Move to config table or env var — do not hardcode.
export const FREE_GAME_LIMIT = 3

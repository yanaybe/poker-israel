// TODO [HIGH][Architecture]:
// Notifications are fetched by polling every 30 seconds from every authenticated user.
// At 1,000 users, this is 2,000 DB queries per minute just for notifications.
// Fix: Replace polling with Server-Sent Events (SSE) or WebSocket push.
// Each user holds an open SSE connection; server pushes new notifications.
// Risk: DB becomes a polling bottleneck; notification count queries become expensive.

// TODO [HIGH][UX]:
// No push notifications (browser Web Push or mobile push). Users must have the
// app open to receive time-sensitive notifications (join approved, game cancelled).
// Fix: Implement Web Push API (Firebase Cloud Messaging). Ask for permission
// on first meaningful action. Send push on: join approved, join rejected,
// game cancelled, waitlist promoted, address revealed.
// Risk: Users miss critical time-sensitive notifications; player no-shows at games.

// TODO [MEDIUM][Backend]:
// take: 30 is hardcoded. Users with many notifications only see 30.
// Fix: Add pagination and a separate "notifications history" page.
// Risk: Older unread notifications are permanently hidden from users.

// TODO [MEDIUM][Backend]:
// PATCH marks ALL notifications as read — there's no way to mark a specific
// notification as read individually, or to dismiss a notification.
// Fix: Accept optional notificationId param. If provided, mark only that one read.
// Risk: Opening the notification dropdown silently marks ALL as read,
// including ones the user hasn't seen yet if they scroll past them.

// TODO [MEDIUM][Backend]:
// No notification grouping. If 10 players join a game in 5 minutes, the host
// gets 10 separate "request to join" notifications — all individually listed.
// Fix: Group by (type, gameId): "5 new join requests for Game X"
// Risk: Notification dropdown overflows; important notifications pushed out.

// TODO [LOW][Trust & Safety]:
// No admin broadcast capability. Cannot send platform-wide announcements
// (e.g., "System maintenance tomorrow 2-4 AM").
// Fix: Add admin endpoint POST /api/admin/notifications/broadcast.
// Risk: No way to communicate platform events to all users at once.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ count: 0, pendingRequests: [], notifications: [] })
  }

  const [pendingRequests, notifications] = await Promise.all([
    prisma.gameRequest.findMany({
      where: { game: { hostId: session.user.id }, status: 'PENDING' },
      include: {
        user: { select: { id: true, name: true, image: true } },
        game: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
  ])

  const unreadNotifs = notifications.filter((n) => !n.read).length
  const count = pendingRequests.length + unreadNotifs

  return NextResponse.json({
    count,
    pendingRequests: pendingRequests.map((r) => ({
      id: r.id,
      gameId: r.game.id,
      gameName: r.game.title,
      message: r.message,
      createdAt: r.createdAt.toISOString(),
      user: r.user,
    })),
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      message: n.message,
      gameId: n.gameId,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
  })
}

export async function PATCH() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ ok: false })

  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  })

  return NextResponse.json({ ok: true })
}

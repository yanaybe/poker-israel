// TODO [CRITICAL][Backend]:
// RACE CONDITION in approval flow: The approve → increment → check full sequence
// is NOT atomic. Between the increment and the full-check, another approval can
// slip through, causing the game to go over capacity.
// Fix: Wrap the entire approval flow in a Prisma transaction:
//   prisma.$transaction([
//     update request status,
//     increment currentPlayers (with optimistic locking),
//     check and update game status
//   ])
// Risk: Games go over maximum player capacity.

// TODO [HIGH][Backend]:
// No validation that requestId belongs to the specified gameId. A malicious host
// could approve requestId from a DIFFERENT game by crafting the URL:
//   PATCH /api/games/gameA/requests/requestFromGameB
// Fix: Add: `where: { id: params.requestId, gameId: params.id }` in findUnique.
// Risk: Cross-game request manipulation.

// TODO [HIGH][UX]:
// No email/push notification when a join request is approved or rejected.
// The current in-app notification is only discovered if the user opens the app.
// Fix: Send email notification via SendGrid/Resend on status change.
// Risk: Players miss approval notification and don't show up to the game.

// TODO [MEDIUM][Backend]:
// When rejecting a previously-approved player, currentPlayers is decremented and
// status reverts to OPEN. But if the game was FULL, it correctly reverts to OPEN.
// However, if multiple rejections happen simultaneously, currentPlayers could
// decrement below 1 (the host).
// Fix: Add `data: { currentPlayers: { decrement: 1 } }` with a floor constraint.
// Risk: currentPlayers becomes 0 or negative, breaking capacity calculations.

// TODO [MEDIUM][Analytics]:
// No tracking of request approval/rejection decisions for marketplace analytics.
// Fix: Log APPROVED/REJECTED events with latency (time from request to decision).
// This data helps optimize the host experience and identify friction points.
// Risk: Cannot measure host response rate — key marketplace health metric.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; requestId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  const game = await prisma.game.findUnique({ where: { id: params.id } })
  if (!game) return NextResponse.json({ error: 'משחק לא נמצא' }, { status: 404 })
  if (game.hostId !== session.user.id) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const { status } = await req.json()
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return NextResponse.json({ error: 'סטטוס לא תקין' }, { status: 400 })
  }

  const request = await prisma.gameRequest.findUnique({
    where: { id: params.requestId },
    select: { userId: true, status: true },
  })
  if (!request) return NextResponse.json({ error: 'בקשה לא נמצאה' }, { status: 404 })

  const prevStatus = request.status

  const updated = await prisma.gameRequest.update({
    where: { id: params.requestId },
    data: { status },
  })

  if (status === 'APPROVED') {
    await prisma.game.update({
      where: { id: params.id },
      data: { currentPlayers: { increment: 1 } },
    })
    const refreshed = await prisma.game.findUnique({ where: { id: params.id } })
    if (refreshed && refreshed.currentPlayers >= refreshed.maxPlayers) {
      await prisma.game.update({ where: { id: params.id }, data: { status: 'FULL' } })
    }
  } else if (status === 'REJECTED' && prevStatus === 'APPROVED') {
    const refreshed = await prisma.game.update({
      where: { id: params.id },
      data: { currentPlayers: { decrement: 1 }, status: 'OPEN' },
    })

    // Promote first person on waitlist to PENDING
    const nextWaiting = await prisma.gameRequest.findFirst({
      where: { gameId: params.id, status: 'WAITLIST' },
      orderBy: { createdAt: 'asc' },
    })
    if (nextWaiting) {
      await prisma.gameRequest.update({
        where: { id: nextWaiting.id },
        data: { status: 'PENDING' },
      })
      await prisma.notification.create({
        data: {
          userId: nextWaiting.userId,
          type: 'WAITLIST_PROMOTED',
          message: `⭐ נפל מקום ב"${game.title}" — הבקשה שלך עברה לממתין לאישור!`,
          gameId: params.id,
        },
      })
    }

    void refreshed
  }

  // Notify the requesting user
  await prisma.notification.create({
    data: {
      userId: request.userId,
      type: status === 'APPROVED' ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED',
      message:
        status === 'APPROVED'
          ? `✅ הבקשתך להצטרף ל"${game.title}" אושרה!`
          : `❌ הבקשתך להצטרף ל"${game.title}" נדחתה`,
      gameId: params.id,
    },
  })

  return NextResponse.json(updated)
}

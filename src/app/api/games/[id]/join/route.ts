// TODO [CRITICAL][Backend]:
// RACE CONDITION: The capacity check and request creation are NOT in a database
// transaction. If two users join simultaneously:
//   User A: reads game (currentPlayers=5, max=6) → not full → creates PENDING request
//   User B: reads game (currentPlayers=5, max=6) → not full → creates PENDING request
// Both get PENDING status. Host approves both. Game goes over capacity.
// Fix: Wrap the capacity check + request creation in a Prisma transaction with
// optimistic locking, or use a SELECT FOR UPDATE on the Game row.
// Risk: Games go over maximum player capacity — physical safety and trust issue.

// TODO [HIGH][Security]:
// No rate limiting on join requests. A user can script rapid join requests to
// multiple games simultaneously, or spam the same game endpoint.
// Fix: Rate limit: max 10 join requests per user per hour.
// Risk: Platform spamming, host notification flood.

// TODO [HIGH][Trust & Safety]:
// No check for user ban/suspension before allowing them to join a game.
// A banned user with a valid JWT can still send join requests.
// Fix: Check user.isBanned before creating the request.
// Risk: Banned/dangerous users can still join games and potentially attend.

// TODO [MEDIUM][Backend]:
// join message content is not validated or sanitized. A user could send
// a 10,000-character message or inject HTML/script content.
// Fix: Validate message: max 500 chars, strip HTML/dangerous content.
// Risk: Oversized messages bloat DB; potential XSS in admin panels.

// TODO [MEDIUM][UX]:
// No waitlist position feedback. When a user joins the waitlist,
// they don't know their position (e.g., "You are #3 of 5 on the waitlist").
// Fix: Return waitlist position in the response (count WAITLIST requests before this one).
// Risk: Users don't know how likely they are to get in — reduces commitment.

// TODO [LOW][Analytics]:
// No tracking of join request events. Cannot analyze join rate, conversion,
// or which games attract the most interest.
// Fix: Log JOIN_REQUESTED event with userId, gameId, status to analytics.
// Risk: No data for marketplace optimization.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  // TODO [HIGH][Trust & Safety]: Check if user is banned here before proceeding.
  // const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isBanned: true } })
  // if (user?.isBanned) return NextResponse.json({ error: 'החשבון הושעה' }, { status: 403 })

  const game = await prisma.game.findUnique({ where: { id: params.id } })
  if (!game) return NextResponse.json({ error: 'משחק לא נמצא' }, { status: 404 })
  if (game.status === 'CANCELLED') return NextResponse.json({ error: 'המשחק בוטל' }, { status: 400 })

  // TODO [MEDIUM][UX]: Also block joining past games (dateTime < now).
  // if (game.dateTime < new Date()) return NextResponse.json({ error: 'המשחק כבר התקיים' }, { status: 400 })

  if (game.hostId === session.user.id) {
    return NextResponse.json({ error: 'אינך יכול לבקש להצטרף למשחק שלך' }, { status: 400 })
  }

  const existing = await prisma.gameRequest.findUnique({
    where: { gameId_userId: { gameId: params.id, userId: session.user.id } },
  })
  if (existing) return NextResponse.json({ error: 'כבר שלחת בקשה למשחק זה' }, { status: 409 })

  const { message } = await req.json().catch(() => ({}))

  // TODO [MEDIUM][Backend]: Validate message length and content here.
  // if (message && message.length > 500) return NextResponse.json({ error: 'הודעה ארוכה מדי' }, { status: 400 })

  // TODO [CRITICAL][Backend]: This capacity check + create is a RACE CONDITION.
  // Wrap in prisma.$transaction() with SELECT FOR UPDATE to prevent overbooking.
  const isFull = game.status === 'FULL' || game.currentPlayers >= game.maxPlayers
  const status = isFull ? 'WAITLIST' : 'PENDING'

  const request = await prisma.gameRequest.create({
    data: {
      gameId: params.id,
      userId: session.user.id,
      message: message ?? null,
      status,
    },
  })

  // TODO [MEDIUM][UX]: Return waitlist position if status === 'WAITLIST'.
  // const waitlistPosition = await prisma.gameRequest.count({
  //   where: { gameId: params.id, status: 'WAITLIST', createdAt: { lt: request.createdAt } }
  // })

  return NextResponse.json(request, { status: 201 })
}

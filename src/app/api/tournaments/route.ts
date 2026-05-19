// TODO [CRITICAL][Security]:
// This file has NO authentication check on POST. Any unauthenticated user on the
// internet can create tournament records by POSTing to /api/tournaments.
// Fix: Add getServerSession() + admin role check before allowing tournament creation.
// Risk: Spam/injected content, database pollution, trust destruction.

// TODO [CRITICAL][Security]:
// POST accepts raw body directly into prisma.create({ data: body }) with zero validation.
// An attacker can inject arbitrary fields, overflow strings, or probe DB structure.
// Fix: Define a strict Zod schema and validate/strip all fields before DB write.
// Risk: Data corruption, unexpected behavior, potential schema-level exploits.

// TODO [HIGH][Backend]:
// GET /api/tournaments has no pagination — returns every tournament ever created.
// Fix: Add cursor-based or offset pagination (?page=1&limit=20).
// Risk: Will time out / OOM at scale (100+ tournaments).

// TODO [HIGH][Backend]:
// GET /api/tournaments has no filtering (by city, date range, buyIn range).
// Fix: Accept query params: ?city=...&upcoming=true&maxBuyIn=...
// Risk: Bad discovery UX — users see irrelevant tournaments from wrong cities.

// TODO [HIGH][Trust & Safety]:
// No admin-only guard on POST. Tournaments should only be created by verified
// admins or through a separate admin dashboard, not a public API endpoint.
// Fix: Implement RBAC (role-based access control) with an ADMIN role on User.
// Risk: Fake tournaments posted publicly, damaging platform credibility.

// TODO [MEDIUM][Backend]:
// No soft-delete or archive mechanism for past tournaments.
// Fix: Add a `status` field (UPCOMING | ONGOING | COMPLETED | CANCELLED) and filter by default.
// Risk: Old tournaments clutter the list indefinitely.

// TODO [MEDIUM][Analytics]:
// No tracking of tournament views, clicks, or interest signals.
// Fix: Log view events to an analytics table or external service (PostHog/Mixpanel).
// Risk: No data to understand which tournaments drive user engagement.

// TODO [LOW][Backend]:
// Tournament model has no relation to User (creator). There's no ownership,
// no way to edit/delete your own tournament, and no audit trail.
// Fix: Add creatorId FK to User, restrict edit/delete to creator or admin.
// Risk: No accountability for tournament data quality.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  // TODO [MEDIUM][Performance]: Add pagination params (page, limit) and date filtering
  // to avoid loading all tournaments into memory.
  const tournaments = await prisma.tournament.findMany({
    orderBy: { date: 'asc' },
  })
  return NextResponse.json(tournaments)
}

export async function POST(req: Request) {
  // TODO [CRITICAL][Security]: Auth check is completely missing below.
  // Add session check and admin role verification before any DB write.
  const session = await getServerSession(authOptions)
  // TODO [CRITICAL][Security]: Replace this placeholder with actual admin role check.
  // Currently any authenticated user could create tournaments once auth is added.
  // Implement: if (!session?.user?.isAdmin) return 403
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })
  }

  try {
    const body = await req.json()
    // TODO [CRITICAL][Security]: Validate body with Zod schema before DB write.
    // Never pass raw request body directly to prisma.create().
    // Define: const validated = tournamentSchema.parse(body)
    const tournament = await prisma.tournament.create({ data: body })
    return NextResponse.json(tournament, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'שגיאה ביצירת הטורניר' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const TournamentSchema = z.object({
  name: z.string().min(2, 'שם הטורניר קצר מדי').max(200),
  location: z.string().min(2).max(200),
  city: z.string().min(1).max(100),
  date: z.string().datetime({ message: 'תאריך לא תקין' }),
  website: z.string().url('כתובת אתר לא תקינה').optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  prizePool: z.string().max(100).optional().nullable(),
  buyIn: z.number().int().min(0).max(1000000).optional().nullable(),
})

export async function GET() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { date: 'asc' },
    where: { date: { gte: new Date() } },
  })
  return NextResponse.json(tournaments)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })
  }

  if (!session.user.isAdmin) {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
  }

  const result = TournamentSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'נתונים לא תקינים', details: result.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const data = result.data

  try {
    const tournament = await prisma.tournament.create({
      data: {
        name: data.name,
        location: data.location,
        city: data.city,
        date: new Date(data.date),
        website: data.website ?? null,
        description: data.description ?? null,
        prizePool: data.prizePool ?? null,
        buyIn: data.buyIn ?? null,
      },
    })
    return NextResponse.json(tournament, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'שגיאה ביצירת הטורניר' }, { status: 500 })
  }
}

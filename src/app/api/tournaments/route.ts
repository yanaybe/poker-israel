import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { date: 'asc' },
  })
  return NextResponse.json(tournaments)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const tournament = await prisma.tournament.create({ data: body })
    return NextResponse.json(tournament, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'שגיאה ביצירת הטורניר' }, { status: 500 })
  }
}

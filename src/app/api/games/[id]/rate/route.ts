import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  const game = await prisma.game.findUnique({ where: { id: params.id } })
  if (!game) return NextResponse.json({ error: 'משחק לא נמצא' }, { status: 404 })
  if (game.hostId === session.user.id) return NextResponse.json({ error: 'לא ניתן לדרג את עצמך' }, { status: 400 })
  if (new Date(game.dateTime) > new Date()) return NextResponse.json({ error: 'המשחק עוד לא התקיים' }, { status: 400 })

  const approved = await prisma.gameRequest.findFirst({
    where: { gameId: params.id, userId: session.user.id, status: 'APPROVED' },
  })
  if (!approved) return NextResponse.json({ error: 'לא ניתן לדרג משחק שלא שיחקת בו' }, { status: 403 })

  const { score } = await req.json()
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return NextResponse.json({ error: 'דירוג חייב להיות בין 1 ל-5' }, { status: 400 })
  }

  const rating = await prisma.gameRating.upsert({
    where: { gameId_raterId: { gameId: params.id, raterId: session.user.id } },
    create: { gameId: params.id, raterId: session.user.id, hostId: game.hostId, score },
    update: { score },
  })

  return NextResponse.json(rating, { status: 201 })
}

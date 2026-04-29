import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: Request, { params }: { params: { id: string; playerId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  const game = await prisma.game.findUnique({ where: { id: params.id } })
  if (!game) return NextResponse.json({ error: 'משחק לא נמצא' }, { status: 404 })
  if (game.hostId !== session.user.id) return NextResponse.json({ error: 'רק המארח יכול לדרג שחקנים' }, { status: 403 })
  if (new Date(game.dateTime) > new Date()) return NextResponse.json({ error: 'המשחק עוד לא התקיים' }, { status: 400 })

  const playerRequest = await prisma.gameRequest.findFirst({
    where: { gameId: params.id, userId: params.playerId, status: 'APPROVED' },
  })
  if (!playerRequest) return NextResponse.json({ error: 'שחקן זה לא השתתף במשחק' }, { status: 400 })

  const { declined, behavior, punctuality, payment, comment } = await req.json()

  if (!declined) {
    const dims = [behavior, punctuality, payment]
    if (dims.some((d) => !Number.isInteger(d) || d < 1 || d > 5)) {
      return NextResponse.json({ error: 'כל קטגוריה חייבת לקבל דירוג 1–5' }, { status: 400 })
    }
  }

  const rating = await prisma.playerRating.upsert({
    where: { gameId_playerId: { gameId: params.id, playerId: params.playerId } },
    create: {
      gameId: params.id,
      raterId: session.user.id,
      playerId: params.playerId,
      declined: declined ?? false,
      behavior: declined ? null : behavior,
      punctuality: declined ? null : punctuality,
      payment: declined ? null : payment,
      comment: comment ?? null,
    },
    update: {
      declined: declined ?? false,
      behavior: declined ? null : behavior,
      punctuality: declined ? null : punctuality,
      payment: declined ? null : payment,
      comment: comment ?? null,
    },
  })

  return NextResponse.json(rating, { status: 201 })
}

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  const game = await prisma.game.findUnique({ where: { id: params.id } })
  if (!game) return NextResponse.json({ error: 'משחק לא נמצא' }, { status: 404 })
  if (game.status === 'CANCELLED') return NextResponse.json({ error: 'המשחק בוטל' }, { status: 400 })
  if (game.hostId === session.user.id) {
    return NextResponse.json({ error: 'אינך יכול לבקש להצטרף למשחק שלך' }, { status: 400 })
  }

  const existing = await prisma.gameRequest.findUnique({
    where: { gameId_userId: { gameId: params.id, userId: session.user.id } },
  })
  if (existing) return NextResponse.json({ error: 'כבר שלחת בקשה למשחק זה' }, { status: 409 })

  const { message } = await req.json().catch(() => ({}))

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

  return NextResponse.json(request, { status: 201 })
}

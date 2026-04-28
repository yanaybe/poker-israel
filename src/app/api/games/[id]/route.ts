import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const game = await prisma.game.findUnique({
    where: { id: params.id },
    include: {
      host: { select: { id: true, name: true, image: true, city: true, skillLevel: true } },
      requests: {
        include: {
          user: { select: { id: true, name: true, image: true, city: true, skillLevel: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!game) return NextResponse.json({ error: 'משחק לא נמצא' }, { status: 404 })
  return NextResponse.json(game)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  const game = await prisma.game.findUnique({ where: { id: params.id } })
  if (!game) return NextResponse.json({ error: 'משחק לא נמצא' }, { status: 404 })
  if (game.hostId !== session.user.id) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const body = await req.json()
  const updated = await prisma.game.update({
    where: { id: params.id },
    data: {
      ...(body.title && { title: body.title }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.status && { status: body.status }),
      ...(body.maxPlayers && { maxPlayers: parseInt(body.maxPlayers) }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  const game = await prisma.game.findUnique({ where: { id: params.id } })
  if (!game) return NextResponse.json({ error: 'משחק לא נמצא' }, { status: 404 })
  if (game.hostId !== session.user.id) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  await prisma.game.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}

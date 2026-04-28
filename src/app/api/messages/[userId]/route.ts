import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  const myId = session.user.id
  const otherId = params.userId

  const [messages, otherUser] = await Promise.all([
    prisma.message.findMany({
      where: {
        OR: [
          { senderId: myId, receiverId: otherId },
          { senderId: otherId, receiverId: myId },
        ],
      },
      include: {
        sender: { select: { id: true, name: true, image: true } },
        receiver: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.user.findUnique({
      where: { id: otherId },
      select: { id: true, name: true, image: true, city: true },
    }),
  ])

  // Mark received messages as read
  await prisma.message.updateMany({
    where: { senderId: otherId, receiverId: myId, read: false },
    data: { read: true },
  })

  return NextResponse.json({ messages, otherUser })
}

export async function POST(req: Request, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'הודעה ריקה' }, { status: 400 })

  const receiver = await prisma.user.findUnique({ where: { id: params.userId } })
  if (!receiver) return NextResponse.json({ error: 'המשתמש לא נמצא' }, { status: 404 })

  const message = await prisma.message.create({
    data: {
      senderId: session.user.id,
      receiverId: params.userId,
      content: content.trim(),
    },
    include: {
      sender: { select: { id: true, name: true, image: true } },
      receiver: { select: { id: true, name: true, image: true } },
    },
  })

  return NextResponse.json(message, { status: 201 })
}

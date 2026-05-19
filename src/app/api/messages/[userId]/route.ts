import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const SendMessageSchema = z.object({
  content: z.string().min(1, 'הודעה ריקה').max(2000, 'הודעה ארוכה מדי').trim(),
})

export async function GET(_req: Request, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  const myId = session.user.id
  const otherId = params.userId

  // Verify the other user exists
  const otherUser = await prisma.user.findUnique({
    where: { id: otherId },
    select: { id: true, name: true, image: true, city: true },
  })
  if (!otherUser) return NextResponse.json({ error: 'המשתמש לא נמצא' }, { status: 404 })

  const messages = await prisma.message.findMany({
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
  })

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

  // Prevent messaging yourself
  if (session.user.id === params.userId) {
    return NextResponse.json({ error: 'לא ניתן לשלוח הודעה לעצמך' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
  }

  const parsed = SendMessageSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'הודעה לא תקינה' },
      { status: 422 }
    )
  }

  const { content } = parsed.data

  const receiver = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, isBanned: true },
  })
  if (!receiver) return NextResponse.json({ error: 'המשתמש לא נמצא' }, { status: 404 })

  const message = await prisma.message.create({
    data: {
      senderId: session.user.id,
      receiverId: params.userId,
      content,
    },
    include: {
      sender: { select: { id: true, name: true, image: true } },
      receiver: { select: { id: true, name: true, image: true } },
    },
  })

  // Create an in-app notification so the receiver is alerted without polling
  const sender = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true },
  })
  if (sender) {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: 'NEW_MESSAGE',
        message: `💬 הודעה חדשה מ-${sender.name}`,
        gameId: null,
      },
    })
  }

  return NextResponse.json(message, { status: 201 })
}

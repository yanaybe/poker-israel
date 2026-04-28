import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Returns all unique conversations for the current user
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  const myId = session.user.id

  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: myId }, { receiverId: myId }],
    },
    include: {
      sender: { select: { id: true, name: true, image: true } },
      receiver: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Build conversation map: otherUserId → latest message + unread count
  const convMap = new Map<string, {
    userId: string
    userName: string
    userImage?: string | null
    lastMessage: string
    lastMessageAt: string
    unreadCount: number
  }>()

  for (const msg of messages) {
    const other = msg.senderId === myId ? msg.receiver : msg.sender
    if (!convMap.has(other.id)) {
      convMap.set(other.id, {
        userId: other.id,
        userName: other.name,
        userImage: other.image,
        lastMessage: msg.content,
        lastMessageAt: msg.createdAt.toISOString(),
        unreadCount: 0,
      })
    }
    // Count unread messages from the other person
    if (msg.receiverId === myId && !msg.read) {
      const conv = convMap.get(other.id)!
      conv.unreadCount++
    }
  }

  return NextResponse.json(Array.from(convMap.values()))
}

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ count: 0 })

  const [pendingRequests, unreadMessages] = await Promise.all([
    // Pending join requests on my games
    prisma.gameRequest.count({
      where: {
        game: { hostId: session.user.id },
        status: 'PENDING',
      },
    }),
    // Unread messages
    prisma.message.count({
      where: {
        receiverId: session.user.id,
        read: false,
      },
    }),
  ])

  const count = pendingRequests + unreadMessages

  return NextResponse.json({
    count,
    pendingRequests,
    unreadMessages,
  })
}

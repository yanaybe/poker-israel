import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

type ConversationRow = {
  partnerId: string
  lastAt: Date
  unreadCount: bigint | number
}

// Returns latest conversation per partner using SQL aggregation.
// Two queries: one GROUP BY aggregation + one batch fetch for partner info + last message.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  const myId = session.user.id

  // Aggregate: for each conversation partner, get the latest timestamp + unread count
  const rows = await prisma.$queryRaw<ConversationRow[]>`
    SELECT
      CASE WHEN "senderId" = ${myId} THEN "receiverId" ELSE "senderId" END AS "partnerId",
      MAX("createdAt") AS "lastAt",
      SUM(CASE WHEN "receiverId" = ${myId} AND "read" = false THEN 1 ELSE 0 END) AS "unreadCount"
    FROM "Message"
    WHERE "senderId" = ${myId} OR "receiverId" = ${myId}
    GROUP BY CASE WHEN "senderId" = ${myId} THEN "receiverId" ELSE "senderId" END
    ORDER BY "lastAt" DESC
  `

  if (rows.length === 0) return NextResponse.json([])

  const partnerIds = rows.map((r) => r.partnerId)

  // Batch-fetch partner user info
  const partners = await prisma.user.findMany({
    where: { id: { in: partnerIds } },
    select: { id: true, name: true, image: true },
  })
  const partnerMap = new Map(partners.map((p) => [p.id, p]))

  // Batch-fetch last message for each conversation
  const lastMessages = await Promise.all(
    partnerIds.map((partnerId) =>
      prisma.message.findFirst({
        where: {
          OR: [
            { senderId: myId, receiverId: partnerId },
            { senderId: partnerId, receiverId: myId },
          ],
        },
        orderBy: { createdAt: 'desc' },
        select: { content: true, createdAt: true },
      })
    )
  )

  const conversations = rows.map((row, i) => {
    const partner = partnerMap.get(row.partnerId)
    const lastMsg = lastMessages[i]
    return {
      userId: row.partnerId,
      userName: partner?.name ?? '',
      userImage: partner?.image ?? null,
      lastMessage: lastMsg?.content ?? '',
      lastMessageAt: lastMsg?.createdAt.toISOString() ?? row.lastAt.toISOString(),
      unreadCount: Number(row.unreadCount),
    }
  })

  return NextResponse.json(conversations)
}

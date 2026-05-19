// TODO [CRITICAL][Performance]:
// GET /api/messages fetches ALL messages ever sent/received by the user and builds
// a conversation map in memory. A user with 1,000 messages (realistic after 6 months)
// has all 1,000 fetched every time they open the messages page.
// Fix: Rewrite using SQL aggregation:
//   SELECT DISTINCT ON (conversation_partner) last_message, unread_count, partner_info
//   GROUP BY conversation pair, ORDER BY latest message DESC
// This reduces the query from O(all_messages) to O(unique_conversations).
// Risk: O(n) memory usage per user; will cause performance degradation at scale.

// TODO [HIGH][Architecture]:
// No real-time messaging. Messages are delivered only when the receiver actively
// polls (every 3 seconds). Compare to WhatsApp/Telegram where messages are instant.
// Fix: Implement WebSocket connection (Socket.io or Pusher/Ably for serverless).
// On message send, push to receiver's open socket. Fall back to polling for clients
// without an active socket connection.
// Risk: 3-second message delay feels broken compared to alternatives users are used to.

// TODO [HIGH][Trust & Safety]:
// No message content moderation. Users can send:
//   - Spam/harassment messages to any user
//   - Phishing links
//   - Personal information of other users (doxxing)
// Fix: Implement word filter for obvious spam/harassment. Add user block/mute.
// Add report-message functionality. Rate-limit: max 30 messages per hour per user.
// Risk: Platform becomes a harassment vector; users uninstall.

// TODO [HIGH][Security]:
// No validation that the receiver exists or is not banned before fetching conversation.
// Fix: Verify receiver exists and is not blocked before returning messages.
// Risk: Requests for non-existent userIds cause unnecessary DB operations.

// TODO [MEDIUM][UX]:
// No read receipt propagation. The sender cannot know if their message was read.
// Fix: Return the `read` status in message objects and update sender's UI in real-time
// (requires WebSocket to push read status updates).
// Risk: Users resend messages thinking they weren't delivered.

// TODO [MEDIUM][Backend]:
// No pagination on conversation list or message thread. A conversation with 10,000
// messages loads all of them on open.
// Fix: Paginate: last 50 messages initially, load older on scroll (infinite scroll up).
// Risk: Chat page freezes or crashes on long conversations.

// TODO [LOW][Security]:
// Message content is stored in plaintext. For a platform where users share home
// addresses, at-rest encryption adds meaningful privacy protection.
// Fix: Encrypt message content with AES-256 using a per-conversation key.
// Risk: DB breach exposes all private messages.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Returns all unique conversations for the current user
// TODO [CRITICAL][Performance]: Rewrite this entire query using SQL aggregation.
// See file-level TODO above.
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

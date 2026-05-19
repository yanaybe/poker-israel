// TODO [HIGH][Mobile]:
// No bottom navigation bar. On mobile, users must reach to the top of the screen
// to navigate away from chat. Primary actions (send, back) are accessible but
// the overall mobile navigation pattern doesn't follow mobile-first conventions.
// Fix: Add a bottom tab bar for primary navigation (Games, Messages, Notifications, Profile).
// Risk: Poor mobile UX; high bounce rate from mobile users.

// TODO [HIGH][UX]:
// No typing indicator. Users don't know if the other person is composing a reply.
// Fix: On textarea focus/change, emit 'typing' event via WebSocket. Display
// "מקליד..." in the chat header for 3 seconds after last keystroke.
// Risk: Users think the other person isn't there and send duplicate messages.

// TODO [HIGH][Trust & Safety]:
// No way to block or report a user from the chat interface.
// Fix: Add "..." menu to chat header with "Block User" and "Report User" options.
// Risk: Harassment continues unchecked within the chat system.

// TODO [MEDIUM][UX]:
// Messages are not paginated. Opening a conversation with 1,000 messages loads all of them.
// Fix: Load last 50 messages initially. On scroll-to-top, load previous 50.
// Use IntersectionObserver on the first message to trigger "load more".
// Risk: Long conversations cause browser to freeze; high memory usage on mobile.

// TODO [MEDIUM][Mobile]:
// Keyboard push behavior on mobile: when the soft keyboard opens, the message
// input is pushed up but the scroll position may not adjust correctly,
// causing the last message to be hidden behind the keyboard.
// Fix: Use `visualViewport` API to detect keyboard height and adjust padding.
// Risk: Users cannot see their own messages while typing on mobile.

// TODO [MEDIUM][UX]:
// No read receipts visible to sender. The `read` field exists in Message model
// but is not shown in the UI (✓ vs ✓✓ pattern like WhatsApp).
// Fix: Show a single checkmark for sent, double checkmark for read.
// Update sender's UI in real-time via WebSocket when receiver opens the message.
// Risk: Users don't know if their message was received/read.

// TODO [LOW][Security]:
// Message content is rendered directly as text (not HTML), which is correct.
// However, if ever switched to dangerouslySetInnerHTML for formatting (bold, links),
// XSS would be introduced. Add explicit note to never use dangerouslySetInnerHTML here.
// Risk: Future developer accidentally introduces XSS.

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Send, ArrowRight } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn, formatTimeAgo } from '@/lib/utils'
import type { MessageWithUsers } from '@/types'

interface OtherUser {
  id: string
  name: string
  image?: string | null
  city?: string | null
}

export default function ChatPage() {
  const { userId: otherUserId } = useParams<{ userId: string }>()
  const { data: session } = useSession()
  const [messages, setMessages] = useState<MessageWithUsers[]>([])
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = useCallback(async () => {
    const res = await fetch(`/api/messages/${otherUserId}`)
    if (res.ok) {
      const data = await res.json()
      setMessages(data.messages)
      setOtherUser(data.otherUser)
    }
    setLoading(false)
  }, [otherUserId])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // TODO [HIGH][Architecture]:
  // Polling every 3 seconds creates a constant stream of HTTP requests and DB queries.
  // At 100 concurrent chat users: 100 req/3s = 2,000 DB queries/minute just for chat.
  // This approach does not scale beyond a few dozen simultaneous conversations.
  //
  // Fix: Replace polling with WebSocket (Socket.io) or Server-Sent Events:
  //   1. On chat open, establish a WebSocket connection to /api/socket
  //   2. Server pushes new messages to the open connection
  //   3. Remove the setInterval polling entirely
  //
  // If WebSocket is too complex initially, use Pusher or Ably (managed WebSocket):
  //   - Pusher free tier: 100 connections, 200k messages/day
  //   - Zero infrastructure overhead
  //
  // Risk: Platform cannot handle more than ~50 concurrent chat users.
  // Battery drain on mobile due to constant polling.

  // Poll for new messages every 3 seconds
  // TODO [HIGH][Performance]: Replace this polling with WebSocket push (see above).
  useEffect(() => {
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  const handleSend = async () => {
    if (!text.trim() || sending) return
    const content = text.trim()
    setText('')
    setSending(true)

    // Optimistic update
    const optimistic: MessageWithUsers = {
      id: `temp-${Date.now()}`,
      content,
      read: false,
      createdAt: new Date().toISOString(),
      senderId: session!.user.id,
      receiverId: otherUserId,
      sender: { id: session!.user.id, name: session!.user.name!, image: session!.user.image },
      receiver: { id: otherUserId, name: otherUser?.name ?? '', image: otherUser?.image },
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      await fetch(`/api/messages/${otherUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      fetchMessages()
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) return <LoadingSpinner text="טוען שיחה..." className="min-h-[60vh]" />

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
      {/* Chat header */}
      <div className="glass-card rounded-2xl p-4 mb-4 border border-felt-700/50 flex items-center gap-4 flex-shrink-0">
        <Link href="/messages" className="p-2 text-poker-muted hover:text-gold-400 rounded-xl hover:bg-felt-800/50 transition-all">
          <ArrowRight className="w-5 h-5" />
        </Link>
        {otherUser && (
          <>
            <Avatar name={otherUser.name} image={otherUser.image} size="md" />
            <div>
              <Link href={`/profile/${otherUser.id}`} className="font-bold text-poker-text hover:text-gold-400 transition-colors">
                {otherUser.name}
              </Link>
              {otherUser.city && <p className="text-xs text-poker-muted">{otherUser.city}</p>}
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-poker-muted text-sm">התחל שיחה עם {otherUser?.name}</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === session?.user?.id
            return (
              <div key={msg.id} className={cn('flex items-end gap-2', isMine ? 'flex-row-reverse' : 'flex-row')}>
                {!isMine && (
                  <Avatar name={msg.sender.name} image={msg.sender.image} size="xs" className="flex-shrink-0 mb-1" />
                )}
                <div className={cn('max-w-[75%] px-4 py-2.5', isMine ? 'message-sent' : 'message-received')}>
                  <p className="text-sm text-poker-text leading-relaxed">{msg.content}</p>
                  <p className="text-[10px] text-poker-subtle mt-1 text-left">
                    {formatTimeAgo(msg.createdAt)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="glass-card rounded-2xl p-3 border border-felt-700/50 flex items-end gap-3 flex-shrink-0">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="כתוב הודעה... (Enter לשליחה)"
          rows={1}
          className="flex-1 bg-transparent text-poker-text placeholder:text-poker-subtle text-sm resize-none focus:outline-none leading-relaxed max-h-32"
          style={{ minHeight: '24px' }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="p-2.5 bg-gold-gradient text-poker-bg rounded-xl disabled:opacity-40 hover:scale-105 transition-all flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

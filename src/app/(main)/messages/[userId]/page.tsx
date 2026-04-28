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

  // Poll for new messages every 3 seconds
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

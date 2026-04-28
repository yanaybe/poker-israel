'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatTimeAgo } from '@/lib/utils'
import { MessageCircle } from 'lucide-react'

interface Conversation {
  userId: string
  userName: string
  userImage?: string | null
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
}

export default function MessagesPage() {
  const { data: session } = useSession()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/messages')
      .then((r) => r.json())
      .then(setConversations)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner text="טוען שיחות..." className="min-h-[60vh]" />

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-black text-poker-text mb-6 flex items-center gap-2">
        <MessageCircle className="w-7 h-7 text-gold-400" />
        הודעות
      </h1>

      {conversations.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 border border-felt-700/50 text-center">
          <div className="text-5xl mb-4">💬</div>
          <h3 className="text-lg font-bold text-poker-text mb-2">אין שיחות עדיין</h3>
          <p className="text-poker-muted text-sm mb-6">
            עבור לדף משחק ולחץ "שלח הודעה למארח" כדי להתחיל שיחה
          </p>
          <Link href="/games" className="text-gold-400 hover:text-gold-300 text-sm font-semibold transition-colors">
            לכל המשחקים →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <Link
              key={conv.userId}
              href={`/messages/${conv.userId}`}
              className="flex items-center gap-4 p-4 glass-card rounded-2xl border border-felt-700/50 hover:border-gold-500/30 transition-all group"
            >
              <div className="relative">
                <Avatar name={conv.userName} image={conv.userImage} size="md" />
                {conv.unreadCount > 0 && (
                  <span className="absolute -top-1 -left-1 w-5 h-5 bg-gold-400 text-poker-bg text-xs font-bold rounded-full flex items-center justify-center">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-poker-text group-hover:text-gold-400 transition-colors">
                    {conv.userName}
                  </span>
                  <span className="text-xs text-poker-subtle flex-shrink-0">
                    {formatTimeAgo(conv.lastMessageAt)}
                  </span>
                </div>
                <p className="text-sm text-poker-muted truncate mt-0.5">
                  {conv.lastMessage}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

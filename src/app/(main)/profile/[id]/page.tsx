'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Pencil, MessageCircle, MapPin, Calendar } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { GameCard } from '@/components/games/GameCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatDateShort, getSkillColor, cn } from '@/lib/utils'
import { SKILL_LABELS, type UserProfile, type GameWithHost } from '@/types'

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [hostedGames, setHostedGames] = useState<GameWithHost[]>([])
  const [loading, setLoading] = useState(true)

  const isOwn = session?.user?.id === id

  useEffect(() => {
    const load = async () => {
      try {
        const [userRes, gamesRes] = await Promise.all([
          fetch(`/api/users/${id}`),
          fetch(`/api/games?hostId=${id}`),
        ])
        if (userRes.ok) setUser(await userRes.json())
        if (gamesRes.ok) setHostedGames(await gamesRes.json())
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) return <LoadingSpinner text="טוען פרופיל..." className="min-h-[60vh]" />

  if (!user) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="text-5xl mb-4">👤</div>
      <h2 className="text-xl font-bold text-poker-text">המשתמש לא נמצא</h2>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Profile header */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 border border-felt-700/50 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <Avatar name={user.name} image={user.image} size="xl" className="ring-4 ring-gold-500/30" />

          <div className="flex-1 text-center sm:text-right">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
              <h1 className="text-2xl sm:text-3xl font-black text-poker-text">{user.name}</h1>
              <span className={cn('text-sm px-3 py-1 rounded-full border inline-block', getSkillColor(user.skillLevel))}>
                {SKILL_LABELS[user.skillLevel]}
              </span>
            </div>

            <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-sm text-poker-muted mb-4">
              {user.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-poker-subtle" />
                  {user.city}
                </span>
              )}
              {user.age && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-poker-subtle" />
                  {user.age} שנים
                </span>
              )}
            </div>

            <div className="flex flex-wrap justify-center sm:justify-start gap-3 mb-4">
              <div className="text-center px-4 py-2 bg-felt-800/50 rounded-xl">
                <p className="text-xl font-bold text-gold-400">{user._count?.gamesHosted ?? 0}</p>
                <p className="text-xs text-poker-subtle">משחקים פורסמו</p>
              </div>
              <div className="text-center px-4 py-2 bg-felt-800/50 rounded-xl">
                <p className="text-xl font-bold text-gold-400">{user._count?.gameRequests ?? 0}</p>
                <p className="text-xs text-poker-subtle">בקשות שנשלחו</p>
              </div>
              <div className="text-center px-4 py-2 bg-felt-800/50 rounded-xl">
                <p className="text-xs text-poker-muted">חבר מאז</p>
                <p className="text-sm font-semibold text-poker-text">{formatDateShort(user.createdAt)}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap justify-center sm:justify-start gap-3">
              {isOwn ? (
                <Link href="/profile/edit">
                  <Button size="sm" variant="outline" className="gap-2">
                    <Pencil className="w-4 h-4" />
                    ערוך פרופיל
                  </Button>
                </Link>
              ) : session && (
                <Link href={`/messages/${user.id}`}>
                  <Button size="sm" className="gap-2">
                    <MessageCircle className="w-4 h-4" />
                    שלח הודעה
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hosted Games */}
      <div>
        <h2 className="text-xl font-bold text-poker-text mb-4">
          {isOwn ? 'המשחקים שלי' : `משחקים של ${user.name}`}
          {hostedGames.length > 0 && (
            <span className="mr-2 text-sm text-poker-muted font-normal">({hostedGames.length})</span>
          )}
        </h2>

        {hostedGames.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 border border-felt-700/50 text-center">
            <div className="text-4xl mb-3">🃏</div>
            <p className="text-poker-muted">
              {isOwn ? 'עדיין לא פרסמת משחקים.' : 'עדיין אין משחקים.'}
            </p>
            {isOwn && (
              <Link href="/create-game" className="mt-4 inline-block">
                <Button size="sm">פרסם משחק ראשון</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {hostedGames.map((game) => (
              <GameCard key={game.id} game={game} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

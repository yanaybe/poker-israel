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
  const [upcomingGames, setUpcomingGames] = useState<GameWithHost[]>([])
  const [pendingGames, setPendingGames] = useState<GameWithHost[]>([])
  const [waitlistGames, setWaitlistGames] = useState<GameWithHost[]>([])
  const [upcomingLoaded, setUpcomingLoaded] = useState(false)
  const [upcomingLoading, setUpcomingLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'hosted' | 'upcoming'>('hosted')
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

  const loadUpcoming = async () => {
    if (upcomingLoaded) return
    setUpcomingLoading(true)
    try {
      const [approvedRes, pendingRes, waitlistRes] = await Promise.all([
        fetch(`/api/games?joinedUserId=${id}&requestStatus=APPROVED`),
        fetch(`/api/games?joinedUserId=${id}&requestStatus=PENDING`),
        fetch(`/api/games?joinedUserId=${id}&requestStatus=WAITLIST`),
      ])
      if (approvedRes.ok) setUpcomingGames(await approvedRes.json())
      if (pendingRes.ok) setPendingGames(await pendingRes.json())
      if (waitlistRes.ok) setWaitlistGames(await waitlistRes.json())
    } finally {
      setUpcomingLoading(false)
      setUpcomingLoaded(true)
    }
  }

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
              {user.hostStats?.avgOverall != null && (
                <div className="text-center px-4 py-2 bg-felt-800/50 rounded-xl">
                  <p className="text-xl font-bold text-gold-400">{user.hostStats.avgOverall}★</p>
                  <p className="text-xs text-poker-subtle">דירוג מארח</p>
                </div>
              )}
              {user.playerStats?.avgOverall != null && (
                <div className="text-center px-4 py-2 bg-felt-800/50 rounded-xl">
                  <p className="text-xl font-bold text-gold-400">{user.playerStats.avgOverall}★</p>
                  <p className="text-xs text-poker-subtle">דירוג שחקן</p>
                </div>
              )}
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

      {/* Suspension warning */}
      {isOwn && user.canHostUntil && new Date(user.canHostUntil) > new Date() && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3">
          <span className="text-xl">🚫</span>
          <div>
            <p className="text-red-400 font-bold text-sm">אינך יכול לפרסם משחקים</p>
            <p className="text-red-400/80 text-xs mt-0.5">
              עקב ביטולים מאוחרים מרובים, הגישה לפרסום משחקים חסומה עד {formatDateShort(user.canHostUntil)}.
            </p>
          </div>
        </div>
      )}

      {/* Rating stats */}
      {(user.hostStats?.totalRatings ?? 0) > 0 && (
        <div className="glass-card rounded-2xl p-5 border border-felt-700/50 mb-4">
          <h3 className="text-sm font-semibold text-poker-muted mb-3">⭐ דירוגים כמארח</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {[
              { label: 'זמנים', val: user.hostStats?.avgPunctuality },
              { label: 'דיוק מיקום', val: user.hostStats?.avgLocationAccuracy },
              { label: 'הגינות', val: user.hostStats?.avgFairDealing },
              { label: 'בטיחות', val: user.hostStats?.avgSafety },
            ].map(({ label, val }) => val != null && (
              <div key={label} className="bg-felt-900/50 rounded-xl py-3 px-2">
                <p className="text-base font-bold text-gold-400">{val}★</p>
                <p className="text-xs text-poker-subtle">{label}</p>
              </div>
            ))}
          </div>
          {user.hostStats?.returnRate != null && (
            <p className="text-xs text-green-400 mt-3 text-center">{user.hostStats.returnRate}% מהשחקנים חזרו</p>
          )}
        </div>
      )}

      {(user.playerStats?.totalRatings ?? 0) > 0 && (
        <div className="glass-card rounded-2xl p-5 border border-felt-700/50 mb-4">
          <h3 className="text-sm font-semibold text-poker-muted mb-3">🃏 דירוגים כשחקן</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'התנהגות', val: user.playerStats?.avgBehavior },
              { label: 'זמנים', val: user.playerStats?.avgPunctuality },
              { label: 'תשלום', val: user.playerStats?.avgPayment },
            ].map(({ label, val }) => val != null && (
              <div key={label} className="bg-felt-900/50 rounded-xl py-3 px-2">
                <p className="text-base font-bold text-gold-400">{val}★</p>
                <p className="text-xs text-poker-subtle">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs — only for own profile */}
      {isOwn && (
        <div className="flex gap-1 mb-4 p-1 bg-felt-900/50 rounded-xl border border-felt-700/50 w-fit">
          <button
            onClick={() => setActiveTab('hosted')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === 'hosted' ? 'bg-gold-500/20 text-gold-400' : 'text-poker-muted hover:text-poker-text'
            )}
          >
            🃏 המשחקים שלי
          </button>
          <button
            onClick={() => { setActiveTab('upcoming'); loadUpcoming() }}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === 'upcoming' ? 'bg-gold-500/20 text-gold-400' : 'text-poker-muted hover:text-poker-text'
            )}
          >
            📅 המשחקים הבאים שלי
          </button>
        </div>
      )}

      {/* Tab content / other profiles */}
      {(!isOwn || activeTab === 'hosted') && (
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
      )}

      {isOwn && activeTab === 'upcoming' && (
        <div className="space-y-8">
          {upcomingLoading ? (
            <div className="glass-card rounded-2xl p-10 border border-felt-700/50 text-center">
              <p className="text-poker-muted text-sm">טוען...</p>
            </div>
          ) : (
            <>
              {/* Approved games */}
              <div>
                <h2 className="text-xl font-bold text-poker-text mb-4 flex items-center gap-2">
                  ✅ משחקים מאושרים
                  {upcomingGames.length > 0 && (
                    <span className="text-sm text-poker-muted font-normal">({upcomingGames.length})</span>
                  )}
                </h2>
                {upcomingGames.length === 0 ? (
                  <div className="glass-card rounded-2xl p-8 border border-felt-700/50 text-center">
                    <p className="text-poker-muted text-sm">עדיין לא אושרת למשחקים.</p>
                    <Link href="/games" className="mt-3 inline-block">
                      <Button size="sm">חפש משחקים</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {upcomingGames.map((game) => (
                      <GameCard key={game.id} game={game} compact />
                    ))}
                  </div>
                )}
              </div>

              {/* Pending requests */}
              <div>
                <h2 className="text-xl font-bold text-poker-text mb-4 flex items-center gap-2">
                  ⏳ ממתינות לאישור
                  {pendingGames.length > 0 && (
                    <span className="text-sm text-poker-muted font-normal">({pendingGames.length})</span>
                  )}
                </h2>
                {pendingGames.length === 0 ? (
                  <div className="glass-card rounded-2xl p-8 border border-felt-700/50 text-center">
                    <p className="text-poker-muted text-sm">אין בקשות ממתינות.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {pendingGames.map((game) => (
                      <div key={game.id} className="relative">
                        <GameCard game={game} compact />
                        <div className="absolute top-3 left-3">
                          <span className="text-xs px-2 py-1 bg-gold-500/20 text-gold-400 border border-gold-500/30 rounded-full font-medium">
                            ⏳ ממתין לאישור
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Waitlist */}
              <div>
                <h2 className="text-xl font-bold text-poker-text mb-4 flex items-center gap-2">
                  🕐 רשימת המתנה
                  {waitlistGames.length > 0 && (
                    <span className="text-sm text-poker-muted font-normal">({waitlistGames.length})</span>
                  )}
                </h2>
                {waitlistGames.length === 0 ? (
                  <div className="glass-card rounded-2xl p-8 border border-felt-700/50 text-center">
                    <p className="text-poker-muted text-sm">אין משחקים ברשימת ההמתנה.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {waitlistGames.map((game) => (
                      <div key={game.id} className="relative">
                        <GameCard game={game} compact />
                        <div className="absolute top-3 left-3">
                          <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full font-medium">
                            🕐 ברשימת המתנה
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { MapPin, Clock, Users, DollarSign, MessageCircle, ArrowRight, Check, X, Pencil } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  formatDate, formatCurrency, getGameTypeIcon, getStatusColor, getSkillColor, cn,
} from '@/lib/utils'
import {
  GAME_TYPE_LABELS, GAME_STATUS_LABELS, SKILL_LABELS, REQUEST_STATUS_LABELS, type GameWithHost,
} from '@/types'

export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const router = useRouter()
  const [game, setGame] = useState<GameWithHost | null>(null)
  const [loading, setLoading] = useState(true)
  const [joinModal, setJoinModal] = useState(false)
  const [joinMessage, setJoinMessage] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  const fetchGame = async () => {
    try {
      const res = await fetch(`/api/games/${id}`)
      if (res.ok) setGame(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchGame() }, [id])

  const myRequest = game?.requests?.find((r) => r.userId === session?.user?.id)
  const isHost = game?.hostId === session?.user?.id
  const isFull = (game?.currentPlayers ?? 0) >= (game?.maxPlayers ?? 1) || game?.status === 'FULL'

  const handleJoinRequest = async () => {
    if (!session) { router.push('/login'); return }
    setJoining(true); setError('')
    try {
      const res = await fetch(`/api/games/${id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: joinMessage }),
      })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? 'שגיאה בשליחת הבקשה')
        return
      }
      setJoinModal(false)
      fetchGame()
    } finally {
      setJoining(false)
    }
  }

  const handleRequestAction = async (requestId: string, action: 'APPROVED' | 'REJECTED') => {
    await fetch(`/api/games/${id}/requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: action }),
    })
    fetchGame()
  }

  if (loading) return <LoadingSpinner text="טוען פרטי משחק..." className="min-h-[60vh]" />

  if (!game) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="text-5xl mb-4">🃏</div>
      <h2 className="text-xl font-bold text-poker-text mb-2">המשחק לא נמצא</h2>
      <Link href="/games"><Button variant="outline" className="mt-4">חזור למשחקים</Button></Link>
    </div>
  )

  const fillPercent = Math.min(100, (game.currentPlayers / game.maxPlayers) * 100)
  const pendingRequests = game.requests?.filter((r) => r.status === 'PENDING') ?? []
  const approvedRequests = game.requests?.filter((r) => r.status === 'APPROVED') ?? []

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <Link href="/games" className="inline-flex items-center gap-1.5 text-sm text-poker-muted hover:text-gold-400 mb-6 transition-colors">
        <ArrowRight className="w-4 h-4" />
        חזור למשחקים
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Game header */}
          <div className="glass-card rounded-2xl p-6 border border-felt-700/50">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{getGameTypeIcon(game.gameType)}</span>
                  <Badge variant="gold">{GAME_TYPE_LABELS[game.gameType]}</Badge>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border', getStatusColor(game.status))}>
                    {GAME_STATUS_LABELS[game.status]}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-poker-text">{game.title}</h1>
              </div>
              {isHost && (
                <Link href={`/games/${game.id}/edit`}>
                  <button className="p-2 text-poker-muted hover:text-gold-400 rounded-xl hover:bg-felt-800/50 transition-all">
                    <Pencil className="w-4 h-4" />
                  </button>
                </Link>
              )}
            </div>

            {/* Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              {[
                { icon: <MapPin className="w-4 h-4" />, label: 'מיקום', value: `${game.location}, ${game.city}` },
                { icon: <Clock className="w-4 h-4" />, label: 'תאריך ושעה', value: formatDate(game.dateTime) },
                { icon: <DollarSign className="w-4 h-4" />, label: 'ביי-אין', value: formatCurrency(game.buyIn) },
                { icon: <span className="text-sm font-bold">BB</span>, label: 'עיוורים', value: game.stakes },
                { icon: <Users className="w-4 h-4" />, label: 'שחקנים', value: `${game.currentPlayers}/${game.maxPlayers}` },
                { icon: <span className="text-sm">%</span>, label: 'עמלה', value: game.houseFee ? formatCurrency(game.houseFee) : 'ללא עמלה' },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3 p-3 bg-felt-900/50 rounded-xl">
                  <span className="text-poker-subtle mt-0.5 flex-shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-xs text-poker-subtle">{item.label}</p>
                    <p className="text-sm font-semibold text-poker-text">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="mt-5">
              <div className="flex justify-between text-xs text-poker-subtle mb-2">
                <span>מקומות תפוסים</span>
                <span>{game.currentPlayers}/{game.maxPlayers}</span>
              </div>
              <div className="h-2 bg-felt-700 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', isFull ? 'bg-red-500' : 'bg-green-500')}
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          {game.notes && (
            <div className="glass-card rounded-2xl p-6 border border-felt-700/50">
              <h3 className="text-sm font-semibold text-poker-muted mb-3">📝 הערות המארח</h3>
              <p className="text-poker-text leading-relaxed whitespace-pre-wrap">{game.notes}</p>
            </div>
          )}

          {/* Host requests panel (visible only to host) */}
          {isHost && game.requests && game.requests.length > 0 && (
            <div className="glass-card rounded-2xl p-6 border border-felt-700/50">
              <h3 className="text-lg font-bold text-poker-text mb-4">
                בקשות הצטרפות
                {pendingRequests.length > 0 && (
                  <span className="mr-2 px-2 py-0.5 bg-gold-500/20 text-gold-400 rounded-full text-sm">
                    {pendingRequests.length} ממתינות
                  </span>
                )}
              </h3>
              <div className="space-y-3">
                {game.requests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between gap-3 p-3 bg-felt-900/50 rounded-xl border border-felt-700/30">
                    <div className="flex items-center gap-3">
                      <Avatar name={req.user.name} image={req.user.image} size="sm" />
                      <div>
                        <p className="text-sm font-semibold text-poker-text">{req.user.name}</p>
                        <p className="text-xs text-poker-muted">{req.user.city} · {SKILL_LABELS[req.user.skillLevel]}</p>
                        {req.message && <p className="text-xs text-poker-subtle mt-1 italic">"{req.message}"</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {req.status === 'PENDING' ? (
                        <>
                          <button
                            onClick={() => handleRequestAction(req.id, 'APPROVED')}
                            className="p-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-all"
                            title="אשר"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRequestAction(req.id, 'REJECTED')}
                            className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-all"
                            title="דחה"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className={cn('text-xs px-2 py-0.5 rounded-full border',
                          req.status === 'APPROVED' ? 'text-green-400 bg-green-500/10 border-green-500/30' : 'text-red-400 bg-red-500/10 border-red-500/30'
                        )}>
                          {REQUEST_STATUS_LABELS[req.status]}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Host card */}
          <div className="glass-card rounded-2xl p-5 border border-felt-700/50">
            <h3 className="text-sm font-semibold text-poker-muted mb-4">המארח</h3>
            <Link href={`/profile/${game.host.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Avatar name={game.host.name} image={game.host.image} size="lg" />
              <div>
                <p className="font-bold text-poker-text">{game.host.name}</p>
                <p className="text-sm text-poker-muted">{game.host.city}</p>
                <span className={cn('text-xs px-2 py-0.5 rounded-full border mt-1 inline-block', getSkillColor(game.host.skillLevel))}>
                  {SKILL_LABELS[game.host.skillLevel]}
                </span>
              </div>
            </Link>
          </div>

          {/* Action buttons */}
          {!isHost && (
            <div className="glass-card rounded-2xl p-5 border border-felt-700/50 space-y-3">
              {myRequest ? (
                <div className="text-center py-3">
                  <span className={cn('inline-block px-4 py-2 rounded-xl text-sm font-semibold border',
                    myRequest.status === 'APPROVED' ? 'text-green-400 bg-green-500/10 border-green-500/30' :
                    myRequest.status === 'REJECTED' ? 'text-red-400 bg-red-500/10 border-red-500/30' :
                    'text-gold-400 bg-gold-500/10 border-gold-500/30'
                  )}>
                    {myRequest.status === 'APPROVED' ? '✅ הבקשה אושרה!' :
                     myRequest.status === 'REJECTED' ? '❌ הבקשה נדחתה' :
                     '⏳ בקשה ממתינה לאישור'}
                  </span>
                </div>
              ) : (
                <Button
                  fullWidth
                  disabled={isFull || !session}
                  onClick={() => session ? setJoinModal(true) : router.push('/login')}
                >
                  {isFull ? 'המשחק מלא' : !session ? 'התחבר כדי להצטרף' : 'בקש להצטרף'}
                </Button>
              )}

              <Button
                variant="outline"
                fullWidth
                onClick={() => session ? router.push(`/messages/${game.host.id}`) : router.push('/login')}
                className="gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                שלח הודעה למארח
              </Button>
            </div>
          )}

          {/* Approved players */}
          {approvedRequests.length > 0 && (
            <div className="glass-card rounded-2xl p-5 border border-felt-700/50">
              <h3 className="text-sm font-semibold text-poker-muted mb-3">שחקנים מאושרים</h3>
              <div className="space-y-2">
                {approvedRequests.map((req) => (
                  <div key={req.id} className="flex items-center gap-2">
                    <Avatar name={req.user.name} image={req.user.image} size="xs" />
                    <span className="text-sm text-poker-text">{req.user.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Join Request Modal */}
      <Modal isOpen={joinModal} onClose={() => setJoinModal(false)} title="בקשת הצטרפות למשחק">
        <div className="space-y-4">
          <p className="text-poker-muted text-sm">שלח הודעה קצרה למארח (אופציונלי)</p>
          <Textarea
            rows={3}
            placeholder="היי! אני שחקן עם ניסיון של... אשמח להצטרף"
            value={joinMessage}
            onChange={(e) => setJoinMessage(e.target.value)}
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setJoinModal(false)}>ביטול</Button>
            <Button fullWidth loading={joining} onClick={handleJoinRequest}>שלח בקשה</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

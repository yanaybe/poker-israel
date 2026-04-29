'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { MapPin, Clock, Users, DollarSign, MessageCircle, ArrowRight, Check, X, Pencil, AlertTriangle, Star } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  formatDate, formatCurrency, formatHouseFee, getGameTypeIcon, getStatusColor, getSkillColor, cn,
} from '@/lib/utils'
import {
  GAME_TYPE_LABELS, GAME_STATUS_LABELS, SKILL_LABELS, REQUEST_STATUS_LABELS, type GameWithHost,
} from '@/types'

const VIBE_LABELS: Record<string, string> = {
  SERIOUS: '🎯 רציני',
  FUN_SOCIAL: '🎉 כיפי/חברתי',
  BEGINNERS_WELCOME: '🌱 מתחילים מוזמנים',
  REGULARS_ONLY: '🔒 רגולרים בלבד',
  QUIET: '🤫 משחק שקט',
}

const PACE_LABELS: Record<string, string> = {
  FAST: '⚡ מהיר',
  NORMAL: '⏱ רגיל',
  SLOW: '🐢 איטי/לייזר',
}

const REBUY_LABELS: Record<string, string> = {
  ALLOWED: '✅ מותרים',
  CAPPED: '🔢 מוגבלים',
  NONE: '❌ אסורים',
}

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1 justify-center">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="text-3xl transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              'w-8 h-8',
              (hover || value) >= n ? 'fill-gold-400 text-gold-400' : 'text-felt-600'
            )}
          />
        </button>
      ))}
    </div>
  )
}

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
  const [cancelModal, setCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [rateModal, setRateModal] = useState(false)
  const [ratingScore, setRatingScore] = useState(0)
  const [ratingSubmitting, setRatingSubmitting] = useState(false)

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
  const myRating = game?.ratings?.find((r) => r.raterId === session?.user?.id)
  const isHost = game?.hostId === session?.user?.id
  const isFull = (game?.currentPlayers ?? 0) >= (game?.maxPlayers ?? 1) || game?.status === 'FULL'
  const isCancelled = game?.status === 'CANCELLED'
  const gameEnded = game ? new Date(game.dateTime) < new Date() : false
  const canRate = !isHost && myRequest?.status === 'APPROVED' && gameEnded && !myRating

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

  const handleCancelGame = async () => {
    setCancelling(true)
    try {
      await fetch(`/api/games/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
      setCancelModal(false)
      fetchGame()
    } finally {
      setCancelling(false)
    }
  }

  const handleRating = async () => {
    if (!ratingScore) return
    setRatingSubmitting(true)
    try {
      await fetch(`/api/games/${id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: ratingScore }),
      })
      setRateModal(false)
      fetchGame()
    } finally {
      setRatingSubmitting(false)
    }
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
  const waitlistRequests = game.requests?.filter((r) => r.status === 'WAITLIST') ?? []
  const hoursUntilGame = (new Date(game.dateTime).getTime() - Date.now()) / 3600000
  const hostStats = game.hostStats

  const vibeTags = game.vibeTags ? game.vibeTags.split(',') : []

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/games" className="inline-flex items-center gap-1.5 text-sm text-poker-muted hover:text-gold-400 mb-6 transition-colors">
        <ArrowRight className="w-4 h-4" />
        חזור למשחקים
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Game header */}
          <div className="glass-card rounded-2xl p-6 border border-felt-700/50">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{getGameTypeIcon(game.gameType)}</span>
                  <Badge variant="gold">{GAME_TYPE_LABELS[game.gameType]}</Badge>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border', getStatusColor(game.status))}>
                    {GAME_STATUS_LABELS[game.status as keyof typeof GAME_STATUS_LABELS] ?? game.status}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-poker-text">{game.title}</h1>
              </div>
              {isHost && !isCancelled && (
                <div className="flex gap-2">
                  <Link href={`/games/${game.id}/edit`}>
                    <button className="p-2 text-poker-muted hover:text-gold-400 rounded-xl hover:bg-felt-800/50 transition-all">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </Link>
                  <button
                    onClick={() => setCancelModal(true)}
                    className="p-2 text-poker-muted hover:text-red-400 rounded-xl hover:bg-red-400/10 transition-all"
                    title="בטל משחק"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              {[
                { icon: <MapPin className="w-4 h-4" />, label: 'מיקום', value: `${game.location}, ${game.city}` },
                { icon: <Clock className="w-4 h-4" />, label: 'תאריך ושעה', value: formatDate(game.dateTime) },
                { icon: <DollarSign className="w-4 h-4" />, label: 'ביי-אין', value: formatCurrency(game.buyIn) },
                { icon: <span className="text-sm font-bold">BB</span>, label: 'בליינדים', value: game.stakes },
                { icon: <Users className="w-4 h-4" />, label: 'שחקנים', value: `${game.currentPlayers}/${game.maxPlayers}` },
                { icon: <span className="text-sm">%</span>, label: 'עמלה', value: formatHouseFee(game.houseFeeType, game.houseFee, game.houseFeePct, game.houseFeeMax) },
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

            {!isCancelled && (
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
                {waitlistRequests.length > 0 && (
                  <p className="text-xs text-poker-subtle mt-1.5">{waitlistRequests.length} ממתינים ברשימת ההמתנה</p>
                )}
              </div>
            )}
          </div>

          {/* Transparency Card */}
          {(game.stackMin || game.gamePace || game.rebuyType || game.vibeTags || game.expectedDuration || game.hasFood || game.hasDrinks) && (
            <div className="glass-card rounded-2xl p-6 border border-felt-700/50">
              <h3 className="text-base font-bold text-poker-text mb-4 flex items-center gap-2">🔍 פרטי המשחק</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(game.stackMin || game.stackMax) && (
                  <div className="flex items-start gap-2 p-3 bg-felt-900/50 rounded-xl">
                    <span className="text-lg">💰</span>
                    <div>
                      <p className="text-xs text-poker-subtle">סטקים</p>
                      <p className="text-sm font-semibold text-poker-text">
                        {game.stackMin ? formatCurrency(game.stackMin) : '—'}
                        {' – '}
                        {game.stackMax ? formatCurrency(game.stackMax) : '—'}
                      </p>
                    </div>
                  </div>
                )}
                {game.rebuyType && (
                  <div className="flex items-start gap-2 p-3 bg-felt-900/50 rounded-xl">
                    <span className="text-lg">🔄</span>
                    <div>
                      <p className="text-xs text-poker-subtle">ריי-בויים</p>
                      <p className="text-sm font-semibold text-poker-text">
                        {REBUY_LABELS[game.rebuyType] ?? game.rebuyType}
                        {game.rebuyType === 'CAPPED' && game.rebuyCap ? ` (מקס ${game.rebuyCap})` : ''}
                      </p>
                    </div>
                  </div>
                )}
                {game.gamePace && (
                  <div className="flex items-start gap-2 p-3 bg-felt-900/50 rounded-xl">
                    <span className="text-lg">⏱</span>
                    <div>
                      <p className="text-xs text-poker-subtle">קצב</p>
                      <p className="text-sm font-semibold text-poker-text">{PACE_LABELS[game.gamePace] ?? game.gamePace}</p>
                    </div>
                  </div>
                )}
                {game.expectedDuration != null && game.expectedDuration > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-felt-900/50 rounded-xl">
                    <span className="text-lg">🕐</span>
                    <div>
                      <p className="text-xs text-poker-subtle">משך משוער</p>
                      <p className="text-sm font-semibold text-poker-text">~{game.expectedDuration} שעות</p>
                    </div>
                  </div>
                )}
                {(game.hasFood || game.hasDrinks) && (
                  <div className="flex items-start gap-2 p-3 bg-felt-900/50 rounded-xl">
                    <span className="text-lg">{game.hasFood && game.hasDrinks ? '🍕🥤' : game.hasFood ? '🍕' : '🥤'}</span>
                    <div>
                      <p className="text-xs text-poker-subtle">כיבוד</p>
                      <p className="text-sm font-semibold text-poker-text">
                        {[game.hasFood && 'אוכל', game.hasDrinks && 'שתייה'].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {vibeTags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {vibeTags.map((tag) => (
                    <span key={tag} className="text-xs px-3 py-1 bg-felt-800/60 border border-felt-700/50 text-poker-muted rounded-full">
                      {VIBE_LABELS[tag] ?? tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {game.notes && (
            <div className="glass-card rounded-2xl p-6 border border-felt-700/50">
              <h3 className="text-sm font-semibold text-poker-muted mb-3">📝 הערות המארח</h3>
              <p className="text-poker-text leading-relaxed whitespace-pre-wrap">{game.notes}</p>
            </div>
          )}

          {/* Host requests panel */}
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
                          <button onClick={() => handleRequestAction(req.id, 'APPROVED')} className="p-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-all" title="אשר">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleRequestAction(req.id, 'REJECTED')} className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-all" title="דחה">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className={cn('text-xs px-2 py-0.5 rounded-full border',
                          req.status === 'APPROVED' ? 'text-green-400 bg-green-500/10 border-green-500/30' :
                          req.status === 'WAITLIST' ? 'text-gold-400 bg-gold-500/10 border-gold-500/30' :
                          'text-red-400 bg-red-500/10 border-red-500/30'
                        )}>
                          {REQUEST_STATUS_LABELS[req.status as keyof typeof REQUEST_STATUS_LABELS] ?? req.status}
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

            {/* Host stats */}
            {hostStats && hostStats.gamesHosted > 0 && (
              <div className="mt-4 pt-4 border-t border-felt-700/30 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-poker-subtle">משחקים</span>
                  <span className="text-poker-text font-semibold">{hostStats.gamesHosted}</span>
                </div>
                {hostStats.lateStrikes > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-poker-subtle">ביטולים מאוחרים</span>
                    <span className="text-red-400 font-semibold">{hostStats.lateStrikes}</span>
                  </div>
                )}
                {hostStats.avgRating != null && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-poker-subtle">דירוג ממוצע</span>
                    <span className="text-gold-400 font-semibold flex items-center gap-0.5">
                      {hostStats.avgRating}★
                      <span className="text-poker-subtle font-normal">({hostStats.totalRatings})</span>
                    </span>
                  </div>
                )}
                {hostStats.returnRate != null && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-poker-subtle">שחקנים שחזרו</span>
                    <span className="text-green-400 font-semibold">{hostStats.returnRate}%</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          {!isHost && !isCancelled && (
            <div className="glass-card rounded-2xl p-5 border border-felt-700/50 space-y-3">
              {myRequest ? (
                <div className="text-center py-2 space-y-2">
                  <span className={cn('inline-block px-4 py-2 rounded-xl text-sm font-semibold border',
                    myRequest.status === 'APPROVED' ? 'text-green-400 bg-green-500/10 border-green-500/30' :
                    myRequest.status === 'REJECTED' ? 'text-red-400 bg-red-500/10 border-red-500/30' :
                    myRequest.status === 'WAITLIST' ? 'text-gold-400 bg-gold-500/10 border-gold-500/30' :
                    'text-gold-400 bg-gold-500/10 border-gold-500/30'
                  )}>
                    {myRequest.status === 'APPROVED' ? '✅ הבקשה אושרה!' :
                     myRequest.status === 'REJECTED' ? '❌ הבקשה נדחתה' :
                     myRequest.status === 'WAITLIST' ? '⏳ אתה ברשימת ההמתנה' :
                     '⏳ בקשה ממתינה לאישור'}
                  </span>
                  {canRate && (
                    <Button size="sm" fullWidth onClick={() => setRateModal(true)} className="gap-2">
                      <Star className="w-4 h-4" />
                      דרג את המארח
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  fullWidth
                  variant={isFull ? 'outline' : 'gold'}
                  disabled={!session}
                  onClick={() => session ? setJoinModal(true) : router.push('/login')}
                >
                  {!session ? 'התחבר כדי להצטרף' : isFull ? 'הצטרף לרשימת ההמתנה' : 'בקש להצטרף'}
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

          {isCancelled && !isHost && (
            <div className="glass-card rounded-2xl p-5 border border-red-500/30 text-center">
              <p className="text-red-400 text-sm font-semibold">המשחק בוטל</p>
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
      <Modal isOpen={joinModal} onClose={() => setJoinModal(false)} title={isFull ? 'הצטרף לרשימת ההמתנה' : 'בקשת הצטרפות למשחק'}>
        <div className="space-y-4">
          {isFull && (
            <div className="p-3 bg-gold-500/10 border border-gold-500/30 rounded-xl text-gold-400 text-sm">
              המשחק מלא. אם יתפנה מקום תקבל התראה ובקשתך תעבור לממתין.
            </div>
          )}
          <p className="text-poker-muted text-sm">שלח הודעה קצרה למארח (אופציונלי)</p>
          <Textarea rows={3} placeholder="היי! אני שחקן עם ניסיון של... אשמח להצטרף" value={joinMessage} onChange={(e) => setJoinMessage(e.target.value)} />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setJoinModal(false)}>ביטול</Button>
            <Button fullWidth loading={joining} onClick={handleJoinRequest}>{isFull ? 'הצטרף לרשימה' : 'שלח בקשה'}</Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Game Modal */}
      <Modal isOpen={cancelModal} onClose={() => setCancelModal(false)} title="ביטול משחק">
        <div className="space-y-4">
          {hoursUntilGame < 3 && (
            <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">
                המשחק מתחיל בפחות מ-3 שעות. ביטול כעת יסב לך <strong>סטרייק</strong>. 3 סטריקים ב-60 יום יחסמו אותך מפרסום משחקים למשך 30 יום.
              </p>
            </div>
          )}
          <p className="text-poker-muted text-sm">כל השחקנים המאושרים יקבלו הודעה על הביטול. פעולה זו אינה הפיכה.</p>
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setCancelModal(false)}>חזור</Button>
            <Button fullWidth loading={cancelling} onClick={handleCancelGame} className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30">
              בטל משחק
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rate Host Modal */}
      <Modal isOpen={rateModal} onClose={() => setRateModal(false)} title="דרג את המארח">
        <div className="space-y-5 text-center">
          <p className="text-poker-muted text-sm">איך היה המשחק? הדירוג שלך עוזר לשחקנים אחרים לבחור.</p>
          <StarRating value={ratingScore} onChange={setRatingScore} />
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setRateModal(false)}>ביטול</Button>
            <Button fullWidth disabled={!ratingScore} loading={ratingSubmitting} onClick={handleRating}>שלח דירוג</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

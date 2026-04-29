'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MessageCircle, X, Plus, MapPin, Calendar, DollarSign } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn, formatCurrency, getSkillColor } from '@/lib/utils'
import { ISRAELI_CITIES, SKILL_LABELS, GAME_TYPE_LABELS, type SkillLevel, type GameType } from '@/types'

interface LfgUser {
  id: string
  name: string
  image?: string | null
  skillLevel: SkillLevel
  city?: string | null
  avgRating: number | null
  totalRatings: number
}

interface LfgPost {
  id: string
  userId: string
  city: string
  availableText: string
  buyIn?: number | null
  gameTypes?: string | null
  notes?: string | null
  expiresAt: string
  createdAt: string
  user: LfgUser
}

const GAME_TYPE_OPTIONS = [
  { value: 'CASH', label: GAME_TYPE_LABELS.CASH },
  { value: 'TOURNAMENT', label: GAME_TYPE_LABELS.TOURNAMENT },
  { value: 'SIT_AND_GO', label: GAME_TYPE_LABELS.SIT_AND_GO },
]

const CITY_OPTIONS = [{ value: '', label: 'כל הערים' }, ...ISRAELI_CITIES.map((c) => ({ value: c, label: c }))]

function daysLeft(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}

function LfgCard({ post, isOwn, onClose, onInvite }: { post: LfgPost; isOwn: boolean; onClose: (id: string) => void; onInvite: (userId: string) => void }) {
  const gameTypes = post.gameTypes ? post.gameTypes.split(',') : []
  const days = daysLeft(post.expiresAt)

  return (
    <div className={cn(
      'glass-card rounded-2xl p-5 border transition-all',
      isOwn ? 'border-gold-500/50' : 'border-felt-700/50'
    )}>
      {isOwn && (
        <div className="flex items-center gap-1.5 text-xs text-gold-400 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
          <span className="font-semibold">הבקשה שלי</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <Link href={`/profile/${post.user.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Avatar name={post.user.name} image={post.user.image} size="md" />
          <div>
            <p className="font-bold text-poker-text">{post.user.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn('text-xs px-2 py-0.5 rounded-full border', getSkillColor(post.user.skillLevel))}>
                {SKILL_LABELS[post.user.skillLevel]}
              </span>
              {post.user.avgRating != null && (
                <span className="text-xs text-gold-400 font-semibold">{post.user.avgRating}★ <span className="text-poker-subtle font-normal">({post.user.totalRatings})</span></span>
              )}
            </div>
          </div>
        </Link>
        {isOwn && (
          <button onClick={() => onClose(post.id)} className="p-1.5 text-poker-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all" title="סגור בקשה">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-poker-muted">
          <MapPin className="w-3.5 h-3.5 text-poker-subtle shrink-0" />
          <span>{post.city}</span>
        </div>
        <div className="flex items-start gap-2 text-sm text-poker-muted">
          <Calendar className="w-3.5 h-3.5 text-poker-subtle shrink-0 mt-0.5" />
          <span>{post.availableText}</span>
        </div>
        {post.buyIn && (
          <div className="flex items-center gap-2 text-sm text-poker-muted">
            <DollarSign className="w-3.5 h-3.5 text-poker-subtle shrink-0" />
            <span>ביי-אין יעד: {formatCurrency(post.buyIn)}</span>
          </div>
        )}
      </div>

      {/* Game type pills */}
      {gameTypes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {gameTypes.map((t) => (
            <span key={t} className="text-xs px-2.5 py-1 bg-felt-800/60 border border-felt-700/50 text-poker-muted rounded-full">
              {GAME_TYPE_LABELS[t as GameType] ?? t}
            </span>
          ))}
        </div>
      )}

      {/* Notes */}
      {post.notes && (
        <p className="text-xs text-poker-muted mb-4 line-clamp-2 leading-relaxed italic">"{post.notes}"</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-poker-subtle">
          {days === 0 ? 'פג תוקף היום' : `תקף עוד ${days} ימים`}
        </span>
        {!isOwn && (
          <Button size="sm" onClick={() => onInvite(post.user.id)} className="gap-1.5 text-xs">
            <MessageCircle className="w-3.5 h-3.5" />
            הזמן למשחק
          </Button>
        )}
      </div>
    </div>
  )
}

export default function LfgPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [posts, setPosts] = useState<LfgPost[]>([])
  const [loading, setLoading] = useState(true)
  const [cityFilter, setCityFilter] = useState('')
  const [createModal, setCreateModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Form state
  const [city, setCity] = useState('')
  const [availableText, setAvailableText] = useState('')
  const [buyIn, setBuyIn] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  const myPost = posts.find((p) => p.userId === session?.user?.id)

  const fetchPosts = useCallback(async () => {
    const url = cityFilter ? `/api/lfg?city=${encodeURIComponent(cityFilter)}` : '/api/lfg'
    const res = await fetch(url)
    if (res.ok) setPosts(await res.json())
    setLoading(false)
  }, [cityFilter])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const openCreate = () => {
    if (!session) { router.push('/login'); return }
    if (myPost) {
      // Pre-fill with existing post
      setCity(myPost.city)
      setAvailableText(myPost.availableText)
      setBuyIn(myPost.buyIn ? String(myPost.buyIn) : '')
      setSelectedTypes(myPost.gameTypes ? myPost.gameTypes.split(',') : [])
      setNotes(myPost.notes ?? '')
    } else {
      setCity('')
      setAvailableText('')
      setBuyIn('')
      setSelectedTypes([])
      setNotes('')
    }
    setFormError('')
    setCreateModal(true)
  }

  const handleSubmit = async () => {
    if (!city || !availableText.trim()) { setFormError('עיר וזמינות הם שדות חובה'); return }
    setSubmitting(true); setFormError('')
    try {
      const res = await fetch('/api/lfg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          availableText,
          buyIn: buyIn || null,
          gameTypes: selectedTypes.length > 0 ? selectedTypes.join(',') : null,
          notes: notes || null,
        }),
      })
      if (!res.ok) { setFormError((await res.json()).error ?? 'שגיאה'); return }
      setCreateModal(false)
      fetchPosts()
    } finally { setSubmitting(false) }
  }

  const handleClose = async (id: string) => {
    await fetch(`/api/lfg/${id}`, { method: 'DELETE' })
    fetchPosts()
  }

  const handleInvite = (userId: string) => {
    if (!session) { router.push('/login'); return }
    router.push(`/messages/${userId}`)
  }

  const toggleType = (t: string) =>
    setSelectedTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])

  const displayedPosts = cityFilter ? posts : posts

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-poker-text mb-1">🔍 מחפשים משחק</h1>
          <p className="text-poker-muted text-sm">שחקנים שמחפשים שולחן — מארחים, הזמינו אותם ישירות.</p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          {myPost ? 'עדכן בקשה' : 'אני מחפש'}
        </Button>
      </div>

      {/* My active post banner */}
      {myPost && (
        <div className="mb-6 p-4 bg-gold-500/10 border border-gold-500/30 rounded-2xl flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gold-400">הבקשה שלך פעילה ✓</p>
            <p className="text-xs text-poker-muted mt-0.5">{myPost.city} · {myPost.availableText} · תקפה עוד {daysLeft(myPost.expiresAt)} ימים</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={openCreate} className="text-xs">ערוך</Button>
            <Button size="sm" variant="outline" onClick={() => handleClose(myPost.id)} className="text-xs text-red-400 border-red-500/30 hover:bg-red-500/10">סגור</Button>
          </div>
        </div>
      )}

      {/* City filter */}
      <div className="mb-6 w-48">
        <Select
          options={CITY_OPTIONS}
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
        />
      </div>

      {/* Board */}
      {loading ? (
        <LoadingSpinner text="טוען..." className="min-h-[30vh]" />
      ) : displayedPosts.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 border border-felt-700/50 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-poker-muted font-semibold mb-1">אין בקשות כרגע</p>
          <p className="text-poker-subtle text-sm mb-6">היה הראשון לפרסם שאתה מחפש משחק.</p>
          <Button onClick={openCreate}>אני מחפש משחק</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedPosts.map((post) => (
            <LfgCard
              key={post.id}
              post={post}
              isOwn={post.userId === session?.user?.id}
              onClose={handleClose}
              onInvite={handleInvite}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title={myPost ? 'עדכן בקשה' : 'אני מחפש משחק'}>
        <div className="space-y-4">
          <p className="text-xs text-poker-muted">הבקשה תוצג למארחים למשך 7 ימים.</p>

          <Select
            label="עיר"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            options={[{ value: '', label: 'בחר עיר...' }, ...ISRAELI_CITIES.map((c) => ({ value: c, label: c }))]}
          />

          <Input
            label="מתי אתה זמין?"
            placeholder="ביום ה׳ בערב, כל יום שישי, סוף שבוע..."
            value={availableText}
            onChange={(e) => setAvailableText(e.target.value)}
          />

          <Input
            label="ביי-אין יעד (אופציונלי)"
            placeholder="500"
            type="number"
            value={buyIn}
            onChange={(e) => setBuyIn(e.target.value)}
          />

          <div>
            <p className="text-xs text-poker-muted mb-2">סוג משחק מועדף</p>
            <div className="flex flex-wrap gap-2">
              {GAME_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleType(opt.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                    selectedTypes.includes(opt.value)
                      ? 'bg-gold-500/20 border-gold-500/50 text-gold-400'
                      : 'bg-felt-900 border-felt-700 text-poker-muted hover:border-felt-600'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            label="הערות (אופציונלי)"
            rows={2}
            placeholder="ניסיון שנתיים בקאש, מעדיף שולחנות קטנים..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {formError && <p className="text-red-400 text-sm text-center">{formError}</p>}

          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setCreateModal(false)}>ביטול</Button>
            <Button fullWidth loading={submitting} onClick={handleSubmit}>
              {myPost ? 'עדכן' : 'פרסם בקשה'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

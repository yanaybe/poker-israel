'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatDateShort, cn } from '@/lib/utils'

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => onChange(n)} className="transition-transform hover:scale-110">
          <Star className={cn('w-7 h-7', (hover || value) >= n ? 'fill-gold-400 text-gold-400' : 'text-felt-600')} />
        </button>
      ))}
    </div>
  )
}

function DimRow({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-poker-muted w-32 text-right shrink-0">{label}</span>
      <StarRating value={value} onChange={onChange} />
    </div>
  )
}

type Task =
  | { type: 'RATE_HOST'; gameId: string; gameTitle: string; gameDate: string; host: { id: string; name: string; image?: string | null } }
  | { type: 'RATE_PLAYER'; gameId: string; gameTitle: string; gameDate: string; player: { id: string; name: string; image?: string | null } }

export default function RatingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const [hostModal, setHostModal] = useState(false)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [hostDims, setHostDims] = useState({ punctuality: 0, locationAccuracy: 0, fairDealing: 0, safety: 0 })
  const [hostDeclined, setHostDeclined] = useState(false)
  const [hostComment, setHostComment] = useState('')
  const [hostSubmitting, setHostSubmitting] = useState(false)

  const [playerModal, setPlayerModal] = useState(false)
  const [playerDims, setPlayerDims] = useState({ behavior: 0, punctuality: 0, payment: 0 })
  const [playerDeclined, setPlayerDeclined] = useState(false)
  const [playerComment, setPlayerComment] = useState('')
  const [playerSubmitting, setPlayerSubmitting] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status !== 'authenticated') return
    fetch('/api/ratings/pending').then((r) => r.json()).then(setTasks).finally(() => setLoading(false))
  }, [status])

  const openHostModal = (task: Task) => {
    setActiveTask(task)
    setHostDims({ punctuality: 0, locationAccuracy: 0, fairDealing: 0, safety: 0 })
    setHostDeclined(false)
    setHostComment('')
    setHostModal(true)
  }

  const openPlayerModal = (task: Task) => {
    setActiveTask(task)
    setPlayerDims({ behavior: 0, punctuality: 0, payment: 0 })
    setPlayerDeclined(false)
    setPlayerComment('')
    setPlayerModal(true)
  }

  const handleRateHost = async () => {
    if (!activeTask) return
    setHostSubmitting(true)
    try {
      const body = hostDeclined
        ? { declined: true }
        : { declined: false, ...hostDims, comment: hostComment || null }
      await fetch(`/api/games/${activeTask.gameId}/rate/host`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      setHostModal(false)
      setTasks((prev) => prev.filter((t) => !(t.type === 'RATE_HOST' && t.gameId === activeTask.gameId)))
    } finally { setHostSubmitting(false) }
  }

  const handleRatePlayer = async () => {
    if (!activeTask || activeTask.type !== 'RATE_PLAYER') return
    setPlayerSubmitting(true)
    try {
      const body = playerDeclined
        ? { declined: true }
        : { declined: false, ...playerDims, comment: playerComment || null }
      await fetch(`/api/games/${activeTask.gameId}/rate/player/${activeTask.player.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      setPlayerModal(false)
      setTasks((prev) => prev.filter((t) => !(t.type === 'RATE_PLAYER' && t.gameId === activeTask.gameId && t.player.id === activeTask.player.id)))
    } finally { setPlayerSubmitting(false) }
  }

  const hostRatingValid = hostDeclined || (hostDims.punctuality > 0 && hostDims.locationAccuracy > 0 && hostDims.fairDealing > 0 && hostDims.safety > 0)
  const playerRatingValid = playerDeclined || (playerDims.behavior > 0 && playerDims.punctuality > 0 && playerDims.payment > 0)

  if (loading || status === 'loading') return <LoadingSpinner text="טוען דירוגים..." className="min-h-[60vh]" />

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-black text-poker-text mb-2">⭐ דירוגים ממתינים</h1>
      <p className="text-poker-muted text-sm mb-8">דרג את השחקנים והמארחים שהיית איתם — עוזר לקהילה לגדול.</p>

      {tasks.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 border border-felt-700/50 text-center">
          <div className="text-5xl mb-4">✅</div>
          <p className="text-poker-muted">אין דירוגים ממתינים — כל הכבוד!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task, i) => {
            const person = task.type === 'RATE_HOST' ? task.host : task.player
            const label = task.type === 'RATE_HOST' ? 'מארח' : 'שחקן'
            return (
              <div key={i} className="glass-card rounded-2xl p-4 border border-felt-700/50 flex items-center gap-4">
                <Avatar name={person.name} image={person.image} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-poker-text">{person.name}</p>
                  <p className="text-xs text-poker-muted truncate">{task.gameTitle}</p>
                  <p className="text-xs text-poker-subtle">{formatDateShort(task.gameDate)} · {label}</p>
                </div>
                <Button size="sm" onClick={() => task.type === 'RATE_HOST' ? openHostModal(task) : openPlayerModal(task)} className="text-xs shrink-0">
                  דרג
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Rate Host Modal */}
      <Modal isOpen={hostModal} onClose={() => setHostModal(false)} title={`דרג מארח: ${activeTask?.type === 'RATE_HOST' ? activeTask.host.name : ''}`}>
        <div className="space-y-4">
          {hostDeclined ? (
            <div className="p-3 bg-felt-900/50 rounded-xl text-center">
              <p className="text-poker-muted text-sm">לא תדורג — הדירוג לא יפורסם.</p>
            </div>
          ) : (
            <div className="divide-y divide-felt-700/30">
              <DimRow label="זמנים" value={hostDims.punctuality} onChange={(n) => setHostDims((d) => ({ ...d, punctuality: n }))} />
              <DimRow label="דיוק מיקום" value={hostDims.locationAccuracy} onChange={(n) => setHostDims((d) => ({ ...d, locationAccuracy: n }))} />
              <DimRow label="הגינות" value={hostDims.fairDealing} onChange={(n) => setHostDims((d) => ({ ...d, fairDealing: n }))} />
              <DimRow label="בטיחות" value={hostDims.safety} onChange={(n) => setHostDims((d) => ({ ...d, safety: n }))} />
            </div>
          )}
          {!hostDeclined && (
            <Textarea rows={2} placeholder="תגובה (אופציונלי)..." value={hostComment} onChange={(e) => setHostComment(e.target.value)} />
          )}
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setHostDeclined(true)} className="text-poker-muted text-xs">לא רוצה לדרג</Button>
            <Button fullWidth disabled={!hostRatingValid} loading={hostSubmitting} onClick={handleRateHost}>
              {hostDeclined ? 'שלח ללא דירוג' : 'שלח דירוג'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rate Player Modal */}
      <Modal isOpen={playerModal} onClose={() => setPlayerModal(false)} title={`דרג שחקן: ${activeTask?.type === 'RATE_PLAYER' ? activeTask.player.name : ''}`}>
        <div className="space-y-4">
          {playerDeclined ? (
            <div className="p-3 bg-felt-900/50 rounded-xl text-center">
              <p className="text-poker-muted text-sm">לא תדורג — הדירוג לא יפורסם.</p>
            </div>
          ) : (
            <div className="divide-y divide-felt-700/30">
              <DimRow label="התנהגות" value={playerDims.behavior} onChange={(n) => setPlayerDims((d) => ({ ...d, behavior: n }))} />
              <DimRow label="זמנים" value={playerDims.punctuality} onChange={(n) => setPlayerDims((d) => ({ ...d, punctuality: n }))} />
              <DimRow label="תשלום" value={playerDims.payment} onChange={(n) => setPlayerDims((d) => ({ ...d, payment: n }))} />
            </div>
          )}
          {!playerDeclined && (
            <Textarea rows={2} placeholder="תגובה (אופציונלי)..." value={playerComment} onChange={(e) => setPlayerComment(e.target.value)} />
          )}
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setPlayerDeclined(true)} className="text-poker-muted text-xs">לא רוצה לדרג</Button>
            <Button fullWidth disabled={!playerRatingValid} loading={playerSubmitting} onClick={handleRatePlayer}>
              {playerDeclined ? 'שלח ללא דירוג' : 'שלח דירוג'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

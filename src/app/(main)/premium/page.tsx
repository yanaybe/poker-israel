'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatDateShort } from '@/lib/utils'

interface SubscriptionStatus {
  isPremium: boolean
  monthlyCount: number
  limit: number
  subscription: { status: string; currentPeriodEnd: string } | null
}

const FEATURES = [
  'משחקים ללא הגבלה (חינם: 3 בחודש)',
  'עדיפות בחיפוש',
  'תווית "מארח פרמיום" ⭐',
  'גישה מוקדמת לשחקנים המחפשים משחק',
  'אנליטיקות מלאות — מילוי, חזרות, דירוג',
]

export default function PremiumPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [cancelDone, setCancelDone] = useState(false)

  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  const fetchStatus = () =>
    fetch('/api/payments/subscription').then((r) => r.json()).then(setSubStatus).finally(() => setLoading(false))

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status !== 'authenticated') return
    fetchStatus()
  }, [status])

  const handleSubscribe = async () => {
    setSubscribing(true)
    try {
      const res = await fetch('/api/payments/subscribe', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally { setSubscribing(false) }
  }

  const handleCancel = async () => {
    if (!confirm('לבטל את המנוי? תישאר פרמיום עד סוף התקופה הנוכחית.')) return
    setCanceling(true)
    try {
      await fetch('/api/payments/portal', { method: 'POST' })
      setCancelDone(true)
      fetchStatus()
    } finally { setCanceling(false) }
  }

  if (loading || status === 'loading') return <LoadingSpinner text="טוען..." className="min-h-[60vh]" />

  const isPremium = subStatus?.isPremium ?? false
  const isCanceled = subStatus?.subscription?.status === 'canceled'

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-2xl text-center">
          <p className="text-green-400 font-semibold">✅ התשלום התקבל! המנוי שלך יופעל תוך דקה.</p>
          <p className="text-xs text-poker-muted mt-1">אם הפרמיום לא מופיע עוד כמה שניות, רענן את הדף.</p>
        </div>
      )}
      {canceled && (
        <div className="mb-6 p-4 bg-felt-800/50 border border-felt-700/50 rounded-2xl text-center">
          <p className="text-poker-muted text-sm">התשלום בוטל — אין חיוב.</p>
        </div>
      )}
      {cancelDone && (
        <div className="mb-6 p-4 bg-felt-800/50 border border-felt-700/50 rounded-2xl text-center">
          <p className="text-poker-muted text-sm">המנוי בוטל. הפרמיום יישאר פעיל עד {subStatus?.subscription?.currentPeriodEnd ? formatDateShort(subStatus.subscription.currentPeriodEnd) : '—'}.</p>
        </div>
      )}

      <div className="text-center mb-10">
        <div className="text-5xl mb-4">⭐</div>
        <h1 className="text-3xl font-black text-poker-text mb-2">מארח פרמיום</h1>
        <p className="text-poker-muted">פרסם יותר, מלא יותר, בנה מוניטין.</p>
      </div>

      <div className={`glass-card rounded-2xl p-8 border mb-6 ${isPremium ? 'border-gold-500/50' : 'border-felt-700/50'}`}>
        {isPremium ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-2xl font-black text-gold-400">פרמיום פעיל ⭐</p>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-sm font-semibold">פעיל</span>
            </div>
            {subStatus?.subscription?.currentPeriodEnd && (
              <p className="text-xs text-poker-muted mb-6">
                {isCanceled ? `פעיל עד ${formatDateShort(subStatus.subscription.currentPeriodEnd)} — לא יתחדש` : `מתחדש ב־${formatDateShort(subStatus.subscription.currentPeriodEnd)} — ₪199`}
              </p>
            )}
            <ul className="space-y-3 mb-8">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-poker-text">
                  <Check className="w-4 h-4 text-green-400 shrink-0" />{f}
                </li>
              ))}
            </ul>
            {!isCanceled && (
              <>
                <Button fullWidth loading={subscribing} onClick={handleSubscribe} className="mb-3">
                  חדש מנוי — ₪199 לחודש נוסף
                </Button>
                <Button variant="outline" fullWidth loading={canceling} onClick={handleCancel} className="text-poker-muted text-sm">
                  בטל חידוש אוטומטי
                </Button>
              </>
            )}
            {isCanceled && (
              <Button fullWidth loading={subscribing} onClick={handleSubscribe}>
                חדש מנוי
              </Button>
            )}
          </>
        ) : (
          <>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-4xl font-black text-poker-text">₪199</span>
              <span className="text-poker-muted mb-1.5">/חודש</span>
            </div>
            <p className="text-xs text-poker-muted mb-6">תשלום חד-פעמי · פרמיום ל-30 יום · ניתן לחדש בכל עת</p>
            {subStatus && (
              <div className="mb-6 p-3 bg-felt-900/50 rounded-xl border border-felt-700/30 flex items-center justify-between text-sm">
                <span className="text-poker-muted">משחקים החודש</span>
                <span className={subStatus.monthlyCount >= subStatus.limit ? 'text-red-400 font-bold' : 'text-poker-text font-semibold'}>
                  {subStatus.monthlyCount}/{subStatus.limit}
                </span>
              </div>
            )}
            <ul className="space-y-3 mb-8">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-poker-text">
                  <Check className="w-4 h-4 text-gold-400 shrink-0" />{f}
                </li>
              ))}
            </ul>
            <Button fullWidth loading={subscribing} onClick={handleSubscribe} className="text-base py-3">
              שדרג לפרמיום — ₪199
            </Button>
          </>
        )}
      </div>

      <div className="glass-card rounded-2xl p-6 border border-felt-700/50 flex items-start gap-4">
        <Zap className="w-8 h-8 text-gold-400 fill-gold-400/30 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-poker-text mb-1">רוצה לקדם משחק ספציפי?</p>
          <p className="text-sm text-poker-muted">פתח את דף המשחק ולחץ על ⚡ כדי לדחוף אותו לראש החיפוש. מ-₪30.</p>
        </div>
      </div>
    </div>
  )
}

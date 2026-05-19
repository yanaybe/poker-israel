'use client'

import { useState } from 'react'
import { Flag } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Button } from './Button'

const REASONS = [
  { value: 'SPAM', label: 'ספאם' },
  { value: 'FAKE_GAME', label: 'משחק מזויף' },
  { value: 'HARASSMENT', label: 'הטרדה' },
  { value: 'INAPPROPRIATE', label: 'תוכן לא הולם' },
  { value: 'SCAM', label: 'הונאה' },
  { value: 'OTHER', label: 'אחר' },
] as const

interface ReportButtonProps {
  targetUserId?: string
  targetGameId?: string
  className?: string
}

export function ReportButton({ targetUserId, targetGameId, className }: ReportButtonProps) {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<string>('')
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  if (!session) return null

  const handleSubmit = async () => {
    if (!reason) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, details: details || null, targetUserId, targetGameId }),
      })
      if (res.ok) {
        setSubmitted(true)
      } else {
        const body = await res.json()
        setError(body.error ?? 'שגיאה בשליחת הדיווח')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 text-xs text-poker-subtle hover:text-red-400 transition-colors ${className ?? ''}`}
        title="דווח"
      >
        <Flag className="w-3.5 h-3.5" />
        <span>דווח</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="glass-card border border-felt-700/50 rounded-2xl p-6 w-full max-w-sm" dir="rtl">
            {submitted ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">✅</div>
                <h3 className="text-lg font-bold text-poker-text mb-1">הדיווח נשלח</h3>
                <p className="text-poker-muted text-sm mb-4">נבדוק ונטפל בהקדם האפשרי</p>
                <Button onClick={() => { setOpen(false); setSubmitted(false); setReason(''); setDetails('') }}>
                  סגור
                </Button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-poker-text mb-4">שלח דיווח</h3>

                {error && (
                  <p className="text-red-400 text-sm mb-3">{error}</p>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-poker-muted mb-1.5">סיבת הדיווח</label>
                    <div className="grid grid-cols-2 gap-2">
                      {REASONS.map((r) => (
                        <button
                          key={r.value}
                          onClick={() => setReason(r.value)}
                          className={`px-3 py-2 rounded-xl text-sm border transition-all ${
                            reason === r.value
                              ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                              : 'border-felt-700/50 text-poker-muted hover:border-felt-600'
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-poker-muted mb-1.5">פרטים נוספים (אופציונלי)</label>
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      maxLength={500}
                      rows={3}
                      className="w-full bg-felt-800/50 border border-felt-700/50 rounded-xl px-3 py-2 text-sm text-poker-text placeholder:text-poker-subtle resize-none focus:outline-none focus:border-gold-500/50"
                      placeholder="תאר את הבעיה בקצרה..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleSubmit}
                      loading={loading}
                      disabled={!reason}
                      className="flex-1"
                    >
                      שלח דיווח
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setOpen(false)}
                      className="flex-1"
                    >
                      ביטול
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

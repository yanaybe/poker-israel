'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import { ISRAELI_CITIES, STAKES_OPTIONS } from '@/types'

const VIBE_OPTIONS = [
  { value: 'SERIOUS', label: '🎯 רציני' },
  { value: 'FUN_SOCIAL', label: '🎉 כיפי/חברתי' },
  { value: 'BEGINNERS_WELCOME', label: '🌱 מתחילים מוזמנים' },
  { value: 'REGULARS_ONLY', label: '🔒 רגולרים בלבד' },
  { value: 'QUIET', label: '🤫 משחק שקט' },
]

const DURATION_OPTIONS = [
  { value: '2', label: '~2 שעות' },
  { value: '3', label: '~3 שעות' },
  { value: '4', label: '~4 שעות' },
  { value: '5', label: '~5 שעות' },
  { value: '6', label: '~6 שעות' },
  { value: '8', label: '8+ שעות' },
  { value: '0', label: 'פתוח / בלי הגבלה' },
]

const schema = z.object({
  title: z.string().min(3, 'כותרת חייבת להכיל לפחות 3 תווים'),
  neighborhood: z.string().min(2, 'נא להזין שכונה/אזור'),
  location: z.string().min(2, 'נא להזין כתובת מדויקת'),
  city: z.string().min(1, 'נא לבחור עיר'),
  dateTime: z.string().min(1, 'נא לבחור תאריך ושעה'),
  buyIn: z.string().min(1, 'נא להזין ביי-אין').refine((v) => parseInt(v) >= 0, 'ביי-אין לא תקין'),
  gameType: z.enum(['CASH', 'TOURNAMENT', 'SIT_AND_GO']),
  stakes: z.string().min(1, 'נא לבחור בליינדים'),
  houseFeeType: z.enum(['NONE', 'ENTRY', 'PER_HAND']).default('NONE'),
  houseFee: z.string().optional(),
  houseFeePct: z.string().optional(),
  houseFeeMax: z.string().optional(),
  maxPlayers: z.string().refine((v) => parseInt(v) >= 2 && parseInt(v) <= 20, 'בין 2 ל-20 שחקנים'),
  existingPlayers: z.string().optional(),
  notes: z.string().optional(),
  // Transparency fields
  stackMin: z.string().optional(),
  stackMax: z.string().optional(),
  rebuyType: z.enum(['ALLOWED', 'CAPPED', 'NONE']).default('ALLOWED'),
  rebuyCap: z.string().optional(),
  gamePace: z.enum(['FAST', 'NORMAL', 'SLOW']).default('NORMAL'),
  expectedDuration: z.string().default('4'),
})

type FormData = z.infer<typeof schema>

export default function CreateGamePage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [showPaywall, setShowPaywall] = useState(false)
  const [vibeTags, setVibeTags] = useState<string[]>([])
  const [hasFood, setHasFood] = useState(false)
  const [hasDrinks, setHasDrinks] = useState(false)

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      gameType: 'CASH', maxPlayers: '9', houseFeeType: 'NONE',
      rebuyType: 'ALLOWED', gamePace: 'NORMAL', expectedDuration: '4',
    },
  })

  const gameType = watch('gameType')
  const feeType = watch('houseFeeType')
  const rebuyType = watch('rebuyType')
  const gamePace = watch('gamePace')

  const toggleVibe = (v: string) =>
    setVibeTags((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])

  const onSubmit = async (data: FormData) => {
    setError('')
    const maxP = parseInt(data.maxPlayers)
    const existing = data.existingPlayers ? parseInt(data.existingPlayers) : 0
    if (existing >= maxP) {
      setError('מספר השחקנים הקיימים חייב להיות פחות ממספר השחקנים המקסימלי')
      return
    }
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          neighborhood: data.neighborhood,
          buyIn: parseInt(data.buyIn),
          maxPlayers: maxP,
          currentPlayers: 1 + existing,
          dateTime: new Date(data.dateTime).toISOString(),
          houseFeeType: data.houseFeeType === 'NONE' ? null : data.houseFeeType,
          houseFee: data.houseFeeType === 'ENTRY' && data.houseFee ? parseInt(data.houseFee) : null,
          houseFeePct: data.houseFeeType === 'PER_HAND' && data.houseFeePct ? parseFloat(data.houseFeePct) : null,
          houseFeeMax: data.houseFeeType === 'PER_HAND' && data.houseFeeMax ? parseInt(data.houseFeeMax) : null,
          vibeTags: vibeTags.length > 0 ? vibeTags.join(',') : null,
          hasFood,
          hasDrinks,
        }),
      })

      if (!res.ok) {
        const body = await res.json()
        if (body.code === 'UPGRADE_REQUIRED') {
          setShowPaywall(true)
          return
        }
        setError(body.error ?? 'שגיאה ביצירת המשחק')
        return
      }

      const game = await res.json()
      router.push(`/games/${game.id}`)
    } catch {
      setError('אירעה שגיאה, נסה שוב')
    }
  }

  const minDate = new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16)

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-poker-text mb-1">🃏 פרסם משחק חדש</h1>
        <p className="text-poker-muted text-sm">מלא את הפרטים ושחקנים יוכלו לבקש להצטרף</p>
      </div>

      <div className="glass-card rounded-2xl p-6 sm:p-8 border border-felt-700/50">
        {error && (
          <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="כותרת המשחק"
            placeholder="קאש גיים ביתי תל אביב"
            {...register('title')}
            error={errors.title?.message}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="שכונה / אזור (גלוי לכולם)"
              placeholder="צפון תל אביב"
              hint="לדוגמה: רמת החייל, פלורנטין, הכרמל"
              {...register('neighborhood')}
              error={errors.neighborhood?.message}
            />
            <Select
              label="עיר"
              placeholder="בחר עיר"
              {...register('city')}
              error={errors.city?.message}
              options={ISRAELI_CITIES.map((c) => ({ value: c, label: c }))}
            />
          </div>
          <Input
            label="כתובת מדויקת (נחשפת למאושרים 2 שעות לפני)"
            placeholder="רחוב האלון 12, קומה 3"
            hint="🔒 לא מוצגת לשחקנים עד שעתיים לפני המשחק"
            {...register('location')}
            error={errors.location?.message}
          />

          <Input
            label="תאריך ושעה"
            type="datetime-local"
            min={minDate}
            {...register('dateTime')}
            error={errors.dateTime?.message}
          />

          <Select
            label="סוג משחק"
            {...register('gameType')}
            error={errors.gameType?.message}
            options={[
              { value: 'CASH', label: '💰 מזומן (Cash Game)' },
              { value: 'TOURNAMENT', label: '🏆 טורניר (Tournament)' },
              { value: 'SIT_AND_GO', label: '⚡ סיט אנד גו (Sit & Go)' },
            ]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={gameType === 'CASH' ? 'מינימום ביי-אין (₪)' : 'ביי-אין (₪)'}
              type="number"
              min="0"
              placeholder="500"
              {...register('buyIn')}
              error={errors.buyIn?.message}
            />
            <Select
              label="בליינדים (Stakes)"
              placeholder="בחר בליינדים"
              {...register('stakes')}
              error={errors.stakes?.message}
              options={STAKES_OPTIONS.map((s) => ({ value: s, label: s }))}
            />
          </div>

          {/* House Fee */}
          <div>
            <label className="block text-sm font-medium text-poker-muted mb-2">עמלה לבית</label>
            <div className="flex gap-2 mb-3">
              {([
                { value: 'NONE', label: 'ללא עמלה' },
                { value: 'ENTRY', label: '🎟 כניסה חד-פעמית' },
                { value: 'PER_HAND', label: '% אחוז מכל יד' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValue('houseFeeType', opt.value)}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all border',
                    feeType === opt.value
                      ? 'bg-gold-500/20 border-gold-500/50 text-gold-400'
                      : 'bg-felt-900 border-felt-700 text-poker-muted hover:border-felt-600'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {feeType === 'ENTRY' && (
              <Input label="סכום כניסה (₪)" type="number" min="1" placeholder="50" {...register('houseFee')} error={errors.houseFee?.message} />
            )}
            {feeType === 'PER_HAND' && (
              <div className="grid grid-cols-2 gap-4">
                <Input label="אחוז מכל יד (%)" type="number" min="0.1" max="100" step="0.1" placeholder="3" {...register('houseFeePct')} error={errors.houseFeePct?.message} />
                <Input label="תקרה (₪) — אופציונלי" type="number" min="1" placeholder="30" {...register('houseFeeMax')} error={errors.houseFeeMax?.message} hint="השאר ריק אם אין תקרה" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="מקסימום שחקנים" type="number" min="2" max="20" placeholder="9" {...register('maxPlayers')} error={errors.maxPlayers?.message} />
            <Input label="כמות שחקנים קיימת" type="number" min="0" max="19" placeholder="0" {...register('existingPlayers')} error={errors.existingPlayers?.message} />
          </div>

          {/* ─── Transparency Card ─── */}
          <div className="border-t border-felt-700/50 pt-5">
            <h2 className="text-base font-bold text-poker-text mb-4 flex items-center gap-2">
              🔍 פרטי השקיפות
              <span className="text-xs font-normal text-poker-muted">עוזרים לשחקנים להחליט אם זה המשחק הנכון עבורם</span>
            </h2>

            {/* Stack sizes */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Input
                label="גודל ערימה מינימלית (₪)"
                type="number"
                min="0"
                placeholder="500"
                {...register('stackMin')}
                error={errors.stackMin?.message}
              />
              <Input
                label="גודל ערימה מקסימלית (₪)"
                type="number"
                min="0"
                placeholder="2000"
                {...register('stackMax')}
                error={errors.stackMax?.message}
              />
            </div>

            {/* Re-buys */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-poker-muted mb-2">ריי-ביים</label>
              <div className="flex gap-2 mb-3">
                {([
                  { value: 'ALLOWED', label: '✅ מותר' },
                  { value: 'CAPPED', label: '🔢 מוגבל' },
                  { value: 'NONE', label: '❌ אסור' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setValue('rebuyType', opt.value)}
                    className={cn(
                      'flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all border',
                      rebuyType === opt.value
                        ? 'bg-gold-500/20 border-gold-500/50 text-gold-400'
                        : 'bg-felt-900 border-felt-700 text-poker-muted hover:border-felt-600'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {rebuyType === 'CAPPED' && (
                <Input label="מספר ריי-ביים מקסימלי" type="number" min="1" placeholder="2" {...register('rebuyCap')} error={errors.rebuyCap?.message} />
              )}
            </div>

            {/* Game pace */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-poker-muted mb-2">קצב משחק</label>
              <div className="flex gap-2">
                {([
                  { value: 'FAST', label: '⚡ מהיר' },
                  { value: 'NORMAL', label: '⏱ רגיל' },
                  { value: 'SLOW', label: '🐢 איטי' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setValue('gamePace', opt.value)}
                    className={cn(
                      'flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all border',
                      gamePace === opt.value
                        ? 'bg-gold-500/20 border-gold-500/50 text-gold-400'
                        : 'bg-felt-900 border-felt-700 text-poker-muted hover:border-felt-600'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Expected duration */}
            <div className="mb-4">
              <Select
                label="משך משוער"
                {...register('expectedDuration')}
                error={errors.expectedDuration?.message}
                options={DURATION_OPTIONS}
              />
            </div>

            {/* Vibe tags */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-poker-muted mb-2">אווירה</label>
              <div className="flex flex-wrap gap-2">
                {VIBE_OPTIONS.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => toggleVibe(v.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                      vibeTags.includes(v.value)
                        ? 'bg-gold-500/20 border-gold-500/50 text-gold-400'
                        : 'bg-felt-900 border-felt-700 text-poker-muted hover:border-felt-600'
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Food & Drinks */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setHasFood(!hasFood)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border',
                  hasFood
                    ? 'bg-gold-500/20 border-gold-500/50 text-gold-400'
                    : 'bg-felt-900 border-felt-700 text-poker-muted hover:border-felt-600'
                )}
              >
                🍕 אוכל
              </button>
              <button
                type="button"
                onClick={() => setHasDrinks(!hasDrinks)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border',
                  hasDrinks
                    ? 'bg-gold-500/20 border-gold-500/50 text-gold-400'
                    : 'bg-felt-900 border-felt-700 text-poker-muted hover:border-felt-600'
                )}
              >
                🥤 שתייה
              </button>
            </div>
          </div>

          <Textarea
            label="הערות (אופציונלי)"
            rows={4}
            placeholder="פרטים נוספים על המשחק, חוקי הבית, חניה..."
            {...register('notes')}
            error={errors.notes?.message}
          />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" fullWidth onClick={() => router.back()}>ביטול</Button>
            <Button type="submit" loading={isSubmitting} fullWidth size="lg">פרסם משחק</Button>
          </div>
        </form>
      </div>

      {/* Paywall modal */}
      <Modal isOpen={showPaywall} onClose={() => setShowPaywall(false)} title="הגעת לגבול החודשי">
        <div className="space-y-4 text-center">
          <div className="text-4xl">⭐</div>
          <p className="text-poker-muted text-sm">ניתן לפרסם עד 3 משחקים בחודש בחינם. שדרג לפרמיום לפרסום ללא הגבלה.</p>
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setShowPaywall(false)}>אולי מאוחר יותר</Button>
            <Link href="/premium" className="flex-1">
              <Button fullWidth>שדרג לפרמיום ₪199/חודש</Button>
            </Link>
          </div>
        </div>
      </Modal>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { ISRAELI_CITIES, STAKES_OPTIONS } from '@/types'

const schema = z.object({
  title: z.string().min(3, 'כותרת חייבת להכיל לפחות 3 תווים'),
  location: z.string().min(2, 'נא להזין מיקום'),
  city: z.string().min(1, 'נא לבחור עיר'),
  dateTime: z.string().min(1, 'נא לבחור תאריך ושעה'),
  buyIn: z.string().min(1, 'נא להזין ביי-אין').refine((v) => parseInt(v) >= 0, 'ביי-אין לא תקין'),
  gameType: z.enum(['CASH', 'TOURNAMENT', 'SIT_AND_GO']),
  stakes: z.string().min(1, 'נא לבחור עיוורים'),
  houseFee: z.string().optional(),
  maxPlayers: z.string().refine((v) => parseInt(v) >= 2 && parseInt(v) <= 20, 'בין 2 ל-20 שחקנים'),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function CreateGamePage() {
  const router = useRouter()
  const [error, setError] = useState('')

  const {
    register, handleSubmit, watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { gameType: 'CASH', maxPlayers: '9' },
  })

  const gameType = watch('gameType')

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          buyIn: parseInt(data.buyIn),
          houseFee: data.houseFee ? parseInt(data.houseFee) : null,
          maxPlayers: parseInt(data.maxPlayers),
          dateTime: new Date(data.dateTime).toISOString(),
        }),
      })

      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? 'שגיאה ביצירת המשחק')
        return
      }

      const game = await res.json()
      router.push(`/games/${game.id}`)
    } catch {
      setError('אירעה שגיאה, נסה שוב')
    }
  }

  // Build the minimum datetime (now + 30 min)
  const minDate = new Date(Date.now() + 30 * 60 * 1000)
    .toISOString()
    .slice(0, 16)

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-poker-text mb-1">
          🃏 פרסם משחק חדש
        </h1>
        <p className="text-poker-muted text-sm">מלא את הפרטים ושחקנים יוכלו לבקש להצטרף</p>
      </div>

      <div className="glass-card rounded-2xl p-6 sm:p-8 border border-felt-700/50">
        {error && (
          <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Title */}
          <Input
            label="כותרת המשחק"
            placeholder="קאש גיים ביתי תל אביב"
            {...register('title')}
            error={errors.title?.message}
          />

          {/* Location + City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="מיקום מדויק"
              placeholder="רחוב האלון 12, קומה 3"
              {...register('location')}
              error={errors.location?.message}
            />
            <Select
              label="עיר"
              placeholder="בחר עיר"
              {...register('city')}
              error={errors.city?.message}
              options={ISRAELI_CITIES.map((c) => ({ value: c, label: c }))}
            />
          </div>

          {/* Date & Time */}
          <Input
            label="תאריך ושעה"
            type="datetime-local"
            min={minDate}
            {...register('dateTime')}
            error={errors.dateTime?.message}
          />

          {/* Game Type */}
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

          {/* Buy-in + Stakes */}
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
              label="עיוורים (Stakes)"
              placeholder="בחר עיוורים"
              {...register('stakes')}
              error={errors.stakes?.message}
              options={STAKES_OPTIONS.map((s) => ({ value: s, label: s }))}
            />
          </div>

          {/* House fee + Max players */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="עמלה לבית (₪) — אופציונלי"
              type="number"
              min="0"
              placeholder="0"
              {...register('houseFee')}
              error={errors.houseFee?.message}
              hint="השאר ריק אם אין עמלה"
            />
            <Input
              label="מקסימום שחקנים"
              type="number"
              min="2"
              max="20"
              placeholder="9"
              {...register('maxPlayers')}
              error={errors.maxPlayers?.message}
            />
          </div>

          {/* Notes */}
          <Textarea
            label="הערות (אופציונלי)"
            rows={4}
            placeholder="פרטים נוספים על המשחק, חוקי הבית, חניה, אוכל..."
            {...register('notes')}
            error={errors.notes?.message}
          />

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => router.back()}
            >
              ביטול
            </Button>
            <Button type="submit" loading={isSubmitting} fullWidth size="lg">
              פרסם משחק
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

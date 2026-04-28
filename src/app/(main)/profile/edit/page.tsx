'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ISRAELI_CITIES } from '@/types'

const schema = z.object({
  name: z.string().min(2, 'שם חייב להכיל לפחות 2 תווים'),
  age: z.string().optional(),
  city: z.string().optional(),
  skillLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'PRO']),
  image: z.string().url('כתובת URL לא תקינה').optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

export default function EditProfilePage() {
  const { data: session, update: updateSession } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const watchedName = watch('name', session?.user?.name ?? '')
  const watchedImage = watch('image', '')

  useEffect(() => {
    if (!session?.user?.id) return
    fetch(`/api/users/${session.user.id}`)
      .then((r) => r.json())
      .then((data) => {
        reset({
          name: data.name ?? '',
          age: data.age?.toString() ?? '',
          city: data.city ?? '',
          skillLevel: data.skillLevel ?? 'BEGINNER',
          image: data.image ?? '',
        })
      })
      .finally(() => setLoading(false))
  }, [session, reset])

  const onSubmit = async (data: FormData) => {
    setError(''); setSuccess(false)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          age: data.age ? parseInt(data.age) : null,
          city: data.city || null,
          skillLevel: data.skillLevel,
          image: data.image || null,
        }),
      })

      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? 'שגיאה בעדכון הפרופיל')
        return
      }

      await updateSession()
      setSuccess(true)
      setTimeout(() => router.push(`/profile/${session?.user?.id}`), 1500)
    } catch {
      setError('אירעה שגיאה, נסה שוב')
    }
  }

  if (loading) return <LoadingSpinner text="טוען פרופיל..." className="min-h-[60vh]" />

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-black text-poker-text mb-8">✏️ עריכת פרופיל</h1>

      <div className="glass-card rounded-2xl p-6 sm:p-8 border border-felt-700/50">
        {/* Avatar preview */}
        <div className="flex justify-center mb-6">
          <Avatar
            name={watchedName || session?.user?.name || 'User'}
            image={watchedImage || session?.user?.image}
            size="xl"
            className="ring-4 ring-gold-500/30"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm text-center">
            ✅ הפרופיל עודכן בהצלחה!
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="שם מלא"
            placeholder="ישראל ישראלי"
            {...register('name')}
            error={errors.name?.message}
          />

          <Input
            label="כתובת תמונה (URL) — אופציונלי"
            type="url"
            placeholder="https://example.com/photo.jpg"
            {...register('image')}
            error={errors.image?.message}
            hint="הדבק URL לתמונה"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="גיל"
              type="number"
              min="18"
              max="100"
              placeholder="25"
              {...register('age')}
              error={errors.age?.message}
            />
            <Select
              label="עיר"
              placeholder="בחר עיר"
              {...register('city')}
              error={errors.city?.message}
              options={ISRAELI_CITIES.map((c) => ({ value: c, label: c }))}
            />
          </div>

          <Select
            label="רמת משחק"
            {...register('skillLevel')}
            error={errors.skillLevel?.message}
            options={[
              { value: 'BEGINNER', label: 'מתחיל' },
              { value: 'INTERMEDIATE', label: 'בינוני' },
              { value: 'PRO', label: 'מקצועי' },
            ]}
          />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" fullWidth onClick={() => router.back()}>
              ביטול
            </Button>
            <Button type="submit" loading={isSubmitting} fullWidth>
              שמור שינויים
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

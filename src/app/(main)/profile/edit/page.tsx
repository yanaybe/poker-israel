'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Camera, X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'
import { ISRAELI_CITIES } from '@/types'

const schema = z.object({
  name: z.string().min(2, 'שם חייב להכיל לפחות 2 תווים'),
  age: z.string().optional(),
  city: z.string().optional(),
  skillLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'PRO']),
})

type FormData = z.infer<typeof schema>

function resizeImage(file: File, maxPx = 256, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = url
  })
}

export default function EditProfilePage() {
  const { data: session, update: updateSession } = useSession()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageProcessing, setImageProcessing] = useState(false)

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const watchedName = watch('name', session?.user?.name ?? '')

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
        })
        if (data.image) setImagePreview(data.image)
      })
      .finally(() => setLoading(false))
  }, [session, reset])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('נא לבחור קובץ תמונה')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('הקובץ גדול מדי (מקסימום 10MB)')
      return
    }
    setError('')
    setImageProcessing(true)
    try {
      const base64 = await resizeImage(file)
      setImagePreview(base64)
    } catch {
      setError('שגיאה בעיבוד התמונה')
    } finally {
      setImageProcessing(false)
      // reset input so same file can be re-selected
      e.target.value = ''
    }
  }

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
          image: imagePreview ?? null,
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
        {/* Avatar upload area */}
        <div className="flex flex-col items-center mb-6 gap-3">
          <div className="relative group">
            <Avatar
              name={watchedName || session?.user?.name || 'User'}
              image={imagePreview ?? undefined}
              size="xl"
              className="ring-4 ring-gold-500/30"
            />
            {/* Overlay on hover */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={imageProcessing}
              className={cn(
                'absolute inset-0 rounded-full flex items-center justify-center',
                'bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity',
                imageProcessing && 'opacity-100 cursor-wait'
              )}
            >
              {imageProcessing
                ? <div className="w-6 h-6 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                : <Camera className="w-7 h-7 text-white" />
              }
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={imageProcessing}
              className="text-xs px-3 py-1.5 rounded-lg border border-felt-600 text-poker-muted hover:border-gold-500 hover:text-gold-400 transition-all"
            >
              {imagePreview ? 'החלף תמונה' : 'העלה תמונה'}
            </button>
            {imagePreview && (
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="text-xs px-3 py-1.5 rounded-lg border border-felt-600 text-poker-muted hover:border-red-500 hover:text-red-400 transition-all flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                הסר
              </button>
            )}
          </div>
          <p className="text-xs text-poker-subtle">JPG, PNG, WEBP עד 10MB</p>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

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

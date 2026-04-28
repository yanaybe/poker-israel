'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { ISRAELI_CITIES } from '@/types'

const schema = z.object({
  name: z.string().min(2, 'שם חייב להכיל לפחות 2 תווים'),
  email: z.string().email('אימייל לא תקין'),
  password: z.string().min(6, 'סיסמה חייבת להכיל לפחות 6 תווים'),
  confirmPassword: z.string(),
  age: z.string().optional(),
  city: z.string().optional(),
  skillLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'PRO']).default('BEGINNER'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'הסיסמאות אינן תואמות',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { skillLevel: 'BEGINNER' },
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          age: data.age ? parseInt(data.age) : undefined,
          city: data.city,
          skillLevel: data.skillLevel,
        }),
      })

      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? 'שגיאה בהרשמה')
        return
      }

      // Auto-login after register
      await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      router.push('/games')
      router.refresh()
    } catch {
      setError('אירעה שגיאה, נסה שוב')
    }
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Logo */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-block">
          <span className="text-5xl">♠</span>
          <h1 className="text-3xl font-black gold-shimmer mt-2">פוקר ישראל</h1>
        </Link>
        <p className="text-poker-muted mt-2 text-sm">הצטרף לקהילת הפוקר הגדולה בישראל</p>
      </div>

      <div className="glass-card rounded-2xl p-6 sm:p-8 border border-felt-700/50">
        <h2 className="text-xl font-bold text-poker-text mb-6 text-center">יצירת חשבון חדש</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="שם מלא"
            placeholder="ישראל ישראלי"
            {...register('name')}
            error={errors.name?.message}
            autoComplete="name"
          />

          <Input
            label="אימייל"
            type="email"
            placeholder="your@email.com"
            {...register('email')}
            error={errors.email?.message}
            autoComplete="email"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="גיל (אופציונלי)"
              type="number"
              placeholder="25"
              min="18"
              max="100"
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
              { value: 'BEGINNER', label: 'מתחיל — משחק לראשונה / הנאה' },
              { value: 'INTERMEDIATE', label: 'בינוני — מכיר את הכללים, ניסיון מסוים' },
              { value: 'PRO', label: 'מקצועי — משחק ברמה גבוהה' },
            ]}
          />

          <Input
            label="סיסמה"
            type="password"
            placeholder="לפחות 6 תווים"
            {...register('password')}
            error={errors.password?.message}
            autoComplete="new-password"
          />

          <Input
            label="אימות סיסמה"
            type="password"
            placeholder="חזור על הסיסמה"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
            autoComplete="new-password"
          />

          <Button type="submit" loading={isSubmitting} fullWidth size="lg" className="mt-2">
            הירשם וצטרף לשולחן
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-felt-700/50 text-center">
          <p className="text-sm text-poker-muted">
            כבר יש לך חשבון?{' '}
            <Link href="/login" className="text-gold-400 hover:text-gold-300 font-semibold transition-colors">
              התחבר כאן
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

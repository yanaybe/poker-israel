'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const schema = z.object({
  password: z
    .string()
    .min(8, 'הסיסמה חייבת להכיל לפחות 8 תווים')
    .regex(/[A-Z]/, 'הסיסמה חייבת להכיל לפחות אות גדולה אחת')
    .regex(/[0-9]/, 'הסיסמה חייבת להכיל לפחות ספרה אחת'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'הסיסמאות אינן תואמות',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  if (!token) {
    return (
      <div className="text-center py-4">
        <p className="text-red-400">קישור לא תקין. בקש קישור חדש מדף שכחתי סיסמה.</p>
        <Link href="/forgot-password" className="text-gold-400 hover:text-gold-300 text-sm font-semibold mt-4 inline-block">
          בקש קישור חדש
        </Link>
      </div>
    )
  }

  const onSubmit = async (data: FormData) => {
    setError('')
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: data.password }),
    })

    if (res.ok) {
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2500)
    } else {
      const body = await res.json()
      setError(body.error ?? 'אירעה שגיאה, נסה שוב')
    }
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-poker-text mb-2">הסיסמה שונתה!</h2>
        <p className="text-poker-muted text-sm">מעביר אותך לדף הכניסה...</p>
      </div>
    )
  }

  return (
    <>
      <h2 className="text-xl font-bold text-poker-text mb-6 text-center">הגדר סיסמה חדשה</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="סיסמה חדשה"
          type="password"
          placeholder="לפחות 8 תווים, אות גדולה וספרה"
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
        <Button type="submit" loading={isSubmitting} fullWidth size="lg">
          שמור סיסמה חדשה
        </Button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <Link href="/" className="inline-block">
          <span className="text-5xl">♠</span>
          <h1 className="text-3xl font-black gold-shimmer mt-2">פוקר ישראל</h1>
        </Link>
      </div>
      <div className="glass-card rounded-2xl p-6 sm:p-8 border border-felt-700/50">
        <Suspense fallback={<div className="text-center text-poker-muted">טוען...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}

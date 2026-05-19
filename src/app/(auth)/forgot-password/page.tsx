'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const schema = z.object({
  email: z.string().email('אימייל לא תקין'),
})

type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setSubmitted(true)
    } else {
      setError('אירעה שגיאה, נסה שוב')
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <Link href="/" className="inline-block">
          <span className="text-5xl">♠</span>
          <h1 className="text-3xl font-black gold-shimmer mt-2">פוקר ישראל</h1>
        </Link>
      </div>

      <div className="glass-card rounded-2xl p-6 sm:p-8 border border-felt-700/50">
        {submitted ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-4">📧</div>
            <h2 className="text-xl font-bold text-poker-text mb-3">בדוק את האימייל שלך</h2>
            <p className="text-poker-muted text-sm mb-6">
              אם כתובת האימייל רשומה, שלחנו קישור לאיפוס הסיסמה. הקישור בתוקף ל-60 דקות.
            </p>
            <Link href="/login" className="text-gold-400 hover:text-gold-300 text-sm font-semibold">
              חזור לכניסה
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-poker-text mb-2 text-center">שכחת סיסמה?</h2>
            <p className="text-sm text-poker-muted text-center mb-6">
              הזן את האימייל שלך ונשלח לך קישור לאיפוס הסיסמה
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="אימייל"
                type="email"
                placeholder="your@email.com"
                {...register('email')}
                error={errors.email?.message}
                autoComplete="email"
              />
              <Button type="submit" loading={isSubmitting} fullWidth size="lg">
                שלח קישור לאיפוס
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/login" className="text-sm text-gold-400 hover:text-gold-300 font-semibold">
                חזור לכניסה
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

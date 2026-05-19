// TODO [HIGH][Security]:
// No CAPTCHA or bot detection on the login form. Bots can script login attempts.
// Fix: Add hCaptcha or Cloudflare Turnstile (both have free tiers).
// Only show CAPTCHA after N failed attempts to minimize friction for real users.
// Risk: Automated brute-force attacks on user accounts.

// TODO [HIGH][Security]:
// No "forgot password" link on this page. Users who forget their password have
// no recovery path and must contact support (which doesn't exist yet).
// Fix: Add forgot password flow: email → time-limited reset link → new password form.
// Requires email service integration (Resend/SendGrid).
// Risk: Users are permanently locked out if they forget their password.

// TODO [MEDIUM][UX]:
// No "remember me" option. JWT expires (once maxAge is configured) and users
// must re-login on every device after expiry with no option for longer sessions.
// Fix: Add a "remember me" checkbox that extends JWT maxAge to 30 days.
// Risk: Users find repeated logins frustrating, especially on mobile.

// TODO [MEDIUM][UX]:
// callbackUrl from searchParams is used without validation:
// `router.push(searchParams.get('callbackUrl') ?? '/games')`
// An open redirect: ?callbackUrl=https://evil.com could redirect users after login.
// Fix: Validate callbackUrl starts with '/' (relative path only).
// Risk: Open redirect vulnerability — phishing attack vector.

// TODO [LOW][Analytics]:
// No login event tracking. Cannot measure daily active users, login frequency,
// or detect unusual login patterns.
// Fix: Log LOGIN_SUCCESS and LOGIN_FAILURE events to analytics on form submit.
// Risk: No data on user engagement or security anomalies.

'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const schema = z.object({
  email: z.string().email('אימייל לא תקין'),
  password: z.string().min(1, 'נא להזין סיסמה'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    })

    if (result?.error) {
      setError('אימייל או סיסמה שגויים')
      return
    }

    router.push(searchParams.get('callbackUrl') ?? '/games')
    router.refresh()
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Logo */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-block">
          <span className="text-5xl">♠</span>
          <h1 className="text-3xl font-black gold-shimmer mt-2">פוקר ישראל</h1>
        </Link>
        <p className="text-poker-muted mt-2 text-sm">ברוך השב לשולחן</p>
      </div>

      {/* Card */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 border border-felt-700/50">
        <h2 className="text-xl font-bold text-poker-text mb-6 text-center">התחבר לחשבון</h2>

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
          <Input
            label="סיסמה"
            type="password"
            placeholder="••••••••"
            {...register('password')}
            error={errors.password?.message}
            autoComplete="current-password"
          />

          <Button type="submit" loading={isSubmitting} fullWidth size="lg" className="mt-2">
            כניסה
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-felt-700/50 text-center">
          <p className="text-sm text-poker-muted">
            אין לך חשבון?{' '}
            <Link href="/register" className="text-gold-400 hover:text-gold-300 font-semibold transition-colors">
              הירשם כאן
            </Link>
          </p>
        </div>

        {/* TODO [CRITICAL][Security]:
            Demo credentials (david@example.com / password123) are hardcoded and
            VISIBLE in the production login page. This is the single most trust-destroying
            element on the platform — any knowledgeable user who sees this immediately
            knows the platform is not production-ready.
            Fix: Remove this entire block before any public launch.
            Also: Change the demo account passwords and remove them from seed data,
            or gate the demo UI behind a DEMO_MODE environment variable.
            Risk: Permanent trust damage; demo credentials used by malicious actors
            to create fake games under the demo account. */}
        <div className="mt-4 p-3 bg-felt-800/50 rounded-xl border border-felt-700/30">
          <p className="text-xs text-poker-subtle text-center">
            Demo: david@example.com / password123
          </p>
        </div>
      </div>
    </div>
  )
}

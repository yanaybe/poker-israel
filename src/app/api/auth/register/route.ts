// TODO [CRITICAL][Security]:
// No rate limiting on registration. An attacker can create millions of fake
// accounts by scripting POST requests to this endpoint.
// Fix: Apply rate limiting middleware: max 5 registrations per IP per hour.
// Risk: Bot-generated fake accounts pollute the marketplace, spam other users.

// TODO [HIGH][Security]:
// No email verification flow after registration. Users can sign up with any
// email address, including emails they don't own, rendering the email field useless
// for contact, password reset, or identity verification.
// Fix: After creating user, send a verification email via Resend/SendGrid with a
// time-limited token. Mark emailVerified=null until verified. Block game creation
// until email is verified.
// Risk: Fake accounts, no password recovery, no trust signal.

// TODO [HIGH][Security]:
// Password minimum length is 6 characters (enforced only by frontend Zod schema).
// The backend does not re-validate password strength.
// Fix: Add backend validation: min 8 chars, at least 1 uppercase, 1 number, 1 symbol.
// Risk: Weak passwords are trivially brute-forced.

// TODO [HIGH][Security]:
// No input validation on the backend. The frontend Zod schema validates, but
// a direct API call (curl/Postman) bypasses all frontend validation.
// Fix: Add Zod validation here: const validated = registerSchema.parse(await req.json())
// Risk: Invalid data types (name as number, age as string) can corrupt the DB.

// TODO [HIGH][Legal]:
// No age verification. The `age` field is optional and client-provided — a minor
// can register by providing no age or any age. Israeli law and App Store guidelines
// require age gates for gambling-adjacent apps.
// Fix: Make age required (min 18). Add server-side validation. Eventually add
// ID verification (Jumio, Onfido) for high-value game hosts.
// Risk: Minors accessing cash game coordination — legal liability.

// TODO [MEDIUM][Legal]:
// No acceptance of Terms of Service or Privacy Policy tracked on registration.
// Fix: Add `termsAcceptedAt DateTime?` to User model. Require checkbox in form.
// Store timestamp when user accepted current ToS version.
// Risk: Cannot prove user consent to ToS — legal exposure.

// TODO [MEDIUM][Security]:
// No CAPTCHA or bot detection on registration.
// Fix: Integrate hCaptcha or Cloudflare Turnstile (both have free tiers).
// Risk: Automated account creation bypasses rate limits.

// TODO [LOW][Security]:
// bcrypt work factor is 10. In 2025, 12 is the recommended minimum for new apps.
// Higher work factor slows down brute-force attacks significantly.
// Fix: Change bcrypt.hash(password, 12)
// Risk: Slightly faster brute-force if DB is breached.

import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  // TODO [CRITICAL][Security]: Add rate limiting check before processing.
  // Example: await ratelimit.limit(req.headers.get('x-forwarded-for') ?? 'unknown')

  try {
    const { name, email, password, age, city, skillLevel } = await req.json()
    // TODO [HIGH][Security]: Validate all fields with Zod schema here (backend-side).
    // Do not trust frontend validation alone. Direct API callers bypass it.
    // const validated = registerSchema.parse({ name, email, password, age, city, skillLevel })

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'חסרים שדות חובה' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'כתובת האימייל כבר רשומה במערכת' }, { status: 409 })
    }

    // TODO [LOW][Security]: Increase bcrypt work factor to 12 for stronger hashing.
    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        age: age ?? null,
        city: city ?? null,
        skillLevel: skillLevel ?? 'BEGINNER',
      },
    })

    return NextResponse.json({ id: user.id, name: user.name, email: user.email }, { status: 201 })
  } catch (error) {
    // TODO [HIGH][DevOps]: Replace console.error with structured logger (pino/winston).
    // console.error leaks stack traces to server logs which may be scraped.
    // Use: logger.error({ err: error, route: 'register' }, 'Registration failed')
    console.error('Register error:', error)
    return NextResponse.json({ error: 'שגיאה פנימית' }, { status: 500 })
  }
}

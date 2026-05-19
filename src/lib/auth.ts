// TODO [HIGH][Security]:
// No account lockout after N failed login attempts. An attacker can brute-force
// passwords at ~250,000 attempts/day with no friction.
// Fix: Implement Redis-backed rate limiting (e.g., upstash/ratelimit) keyed by
// email + IP. Lock after 5 failed attempts for 15 minutes.
// Risk: Any bcrypt hash (even a weak password) can be cracked via brute force.

// TODO [HIGH][Security]:
// JWT session has no expiry configured. `session: { strategy: 'jwt' }` without
// `maxAge` creates tokens that never expire.
// Fix: Add `session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 }` (7 days).
// Risk: Stolen session cookies remain valid forever — permanent account takeover.

// TODO [HIGH][Security]:
// No token revocation / invalidation mechanism. If a user changes their password
// or is banned, their existing JWTs remain valid until natural expiry.
// Fix: Add a `tokenVersion` field to User. Increment on password change or ban.
// Include tokenVersion in JWT payload and validate against DB on each request.
// Risk: Banned users and compromised accounts can continue using the platform.

// TODO [HIGH][Security]:
// No email verification on signup. Users can register with any email, including
// emails they don't own. No password reset is possible without email verification.
// Fix: After registration, send a verification email (Resend/SendGrid).
// Require email verification before allowing game creation.
// Risk: Fake accounts, no contact channel, no password recovery.

// TODO [HIGH][Security]:
// NEXTAUTH_SECRET is not validated on startup. If missing/weak in production,
// all JWTs are insecure. The .env.example has a placeholder value.
// Fix: Add startup validation: if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) throw
// Risk: Weak or missing secret allows JWT forgery.

// TODO [MEDIUM][Security]:
// No 2FA / MFA support. For a platform facilitating real-money meetups, MFA is
// a meaningful trust signal and security layer.
// Fix: Add TOTP (Google Authenticator) via next-auth or a separate implementation.
// Risk: Accounts protected only by email+password — single factor.

// TODO [MEDIUM][Security]:
// No OAuth providers (Google, Facebook). Israeli users commonly sign in via Google.
// Fix: Add NextAuth Google provider. Reduces password management burden.
// Risk: Higher registration friction, lower conversion rate.

// TODO [MEDIUM][Backend]:
// Session callback does not re-fetch user data from DB. If a user's name/image
// changes, the session still shows stale data until they log out and back in.
// Fix: In the session callback, optionally re-fetch fresh user data from DB.
// Risk: Stale display names / avatars across sessions.

// TODO [LOW][Security]:
// No audit log for auth events (login, logout, failed attempts, password changes).
// Fix: Create an AuthEvent table and log all auth activity with IP + user agent.
// Risk: No forensic trail for security incidents.

import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './db'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'אימייל', type: 'email' },
        password: { label: 'סיסמה', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('נא להזין אימייל וסיסמה')
        }

        // TODO [HIGH][Security]: Add rate limiting here before DB query.
        // Check Redis for failed attempt count by email+IP before proceeding.
        // Throw 'חשבון נעול זמנית' after 5 failed attempts.

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          // TODO [MEDIUM][Security]: Also select emailVerified, isBanned, tokenVersion
          // to gate access for unverified or banned accounts.
        })

        if (!user) {
          // TODO [HIGH][Security]: Increment failed-attempt counter in Redis here.
          throw new Error('אימייל או סיסמה שגויים')
        }

        // TODO [HIGH][Trust & Safety]: Check if user is banned/suspended before
        // allowing login. There is currently no ban/suspension field on User.
        // Add: if (user.isBanned) throw new Error('החשבון הושעה')

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
        if (!isPasswordValid) {
          // TODO [HIGH][Security]: Increment failed-attempt counter in Redis here.
          throw new Error('אימייל או סיסמה שגויים')
        }

        // TODO [HIGH][Security]: Reset failed-attempt counter on successful login.

        // TODO [MEDIUM][Security]: Check user.emailVerified — if not verified,
        // block login or show a "please verify your email" error.

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          // TODO [MEDIUM][Security]: Include tokenVersion in JWT for revocation support.
        }
      },
    }),
    // TODO [MEDIUM][UX]: Add Google OAuth provider for easier Israeli-market sign-in.
    // GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! })
  ],
  // TODO [HIGH][Security]: Add maxAge to prevent forever-valid JWT tokens.
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        // TODO [MEDIUM][Security]: Store tokenVersion in token for revocation checking.
        // token.tokenVersion = user.tokenVersion
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        // TODO [MEDIUM][Security]: Validate tokenVersion against DB here.
        // Invalidate session if tokenVersion mismatch (user banned or password changed).
      }
      return session
    },
  },
  // TODO [LOW][Security]: Add events handlers to log auth activity:
  // events: { signIn, signOut, createUser, linkAccount }
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

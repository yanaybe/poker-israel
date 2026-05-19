// TODO [HIGH][Security]:
// Route protection is incomplete. The following routes have no auth middleware
// but should require authentication:
//   - /ratings (rating page — should require login)
//   - /premium (subscription page — should require login to show current status)
//   - /games/[id]/join is an API call but the UI join button on /games/[id] should
//     redirect unauthenticated users to login before showing the modal
// Fix: Add the above routes to the matcher array below.
// Risk: Unauthenticated users can view the ratings page UI (though API is protected).

// TODO [HIGH][Security]:
// This middleware only checks if a JWT token EXISTS. It does NOT:
//   1. Validate token version (revocation)
//   2. Check if user is banned/suspended
//   3. Check if email is verified
// Fix: Extend the authorized callback to fetch user status from DB or Redis cache.
// Risk: Banned users with valid tokens can still access all protected routes.

// TODO [HIGH][Security]:
// No CSRF protection configured. Next.js/NextAuth handles some CSRF via the
// double-submit cookie pattern on the signIn endpoint, but custom state-changing
// API routes (PATCH, DELETE) have no explicit CSRF tokens.
// Fix: Implement SameSite=Strict cookies and verify Origin header on state-changing
// API routes, or use a CSRF token library.
// Risk: Cross-site request forgery on game cancellation, request approval, etc.

// TODO [HIGH][Security]:
// No global rate limiting middleware. Every API route is unprotected from
// flooding. Rate limits should be enforced at the middleware layer, not per-route.
// Fix: Integrate @upstash/ratelimit + @upstash/redis. Apply different limits:
//   - /api/auth/*: 5 req/min per IP
//   - /api/messages/*: 30 req/min per user
//   - /api/games (POST): 10 req/min per user
//   - All other /api/*: 100 req/min per IP
// Risk: Any route can be flooded causing server/DB overload.

// TODO [MEDIUM][Security]:
// No request size limit. A malicious user can POST a 100MB payload to any
// API endpoint, potentially causing OOM errors in the Next.js server process.
// Fix: Add Content-Length header check in middleware and reject requests > 1MB.
// Risk: DoS via oversized request bodies.

// TODO [MEDIUM][Security]:
// No security headers configured (X-Frame-Options, Content-Security-Policy,
// X-Content-Type-Options, Referrer-Policy, Permissions-Policy).
// Fix: Add headers in next.config.js under `headers()` config or this middleware.
// Risk: Clickjacking, XSS, MIME sniffing attacks.

// TODO [LOW][Security]:
// No IP-based geofencing or anomaly detection. A user logging in from Israel,
// then immediately from Russia, is not flagged.
// Fix: Log login IP and flag suspicious location changes. Alert user via email.
// Risk: Account takeovers go undetected.

import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // TODO [HIGH][Security]: Add rate limiting check here before passing through.
    // Check Redis for request count by IP/user and return 429 if exceeded.

    // TODO [HIGH][Security]: Add security response headers here:
    // res.headers.set('X-Frame-Options', 'DENY')
    // res.headers.set('X-Content-Type-Options', 'nosniff')
    // res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

    return NextResponse.next()
  },
  {
    callbacks: {
      // TODO [HIGH][Security]: Extend this to check token version and ban status.
      // authorized: ({ token }) => !!token && !token.isBanned && token.version === latestVersion
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: [
    '/create-game',
    '/profile/edit',
    '/messages/:path*',
    // TODO [HIGH][Security]: Add missing protected routes:
    // '/ratings',
    // '/premium',
  ],
}

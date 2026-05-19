# MASTER LAUNCH CHECKLIST
## Poker Israel — Pre-Production Engineering Mission

> **STATUS: IN PROGRESS — CRITICAL SECURITY FIXES APPLIED**
> Current launch readiness score: 5/10
> Estimated time to production-ready: 2–3 weeks of focused engineering

---

## 🔴 PHASE 1 — CRITICAL BLOCKERS (Week 1)
*Nothing ships until every item here is done.*

### Security
- [x] **[SEC-001]** Add authentication check to `POST /api/tournaments` — now requires session + isAdmin
- [x] **[SEC-002]** Fix webhook signature verification — always verify, PAYPLUS_SKIP_SIG_VERIFY flag for local dev only
- [x] **[SEC-003]** Fix webhook bypass: reject requests with empty/missing signature header (returns 401)
- [ ] **[SEC-004]** Add rate limiting to `/api/auth/*` endpoints (max 5/min per IP)
- [ ] **[SEC-005]** Add rate limiting to `/api/messages/*` (max 30/hr per user)
- [x] **[SEC-006]** Add Zod schema validation on ALL POST/PATCH API route bodies (tournaments, games, join, approval, register, messages, lfg, users/me, games/[id])
- [x] **[SEC-007]** Add backend password strength validation (min 8 chars + uppercase + number)
- [x] **[SEC-008]** Remove demo credentials from `/login` page entirely

### Database & DevOps
- [x] **[DB-001]** Replace `prisma db push` in build script with `prisma migrate deploy`
- [ ] **[DB-002]** Set up proper Prisma migration history (`prisma migrate dev`)
- [x] **[DB-003]** Add production guard to `prisma/seed.ts` — throws if NODE_ENV === 'production'
- [x] **[DB-004]** Add critical indexes: Game(city, status, dateTime), Message(senderId, receiverId), Strike(userId, createdAt), Notification(userId), GameRequest(userId), LfgPost(city, status)
- [ ] **[DB-005]** Change database provider from SQLite to PostgreSQL in all environments

### Legal
- [ ] **[LEGAL-001]** Create Terms of Service page (`/terms`)
- [ ] **[LEGAL-002]** Create Privacy Policy page (`/privacy`)
- [ ] **[LEGAL-003]** Add ToS/Privacy links to footer and registration form
- [x] **[LEGAL-004]** Enforce age 18+ on registration (backend validation — z.number().min(18))

### Trust & Safety
- [x] **[TS-001]** Add user ban/suspension fields to User model (`isBanned`, `banReason`, `bannedAt`, `isAdmin`, `tokenVersion`)
- [x] **[TS-002]** Check ban status before allowing login, game join, and message send

---

## 🟠 PHASE 2 — PRE-LAUNCH (Week 2)
*Must be complete before inviting public users.*

### Authentication & Identity
- [ ] **[AUTH-001]** Add email verification flow (Resend/SendGrid integration)
- [ ] **[AUTH-002]** Add password reset flow (email → time-limited token → new password)
- [x] **[AUTH-003]** Configure JWT session expiry (`maxAge: 7 * 24 * 60 * 60`)
- [x] **[AUTH-004]** Add token version field to User for JWT revocation on ban/password change

### API Quality
- [ ] **[API-001]** Add pagination to `GET /api/games` (cursor-based, limit=20)
- [ ] **[API-002]** Add pagination to `GET /api/messages` (last 50, load more)
- [ ] **[API-003]** Add pagination to `GET /api/lfg`
- [x] **[API-004]** Fix race condition in game join — wrapped in Prisma transaction with ban check
- [x] **[API-005]** Fix race condition in request approval — wrapped in Prisma transaction with cross-game validation
- [x] **[API-006]** Add input bounds validation (buyIn: 0–100000, maxPlayers: 2–20, dateTime: future only)
- [x] **[API-007]** Remove email and canHostUntil from public `GET /api/users/[id]` response (now owner/admin only)
- [ ] **[API-008]** Add webhook idempotency — store processed transactionUids, skip duplicates

### Images & Storage
- [ ] **[IMG-001]** Migrate profile image storage from base64-in-DB to Cloudinary or S3
- [ ] **[IMG-002]** Add backend image size validation (max 5MB, check before accepting)
- [ ] **[IMG-003]** Update remotePatterns in next.config.js for CDN domain

### Observability
- [ ] **[OBS-001]** Integrate Sentry for error tracking (frontend + backend)
- [ ] **[OBS-002]** Replace all `console.error` with structured logger (pino/winston)
- [ ] **[OBS-003]** Add `/api/health` endpoint for deployment health checks
- [ ] **[OBS-004]** Add environment variable validation on startup (zod or @t3-oss/env-nextjs)

### Moderation
- [ ] **[MOD-001]** Add Report model to Prisma schema (reports on users/games/lfg)
- [ ] **[MOD-002]** Add "Report User" / "Report Game" UI buttons
- [ ] **[MOD-003]** Add admin user management (ban/unban, view reports)

---

## 🟡 PHASE 3 — LAUNCH QUALITY (Week 3)
*Makes the difference between "usable" and "good".*

### Push Notifications
- [ ] **[PUSH-001]** Integrate Web Push API with Service Worker
- [ ] **[PUSH-002]** Request push permission after first notification event
- [ ] **[PUSH-003]** Send push on: join approved, join rejected, game cancelled, address revealed
- [ ] **[PUSH-004]** Add email notifications via Resend on all game events

### Mobile UX
- [ ] **[MOB-001]** Add bottom navigation bar for mobile (Games, Messages, Notifications, Profile)
- [ ] **[MOB-002]** Fix keyboard push on mobile chat (visualViewport API)
- [ ] **[MOB-003]** Ensure all touch targets are ≥ 44px (WCAG requirement)
- [ ] **[MOB-004]** Add PWA manifest for "Add to Home Screen"

### Discovery
- [ ] **[DISC-001]** Add map view using Leaflet + OpenStreetMap (game locations at city level)
- [ ] **[DISC-002]** Add "Notify me when a game is posted in [city]" alert subscription
- [ ] **[DISC-003]** Expand city coverage beyond 20 hardcoded cities
- [ ] **[DISC-004]** Add shareable game URLs with Open Graph meta tags for WhatsApp sharing

### Growth
- [ ] **[GROW-001]** Add WhatsApp share button on game detail page
- [ ] **[GROW-002]** Replace hardcoded fake stats on landing page with real database counts
- [ ] **[GROW-003]** Add analytics integration (PostHog free tier)
- [ ] **[GROW-004]** Add "games posted this month" counter for hosts to track usage

### Routing & Navigation
- [ ] **[NAV-001]** Create `/games/[id]/edit` page (currently linked from detail page but doesn't exist)
- [ ] **[NAV-002]** Add Open Graph tags on game detail pages for social sharing
- [x] **[NAV-003]** Fix open redirect vulnerability in login callbackUrl validation (getSafeCallbackUrl validates relative paths only)

---

## 🟢 PHASE 4 — POST-LAUNCH SCALING (Month 2+)
*Important but can launch without these.*

### Real-time Infrastructure
- [ ] **[RT-001]** Replace chat polling (3s) with WebSocket (Socket.io or Pusher)
- [ ] **[RT-002]** Replace notification polling (30s) with Server-Sent Events or WebSocket
- [ ] **[RT-003]** Add typing indicators in chat
- [ ] **[RT-004]** Add read receipts (single ✓ sent, double ✓✓ read)

### Database Optimization
- [ ] **[PERF-001]** Denormalize avgRating and ratingCount onto User (eliminate N+1 on games list)
- [ ] **[PERF-002]** Rewrite `GET /api/messages` conversation list as SQL aggregation query
- [ ] **[PERF-003]** Rewrite `GET /api/ratings/pending` as single SQL LEFT JOIN query
- [ ] **[PERF-004]** Add Redis caching layer for games list (60s TTL, invalidate on write)
- [ ] **[PERF-005]** Add PostGIS for server-side geo queries (replace client-side Haversine)

### Security Hardening
- [x] **[SEC-H-001]** Add HTTP security headers (X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy, Permissions-Policy) in next.config.js
- [ ] **[SEC-H-002]** Implement user message blocking (Block table + enforcement in messages API)
- [ ] **[SEC-H-003]** Add 2FA/TOTP support for high-value accounts
- [ ] **[SEC-H-004]** Implement CSRF tokens on state-changing API routes
- [ ] **[SEC-H-005]** Encrypt home addresses at-rest (AES-256-GCM on Game.location)

### Marketplace Features
- [ ] **[MKT-001]** Add recurring game support (host can set weekly recurring schedule)
- [ ] **[MKT-002]** Add referral system (invite friend → both get 1 free premium month)
- [ ] **[MKT-003]** Add host analytics dashboard (views, join rate, fill rate per game)
- [ ] **[MKT-004]** Add in-app "Games this month" counter showing X/3 free games used
- [ ] **[MKT-005]** Notify LFG posters when a matching game is created in their city

### Legal & Compliance
- [ ] **[LEG-001]** Generate and email payment receipts (required by Israeli tax law)
- [ ] **[LEG-002]** Add VAT calculation on subscription/boost fees (17% in Israel)
- [ ] **[LEG-003]** Add data deletion endpoint (GDPR right to erasure)
- [ ] **[LEG-004]** Add data export endpoint (GDPR right of access)
- [ ] **[LEG-005]** Add cookie consent banner if adding analytics
- [ ] **[LEG-006]** Self-host Google Fonts (Heebo) to avoid sending user IPs to Google
- [ ] **[LEG-007]** Get Israeli gaming law counsel review before public launch

---

## DEPENDENCIES MAP

```
SEC-001 (auth tournaments) → independent
SEC-002 (webhook sig) → independent  
DB-001 (migrate deploy) → DB-002 (migrate dev) must come first
AUTH-001 (email verify) → AUTH-002 (password reset) requires same email service
AUTH-003 (JWT expiry) → AUTH-004 (token version) extends the same mechanism
API-004 (join race) → DB-004 (indexes) should be done before to avoid lock contention
IMG-001 (image migration) → IMG-003 (remotePatterns) depends on IMG-001
RT-001 (WebSocket chat) → RT-003 (typing indicators) requires RT-001 first
PERF-001 (denormalize ratings) → DB schema migration required first
```

---

## DEFINITION OF "LAUNCH READY"

The platform is ready for public launch when:
1. ✅ All Phase 1 items complete
2. ✅ All Phase 2 items complete  
3. ✅ At minimum: Terms of Service, Privacy Policy, email verification live
4. ✅ At minimum: push notifications working for join approved/rejected
5. ✅ At minimum: fake landing page stats replaced or removed
6. ✅ Load tested with 50 concurrent simulated users without degradation
7. ✅ Manual QA walkthrough: register → find game → join → get approved → attend → rate

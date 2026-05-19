# SECURITY AUDIT TASKS
## Poker Israel — Complete Security Engineering Backlog

---

## CRITICAL VULNERABILITIES (Fix Before Any Public Access)

### VULN-001: Unauthenticated Tournament Creation
- **File:** `src/app/api/tournaments/route.ts` (line 11 after TODOs)
- **Severity:** CRITICAL
- **Description:** `POST /api/tournaments` has zero authentication. Anyone on the internet can create tournament records by sending an HTTP POST request.
- **Proof of Exploit:** `curl -X POST https://domain.com/api/tournaments -d '{"name":"SPAM","city":"כל העיר","date":"2025-01-01"}'`
- **Fix:** Add `getServerSession()` check + admin role verification. Implement RBAC with User.isAdmin field.
- **Impact:** Database pollution, fake tournaments, platform credibility destroyed.

### VULN-002: Webhook Signature Bypass
- **File:** `src/app/api/payments/webhook/route.ts` (line ~30)
- **Severity:** CRITICAL
- **Description:** Two bypass vectors:
  1. Signature check skipped entirely when `NODE_ENV !== 'production'`
  2. Signature check skipped when signature header is empty (`&& signature` condition)
- **Proof of Exploit:** `curl -X POST https://domain.com/api/payments/webhook -d '{"status":"success","more_info":"sub:victimUserId","transaction_uid":"fake123"}'` — no signature header needed in non-production.
- **Fix:** Always verify signature. Return 401 if signature header is missing or invalid.
- **Impact:** Attackers get free premium subscriptions without paying.

### VULN-003: No Backend Input Validation
- **Files:** All `src/app/api/*/route.ts` files
- **Severity:** CRITICAL
- **Description:** All API routes accept raw JSON body with no server-side validation. Frontend Zod schemas are bypassed by direct API calls.
- **Examples:**
  - `buyIn: parseInt(undefined)` → NaN stored in DB
  - `title: "<script>alert(1)</script>"` → stored as-is
  - `maxPlayers: 9999999` → stored without bounds check
  - `dateTime: "invalid-date"` → `new Date("invalid-date")` = Invalid Date
- **Fix:** Define Zod schemas in `src/schemas/` and validate in every POST/PATCH handler before DB write.
- **Impact:** Data corruption, potential XSS, unexpected behavior.

### VULN-004: No Rate Limiting
- **File:** `src/middleware.ts`, all API routes
- **Severity:** CRITICAL
- **Description:** Every API endpoint has zero rate limiting. Brute force, spam, and DoS attacks are unrestricted.
- **Specific Risks:**
  - Login: ~250,000 attempts/day per attacker (bcrypt is slow but not infinite)
  - Register: Unlimited fake accounts
  - Messages: Unlimited harassment messages per second
  - Games: Unlimited game creation attempts beyond premium limits (API bypasses business logic)
- **Fix:** Integrate `@upstash/ratelimit` with Redis. Apply at middleware level with per-route limits.
- **Impact:** Account takeovers, platform spam, server overload.

---

## HIGH SEVERITY VULNERABILITIES

### VULN-005: Email Exposed in Public User API
- **File:** `src/app/api/users/[id]/route.ts` (line ~19)
- **Severity:** HIGH
- **Description:** `GET /api/users/[id]` includes `email: true` in the select and returns it to any unauthenticated caller.
- **Fix:** Remove email from public API response. Return email only to the authenticated user themselves.
- **Impact:** All user email addresses are publicly scrapeable via `/api/users/[id]`.

### VULN-006: Suspension Date Exposed in Public API
- **File:** `src/app/api/users/[id]/route.ts` and `src/types/index.ts`
- **Severity:** HIGH
- **Description:** `canHostUntil` (suspension expiry timestamp) is returned in the public user profile API.
- **Fix:** Remove `canHostUntil` from public response. Admin-only field.
- **Impact:** Suspended users are publicly labelled, their suspension end date is public.

### VULN-007: JWT Sessions Never Expire
- **File:** `src/lib/auth.ts`
- **Severity:** HIGH
- **Description:** `session: { strategy: 'jwt' }` without `maxAge` creates tokens with no expiry.
- **Fix:** Add `maxAge: 7 * 24 * 60 * 60` (7 days). Add token version for revocation.
- **Impact:** Stolen session cookies are valid permanently. Account takeovers never self-expire.

### VULN-008: No Account Lockout
- **File:** `src/lib/auth.ts`, `authorize()` function
- **Severity:** HIGH
- **Description:** No lockout after N failed login attempts. Brute force of any email/password combination is unrestricted.
- **Fix:** Track failed attempts in Redis (keyed by email + IP). Lock after 5 failures for 15 minutes.
- **Impact:** Any account with a weak password can be compromised via automated brute force.

### VULN-009: Home Addresses in Plaintext
- **File:** `prisma/schema.prisma`, Game.location field
- **Severity:** HIGH
- **Description:** Home addresses of every poker host are stored in plaintext in the database. Database backups contain all addresses.
- **Fix:** Encrypt Game.location field using AES-256-GCM with application-level encryption. Decrypt only when reveal conditions are met, server-side.
- **Impact:** Database breach exposes home addresses of all hosts — personal safety risk.

### VULN-010: Location Reveal Bypassable via API
- **File:** `src/app/api/games/[id]/route.ts`
- **Severity:** HIGH
- **Description:** The response does correctly null out `location` when not revealed, but the logic depends on correct session parsing. The `locationRevealed` flag and `location` field are both in the same response object — verify that when location is null, the `location` key itself is not present in the response.
- **Fix:** Audit the response object structure. Ensure `location` key is omitted (not just null) when not revealed, or at minimum consistently null.
- **Impact:** Users may access host home addresses before the 2-hour reveal window.

### VULN-011: Race Condition in Game Join
- **File:** `src/app/api/games/[id]/join/route.ts`
- **Severity:** HIGH
- **Description:** Capacity check and request creation are not atomic. Two simultaneous join requests can both read "not full" and both get PENDING status, allowing overbooking.
- **Fix:** Use `prisma.$transaction()` with SELECT FOR UPDATE or optimistic locking on the Game row.
- **Impact:** Games go over maximum player capacity — host's physical space exceeded.

### VULN-012: Race Condition in Request Approval
- **File:** `src/app/api/games/[id]/requests/[requestId]/route.ts`
- **Severity:** HIGH
- **Description:** Approve → increment → full check sequence is not atomic across the 3 operations.
- **Fix:** Wrap entire approval flow in `prisma.$transaction()`.
- **Impact:** Same as VULN-011 — games go over capacity.

### VULN-013: Open Redirect in Login
- **File:** `src/app/(auth)/login/page.tsx`
- **Severity:** HIGH
- **Description:** `router.push(searchParams.get('callbackUrl') ?? '/games')` — callbackUrl is not validated as a relative URL. `?callbackUrl=https://evil.com` redirects users to attacker-controlled sites after login.
- **Fix:** Validate: `if (!callbackUrl.startsWith('/')) callbackUrl = '/games'`
- **Impact:** Phishing attacks — users tricked into providing credentials to attacker sites.

---

## MEDIUM SEVERITY VULNERABILITIES

### VULN-014: CSRF Protection Gaps
- **File:** `src/middleware.ts`
- **Description:** State-changing API routes (game cancel, request approve, profile update) rely on cookie-based auth without explicit CSRF tokens. SameSite cookie attributes should be verified.
- **Fix:** Verify SameSite=Strict or SameSite=Lax on session cookies. Add Origin header validation on state-changing routes.

### VULN-015: Request Size Not Limited
- **File:** `src/middleware.ts` (missing)
- **Description:** No Content-Length limit. Oversized payloads (100MB base64 image) can OOM the server process.
- **Fix:** Reject requests with Content-Length > 5MB. Add Next.js bodySize configuration.

### VULN-016: Message Content Not Size-Limited
- **File:** `src/app/api/messages/[userId]/route.ts`
- **Description:** No maximum length on message content. 100,000-character messages can be stored and displayed.
- **Fix:** Add: `if (content.length > 2000) return 400`

### VULN-017: Cross-Game Request Manipulation
- **File:** `src/app/api/games/[id]/requests/[requestId]/route.ts`
- **Description:** requestId is not validated to belong to the specified gameId. A host could potentially manipulate requests from other games.
- **Fix:** `findUnique({ where: { id: params.requestId, gameId: params.id } })`

### VULN-018: Game Delete Avoids Strike System
- **File:** `src/app/api/games/[id]/route.ts` (DELETE handler)
- **Description:** A host can DELETE a game with approved players without triggering the strike system. Deletion is harder to reverse than cancellation.
- **Fix:** Apply same strike logic as CANCELLED status when game has approved players + upcoming dateTime.

### VULN-019: No Email Verification
- **File:** `src/app/api/auth/register/route.ts`
- **Description:** Users can register with any email address, including emails they don't own. No verification required.
- **Fix:** Send verification email after registration. Require verification before game creation.

### VULN-020: No Security Headers
- **File:** `next.config.js`
- **Description:** Missing X-Frame-Options, Content-Security-Policy, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- **Fix:** Add `headers()` configuration in next.config.js.

---

## LOW SEVERITY VULNERABILITIES

### VULN-021: bcrypt Work Factor Low
- **File:** `src/app/api/auth/register/route.ts`, `prisma/seed.ts`
- **Description:** Work factor 10 is below 2025 recommendations (12+).
- **Fix:** Change to `bcrypt.hash(password, 12)`.

### VULN-022: GPS Coordinates in localStorage
- **File:** `src/hooks/useUserLocation.ts`
- **Description:** Precise GPS coordinates stored in localStorage accessible to all JS on the page.
- **Fix:** Round to 2 decimal places before storing (~1km precision). Add explicit consent prompt.

### VULN-023: No Audit Log
- **Files:** All API routes
- **Description:** No record of who did what and when. Cannot investigate security incidents.
- **Fix:** Create AuditLog table. Log auth events, game modifications, payment events.

### VULN-024: Demo Credentials in Production
- **File:** `src/app/(auth)/login/page.tsx`
- **Description:** `Demo: david@example.com / password123` displayed in the UI.
- **Fix:** Remove before any public access. Gate behind `DEMO_MODE=true` env var if needed.

### VULN-025: Seed Password in Source Code
- **File:** `prisma/seed.ts`
- **Description:** `password123` hardcoded in seed script and committed to source control.
- **Fix:** Use environment variable: `process.env.SEED_PASSWORD`. Add production guard.

---

## SECURITY IMPLEMENTATION ORDER

```
Week 1: VULN-001, VULN-002, VULN-003, VULN-004, VULN-024
Week 2: VULN-005, VULN-006, VULN-007, VULN-008, VULN-011, VULN-012, VULN-013
Week 3: VULN-009, VULN-014, VULN-015, VULN-017, VULN-018, VULN-019, VULN-020
Week 4+: VULN-010, VULN-016, VULN-021–VULN-025
```

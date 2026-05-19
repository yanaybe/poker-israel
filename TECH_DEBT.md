# TECH DEBT
## Poker Israel — Architecture & Code Quality Engineering Backlog

> **Philosophy:** These items don't cause visible bugs today, but each one increases the cost of every future change. Left unaddressed, they compound — a codebase that takes 1 hour to add a feature today takes 4 hours in 6 months.

---

## ARCHITECTURE DEBT

### TD-001: No Service Layer — All Logic in Route Handlers
- **Priority:** HIGH
- **Effort:** 8 hours (refactor, no new features)
- **Files:** All `src/app/api/*/route.ts` files
- **Problem:** Business logic (premium checks, strike calculation, notification creation, location reveal timing) is embedded directly in route handlers. The same logic is copy-pasted across multiple routes.
- **Examples of duplication:**
  - Premium check appears in game creation AND directly referenced in multiple places
  - Notification creation logic is inline in every route that should notify users
  - Strike threshold check is hardcoded in game PATCH handler
- **Fix:**
  1. Create `src/services/` directory
  2. Extract: `GameService`, `UserService`, `NotificationService`, `PremiumService`
  3. Route handlers call services; services call Prisma
- **Impact:** Every bug fix and feature change requires touching 3-5 files instead of 1. Service extraction is the most impactful architectural improvement.

### TD-002: Dual Sources of Truth — Types vs Prisma Schema
- **Priority:** HIGH
- **Effort:** 4 hours
- **Files:** `src/types/index.ts`, `prisma/schema.prisma`
- **Problem:** `src/types/index.ts` manually duplicates the Prisma schema shape as TypeScript interfaces. Any field added to the schema must also be added to the types manually.
- **Divergence already present:**
  - `GameWithHost.host.canHostUntil` included in public-facing type (privacy leak)
  - `LfgPost.user.avgRating` referenced in type but doesn't exist in schema
- **Fix:**
  ```typescript
  // Instead of manual interfaces, use Prisma's generated types:
  import { Prisma } from '@prisma/client'
  
  type GameWithHost = Prisma.GameGetPayload<{
    include: { host: true; boost: true }
  }>
  ```
  Or use `zod-prisma-types` to auto-generate Zod schemas from the Prisma schema.
- **Impact:** Every schema change now requires a manual type update. Divergence causes silent runtime bugs.

### TD-003: No Test Coverage
- **Priority:** HIGH**
- **Effort:** 16 hours (initial coverage)
- **Files:** New `src/__tests__/`, `jest.config.js` or `vitest.config.ts`
- **Problem:** Zero tests. No unit tests, no integration tests, no E2E tests. Critical business logic (premium limits, strike system, location reveal, payment webhook) has no automated verification.
- **Minimum viable test suite:**
  1. **Unit:** `isPremiumHost()`, `haversineKm()`, strike threshold logic
  2. **Integration:** Game creation (auth check, premium limit, validation), join flow (capacity check, race condition), webhook processing
  3. **E2E (Playwright):** Register → browse games → join game → get approved → rate host
- **Fix:** Set up Vitest for unit/integration tests. Playwright for E2E. Add to CI pipeline.
- **Impact:** Every deploy is a prayer. Refactoring is impossible without tests. This is the highest-leverage quality investment.

### TD-004: No CI/CD Pipeline
- **Priority:** HIGH
- **Effort:** 4 hours
- **Files:** New `.github/workflows/ci.yml`
- **Problem:** No automated testing, linting, or type-checking on pull requests. Broken code can be merged and deployed without detection.
- **Fix:**
  ```yaml
  # .github/workflows/ci.yml
  - name: Type check
    run: npx tsc --noEmit
  - name: Lint
    run: npx eslint src/
  - name: Test
    run: npx vitest run
  - name: Build
    run: npm run build
  ```
- **Impact:** Type errors, lint violations, and broken builds caught before merge instead of in production.

### TD-005: `prisma db push` in Build Script
- **Priority:** CRITICAL
- **Effort:** 2 hours
- **File:** `package.json`
- **Problem:** `"build": "prisma generate && prisma db push && next build"`. `prisma db push` is a destructive operation that can DROP columns when the schema changes. Running it as part of the production build is extremely dangerous.
- **Fix:**
  1. Run `prisma migrate dev --name init` to create migration history
  2. Replace `prisma db push` with `prisma migrate deploy` in build script
  3. `prisma migrate deploy` is safe — it only applies pending migrations, never drops
- **Impact:** A schema change on next deploy could silently drop a production database column.

### TD-006: No Error Boundaries in React Tree
- **Priority:** HIGH
- **Effort:** 2 hours
- **Files:** `src/app/(main)/games/[id]/page.tsx`, `src/app/(main)/messages/[userId]/page.tsx`, route `error.tsx` files
- **Problem:** No `error.tsx` files in any Next.js route segment. A JavaScript error in a child component (e.g., a rating component) crashes the entire page with an unhandled error screen.
- **Fix:** Add `error.tsx` to each route segment:
  ```typescript
  // src/app/(main)/games/[id]/error.tsx
  'use client'
  export default function GameError({ error, reset }) {
    return <div>Something went wrong. <button onClick={reset}>Try again</button></div>
  }
  ```
- **Impact:** Currently, any runtime error shows a blank white page or Next.js error overlay in production.

---

## CODE QUALITY DEBT

### TD-007: No Input Validation on Any API Route
- **Priority:** CRITICAL
- **Effort:** 8 hours
- **Files:** All `src/app/api/*/route.ts` files
- **Problem:** Every POST/PATCH route reads `req.json()` and passes it directly to Prisma with no validation. This is simultaneously a security vulnerability and a data quality issue.
- **Fix:** Create `src/schemas/` directory. Define Zod schemas matching each endpoint's expected input:
  ```typescript
  // src/schemas/game.ts
  export const CreateGameSchema = z.object({
    title: z.string().min(3).max(100),
    city: z.enum(ISRAELI_CITIES),
    dateTime: z.string().datetime().refine(d => new Date(d) > new Date()),
    buyIn: z.number().int().min(0).max(100000),
    maxPlayers: z.number().int().min(2).max(20),
    // ...
  })
  ```
  Import and parse in each route handler.
- **Impact:** Data corruption, security vulnerabilities, and silent failures all traced back to missing validation.

### TD-008: Inconsistent Error Handling
- **Priority:** MEDIUM
- **Effort:** 4 hours
- **Files:** All `src/app/api/*/route.ts` files
- **Problem:** Error handling is inconsistent. Some routes return `{ error: "message" }`, some return `{ message: "error" }`, some return plain strings, some throw unhandled exceptions.
- **Examples:**
  ```typescript
  return NextResponse.json({ error: '...' }, { status: 400 })  // pattern A
  return NextResponse.json({ message: '...' }, { status: 400 }) // pattern B
  return new Response('Unauthorized', { status: 401 })           // pattern C
  ```
- **Fix:** Define a single error response helper:
  ```typescript
  // src/lib/api-response.ts
  export const apiError = (message: string, status: number) =>
    NextResponse.json({ error: message }, { status })
  ```
  Use consistently across all routes.
- **Impact:** Frontend must handle 3 different error shapes. Type safety impossible without standardization.

### TD-009: `console.error` Instead of Structured Logging
- **Priority:** MEDIUM
- **Effort:** 3 hours
- **Files:** All `src/app/api/*/route.ts` files
- **Problem:** `console.error(e)` scattered throughout codebase. In production, these appear as unstructured text in server logs. Cannot be queried, cannot be aggregated, cannot trigger alerts.
- **Fix:**
  ```typescript
  // src/lib/logger.ts
  import pino from 'pino'
  export const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' })
  
  // Usage:
  logger.error({ userId, gameId, error: e.message }, 'Game creation failed')
  ```
  Replace all `console.error` with structured logger calls.
- **Impact:** Without structured logging, debugging production issues requires reading raw text logs.

### TD-010: Hardcoded Magic Numbers and Config Values
- **Priority:** MEDIUM
- **Effort:** 2 hours
- **Files:** `src/lib/premium.ts`, `src/lib/payplus.ts`, `src/app/api/notifications/route.ts`
- **Problem:** Business-critical constants scattered throughout the codebase:
  - `FREE_GAME_LIMIT = 3` in `premium.ts` (correct — isolated)
  - `₪199` subscription price in multiple files
  - `take: 30` notifications limit in API route (hardcoded inline)
  - `2 * 60 * 60 * 1000` (2-hour location reveal) computed inline in multiple places
  - `10` bcrypt rounds in `register/route.ts` and `seed.ts`
- **Fix:** Create `src/lib/constants.ts`:
  ```typescript
  export const SUBSCRIPTION_PRICE_ILS = 199
  export const FREE_GAMES_PER_MONTH = 3
  export const LOCATION_REVEAL_MS = 2 * 60 * 60 * 1000
  export const BCRYPT_ROUNDS = 12
  export const NOTIFICATIONS_PAGE_SIZE = 30
  ```
- **Impact:** Changing a business rule (e.g., free limit from 3 to 5) requires searching all files instead of changing one constant.

### TD-011: ISRAELI_CITIES Duplicated in Two Files
- **Priority:** MEDIUM
- **Effort:** 30 minutes
- **Files:** `src/types/index.ts`, `src/lib/utils.ts`
- **Problem:** `ISRAELI_CITIES` array in `types/index.ts` and `CITY_COORDS` object keys in `utils.ts` must be kept in sync manually. They currently have the same 20 cities, but adding a city to one doesn't add it to the other.
- **Fix:**
  ```typescript
  // src/lib/constants.ts
  export const CITY_COORDS: Record<string, { lat: number; lng: number }> = { ... }
  export const ISRAELI_CITIES = Object.keys(CITY_COORDS) as string[]
  ```
  Import `ISRAELI_CITIES` from constants in `types/index.ts`. Delete the duplicate.
- **Impact:** Next city addition will cause a bug — distance shows `null` for city that appears in dropdown.

---

## DEPENDENCY DEBT

### TD-012: NextAuth v4 (Legacy)
- **Priority:** MEDIUM (Future)
- **Effort:** 8 hours
- **File:** `src/lib/auth.ts`
- **Problem:** Project uses NextAuth v4. NextAuth v5 (Auth.js) is the current version with better TypeScript support and Next.js App Router integration. v4 works but is in maintenance mode.
- **Fix:** Migrate to Auth.js v5 after other critical issues are addressed. Follow migration guide. Update session types, callbacks, and adapter configuration.
- **Impact:** No immediate breakage, but v4 will receive fewer security patches over time.

### TD-013: Missing package.json Scripts
- **Priority:** MEDIUM
- **Effort:** 30 minutes
- **File:** `package.json`
- **Problem:** No `type-check`, `test`, `lint`, `migrate:dev`, or `migrate:prod` scripts. Developers must remember raw commands.
- **Fix:**
  ```json
  {
    "scripts": {
      "type-check": "tsc --noEmit",
      "lint": "next lint",
      "test": "vitest",
      "test:e2e": "playwright test",
      "migrate:dev": "prisma migrate dev",
      "migrate:prod": "prisma migrate deploy",
      "studio": "prisma studio"
    }
  }
  ```
- **Impact:** New developers don't know how to type-check or run migrations. CI pipeline has no standard commands to call.

### TD-014: No Environment Variable Validation on Startup
- **Priority:** HIGH
- **Effort:** 1 hour
- **Files:** New `src/env.ts`, `src/app/layout.tsx`
- **Problem:** If `NEXTAUTH_SECRET`, `DATABASE_URL`, or `PAYPLUS_SECRET_KEY` are missing, the app starts without error and fails only when the relevant code path is hit — potentially in production under load.
- **Fix:**
  ```typescript
  // src/env.ts (using @t3-oss/env-nextjs or manual zod)
  import { z } from 'zod'
  const envSchema = z.object({
    DATABASE_URL: z.string().min(1),
    NEXTAUTH_SECRET: z.string().min(32),
    PAYPLUS_API_KEY: z.string().min(1),
  })
  export const env = envSchema.parse(process.env)
  ```
- **Impact:** Silent misconfiguration failures in production. Hard to diagnose.

---

## TECH DEBT IMPLEMENTATION ORDER

```
Immediate (before any new features):
  TD-005 (prisma db push), TD-007 (input validation), TD-014 (env validation)

Week 1-2:
  TD-003 (tests — start with critical paths), TD-004 (CI/CD pipeline)
  TD-006 (error boundaries), TD-008 (error handling consistency)

Week 3-4:
  TD-001 (service layer), TD-002 (types → Prisma generated)
  TD-009 (structured logging), TD-010 (constants file), TD-011 (cities dedup)

Month 2:
  TD-013 (package.json scripts), TD-012 (NextAuth v5 migration)
```

---

## TECH DEBT METRICS TO TRACK

| Metric | Current | Target |
|--------|---------|--------|
| Test coverage | 0% | 70%+ |
| TypeScript errors (`tsc --noEmit`) | Unknown | 0 |
| Lint errors | Unknown | 0 |
| API routes with Zod validation | 0/~15 | 15/15 |
| API routes with consistent error format | ~3/15 | 15/15 |
| `console.error` calls | ~20 | 0 |
| Magic numbers/hardcoded constants | ~10 | 0 |

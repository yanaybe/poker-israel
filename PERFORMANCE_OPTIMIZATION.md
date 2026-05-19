# PERFORMANCE OPTIMIZATION
## Poker Israel — Query, API & Frontend Performance Engineering

> **Baseline:** Untested. No profiling has been run. All issues below are architecture-level certainties, not hypothetical.

---

## DATABASE QUERY PERFORMANCE

### PERF-001: N+1 Ratings Query on Games List (CRITICAL)
- **Priority:** CRITICAL
- **Effort:** 4 hours
- **File:** `src/app/api/games/route.ts`
- **Problem:** `GET /api/games` fetches all games, then for each game fetches `hostRatingsReceived` to compute `avgRating`. With 50 games × 30 ratings each = 1,500+ DB rows fetched, then averaged in JavaScript.
- **Measurement:** Add `prisma.$on('query')` logging. Count queries on `/api/games` — expect 1 + N queries.
- **Fix (Short-term):** Denormalize `avgRating Float?` and `totalRatings Int @default(0)` onto User. Update on each rating write. Read from User directly in games query.
- **Fix (Long-term):** Use Prisma `_avg` aggregation with `groupBy` to compute in a single SQL query.
- **Impact:** O(games × ratings) → O(games). 10–100x speedup at scale. This is the single most impactful query change.

### PERF-002: O(n) Conversation List Query (CRITICAL)
- **Priority:** CRITICAL
- **Effort:** 3 hours
- **File:** `src/app/api/messages/route.ts`
- **Problem:** Fetches ALL messages where user is sender OR receiver, loads them all into memory, builds conversation map in JavaScript. A user with 500 messages pays O(500) per page load.
- **Current code pattern:**
  ```typescript
  // Fetches ALL messages into memory, groups in JS
  const messages = await prisma.message.findMany({ where: { OR: [...] } })
  const conversations = groupByConversation(messages) // in-memory O(n)
  ```
- **Fix:**
  ```sql
  SELECT DISTINCT ON (other_user_id) ...
  FROM messages
  ORDER BY other_user_id, created_at DESC
  ```
  Or use Prisma `groupBy` + subquery for latest message per conversation.
- **Impact:** O(all_messages) → O(conversations). Orders of magnitude faster for active users.

### PERF-003: O(n²) Pending Ratings Query
- **Priority:** HIGH
- **Effort:** 2 hours
- **File:** `src/app/api/ratings/pending/route.ts`
- **Problem:** 4 parallel queries (approved requests, all host ratings, all player ratings, game details) followed by nested loops in JavaScript to find unrated games. O(requests × ratings).
- **Fix:** Single Prisma query using `NOT: { game: { hostRatings: { some: { raterId: uid } } } }`:
  ```typescript
  await prisma.gameRequest.findMany({
    where: {
      userId: uid,
      status: 'APPROVED',
      game: { dateTime: { lt: now } },
      NOT: { game: { hostRatings: { some: { raterId: uid } } } }
    },
    include: { game: { include: { host: true } } }
  })
  ```
- **Impact:** 4 queries + in-memory join → 1 query. This endpoint is called on every games page load.

### PERF-004: Missing Database Indexes (CRITICAL)
- **Priority:** CRITICAL
- **Effort:** 1 hour
- **File:** `prisma/schema.prisma`
- **Problem:** Zero custom indexes. Every filtered query is a full table scan. The most common queries:
  - `WHERE city = ? AND status = ? ORDER BY dateTime` — no index
  - `WHERE senderId = ? OR receiverId = ?` — no index
  - `WHERE userId = ? ORDER BY createdAt` (notifications, strikes) — no index
- **Required indexes:**
  ```prisma
  model Game       { @@index([city, status, dateTime]) @@index([hostId]) }
  model Message    { @@index([senderId, receiverId, createdAt]) }
  model Notification { @@index([userId, read, createdAt]) }
  model Strike     { @@index([userId, createdAt]) }
  model GameRequest { @@index([userId]) @@index([gameId, status]) }
  model LfgPost    { @@index([city, status, expiresAt]) }
  ```
- **Impact:** Every production query currently does O(n) full scan. Indexes make them O(log n).

### PERF-005: Game Detail Page — Multiple Sequential Queries
- **Priority:** HIGH
- **Effort:** 2 hours
- **File:** `src/app/(main)/games/[id]/page.tsx`
- **Problem:** Game detail page makes multiple sequential API calls (waterfall): first fetches game, then fetches similar games. These happen one after another, not in parallel.
- **Fix:** Use `Promise.all()` for independent fetches. Or better: combine into a single server component with parallel Prisma queries.
- **Impact:** 500ms+ latency reduction on game detail page load.

### PERF-006: useUserLocation Called Per Game Card
- **Priority:** HIGH
- **Effort:** 1 hour
- **File:** `src/components/games/GameCard.tsx`
- **Problem:** `useUserLocation()` hook is called inside `GameCard` component. With 20 game cards on the games list, the hook is instantiated 20 times — potentially triggering 20 `navigator.geolocation.getCurrentPosition()` calls or 20 localStorage reads.
- **Fix:** Lift `useUserLocation()` to the parent `GamesPage` component. Pass `userLocation` as a prop to each `GameCard`. Single geolocation call for all cards.
- **Impact:** From 20× location fetches to 1×. Eliminates 19 redundant localStorage reads per games list render.

---

## API RESPONSE OPTIMIZATION

### PERF-007: No Pagination on Any List Endpoint
- **Priority:** CRITICAL
- **Effort:** 4 hours
- **Files:** `src/app/api/games/route.ts`, `src/app/api/messages/route.ts`, `src/app/api/lfg/route.ts`
- **Problem:** All list endpoints return unbounded result sets. At scale:
  - `/api/games` → returns all games (could be 10,000+)
  - `/api/messages` → returns all messages
  - `/api/lfg` → returns all LFG posts
- **Fix:** Implement cursor-based pagination on all list endpoints:
  ```typescript
  const games = await prisma.game.findMany({
    take: 20,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: { dateTime: 'asc' }
  })
  const nextCursor = games.length === 20 ? games[games.length - 1].id : null
  return { games: games.slice(0, 20), nextCursor }
  ```
- **Impact:** Response time becomes O(limit) instead of O(total). Essential for any real traffic.

### PERF-008: All Game Filtering is Client-Side
- **Priority:** HIGH
- **Effort:** 3 hours
- **Files:** `src/app/api/games/route.ts`, `src/app/(main)/games/page.tsx`
- **Problem:** City, gameType, stakes, status filters all happen in the browser after downloading all games. A user filtering for "Tel Aviv cash games" still downloads Jerusalem and Haifa games first.
- **Fix:** Pass filter params as query params to `/api/games`. Apply as Prisma `WHERE` clauses:
  ```typescript
  const where = {
    ...(city && { city }),
    ...(gameType && { gameType }),
    ...(status && { status }),
    ...(minBuyIn && { buyIn: { gte: minBuyIn } }),
  }
  ```
- **Impact:** Network payload reduced 90%+ for filtered views. DB does the work, not the browser.

### PERF-009: Response Payload Size — Unnecessary Fields
- **Priority:** MEDIUM
- **Effort:** 2 hours
- **Files:** `src/app/api/games/route.ts`, `src/app/api/users/[id]/route.ts`
- **Problem:** API responses include fields that aren't needed by the requesting client. Games list returns full `notes` text (can be 500+ chars), full `hostRatingsReceived` arrays, etc.
- **Fix:** Use Prisma `select` instead of `include` for list endpoints. Only return fields needed for the card view. Full detail only on `GET /api/games/[id]`.
- **Impact:** 30-50% reduction in JSON payload size for games list.

---

## CACHING

### PERF-010: No Caching on Games List
- **Priority:** HIGH
- **Effort:** 4 hours
- **Dependency:** Redis/Upstash setup
- **Files:** `src/app/api/games/route.ts`
- **Problem:** Every page load hits the database. Games list doesn't change second-to-second.
- **Strategy:**
  - Cache key: `games:${city}:${gameType}:${status}:${page}`
  - TTL: 60 seconds
  - Invalidate on: game create, update, delete, boost change
  ```typescript
  const cacheKey = `games:${city}:${gameType}:${page}`
  const cached = await redis.get(cacheKey)
  if (cached) return Response.json(JSON.parse(cached))
  const games = await prisma.game.findMany(...)
  await redis.setex(cacheKey, 60, JSON.stringify(games))
  ```
- **Impact:** Eliminates DB query for 95%+ of games list loads after warm-up.

### PERF-011: No Caching on Notification Count
- **Priority:** MEDIUM
- **Effort:** 2 hours
- **File:** `src/app/api/notifications/route.ts`
- **Problem:** Notification count is polled every 30 seconds from every logged-in user. At 100 users = 200 DB queries/minute just for notification counts.
- **Fix:** Cache count per user in Redis. Increment/decrement on notification write/read. Key: `notif_count:${userId}`. Invalidate on `prisma.notification.create()`.
- **Impact:** 200 DB queries/minute → near zero for notification badge counts.

### PERF-012: Next.js Response Caching Not Configured
- **Priority:** MEDIUM
- **Effort:** 1 hour
- **Files:** `src/app/api/games/route.ts`, `next.config.js`
- **Problem:** No `Cache-Control` headers on API responses. No `revalidate` on Server Components. Every request is treated as dynamic.
- **Fix:** Add `Cache-Control: s-maxage=30, stale-while-revalidate=60` to games list response. Use `export const revalidate = 30` in Server Components for quasi-static data.
- **Impact:** CDN caching of API responses. Free performance with 2 lines of config.

---

## FRONTEND PERFORMANCE

### PERF-013: No Error Boundaries
- **Priority:** HIGH
- **Effort:** 2 hours
- **Files:** `src/app/(main)/games/[id]/page.tsx`, `src/app/(main)/messages/[userId]/page.tsx`
- **Problem:** A single React rendering error anywhere in the component tree crashes the entire page. No `error.tsx` files in any route segment.
- **Fix:** Add `error.tsx` to each main route segment. Add `<ErrorBoundary>` wrappers around data-fetching components.
- **Impact:** A rating component error shouldn't take down the entire game detail page.

### PERF-014: Haversine Distance Computed on Every Render
- **Priority:** MEDIUM
- **Effort:** 1 hour
- **File:** `src/components/games/GameCard.tsx`
- **Problem:** `haversineKm(userLat, userLng, game.lat, game.lng)` is called on every render of `GameCard`. With 20 cards re-rendering on any state change, that's 20 distance calculations per re-render.
- **Fix:** Memoize with `useMemo(() => haversineKm(...), [userLat, userLng, game.lat, game.lng])`. Or compute distances once in parent component and pass as props.
- **Impact:** Eliminates redundant math on every re-render. Small but costs nothing to fix.

### PERF-015: Large Third-Party Libraries Not Code-Split
- **Priority:** MEDIUM
- **Effort:** 2 hours
- **Files:** `src/app/(main)/create-game/page.tsx`, `src/app/(main)/games/[id]/page.tsx`
- **Problem:** Heavy components (game creation form, rating modal) are loaded synchronously with the main bundle. Users who never create a game or rate anyone still download that code.
- **Fix:**
  ```typescript
  const CreateGameForm = dynamic(() => import('@/components/games/CreateGameForm'), {
    loading: () => <FormSkeleton />,
    ssr: false
  })
  ```
- **Impact:** 20-30% reduction in initial JS bundle size. Faster interaction time for most users.

---

## PERFORMANCE IMPLEMENTATION ORDER

```
Immediate (before any load testing):
  PERF-004 (indexes), PERF-001 (N+1 ratings), PERF-007 (pagination)

Week 1-2:
  PERF-002 (conversation query), PERF-003 (pending ratings), PERF-006 (location hook)
  PERF-008 (server-side filtering), PERF-013 (error boundaries)

Week 3-4:
  PERF-005 (parallel fetches), PERF-009 (response payload), PERF-010 (Redis cache)
  PERF-012 (HTTP caching), PERF-014 (haversine memoize)

Month 2:
  PERF-011 (notification cache), PERF-015 (code splitting)
```

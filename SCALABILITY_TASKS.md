# SCALABILITY TASKS
## Poker Israel — Engineering for Growth

> **Current Estimated Breaking Point:** ~50 concurrent authenticated users
> **Target:** 10,000 registered users, 500 concurrent

---

## DATABASE SCALABILITY

### SCALE-DB-001: Add Missing Database Indexes
- **Priority:** CRITICAL
- **Effort:** 1 hour
- **Files:** `prisma/schema.prisma`
- **Problem:** Every filtered query does a full table scan. O(n) per request.
- **Required Indexes:**
  ```prisma
  model Game {
    @@index([city, status, dateTime])
    @@index([gameType])
    @@index([hostId])
  }
  model GameRequest {
    @@index([userId])
    @@index([gameId, status])
  }
  model Message {
    @@index([senderId, createdAt])
    @@index([receiverId, createdAt])
    @@index([senderId, receiverId, createdAt])
  }
  model Strike {
    @@index([userId, createdAt])
  }
  model Notification {
    @@index([userId, createdAt])
    @@index([userId, read])
  }
  model LfgPost {
    @@index([city, status, expiresAt])
    @@index([userId, status])
  }
  ```
- **Impact:** Queries that currently take O(n) full scans become O(log n) indexed lookups. Essential before any production traffic.

### SCALE-DB-002: Denormalize avgRating on User
- **Priority:** HIGH
- **Effort:** 4 hours
- **Files:** `prisma/schema.prisma`, `src/app/api/games/route.ts`, `src/app/api/users/[id]/route.ts`
- **Problem:** `GET /api/games` fetches ALL host ratings for ALL hosts in the result set to compute avgRating. At 100 games × 50 ratings/host = 5,000 rating rows fetched per page load.
- **Fix:**
  1. Add `avgRating Float?` and `totalRatings Int @default(0)` to User model
  2. Update these fields in `POST /api/games/[id]/rate/host` and `POST /api/games/[id]/rate/player/[playerId]`
  3. Remove `hostRatingsReceived` join from `GET /api/games` and `GET /api/games/[id]`
- **Impact:** Games list query goes from O(games × ratings) to O(games). 10–100x speedup.

### SCALE-DB-003: Add Soft Delete to Game
- **Priority:** HIGH
- **Effort:** 2 hours
- **Files:** `prisma/schema.prisma`, `src/app/api/games/[id]/route.ts`
- **Problem:** Hard DELETE removes game data and can orphan related records.
- **Fix:** Add `deletedAt DateTime?`. Filter on `WHERE deletedAt IS NULL`. Change DELETE handler to `update({ data: { deletedAt: new Date() } })`.
- **Impact:** Data recovery, audit trail, proper referential integrity.

### SCALE-DB-004: Switch to PostgreSQL
- **Priority:** CRITICAL
- **Effort:** 2 hours (schema is compatible, just change connection string)
- **Files:** `prisma/schema.prisma`, `.env`, `.env.example`
- **Problem:** SQLite does not support concurrent writes, PostGIS geo queries, or proper connection pooling.
- **Fix:** Change datasource provider to "postgresql". Update DATABASE_URL. Set up Supabase, Neon, or RDS.
- **Impact:** Concurrent write support, PostGIS for geo queries, proper production-grade DB.

### SCALE-DB-005: Proper Migration Strategy
- **Priority:** CRITICAL
- **Effort:** 1 hour
- **Files:** `package.json`, CI/CD pipeline
- **Problem:** `prisma db push` in build script is destructive and leaves no migration history.
- **Fix:** 
  1. Run `prisma migrate dev --name init` to create migration history
  2. Replace `prisma db push` in build with `prisma migrate deploy`
  3. Add `prisma migrate deploy` to deployment pipeline (runs before app starts)
- **Impact:** Safe, reversible production deployments. Schema change history tracked.

---

## API & QUERY SCALABILITY

### SCALE-API-001: Add Pagination to All List Endpoints
- **Priority:** HIGH
- **Effort:** 4 hours
- **Files:** `src/app/api/games/route.ts`, `src/app/api/messages/route.ts`, `src/app/api/lfg/route.ts`
- **Problem:** All list endpoints return unbounded datasets. At 10,000 games, the games endpoint returns all 10,000 with full join data.
- **Fix:** Implement cursor-based pagination:
  ```typescript
  // Request: GET /api/games?cursor=lastGameId&limit=20
  // Response: { games: [...], nextCursor: "lastId" }
  const games = await prisma.game.findMany({
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
  })
  ```
- **Impact:** API response time becomes O(limit) instead of O(total_records). Essential for scale.

### SCALE-API-002: Rewrite Conversation List Query
- **Priority:** HIGH
- **Effort:** 3 hours
- **File:** `src/app/api/messages/route.ts`
- **Problem:** Fetches ALL messages to build conversation map in memory. O(total_messages) per request.
- **Fix:** SQL aggregation using raw query or Prisma's groupBy:
  ```sql
  SELECT DISTINCT ON (other_user_id)
    other_user_id, last_message, last_message_at, unread_count
  FROM messages
  WHERE sender_id = $uid OR receiver_id = $uid
  ORDER BY other_user_id, created_at DESC
  ```
- **Impact:** O(conversations) instead of O(all_messages). Orders of magnitude faster for active users.

### SCALE-API-003: Rewrite Pending Ratings Query
- **Priority:** MEDIUM
- **Effort:** 2 hours
- **File:** `src/app/api/ratings/pending/route.ts`
- **Problem:** 4 parallel queries + nested loops in memory. O(n²) complexity.
- **Fix:** Single query with NOT EXISTS:
  ```prisma
  await prisma.gameRequest.findMany({
    where: {
      userId: uid, status: 'APPROVED',
      game: { dateTime: { lt: now } },
      NOT: { game: { hostRatings: { some: { raterId: uid } } } }
    }
  })
  ```
- **Impact:** 4 queries → 1 query. Eliminates in-memory join.

### SCALE-API-004: Move Game Filtering to Server
- **Priority:** HIGH
- **Effort:** 3 hours
- **Files:** `src/app/api/games/route.ts`, `src/app/(main)/games/page.tsx`, `src/components/games/GameFilters.tsx`
- **Problem:** All game filtering (city, gameType, stakes, status) happens client-side after fetching all games.
- **Fix:** Pass filter params to API. Apply WHERE clauses in Prisma query. Return filtered + paginated results.
- **Impact:** Network payload reduced 90%+ for filtered views. Server does the work, not the browser.

---

## CACHING STRATEGY

### SCALE-CACHE-001: Redis Caching for Games List
- **Priority:** MEDIUM
- **Effort:** 4 hours
- **Dependency:** Redis setup (Upstash for serverless)
- **Problem:** Games list is queried on every page load with no caching.
- **Strategy:**
  - Cache key: `games:${city}:${gameType}:${status}:${page}`
  - TTL: 60 seconds
  - Invalidate: On game create, update, delete, or boost change
- **Impact:** Eliminates DB query for 95%+ of games list loads after warm-up.

### SCALE-CACHE-002: Cache Premium Status
- **Priority:** MEDIUM
- **Effort:** 1 hour
- **File:** `src/lib/premium.ts`
- **Problem:** `isPremiumHost()` hits DB on every game creation attempt.
- **Strategy:** Cache premium status in Redis with 5-minute TTL. Key: `premium:${userId}`. Invalidate on subscription change.
- **Impact:** Eliminates DB round-trip on every game creation check.

### SCALE-CACHE-003: Cache Notification Count
- **Priority:** MEDIUM
- **Effort:** 2 hours
- **File:** `src/app/api/notifications/route.ts`
- **Problem:** Notification count queried every 30 seconds from every user.
- **Strategy:** Cache count in Redis. Increment/decrement on notification create/read. Key: `notif_count:${userId}`.
- **Impact:** Reduces notification queries from DB to Redis (10x faster, 10x cheaper).

---

## REAL-TIME INFRASTRUCTURE

### SCALE-RT-001: Replace Chat Polling with WebSocket
- **Priority:** HIGH
- **Effort:** 8 hours
- **Files:** `src/app/(main)/messages/[userId]/page.tsx`, new `src/app/api/socket/route.ts`
- **Problem:** 3-second polling creates 2,000 DB queries/minute from 100 concurrent chat users.
- **Options (cheapest to most complex):**
  1. **Ably/Pusher** (managed, $): Add Ably SDK. On POST message, publish to user's channel. Client subscribes on mount.
  2. **Socket.io** (self-hosted): Add socket.io server. Requires stateful deployment (not serverless).
  3. **Server-Sent Events**: Simpler than WebSocket for one-directional updates.
- **Impact:** Real-time message delivery. Eliminates polling load. Battery-friendly on mobile.

### SCALE-RT-002: Replace Notification Polling with SSE
- **Priority:** HIGH
- **Effort:** 4 hours
- **Files:** `src/components/layout/Navbar.tsx`, new `src/app/api/notifications/stream/route.ts`
- **Problem:** 30-second polling from every authenticated user.
- **Fix:** Server-Sent Events endpoint. Each browser holds an open SSE connection. Server sends event when new notification is created.
- **Impact:** True real-time notifications. Eliminates 30-second poll latency. 10x reduction in DB notification queries.

---

## GEOSPATIAL SCALABILITY

### SCALE-GEO-001: PostGIS for Location Queries
- **Priority:** MEDIUM
- **Effort:** 8 hours
- **Dependency:** PostgreSQL (SCALE-DB-004)
- **Problem:** Location filtering is client-side Haversine. All games transferred before geo-filtering.
- **Fix:**
  1. Enable PostGIS extension on PostgreSQL
  2. Add `location geometry(Point, 4326)` column to Game
  3. Add `ST_DWithin(game.location, user_point, radius_km * 1000)` to WHERE clause
  4. Add GIST index on location column
- **Impact:** Server-side radius filtering. Only relevant games transferred. 90%+ payload reduction for geo-filtered queries.

### SCALE-GEO-002: Dynamic City Geocoding
- **Priority:** MEDIUM
- **Effort:** 3 hours
- **Files:** `src/lib/utils.ts`, `prisma/schema.prisma`
- **Problem:** 20 hardcoded city coordinates. 235+ Israeli municipalities uncovered.
- **Fix:** Move cities to a Cities table with lat/lng columns. Seed with expanded city list. Use OpenStreetMap Nominatim API for dynamic geocoding of new cities.
- **Impact:** Full Israeli market coverage. No more "my city isn't supported" complaints.

---

## INFRASTRUCTURE SCALABILITY

### SCALE-INFRA-001: CDN for Static Assets
- **Priority:** HIGH
- **Effort:** 2 hours (Vercel handles this automatically)
- **Problem:** Static assets (JS, CSS, images) served from origin server. No geographic distribution.
- **Fix:** Deploy on Vercel (CDN included) or add Cloudflare in front of any hosting provider.
- **Impact:** Global CDN edge serving. 50–200ms latency reduction for users outside the origin region.

### SCALE-INFRA-002: Image CDN
- **Priority:** HIGH (after SCALE-IMG-001)
- **Effort:** 2 hours (post image migration)
- **Problem:** Profile images stored as base64 in DB — no CDN, no optimization, no resizing.
- **Fix:** Cloudinary free tier handles: upload, resize, WebP conversion, CDN delivery.
- **Impact:** Images served from CDN. Automatic WebP for supporting browsers. 80% bandwidth reduction.

### SCALE-INFRA-003: Database Read Replicas
- **Priority:** LOW (future)
- **Effort:** 4 hours
- **Dependency:** PostgreSQL + high traffic
- **Problem:** All reads and writes go to the same database. At 1,000 concurrent users, reads saturate DB.
- **Fix:** Add read replica. Route all `SELECT` queries to replica, `INSERT/UPDATE/DELETE` to primary.
- **Impact:** 3–5x DB capacity increase with minimal cost addition.

---

## MONITORING & OBSERVABILITY

### SCALE-MON-001: Application Performance Monitoring
- **Priority:** HIGH
- **Effort:** 2 hours
- **Problem:** No visibility into slow queries, error rates, or response time distributions.
- **Fix:** Integrate DataDog APM or New Relic (free tier). Set up dashboards for:
  - API response time P50/P95/P99
  - DB query slow log
  - Error rate by endpoint
  - Active users
- **Impact:** Know about performance problems before users report them.

### SCALE-MON-002: Structured Logging
- **Priority:** HIGH
- **Effort:** 3 hours
- **Files:** All `src/app/api/*/route.ts` files
- **Problem:** `console.error` spread throughout codebase. No structured log format. Cannot query logs.
- **Fix:** Install `pino`. Create `src/lib/logger.ts`. Replace all `console.*` with logger calls.
  ```typescript
  import pino from 'pino'
  export const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' })
  ```
- **Impact:** Queryable logs. Structured JSON output. Integrates with log aggregators (Datadog, Papertrail).

---

## SCALABILITY IMPROVEMENT TIMELINE

| Week | Priority Items |
|------|----------------|
| 1 | SCALE-DB-001 (indexes), SCALE-DB-004 (PostgreSQL), SCALE-DB-005 (migrations) |
| 2 | SCALE-API-001 (pagination), SCALE-API-002 (messages query), SCALE-DB-002 (denormalize ratings) |
| 3 | SCALE-RT-001 (WebSocket chat), SCALE-RT-002 (SSE notifications) |
| 4 | SCALE-CACHE-001 (Redis games), SCALE-GEO-002 (dynamic cities) |
| Month 2 | SCALE-GEO-001 (PostGIS), SCALE-API-004 (server-side filtering) |
| Month 3 | SCALE-INFRA-003 (read replicas), SCALE-MON-001 (APM) |

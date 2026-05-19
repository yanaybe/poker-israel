# TRUST AND SAFETY TASKS
## Poker Israel — Community Safety Engineering Backlog

> **Context:** This is a platform where strangers meet at private homes for cash gambling. Trust and safety failures are physical safety failures, not just UX failures.

---

## USER MODERATION

### TS-001: User Ban / Suspension System
- **Priority:** CRITICAL
- **Effort:** 3 hours
- **Files:** `prisma/schema.prisma`, `src/lib/auth.ts`, `src/app/api/games/[id]/join/route.ts`, `src/app/api/messages/[userId]/route.ts`
- **Problem:** No `isBanned` or `banReason` field on User. Banned users cannot be prevented from joining games or sending messages.
- **Fix:**
  1. Add `isBanned Boolean @default(false)`, `banReason String?`, `bannedAt DateTime?` to User model
  2. Check `isBanned` in `authorize()` in `src/lib/auth.ts` — return null if banned
  3. Check `isBanned` in join, message, game creation, LFG post routes
- **Impact:** No way to remove bad actors from the platform currently.

### TS-002: Strike-to-Suspension Automation
- **Priority:** HIGH
- **Effort:** 2 hours
- **Files:** `src/app/api/games/[id]/route.ts` (PATCH handler, CANCELLED status)
- **Problem:** Strikes are tracked but never automatically enforced. The `canHostUntil` field exists but is never populated by any route handler (manual admin action only).
- **Fix:**
  1. On 3rd strike in rolling 90 days → set `canHostUntil = now + 30 days`
  2. On 5th strike total → set `isBanned = true`, `banReason = 'Too many strikes'`
  3. Check strike count in a dedicated `checkAndApplyStrikePenalties(userId)` utility
- **Impact:** Strike system has zero teeth currently — hosts know there are no real consequences.

### TS-003: User Reporting System
- **Priority:** HIGH
- **Effort:** 4 hours
- **Files:** `prisma/schema.prisma`, new `src/app/api/reports/route.ts`, `src/components/games/GameCard.tsx`, `src/app/(main)/games/[id]/page.tsx`
- **Problem:** No Report model. Users cannot report bad hosts, abusive players, or fake game listings.
- **Fix:**
  1. Add `Report` model: `reporterId, targetUserId?, targetGameId?, reason, description, status (PENDING/REVIEWED/DISMISSED), createdAt`
  2. Add "Report User" button on user profiles and game detail pages
  3. Add `POST /api/reports` route with auth check
  4. Add admin dashboard to review reports
- **Impact:** Without reporting, abusive behavior has no consequences and no visibility.

### TS-004: Admin Dashboard
- **Priority:** HIGH
- **Effort:** 8 hours
- **Files:** New `src/app/(admin)/` route group, `prisma/schema.prisma` (add `isAdmin` to User)
- **Problem:** No admin interface. All moderation is manual database manipulation.
- **Required Admin Capabilities:**
  - View all reports
  - Ban/unban users
  - View/delete games
  - View strikes per user
  - View payment history
  - Broadcast notifications
- **Fix:** Add `isAdmin Boolean @default(false)` to User. Create `/admin/*` route group with middleware guard. Build basic CRUD views.
- **Impact:** Platform cannot be moderated at any real scale without tooling.

---

## GAME SAFETY

### TS-005: Host Identity Verification
- **Priority:** HIGH (Pre-Launch)
- **Effort:** 8 hours
- **Files:** `prisma/schema.prisma`, new `src/app/api/verification/route.ts`, `src/components/profile/`
- **Problem:** Anyone can become a "host" and post a game with a home address with zero identity verification. Potential for scam games that collect join confirmations but have no real event.
- **Options:**
  1. **Phone verification** (SMS via Twilio) — quick, cheap, reduces fake accounts 90%
  2. **Government ID verification** (Persona, Onfido) — expensive but strongest trust signal
  3. **Social proof requirement** — require 3+ completed games before becoming "verified host"
- **Fix (Phase 1):** Phone verification via SMS OTP. Add `phoneVerified Boolean @default(false)` to User. Require phone verification before first game hosting.
- **Impact:** Currently zero barrier to posting fraudulent game listings.

### TS-006: Location Reveal Audit
- **Priority:** HIGH
- **Effort:** 2 hours
- **File:** `src/app/api/games/[id]/route.ts`
- **Problem:** The 2-hour-before-game location reveal is implemented but the logic has NOT been audited to confirm `location` key is fully omitted (not just null) before reveal time. A null vs. undefined distinction could leak data.
- **Fix:**
  1. Audit response object: use `delete game.location` rather than setting to null
  2. Add integration test: fetch game 3 hours before → location must not be in response body at all
  3. Add integration test: fetch game 1 hour before → approved player sees location
- **Impact:** Host home addresses exposed to players who haven't been approved yet.

### TS-007: Game Cancellation Notifications
- **Priority:** HIGH
- **Effort:** 2 hours
- **File:** `src/app/api/games/[id]/route.ts` (PATCH, status → CANCELLED)
- **Problem:** When a host cancels a game, approved players receive NO notification. They may show up at a private address with no one home.
- **Fix:** On `status: 'CANCELLED'`, create Notification records for all approved GameRequest users. Send push notification (once PUSH-001 is implemented).
- **Impact:** Players physically traveling to a game that was silently cancelled. Real-world safety and trust risk.

### TS-008: Player Block System
- **Priority:** HIGH
- **Effort:** 4 hours
- **Files:** `prisma/schema.prisma`, new `src/app/api/blocks/route.ts`, `src/app/api/messages/[userId]/route.ts`
- **Problem:** No mechanism for users to block each other. A harassing player can continue messaging a host indefinitely.
- **Fix:**
  1. Add `Block` model: `blockerId, blockedId, createdAt`. Unique on (blockerId, blockedId).
  2. Add `POST /api/blocks` and `DELETE /api/blocks/[userId]`
  3. Check block in `POST /api/messages/[userId]` — return 403 if blocked
  4. Filter blocked users from game request lists
- **Impact:** No protection against harassment. Particularly serious given home address sharing.

---

## PAYMENT SAFETY

### TS-009: Premium Status Verification on Game Create
- **Priority:** HIGH
- **Effort:** 1 hour
- **Files:** `src/app/api/games/route.ts`, `src/lib/premium.ts`
- **Problem:** `isPremiumHost()` is called on game creation, but there is NO check that verifies the subscription is still active at the time of posting. A user who cancels their subscription but whose `Subscription.endDate` is in the future can still post games — this is correct behavior, but it's not explicitly verified.
- **Fix:** Verify `isPremiumHost()` actually checks `endDate > now` (it does via Subscription model but document this explicitly). Add logging when premium check fires.
- **Impact:** Free-tier bypass if premium check logic has edge case bugs.

### TS-010: Refund Policy Enforcement
- **Priority:** MEDIUM
- **Effort:** 3 hours
- **Problem:** No refund flow exists. A host cancels a boosted game — the ₪30-80 boost fee is not refunded. No policy, no UI, no mechanism.
- **Fix:**
  1. Define refund policy: boosts non-refundable (as most ad systems work) OR partial refund for early cancellation
  2. Add refund endpoint using PayPlus refund API
  3. Document policy in ToS
- **Impact:** Host frustration when they cancel a game with an active boost.

---

## CONTENT MODERATION

### TS-011: Game Notes Content Filtering
- **Priority:** MEDIUM
- **Effort:** 3 hours
- **Files:** `src/app/api/games/route.ts`, `src/app/api/lfg/route.ts`
- **Problem:** Game notes, LFG post notes, and messages have zero content filtering. Racist content, phone numbers for off-platform payment, illegal activity coordination can all be posted freely.
- **Fix:**
  1. **Basic:** Server-side profanity filter (Israeli Hebrew + English)
  2. **Better:** Phone number/external URL pattern blocking to prevent off-platform migration
  3. **Best:** AI moderation API (Perspective API, OpenAI Moderation) for context-aware filtering
- **Impact:** Platform liability for hosted content. WhatsApp group migration risk (off-platform poaching).

### TS-012: Rating Manipulation Prevention
- **Priority:** MEDIUM
- **Effort:** 2 hours
- **File:** `src/app/api/games/[id]/rate/host/route.ts`, `src/app/api/games/[id]/rate/player/[playerId]/route.ts`
- **Problem:** Rating system uses `upsert` which prevents duplicate ratings, but there's no check that:
  1. The rater actually attended the game (was APPROVED, not just PENDING)
  2. The game has actually occurred (dateTime is in the past)
- **Fix:** Add validation: `gameRequest.status === 'APPROVED'` AND `game.dateTime < now` before allowing rating creation.
- **Impact:** Players rejected from a game could still rate the host negatively.

### TS-013: Message History Visibility
- **Priority:** MEDIUM
- **Effort:** 2 hours
- **File:** `src/app/api/messages/[userId]/route.ts`
- **Problem:** A user can fetch message history with any other user ID, even if no conversation exists and even if blocked. There's no authorization check that the requesting user is a participant in the conversation.
- **Fix:** Validate `userId` is a participant: `where: { OR: [{ senderId: session.uid, receiverId: userId }, { senderId: userId, receiverId: session.uid }] }` (already partially in place but verify).
- **Impact:** Privacy violation — could expose metadata about conversations.

---

## LEGAL COMPLIANCE

### TS-014: Age Verification Enforcement
- **Priority:** HIGH (Legal)
- **Effort:** 2 hours
- **Files:** `src/app/api/auth/register/route.ts`, `prisma/schema.prisma`
- **Problem:** Real-money gambling at registered users. Age field is optional on registration. No backend age check. Minors can join.
- **Fix:**
  1. Make `age` required in registration with backend validation `>= 18`
  2. Add `dateOfBirth Date?` to User for proper verification (vs. self-reported age)
  3. Add ToS checkbox with "I confirm I am 18 years of age or older"
- **Impact:** Legal liability for facilitating underage gambling in Israel.

### TS-015: Israeli Gambling Law Compliance
- **Priority:** HIGH (Legal)
- **Effort:** 2 hours (review) + legal counsel
- **Problem:** Israeli gambling law (Penal Code Section 225) has specific carve-outs for private games. Platform may need to:
  1. Limit game size (players, buy-in)
  2. Not facilitate house-cut games (facilitating rake may constitute operating a gambling enterprise)
  3. Not advertise "win money" outcomes
- **Fix:** Get Israeli gaming law counsel review before public launch. Add disclaimers. Consider limiting visible house fee % in search results.
- **Impact:** Criminal liability for platform operators under Israeli gambling laws.

---

## TRUST AND SAFETY IMPLEMENTATION ORDER

```
Week 1: TS-001 (ban system), TS-007 (cancellation notifications), TS-014 (age verification)
Week 2: TS-002 (strike automation), TS-003 (reporting), TS-006 (location reveal audit), TS-008 (block system)
Week 3: TS-004 (admin dashboard), TS-005 (phone verification), TS-012 (rating validation)
Week 4: TS-011 (content filtering), TS-013 (message privacy), TS-015 (legal review)
Month 2: TS-009, TS-010 (payment safety), TS-005 advanced (ID verification)
```

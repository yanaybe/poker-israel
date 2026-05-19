# MARKETPLACE RISKS
## Poker Israel — Growth, Trust & Business Model Engineering

> **Context:** Two-sided marketplace (hosts vs. players). Cold start problem, network effects, unit economics, and supply/demand balance are as important as code quality.

---

## SUPPLY SIDE (HOST) RISKS

### MKT-001: Host Cold Start — Zero Games = Zero Players
- **Priority:** CRITICAL (Business)
- **Effort:** 4 hours
- **Files:** `src/app/page.tsx`, `prisma/seed.ts`
- **Problem:** Landing page shows fake hardcoded stats ("500+ games", "50+ hosts", "10+ cities"). When a real user visits and sees 0 real games in their city, they leave immediately and never return.
- **Fix:**
  1. Replace fake stats with real DB counts (dynamic, server-side)
  2. Build "coming soon to [city]" waitlist feature for cities with 0 games
  3. Create "invite a host" referral flow specifically targeting known poker hosts
  4. Seed real content with permission from beta host partners before launch
- **Impact:** First impressions destroy trust. Fake stats are also a legal liability.

### MKT-002: Host Premium Conversion Funnel Broken
- **Priority:** HIGH
- **Effort:** 3 hours
- **Files:** `src/app/(main)/games/page.tsx`, `src/components/games/GameCard.tsx`, `src/app/(main)/premium/page.tsx`
- **Problem:** Free hosts hit the 3-game/month limit with no clear upgrade path. No upsell banner, no "you've used 2/3 games this month" counter, no urgency. Premium page exists but is never surfaced contextually.
- **Fix:**
  1. Show "2/3 free games used this month" counter in host dashboard
  2. Add inline upsell when host tries to create a 4th game: "Upgrade to post unlimited games"
  3. Show "Boosted" badge value proposition on game cards
  4. Email reminder when free limit reached (requires email service)
- **Impact:** Revenue leakage — hosts who would pay don't because the upgrade path is invisible.

### MKT-003: Boost ROI Not Demonstrated
- **Priority:** HIGH
- **Effort:** 2 hours
- **Files:** `src/app/(main)/games/page.tsx`, `src/components/games/GameCard.tsx`
- **Problem:** Boosted games show a star badge but:
  1. There's no data showing hosts what boost actually does (view count, fill rate)
  2. Non-boosted games fill up anyway in low-supply markets
  3. ₪80 for 7 days with no ROI evidence has zero conversion rate
- **Fix:**
  1. Add "X players viewed this game" counter on host's own game page
  2. Show "Boosted games fill 3x faster" stat on boost purchase page
  3. Track and display host-specific analytics: views, join rate, fill rate
- **Impact:** Boost is core revenue. If hosts don't see value, they cancel premium and stop boosting.

### MKT-004: Host Onboarding Flow Missing
- **Priority:** HIGH
- **Effort:** 4 hours
- **Files:** New `src/app/(main)/onboarding/` route group
- **Problem:** After registration, new hosts land on games list with no guidance. Creating a first game requires finding the button, filling a complex form, understanding pricing options — all without any tutorial or template.
- **Fix:**
  1. Add post-registration onboarding checklist: "Complete your profile → Create first game → Invite players"
  2. Add first-game template suggestions (pre-fill common settings for their city/skill level)
  3. Add "Your first game is free" explicit messaging
- **Impact:** Host activation rate is the #1 metric for two-sided marketplace growth.

### MKT-005: Game Edit Page is a 404
- **Priority:** HIGH
- **Effort:** 3 hours
- **Files:** New `src/app/(main)/games/[id]/edit/page.tsx`
- **Problem:** The game detail page links to `/games/[id]/edit` but this route doesn't exist. Hosts cannot edit their games after creation. This is discovered only after publishing.
- **Fix:** Create the edit page using the existing PATCH `/api/games/[id]` endpoint. Pre-fill form with existing game data.
- **Impact:** Hosts who need to change time, address, or buy-in must either delete and recreate, or contact support.

---

## DEMAND SIDE (PLAYER) RISKS

### MKT-006: Player Discovery Friction
- **Priority:** HIGH
- **Effort:** 4 hours
- **Files:** `src/app/(main)/games/page.tsx`, `src/components/games/GameFilters.tsx`
- **Problem:** All game filtering is client-side after fetching all games. On mobile, the filter UI is not prominent. A player looking for "1/2 cash game this weekend in Tel Aviv" must:
  1. Load all games
  2. Manually set 3 filters
  3. Remember to set date filter (no default)
- **Fix:**
  1. URL-based filter state (shareable filtered views)
  2. "Games tonight" one-tap filter
  3. Persistent filter preferences per user (localStorage or DB)
  4. "Near me" button that uses geolocation immediately
- **Impact:** Players who don't find relevant games in first session never return.

### MKT-007: No Game Alerts / Notifications
- **Priority:** HIGH
- **Effort:** 4 hours
- **Files:** New `src/app/api/game-alerts/route.ts`, `prisma/schema.prisma`
- **Problem:** A player in Tel Aviv looking for a 2/5 game gets no notification when one is posted. They have to manually check the app. This is the most valuable retention feature and it doesn't exist.
- **Fix:**
  1. Add `GameAlert` model: `userId, city, gameType?, stakes?, minBuyIn?, maxBuyIn?`
  2. Add alert subscription UI on games list page
  3. Trigger notification + email on game creation if it matches any alert
- **Impact:** Without alerts, retained players are rare. Most users visit once and forget.

### MKT-008: LFG (Looking for Game) Under-Utilized
- **Priority:** MEDIUM
- **Effort:** 2 hours
- **Files:** `src/app/(main)/lfg/page.tsx`, `src/app/api/games/route.ts`
- **Problem:** LFG posts are completely disconnected from the game creation flow. When a host posts a game in a city where LFG posts exist, nothing happens. Two features that should power each other are isolated.
- **Fix:**
  1. When game is posted, check for matching LFG posts (same city, overlapping game type/stakes)
  2. Notify matching LFG posters: "A game matching your search was just posted"
  3. Show LFG count on games list: "3 players looking for a game in Tel Aviv tonight"
- **Impact:** LFG feature has no virality or utility without cross-feature integration.

---

## MARKETPLACE HEALTH RISKS

### MKT-009: Off-Platform Migration Risk
- **Priority:** HIGH
- **Effort:** 2 hours
- **Files:** `src/app/api/games/route.ts`, `src/app/api/messages/[userId]/route.ts`
- **Problem:** Nothing prevents hosts from posting "WhatsApp: 050-XXXXXXX" in game notes. Once players get the host's WhatsApp, they bypass the platform for all future games — destroying LTV.
- **Fix:**
  1. Filter phone numbers and external URLs from game notes (regex-based)
  2. Make on-platform messaging more valuable than WhatsApp (message history, notifications)
  3. Add "Share game" feature that deeplinks to the game page (not external chat)
- **Impact:** Every successful WhatsApp migration loses that host's future subscription revenue.

### MKT-010: Fake Game Listings
- **Priority:** HIGH
- **Effort:** 3 hours
- **Files:** `prisma/schema.prisma`, `src/app/api/games/route.ts`
- **Problem:** No mechanism to detect or prevent fake game listings (games posted to collect player data with no intention of hosting). Zero friction to post a game and ghost all approved players.
- **Fix:**
  1. Track "no-show rate" per host: games CANCELLED with approved players / total games hosted
  2. Auto-suspend hosts with no-show rate > 20% (with 5+ games sample)
  3. Add "Game Completed" confirmation step (host marks game as done → triggers rating period)
  4. Require phone verification before first game post
- **Impact:** One fake game experience destroys a player's trust in the platform permanently.

### MKT-011: Review Gaming and Social Proof Quality
- **Priority:** MEDIUM
- **Effort:** 3 hours
- **Files:** `src/app/api/games/[id]/rate/`, `src/app/(main)/games/[id]/page.tsx`
- **Problem:** Rating system doesn't differentiate between 1 rating and 50 ratings in the UI. A host with 1× 5-star rating appears equal to a host with 50× 4.8-star ratings.
- **Fix:**
  1. Show rating count prominently: "4.8 ★ (47 ratings)"
  2. Add "Verified Host" badge for hosts with 10+ completed games and 4.5+ rating
  3. Sort by (rating × log(count)) Bayesian average — not raw average
- **Impact:** New hosts with inflated 1-rating scores compete unfairly with established hosts.

### MKT-012: No Recurring Game Support
- **Priority:** MEDIUM
- **Effort:** 6 hours
- **Files:** `prisma/schema.prisma`, `src/app/api/games/route.ts`
- **Problem:** Many poker hosts run the same game every week. They must manually create a new game every time, which is friction that leads to them finding a simpler solution (WhatsApp group).
- **Fix:**
  1. Add `isRecurring Boolean @default(false)`, `recurringSchedule String?` (cron-like or "weekly-friday") to Game
  2. Auto-create next game instance 7 days before the recurring game date
  3. "Subscribe to recurring game" for players → auto-notify on new instance
- **Impact:** Recurring games = predictable revenue for premium hosts = higher retention.

---

## UNIT ECONOMICS RISKS

### MKT-013: Pricing Not Localized or Tested
- **Priority:** MEDIUM
- **Effort:** 2 hours
- **Files:** `src/lib/premium.ts`, `src/lib/payplus.ts`, `src/app/(main)/premium/page.tsx`
- **Problem:** ₪199/month, ₪30/₪50/₪80 boosts are hardcoded with zero market research documentation. No A/B test infrastructure. No annual plan option (which dramatically reduces churn).
- **Fix:**
  1. Add annual plan: ₪1,590/year (~33% discount vs monthly)
  2. Document pricing rationale in a comment or PRICING.md
  3. Add PostHog A/B test for boost pricing (₪25 vs ₪30 vs ₪35)
- **Impact:** Wrong pricing = either leaving money on the table or price-blocking potential hosts.

### MKT-014: No Referral / Viral Loop
- **Priority:** MEDIUM
- **Effort:** 4 hours
- **Files:** `prisma/schema.prisma`, new `src/app/api/referrals/route.ts`
- **Problem:** No referral mechanism. Growth depends entirely on paid acquisition or organic discovery. Poker players know dozens of other poker players — a referral loop is the highest-ROI growth feature possible.
- **Fix:**
  1. Add `referralCode String @unique?` and `referredById String?` to User
  2. Generate unique referral link per user: `https://domain.com/r/[code]`
  3. On referred user's first game attendance: give referrer 1 free month of premium
- **Impact:** Each active user knows 5-20 other poker players. Viral coefficient could be > 1.

---

## MARKETPLACE RISK IMPLEMENTATION ORDER

```
Pre-Launch (Week 1-2):
  MKT-001 (fake stats), MKT-005 (edit page 404), MKT-007 (game alerts)

Pre-Launch (Week 3):
  MKT-002 (premium funnel), MKT-004 (host onboarding), MKT-006 (player discovery)

Launch Month:
  MKT-008 (LFG integration), MKT-009 (off-platform migration), MKT-010 (fake games)

Month 2:
  MKT-003 (boost ROI), MKT-011 (review quality), MKT-012 (recurring games)

Month 3:
  MKT-013 (pricing), MKT-014 (referral loop)
```

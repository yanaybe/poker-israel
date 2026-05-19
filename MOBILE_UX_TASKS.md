# MOBILE UX TASKS
## Poker Israel — Mobile-First Engineering Backlog

> **Context:** Target users are Israeli poker players discovering games on their phones — primarily in WhatsApp-heavy mobile usage patterns. The app must feel like a native app, not a desktop website viewed on mobile.

---

## NAVIGATION

### MOB-001: Bottom Navigation Bar (Critical for Mobile)
- **Priority:** CRITICAL
- **Effort:** 3 hours
- **Files:** `src/components/layout/Navbar.tsx`, new `src/components/layout/BottomNav.tsx`
- **Problem:** The only navigation is a top navbar with a hamburger menu. On mobile, all key actions (Games, Messages, Notifications, Profile) require reaching to the top of the screen — the hardest area to reach with one hand.
- **Fix:** Add fixed bottom navigation bar on screens < 768px:
  ```
  [🃏 Games] [💬 Messages] [🔔 Notifs] [👤 Profile]
  ```
  Show unread badge on Messages and Notifications. Use `usePathname()` to highlight active tab.
- **Accessibility:** Each target must be ≥ 44px (WCAG 2.5.5)
- **Impact:** Core navigation pattern for mobile apps. Reduces all navigation to one thumb-reachable tap.

### MOB-002: PWA Manifest — "Add to Home Screen"
- **Priority:** HIGH
- **Effort:** 2 hours
- **Files:** New `public/manifest.json`, `src/app/layout.tsx`
- **Problem:** No PWA manifest. Users cannot add the app to their home screen. Without this, it opens in a browser tab with address bar, back button, etc. — not app-like.
- **Fix:**
  1. Create `public/manifest.json` with name, icons (192px + 512px), theme_color, display: "standalone", start_url
  2. Add `<link rel="manifest" href="/manifest.json">` to layout.tsx
  3. Add `apple-mobile-web-app-capable` meta tag for iOS
  4. Create app icons in multiple sizes
- **Impact:** Home screen icon = 3x higher retention vs browser-only access.

### MOB-003: Mobile Keyboard Push Fix
- **Priority:** HIGH
- **Effort:** 2 hours
- **File:** `src/app/(main)/messages/[userId]/page.tsx`
- **Problem:** On iOS and Android, when the software keyboard opens in the chat view, it pushes the input field behind the keyboard or the message list doesn't scroll to the latest message.
- **Fix:**
  ```typescript
  useEffect(() => {
    const handler = () => {
      window.scrollTo(0, document.documentElement.scrollHeight)
    }
    visualViewport?.addEventListener('resize', handler)
    return () => visualViewport?.removeEventListener('resize', handler)
  }, [])
  ```
  Use `visualViewport` API for reliable cross-browser keyboard detection.
- **Impact:** Broken chat input on mobile is a critical UX failure for the most important feature.

### MOB-004: Back Navigation Consistency
- **Priority:** MEDIUM
- **Effort:** 2 hours
- **Files:** Multiple page components
- **Problem:** No explicit back button on game detail pages, message threads, or profile views. On mobile browsers with limited chrome, users rely on in-app back navigation.
- **Fix:** Add `router.back()` chevron button at top-left of all secondary pages. Match iOS/Android back navigation conventions.
- **Impact:** Users get trapped on pages with no clear exit path.

---

## TOUCH & INTERACTION

### MOB-005: Touch Target Sizes (WCAG Compliance)
- **Priority:** HIGH
- **Effort:** 2 hours
- **Files:** `src/components/games/GameCard.tsx`, `src/components/layout/Navbar.tsx`, multiple form components
- **Problem:** Several interactive elements are below 44×44px minimum:
  - Game card action buttons
  - Navbar icon buttons
  - Filter checkboxes
  - Rating star buttons
- **Fix:** Audit all interactive elements with browser devtools. Add `min-h-[44px] min-w-[44px]` to all tappable elements. Use padding instead of changing visual size where needed.
- **Impact:** WCAG 2.5.5 compliance. Dramatic improvement in tap accuracy for users with larger fingers.

### MOB-006: Swipe Gestures on Game Cards
- **Priority:** LOW
- **Effort:** 4 hours
- **Files:** `src/components/games/GameCard.tsx`
- **Problem:** Game browsing is scroll-only. No swipe-to-dismiss, no swipe-to-bookmark, no swipe-to-share. Native apps in this space use swipe interactions for speed.
- **Fix:** Add touch event handlers for horizontal swipe: swipe-right = "interested" (saves to watchlist), swipe-left = "not for me" (hide from this session).
- **Dependency:** Requires watchlist/bookmark feature (MKT feature)
- **Impact:** Power user efficiency. Reduces friction for users browsing many games.

---

## FORMS & INPUT

### MOB-007: Game Creation Form — Mobile Optimization
- **Priority:** HIGH
- **Effort:** 3 hours
- **File:** `src/app/(main)/create-game/page.tsx`
- **Problem:** Game creation form is a long single-page form with ~20 fields. On mobile:
  1. Date/time picker uses native browser controls (inconsistent across devices)
  2. Number inputs have no stepper buttons (hard to enter 500 on mobile keyboard)
  3. No form progress indicator (users don't know how long the form is)
  4. No draft saving (lose all input if you navigate away)
- **Fix:**
  1. Add multi-step form wizard with progress bar (Step 1: Basic Info, Step 2: Game Details, Step 3: Rules & Notes)
  2. Add localStorage draft auto-save
  3. Use native date/time inputs with `inputmode="numeric"` on number fields
- **Impact:** Form abandonment is the #1 reason new hosts don't complete game creation.

### MOB-008: Registration Form Mobile UX
- **Priority:** MEDIUM
- **Effort:** 1 hour
- **File:** `src/app/(auth)/register/page.tsx`
- **Problem:** Email input missing `autocomplete="email"`. Password inputs missing `autocomplete="new-password"`. City select not using native mobile picker.
- **Fix:**
  1. Add `autocomplete` attributes to all form fields
  2. Add `inputmode="email"` on email field
  3. Add `inputmode="tel"` on phone number field (when added)
- **Impact:** Password manager support. Faster form completion on mobile.

---

## PERFORMANCE ON MOBILE

### MOB-009: Image Optimization for Mobile
- **Priority:** HIGH
- **Effort:** 2 hours (config only, full fix requires IMG-001)
- **Files:** `next.config.js`, `src/components/games/GameCard.tsx`, profile components
- **Problem:** Profile images stored as base64 strings. On a games list with 20 hosts, that's 20 full-resolution images loaded as inline data URIs with no lazy loading, no WebP conversion, no responsive sizes.
- **Fix (immediate):**
  1. Add `loading="lazy"` to all profile images
  2. Add `sizes` attribute for responsive image loading
- **Fix (full):** Migrate to Cloudinary (IMG-001) for automatic WebP + responsive sizing
- **Impact:** 80%+ reduction in initial page load data transfer on mobile networks.

### MOB-010: First Contentful Paint Optimization
- **Priority:** MEDIUM
- **Effort:** 3 hours
- **Files:** `src/app/(main)/games/page.tsx`, `src/app/page.tsx`
- **Problem:** Games list page is fully client-side rendered. On a 4G connection, users see a blank page or loading spinner for 2-3 seconds before any content appears.
- **Fix:**
  1. Convert games list to `async` Server Component with `await prisma.game.findMany()`
  2. Use React Suspense boundaries for progressive loading
  3. Add skeleton loading UI for game cards
- **Impact:** Perceived performance improvement of 2-3 seconds on mobile networks.

### MOB-011: Reduce JavaScript Bundle Size
- **Priority:** MEDIUM
- **Effort:** 2 hours
- **Files:** `next.config.js`, various component imports
- **Problem:** No bundle analysis has been run. date-fns, react-hook-form, zod, and lucide-react are large libraries. On slow mobile connections, JS parse time dominates.
- **Fix:**
  1. Run `@next/bundle-analyzer`
  2. Ensure date-fns is tree-shaken (import specific functions, not the whole library)
  3. Lazy-load heavy components (game creation form, rating modal) with `dynamic()`
- **Impact:** 200-500ms faster interaction-ready time on mid-range Android devices.

---

## OFFLINE & CONNECTIVITY

### MOB-012: Offline State Handling
- **Priority:** MEDIUM
- **Effort:** 2 hours
- **Files:** `src/components/layout/`, `src/app/(main)/`
- **Problem:** No offline state detection. If a user loses connectivity mid-session (common on mobile), they see generic network errors with no guidance.
- **Fix:**
  1. Detect `navigator.onLine` and `offline`/`online` events
  2. Show "No internet connection" banner when offline
  3. Queue message sends and retry on reconnect
- **Impact:** Critical for users checking the app in areas with spotty coverage.

### MOB-013: Service Worker for Offline Caching
- **Priority:** LOW
- **Effort:** 4 hours
- **Dependency:** MOB-002 (PWA manifest)
- **Problem:** No service worker. Static assets are re-downloaded on every visit. App doesn't work at all offline.
- **Fix:** Add service worker via `next-pwa` or custom implementation. Cache: app shell, fonts, static images. Don't cache API responses (game data must be fresh).
- **Impact:** Instant app shell load on repeat visits. Graceful offline fallback page.

---

## ACCESSIBILITY

### MOB-014: RTL Language Support Audit
- **Priority:** HIGH
- **Effort:** 3 hours
- **Files:** `src/app/layout.tsx`, multiple component files
- **Problem:** The app is Hebrew-first but:
  1. `dir="rtl"` needs to be verified on root HTML element
  2. Some TailwindCSS `left-`/`right-` utilities may not respect RTL without `rtl:` variants
  3. Chevron icons (back/forward arrows) may point the wrong direction
  4. Date formatting (date-fns) may show dates in LTR order
- **Fix:** Audit with `dir="rtl"` explicitly set. Use TailwindCSS `start-`/`end-` logical properties instead of `left-`/`right-`. Add `lang="he"` to `<html>` tag.
- **Impact:** Hebrew text rendering, RTL layout, and date formatting correctness.

### MOB-015: Screen Reader Support
- **Priority:** LOW
- **Effort:** 3 hours
- **Files:** Multiple component files
- **Problem:** Icon-only buttons (close X, hamburger menu, filter icons) have no `aria-label`. Dynamic content updates (new notifications, new messages) have no `aria-live` regions.
- **Fix:**
  1. Add `aria-label` to all icon-only buttons
  2. Add `aria-live="polite"` to notification count
  3. Add `role="dialog"` + focus management on modals
- **Impact:** Accessibility compliance. VoiceOver/TalkBack support for visually impaired users.

---

## MOBILE UX IMPLEMENTATION ORDER

```
Pre-Launch (Week 1-2):
  MOB-001 (bottom nav), MOB-003 (keyboard push), MOB-005 (touch targets), MOB-009 (image lazy load)

Pre-Launch (Week 3):
  MOB-002 (PWA manifest), MOB-007 (game creation form), MOB-014 (RTL audit)

Launch Month:
  MOB-004 (back navigation), MOB-008 (form autocomplete), MOB-010 (SSR games list), MOB-012 (offline state)

Month 2:
  MOB-006 (swipe gestures), MOB-011 (bundle size), MOB-013 (service worker), MOB-015 (screen reader)
```

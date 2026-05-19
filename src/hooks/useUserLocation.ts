// TODO [HIGH][Privacy]:
// This hook requests the user's precise GPS coordinates via the browser geolocation API.
// These coordinates are stored in localStorage without encryption and without
// any explicit user consent beyond the browser's built-in permission prompt.
// Fix: Add explicit in-app consent step before requesting location:
// "Sharing your location helps us show nearby games. [Allow] [Decline]"
// Store consent decision separately. Respect privacy preference.
// Risk: GDPR Article 6 requires lawful basis for processing location data.
// Storing precise GPS in localStorage is a privacy violation without explicit consent.

// TODO [HIGH][Privacy]:
// Location is cached in localStorage with the key 'userLocation' containing
// precise GPS coordinates (lat, lng). Any third-party script (analytics, ads)
// running on the page can read this from localStorage.
// Fix: Derive an approximate location (nearest city center) instead of storing
// precise GPS. Round coordinates to 2 decimal places (~1km precision).
// Risk: Precise user GPS data accessible to any JS running on the page.

// TODO [MEDIUM][UX]:
// No user feedback when geolocation is denied. The hook silently returns null
// and the UI shows no distance information with no explanation.
// Fix: Set a `permissionDenied` state and show a message:
// "Enable location to see distance to games" with a settings deep-link.
// Risk: Users don't understand why distance info is missing.

// TODO [MEDIUM][UX]:
// Location is cached for 10 minutes but never re-requested during the session
// even if the user has moved. For a mobile app, location should update on demand.
// Fix: Add a manual "refresh location" option in the UI.
// Risk: Users who moved see stale distance calculations for 10 minutes.

// TODO [MEDIUM][Performance]:
// Every component that calls useUserLocation() is a potential duplicate hook
// instance (see GameCard TODO). This hook should be elevated to a context provider
// so only one geolocation request is made per session.
// Fix: Create LocationContext that wraps the app and exposes useUserLocation().
// Risk: Multiple simultaneous geolocation requests from multiple card renders.

// TODO [LOW][UX]:
// No graceful degradation for server-side rendering. navigator.geolocation
// is not available on the server — the `if (!navigator.geolocation) return`
// check handles this, but the hook returns null during SSR and hydration,
// causing a layout shift when location loads.
// Fix: Keep current SSR-safe pattern but add a skeleton/loading state in the UI.
// Risk: Layout shift when distance estimates appear after hydration.

'use client'

import { useEffect, useState } from 'react'

interface Location { lat: number; lng: number }

const CACHE_KEY = 'userLocation'
// TODO [HIGH][Privacy]: Store approximate location only (round to 2 decimal places).
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

export function useUserLocation() {
  const [location, setLocation] = useState<Location | null>(null)

  useEffect(() => {
    // Try cache first
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const { lat, lng, ts } = JSON.parse(cached)
        if (Date.now() - ts < CACHE_TTL) {
          setLocation({ lat, lng })
          return
        }
      }
    } catch {}

    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setLocation(loc)
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ...loc, ts: Date.now() }))
        } catch {}
      },
      () => {},
      { timeout: 5000, maximumAge: CACHE_TTL }
    )
  }, [])

  return location
}

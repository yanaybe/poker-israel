'use client'

import { useEffect, useState } from 'react'

interface Location { lat: number; lng: number }

const CACHE_KEY = 'userLocation'
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

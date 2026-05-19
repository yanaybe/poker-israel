// TODO [HIGH][Performance]:
// This page fetches ALL games from /api/games with no pagination.
// If there are 500 games, all 500 are fetched, transferred, and rendered.
// Fix: Implement server-side pagination. Render initial 20 games. Load more on scroll.
// Use IntersectionObserver for infinite scroll or manual "Load more" button.
// Risk: Page load time increases linearly with game count. Will crash mobile browsers.

// TODO [HIGH][UX]:
// Filtering is entirely client-side. All games are fetched first, then filtered
// by city/gameType/stakes/status in JavaScript. This means:
//   1. All data is sent over the network even when 90% is irrelevant
//   2. Filter changes are instant (good) but at the cost of pre-loading everything
// Fix: Move filtering to server-side query params on /api/games.
// Use URLSearchParams to reflect filters in the URL (shareable links!).
// Risk: At scale, massive data transfer; filter changes cause full re-fetches.

// TODO [HIGH][UX]:
// Empty state when no games are found could be more actionable.
// Currently shows: "אין משחקים כרגע" with create game CTA.
// Should show: "No games in Tel Aviv right now. [Post a game] [Set up alert]"
// Fix: Context-aware empty states based on which filter is active.
// Risk: Users with city filter set see "no games" without realizing games exist in other cities.

// TODO [MEDIUM][Marketplace]:
// No "alert me when a game is posted" feature on the empty state.
// This is the highest-value retention action when supply is low.
// Fix: Add a "Notify me when a game is posted in [city]" button.
// Store alert preference. Send push/email when a matching game is created.
// Risk: Users who find no games leave and never return.

// TODO [MEDIUM][UX]:
// Page title shows total filtered count but not pagination info.
// "מציג 20 מתוך 150 משחקים" would communicate scale and invite scrolling.
// Fix: Add count display and pagination controls.
// Risk: Users don't know how many games exist beyond the visible set.

// TODO [MEDIUM][SEO]:
// This page uses 'use client' which prevents SSR/SSG of game listings.
// Search engines cannot index game listings, which is the core content.
// Fix: Prefetch initial game data on the server and hydrate client.
// Or use Next.js Server Components for the initial data load.
// Risk: Platform invisible to Google — massive missed organic traffic opportunity.

// TODO [LOW][UX]:
// No sorting options. Games are sorted by dateTime ascending (soonest first).
// Users may want: newest posted, closest to me, highest stakes, lowest buy-in.
// Fix: Add a sort dropdown. Pass sort parameter to /api/games.
// Risk: Discovery is limited to chronological order only.

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { PlusCircle, RefreshCw } from 'lucide-react'
import { GameCard } from '@/components/games/GameCard'
import { GameFilters, type FilterState } from '@/components/games/GameFilters'
import { LoadingSpinner, CardSkeleton } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import type { GameWithHost } from '@/types'

export default function GamesPage() {
  const { data: session } = useSession()
  const [games, setGames] = useState<GameWithHost[]>([])
  const [filtered, setFiltered] = useState<GameWithHost[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [pendingRatings, setPendingRatings] = useState(0)

  const fetchGames = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    try {
      const res = await fetch('/api/games')
      if (res.ok) {
        const data = await res.json()
        setGames(data)
        setFiltered(data)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchGames()
  }, [fetchGames])

  useEffect(() => {
    if (!session) return
    fetch('/api/ratings/pending').then((r) => r.json()).then((tasks: unknown[]) => setPendingRatings(tasks.length)).catch(() => {})
  }, [session])

  const handleFilter = (filters: FilterState) => {
    let result = [...games]
    if (filters.city) result = result.filter((g) => g.city === filters.city)
    if (filters.gameType) result = result.filter((g) => g.gameType === filters.gameType)
    if (filters.stakes) result = result.filter((g) => g.stakes === filters.stakes)
    if (filters.status) result = result.filter((g) => g.status === filters.status)
    setFiltered(result)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-poker-text mb-1">
            <span className="suit-black">♠</span> משחקים פעילים
          </h1>
          <p className="text-poker-muted text-sm">
            {filtered.length} משחקים זמינים ברחבי הארץ
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchGames(true)}
            className="p-2 text-poker-muted hover:text-gold-400 rounded-xl hover:bg-felt-800/50 transition-all"
            title="רענן"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {session && (
            <Link href="/create-game">
              <Button size="sm" className="gap-2">
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">פרסם משחק</span>
                <span className="sm:hidden">חדש</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Pending ratings banner */}
      {pendingRatings > 0 && (
        <div className="mb-6 p-4 bg-gold-500/10 border border-gold-500/30 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⭐</span>
            <p className="text-sm text-gold-400 font-semibold">יש לך {pendingRatings} דירוגים ממתינים</p>
          </div>
          <Link href="/ratings">
            <Button size="sm" variant="outline" className="text-gold-400 border-gold-500/40 text-xs">דרג עכשיו</Button>
          </Link>
        </div>
      )}

      {/* Filters */}
      <GameFilters onFilter={handleFilter} />

      {/* Games grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🃏</div>
          <h3 className="text-xl font-bold text-poker-text mb-2">אין משחקים כרגע</h3>
          <p className="text-poker-muted mb-6">
            {games.length === 0 ? 'היה הראשון לפרסם משחק!' : 'נסה לשנות את הסינון'}
          </p>
          {session && (
            <Link href="/create-game">
              <Button>פרסם את המשחק הראשון</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {filtered.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  )
}

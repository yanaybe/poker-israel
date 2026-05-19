'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams, type ReadonlyURLSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { PlusCircle, RefreshCw } from 'lucide-react'
import { GameCard } from '@/components/games/GameCard'
import { GameFilters, type FilterState } from '@/components/games/GameFilters'
import { LoadingSpinner, CardSkeleton } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import type { GameWithHost } from '@/types'

type GamesResponse = { games: GameWithHost[]; nextCursor: string | null }

function buildApiUrl(filters: FilterState, cursor?: string | null): string {
  const params = new URLSearchParams()
  if (filters.city) params.set('city', filters.city)
  if (filters.gameType) params.set('gameType', filters.gameType)
  if (filters.stakes) params.set('stakes', filters.stakes)
  if (filters.status) params.set('status', filters.status)
  if (cursor) params.set('cursor', cursor)
  return `/api/games?${params.toString()}`
}

function filtersFromSearchParams(sp: URLSearchParams | ReadonlyURLSearchParams): FilterState {
  return {
    city: sp.get('city') ?? '',
    gameType: sp.get('gameType') ?? '',
    stakes: sp.get('stakes') ?? '',
    status: sp.get('status') ?? '',
  }
}

export default function GamesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [games, setGames] = useState<GameWithHost[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pendingRatings, setPendingRatings] = useState(0)
  const filtersRef = useRef<FilterState>(filtersFromSearchParams(searchParams))

  const fetchGames = useCallback(async (filters: FilterState, showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await fetch(buildApiUrl(filters))
      if (res.ok) {
        const data: GamesResponse = await res.json()
        setGames(data.games)
        setNextCursor(data.nextCursor)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const filters = filtersFromSearchParams(searchParams)
    filtersRef.current = filters
    fetchGames(filters)
  }, [searchParams, fetchGames])

  useEffect(() => {
    if (!session) return
    fetch('/api/ratings/pending')
      .then((r) => r.json())
      .then((tasks: unknown[]) => setPendingRatings(tasks.length))
      .catch(() => {})
  }, [session])

  const handleFilter = (filters: FilterState) => {
    filtersRef.current = filters
    const params = new URLSearchParams()
    if (filters.city) params.set('city', filters.city)
    if (filters.gameType) params.set('gameType', filters.gameType)
    if (filters.stakes) params.set('stakes', filters.stakes)
    if (filters.status) params.set('status', filters.status)
    router.push(`/games?${params.toString()}`)
  }

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(buildApiUrl(filtersRef.current, nextCursor))
      if (res.ok) {
        const data: GamesResponse = await res.json()
        setGames((prev) => [...prev, ...data.games])
        setNextCursor(data.nextCursor)
      }
    } finally {
      setLoadingMore(false)
    }
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
            {loading ? 'טוען...' : `${games.length} משחקים${nextCursor ? '+' : ''} זמינים`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchGames(filtersRef.current, true)}
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
      <GameFilters onFilter={handleFilter} initialFilters={filtersFromSearchParams(searchParams)} />

      {/* Games grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : games.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🃏</div>
          <h3 className="text-xl font-bold text-poker-text mb-2">אין משחקים כרגע</h3>
          <p className="text-poker-muted mb-6">
            {Object.values(filtersRef.current).some(Boolean)
              ? 'לא נמצאו משחקים עם הסינון הנוכחי — נסה לשנות אותו'
              : 'היה הראשון לפרסם משחק!'}
          </p>
          {session && (
            <Link href="/create-game">
              <Button>פרסם את המשחק הראשון</Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            {games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>

          {nextCursor && (
            <div className="mt-8 text-center">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                loading={loadingMore}
                className="min-w-[160px]"
              >
                {loadingMore ? 'טוען...' : 'טען עוד משחקים'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

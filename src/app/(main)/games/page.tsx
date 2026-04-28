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

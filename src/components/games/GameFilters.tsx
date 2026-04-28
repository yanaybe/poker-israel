'use client'

import { useState } from 'react'
import { Filter, X } from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { ISRAELI_CITIES, STAKES_OPTIONS } from '@/types'

export interface FilterState {
  city: string
  gameType: string
  stakes: string
  status: string
}

interface GameFiltersProps {
  onFilter: (filters: FilterState) => void
}

const defaultFilters: FilterState = { city: '', gameType: '', stakes: '', status: '' }

export function GameFilters({ onFilter }: GameFiltersProps) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [open, setOpen] = useState(false)

  const hasActive = Object.values(filters).some(Boolean)

  const update = (key: keyof FilterState, val: string) => {
    const next = { ...filters, [key]: val }
    setFilters(next)
    onFilter(next)
  }

  const reset = () => {
    setFilters(defaultFilters)
    onFilter(defaultFilters)
  }

  return (
    <div className="mb-6">
      {/* Filter toggle button */}
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-4 py-2 glass-card border border-felt-700/50 rounded-xl text-sm text-poker-muted hover:text-poker-text hover:border-gold-500/50 transition-all"
        >
          <Filter className="w-4 h-4" />
          <span>סינון</span>
          {hasActive && <span className="w-2 h-2 rounded-full bg-gold-400" />}
        </button>

        {hasActive && (
          <button
            onClick={reset}
            className="flex items-center gap-1 text-xs text-poker-subtle hover:text-red-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            נקה סינון
          </button>
        )}
      </div>

      {/* Filters panel */}
      {open && (
        <div className="glass-card border border-felt-700/50 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 animate-slide-up">
          <Select
            label="עיר"
            value={filters.city}
            onChange={(e) => update('city', e.target.value)}
            placeholder="כל הערים"
            options={ISRAELI_CITIES.map((c) => ({ value: c, label: c }))}
          />
          <Select
            label="סוג משחק"
            value={filters.gameType}
            onChange={(e) => update('gameType', e.target.value)}
            placeholder="כל הסוגים"
            options={[
              { value: 'CASH', label: 'מזומן' },
              { value: 'TOURNAMENT', label: 'טורניר' },
              { value: 'SIT_AND_GO', label: 'סיט אנד גו' },
            ]}
          />
          <Select
            label="עיוורים"
            value={filters.stakes}
            onChange={(e) => update('stakes', e.target.value)}
            placeholder="כל העיוורים"
            options={STAKES_OPTIONS.map((s) => ({ value: s, label: s }))}
          />
          <Select
            label="סטטוס"
            value={filters.status}
            onChange={(e) => update('status', e.target.value)}
            placeholder="כל הסטטוסים"
            options={[
              { value: 'OPEN', label: 'פתוח' },
              { value: 'FULL', label: 'מלא' },
              { value: 'CLOSED', label: 'סגור' },
            ]}
          />
        </div>
      )}
    </div>
  )
}

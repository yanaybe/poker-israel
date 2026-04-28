'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, MapPin, Calendar, Trophy, DollarSign } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatDateShort, formatCurrency, cn } from '@/lib/utils'
import type { TournamentData } from '@/types'

const TIER_COLORS: Record<number, string> = {
  0: 'border-gold-500/40 bg-gold-500/5',
  1: 'border-blue-500/30 bg-blue-500/5',
  2: 'border-felt-600/50',
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<TournamentData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/tournaments')
      .then((r) => r.json())
      .then(setTournaments)
      .finally(() => setLoading(false))
  }, [])

  const upcoming = tournaments.filter((t) => new Date(t.date) > new Date())
  const past = tournaments.filter((t) => new Date(t.date) <= new Date())

  if (loading) return <LoadingSpinner text="טוען טורנירים..." className="min-h-[60vh]" />

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-black text-poker-text mb-1 flex items-center gap-3">
          <Trophy className="w-8 h-8 text-gold-400" />
          טורנירים בישראל
        </h1>
        <p className="text-poker-muted text-sm">
          אירועי פוקר מקצועיים ברחבי הארץ · לחץ על טורניר לפרטים נוספים
        </p>
      </div>

      {/* Upcoming tournaments */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-poker-text mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full" />
          קרובים ({upcoming.length})
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {upcoming.map((t, i) => (
            <TournamentCard key={t.id} tournament={t} tier={i < 2 ? i : 2} />
          ))}
          {upcoming.length === 0 && (
            <p className="text-poker-muted text-sm col-span-2">אין טורנירים קרובים כרגע</p>
          )}
        </div>
      </section>

      {/* Past tournaments */}
      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-poker-muted mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-poker-subtle rounded-full" />
            אירועים שעברו ({past.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-60">
            {past.map((t) => (
              <TournamentCard key={t.id} tournament={t} tier={2} past />
            ))}
          </div>
        </section>
      )}

      {/* Info note */}
      <div className="mt-10 p-4 glass-card rounded-2xl border border-felt-700/30 text-center">
        <p className="text-xs text-poker-subtle">
          💡 המידע בדף זה מבוסס על נתונים ציבוריים. לפרטים מדויקים ורישום, לחץ על הטורניר הרלוונטי.
        </p>
      </div>
    </div>
  )
}

function TournamentCard({
  tournament: t,
  tier,
  past,
}: {
  tournament: TournamentData
  tier: number
  past?: boolean
}) {
  const content = (
    <div className={cn(
      'glass-card rounded-2xl p-5 border transition-all',
      TIER_COLORS[tier],
      !past && 'hover:scale-[1.01] cursor-pointer',
      tier === 0 && 'shadow-gold',
    )}>
      {/* Tier badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap gap-2">
          {tier === 0 && <Badge variant="gold">⭐ מוצג</Badge>}
          {t.buyIn && <Badge variant="default">{formatCurrency(t.buyIn)} ביי-אין</Badge>}
        </div>
        {t.website && !past && (
          <ExternalLink className="w-4 h-4 text-poker-subtle flex-shrink-0 mt-1" />
        )}
      </div>

      <h3 className={cn('text-lg font-bold mb-3', tier === 0 ? 'text-gold-400' : 'text-poker-text')}>
        {t.name}
      </h3>

      <div className="space-y-2 text-sm mb-3">
        <div className="flex items-center gap-2 text-poker-muted">
          <MapPin className="w-4 h-4 text-poker-subtle flex-shrink-0" />
          <span>{t.location}, {t.city}</span>
        </div>
        <div className="flex items-center gap-2 text-poker-muted">
          <Calendar className="w-4 h-4 text-poker-subtle flex-shrink-0" />
          <span>{formatDateShort(t.date)}</span>
        </div>
        {t.prizePool && (
          <div className="flex items-center gap-2 text-gold-400">
            <Trophy className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold">פרסים: {t.prizePool}</span>
          </div>
        )}
      </div>

      {t.description && (
        <p className="text-xs text-poker-muted leading-relaxed line-clamp-2">{t.description}</p>
      )}
    </div>
  )

  if (t.website && !past) {
    return (
      <a href={t.website} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    )
  }
  return content
}

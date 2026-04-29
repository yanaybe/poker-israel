'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { MapPin, Clock, Users, DollarSign, MessageCircle, Zap } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn, formatDate, formatCurrency, formatHouseFee, getGameTypeIcon, getStatusColor, CITY_COORDS, haversineKm, formatDriveTime } from '@/lib/utils'
import { GAME_TYPE_LABELS, GAME_STATUS_LABELS, SKILL_LABELS, type GameWithHost } from '@/types'
import { useUserLocation } from '@/hooks/useUserLocation'

interface GameCardProps {
  game: GameWithHost
  compact?: boolean
}

export function GameCard({ game, compact }: GameCardProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const userLocation = useUserLocation()

  const isFull = game.currentPlayers >= game.maxPlayers || game.status === 'FULL'
  const isCancelled = game.status === 'CANCELLED'
  const fillPercent = Math.min(100, (game.currentPlayers / game.maxPlayers) * 100)
  const isBoosted = !!game.boost && new Date(game.boost.boostedUntil) > new Date()

  // Distance calculation
  let driveTime: string | null = null
  if (userLocation && game.city) {
    const coords = CITY_COORDS[game.city]
    if (coords) {
      const km = haversineKm(userLocation.lat, userLocation.lng, coords[0], coords[1])
      driveTime = formatDriveTime(km)
    }
  }

  const hostStrikes = game.host._count?.strikes ?? 0
  const hostGames = game.host._count?.gamesHosted ?? 0

  const handleMessage = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!session) { router.push('/login'); return }
    router.push(`/messages/${game.host.id}`)
  }

  return (
    <Link href={`/games/${game.id}`}>
      <article className={cn(
        'game-card glass-card rounded-2xl border transition-all cursor-pointer group',
        isBoosted ? 'border-gold-500/50 shadow-gold-500/10 shadow-md' : 'border-felt-700/50',
        compact ? 'p-4' : 'p-5'
      )}>
        {isBoosted && (
          <div className="flex items-center gap-1 text-xs text-gold-400 mb-2">
            <Zap className="w-3 h-3 fill-gold-400" /><span className="font-semibold">מוצג</span>
          </div>
        )}
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={game.host.name} image={game.host.image} size="sm" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-poker-text truncate">{game.host.name}</p>
                {game.host.isPremium && <span className="text-xs px-1.5 py-0.5 bg-gold-500/20 text-gold-400 border border-gold-500/30 rounded-full shrink-0">⭐ פרמיום</span>}
              </div>
              {/* Quick stats line */}
              <p className="text-xs text-poker-muted flex flex-wrap items-center gap-x-1.5 mt-0.5">
                {game.host.avgRating != null && (
                  <span className="text-gold-400 font-medium">{game.host.avgRating}★</span>
                )}
                {hostGames > 0 && (
                  <span className="text-poker-subtle">{hostGames} משחקים</span>
                )}
                {hostStrikes > 0 ? (
                  <span className="text-red-400">{hostStrikes} ביטולים</span>
                ) : hostGames > 0 ? (
                  <span className="text-green-400">0 ביטולים</span>
                ) : null}
              </p>
              {!game.host.avgRating && hostGames === 0 && (
                <p className="text-xs text-poker-muted">{SKILL_LABELS[game.host.skillLevel]}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className={cn('text-xs px-2 py-0.5 rounded-full border', getStatusColor(game.status))}>
              {GAME_STATUS_LABELS[game.status as keyof typeof GAME_STATUS_LABELS] ?? game.status}
            </span>
            <span className="text-xl" title={GAME_TYPE_LABELS[game.gameType]}>
              {getGameTypeIcon(game.gameType)}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-poker-text mb-3 group-hover:text-gold-400 transition-colors line-clamp-1">
          {game.title}
        </h3>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
          <div className="flex items-center gap-1.5 text-poker-muted">
            <MapPin className="w-3.5 h-3.5 text-poker-subtle flex-shrink-0" />
            <span className="truncate">{game.city}</span>
          </div>
          <div className="flex items-center gap-1.5 text-poker-muted">
            <Clock className="w-3.5 h-3.5 text-poker-subtle flex-shrink-0" />
            <span className="truncate text-xs">{formatDate(game.dateTime)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-poker-muted">
            <DollarSign className="w-3.5 h-3.5 text-poker-subtle flex-shrink-0" />
            <span>{formatCurrency(game.buyIn)} ביי-אין</span>
          </div>
          <div className="flex items-center gap-1.5 text-poker-muted">
            <Users className="w-3.5 h-3.5 text-poker-subtle flex-shrink-0" />
            <span>{game.currentPlayers}/{game.maxPlayers} שחקנים</span>
          </div>
        </div>

        {/* Distance ETA */}
        {driveTime && (
          <div className="flex items-center gap-1.5 text-xs text-poker-subtle mb-3">
            <span>🚗</span>
            <span>{driveTime}</span>
          </div>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="gold">{GAME_TYPE_LABELS[game.gameType]}</Badge>
          <Badge variant="default">בליינדים: {game.stakes}</Badge>
          {game.houseFeeType && game.houseFeeType !== 'NONE'
            ? <Badge variant="default">עמלה: {formatHouseFee(game.houseFeeType, game.houseFee, game.houseFeePct, game.houseFeeMax)}</Badge>
            : <Badge variant="green">ללא עמלה</Badge>}
          {game.hasFood && <Badge variant="default">🍕</Badge>}
          {game.hasDrinks && <Badge variant="default">🥤</Badge>}
          {game.gamePace && game.gamePace !== 'NORMAL' && (
            <Badge variant="default">{game.gamePace === 'FAST' ? '⚡ מהיר' : '🐢 איטי'}</Badge>
          )}
        </div>

        {/* Player progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-poker-subtle mb-1">
            <span>מקומות תפוסים</span>
            <span>{game.currentPlayers}/{game.maxPlayers}</span>
          </div>
          <div className="h-1.5 bg-felt-700 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', isFull ? 'bg-red-500' : 'bg-green-500')}
              style={{ width: `${fillPercent}%` }}
            />
          </div>
        </div>

        {/* Notes preview */}
        {game.notes && !compact && (
          <p className="text-xs text-poker-muted mb-4 line-clamp-2 leading-relaxed">{game.notes}</p>
        )}

        {/* Actions */}
        {!compact && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant={isCancelled ? 'outline' : 'gold'}
              disabled={isCancelled || game.hostId === session?.user?.id}
              className="flex-1 text-xs"
            >
              {isCancelled ? 'בוטל' : isFull ? 'רשימת המתנה' : game.hostId === session?.user?.id ? 'המשחק שלי' : 'בקש להצטרף'}
            </Button>
            {game.hostId !== session?.user?.id && !isCancelled && (
              <Button size="sm" variant="outline" onClick={handleMessage} className="text-xs gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">הודעה</span>
              </Button>
            )}
          </div>
        )}
      </article>
    </Link>
  )
}

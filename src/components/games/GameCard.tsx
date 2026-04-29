'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { MapPin, Clock, Users, DollarSign, MessageCircle } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn, formatDate, formatHouseFee, getGameTypeIcon, getStatusColor } from '@/lib/utils'
import { GAME_TYPE_LABELS, GAME_STATUS_LABELS, SKILL_LABELS, type GameWithHost } from '@/types'

interface GameCardProps {
  game: GameWithHost
  compact?: boolean
}

export function GameCard({ game, compact }: GameCardProps) {
  const { data: session } = useSession()
  const router = useRouter()

  const isFull = game.currentPlayers >= game.maxPlayers || game.status === 'FULL'
  const fillPercent = Math.min(100, (game.currentPlayers / game.maxPlayers) * 100)

  const handleMessage = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!session) {
      router.push('/login')
      return
    }
    router.push(`/messages/${game.host.id}`)
  }

  return (
    <Link href={`/games/${game.id}`}>
      <article className={cn(
        'game-card glass-card rounded-2xl border border-felt-700/50 transition-all cursor-pointer group',
        compact ? 'p-4' : 'p-5'
      )}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={game.host.name} image={game.host.image} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-poker-text truncate">{game.host.name}</p>
              <p className="text-xs text-poker-muted">{SKILL_LABELS[game.host.skillLevel]}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className={cn('text-xs px-2 py-0.5 rounded-full border', getStatusColor(game.status))}>
              {GAME_STATUS_LABELS[game.status]}
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

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="gold">{GAME_TYPE_LABELS[game.gameType]}</Badge>
          <Badge variant="default">בליינדים: {game.stakes}</Badge>
          {game.houseFeeType && game.houseFeeType !== 'NONE'
            ? <Badge variant="default">עמלה: {formatHouseFee(game.houseFeeType, game.houseFee, game.houseFeePct, game.houseFeeMax)}</Badge>
            : <Badge variant="green">ללא עמלה</Badge>}
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
              variant="gold"
              disabled={isFull || game.hostId === session?.user?.id}
              className="flex-1 text-xs"
            >
              {isFull ? 'מלא' : game.hostId === session?.user?.id ? 'המשחק שלי' : 'בקש להצטרף'}
            </Button>
            {game.hostId !== session?.user?.id && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleMessage}
                className="text-xs gap-1.5"
              >
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

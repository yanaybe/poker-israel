import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns'
import { he } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  if (isToday(d)) return `היום, ${format(d, 'HH:mm')}`
  if (isTomorrow(d)) return `מחר, ${format(d, 'HH:mm')}`
  return format(d, 'EEEE d בMMMM, HH:mm', { locale: he })
}

export function formatDateShort(date: string | Date): string {
  return format(new Date(date), 'd בMMM yyyy', { locale: he })
}

export function formatTimeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: he })
}

export function getConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('_')
}

export function getOtherUserId(conversationId: string, myUserId: string): string {
  const [id1, id2] = conversationId.split('_')
  return id1 === myUserId ? id2 : id1
}

export function getAvatarUrl(name: string, image?: string | null): string {
  if (image) return image
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1a3822&color=c9971e&bold=true&size=128`
}

export function formatCurrency(amount: number): string {
  return `₪${amount.toLocaleString('he-IL')}`
}

export function getSkillColor(skill: string): string {
  switch (skill) {
    case 'PRO': return 'text-gold-400 bg-gold-400/10 border-gold-400/30'
    case 'INTERMEDIATE': return 'text-blue-400 bg-blue-400/10 border-blue-400/30'
    case 'BEGINNER': return 'text-green-400 bg-green-400/10 border-green-400/30'
    default: return 'text-poker-muted bg-felt-700/50 border-felt-600/30'
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'OPEN': return 'text-green-400 bg-green-400/10 border-green-400/30'
    case 'FULL': return 'text-red-400 bg-red-400/10 border-red-400/30'
    case 'CLOSED': return 'text-poker-subtle bg-felt-800/50 border-felt-700/30'
    default: return 'text-poker-muted bg-felt-700/50 border-felt-600/30'
  }
}

export function formatHouseFee(
  houseFeeType?: string | null,
  houseFee?: number | null,
  houseFeePct?: number | null,
  houseFeeMax?: number | null
): string {
  if (!houseFeeType || houseFeeType === 'NONE') return 'ללא עמלה'
  if (houseFeeType === 'ENTRY') return `כניסה: ${formatCurrency(houseFee ?? 0)}`
  if (houseFeeType === 'PER_HAND') {
    const pct = `${houseFeePct}% מכל יד`
    return houseFeeMax ? `${pct} (מקס ${formatCurrency(houseFeeMax)})` : pct
  }
  return 'ללא עמלה'
}

export function getGameTypeIcon(gameType: string): string {
  switch (gameType) {
    case 'CASH': return '💰'
    case 'TOURNAMENT': return '🏆'
    case 'SIT_AND_GO': return '⚡'
    default: return '🃏'
  }
}

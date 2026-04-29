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
    case 'CANCELLED': return 'text-red-400 bg-red-400/10 border-red-400/30'
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

export const CITY_COORDS: Record<string, [number, number]> = {
  'תל אביב': [32.0853, 34.7818],
  'ירושלים': [31.7683, 35.2137],
  'חיפה': [32.7940, 34.9896],
  'באר שבע': [31.2520, 34.7915],
  'נתניה': [32.3226, 34.8530],
  'פתח תקווה': [32.0843, 34.8878],
  'ראשון לציון': [31.9642, 34.8000],
  'אשדוד': [31.8044, 34.6553],
  'רמת גן': [32.0684, 34.8248],
  'הרצליה': [32.1663, 34.8435],
  'כפר סבא': [32.1796, 34.9069],
  'רעננה': [32.1849, 34.8706],
  'בת ים': [32.0157, 34.7506],
  'בני ברק': [32.0840, 34.8345],
  'חולון': [32.0115, 34.7749],
  'אילת': [29.5581, 34.9482],
  'ים המלח': [31.5590, 35.4732],
  'נצרת': [32.6996, 35.2955],
  'אשקלון': [31.6688, 34.5713],
  'רחובות': [31.8964, 34.8117],
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDriveTime(km: number): string {
  const minutes = Math.round((km / 50) * 60)
  if (minutes < 60) return `${minutes} דקות נסיעה ממיקומך`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}:${String(m).padStart(2, '0')} שעות נסיעה ממיקומך` : `${h} שעות נסיעה ממיקומך`
}

export function getGameTypeIcon(gameType: string): string {
  switch (gameType) {
    case 'CASH': return '💰'
    case 'TOURNAMENT': return '🏆'
    case 'SIT_AND_GO': return '⚡'
    default: return '🃏'
  }
}

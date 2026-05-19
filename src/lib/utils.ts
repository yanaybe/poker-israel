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

// TODO [HIGH][Scalability]:
// CITY_COORDS is hardcoded to only 20 Israeli cities. Israel has 255+ municipalities.
// Users in Ra'anana, Petah Tikva, Modiin, Rishon LeZion suburbs, etc. cannot
// find nearby games because their city has no coordinates.
// Fix: Replace with a cities table in the database, or use a geocoding API
// (Google Geocoding or OpenStreetMap Nominatim) to resolve arbitrary city names.
// Risk: Severely limits geographic coverage — suburbs are where home games happen.

// TODO [HIGH][Performance]:
// Haversine distance calculation runs client-side after fetching ALL games.
// All game data is sent over the network before any geographic filtering occurs.
// Fix: Use PostGIS extension on PostgreSQL for server-side geo queries.
// Add a `location` geometry column to Game and query by ST_DWithin radius.
// Risk: At 10,000 games, client receives 10,000 records and computes distances in-browser.

// TODO [MEDIUM][UX]:
// CITY_COORDS duplicates ISRAELI_CITIES in src/types/index.ts. Two sources of truth
// for the same list — they can diverge causing bugs (city in dropdown but no coords).
// Fix: Single source of truth: derive CITY_COORDS keys from ISRAELI_CITIES, or
// store both name and coords in a unified config object.
// Risk: City added to dropdown but missing from CITY_COORDS → distance shows null.

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

// TODO [HIGH][Performance]:
// haversineKm is called client-side inside GameCard for every game in the list.
// At 100 games it runs 100 times per render. Results are not memoized.
// Fix: Move geo-filtering to server side (PostGIS). If client-side is retained,
// memoize results with useMemo keyed by userLocation + city.
// Risk: CPU spike on low-end mobile devices when rendering large game lists.

// TODO [MEDIUM][UX]:
// formatDriveTime assumes 50 km/h average speed for all Israeli routes.
// Tel Aviv to Jerusalem via Highway 1 is ~60km but takes 45-70 min depending on traffic.
// Fix: Use a routing API (Google Directions, HERE Maps) for accurate ETAs.
// At minimum, adjust the speed assumption per region.
// Risk: Users get inaccurate drive time estimates that don't match reality.

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

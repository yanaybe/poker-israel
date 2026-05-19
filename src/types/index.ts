// TODO [HIGH][Architecture]:
// These TypeScript types are manually maintained in parallel with the Prisma schema.
// If a field is added to the Prisma schema, it must also be added here — two sources of truth.
// Fix: Use Prisma's generated types directly (import from '@prisma/client').
// Or use `zod-prisma-types` to auto-generate Zod schemas from Prisma schema.
// Risk: Schema and TypeScript types diverge → runtime shape mismatches.

// TODO [MEDIUM][Architecture]:
// GameWithHost.host includes `canHostUntil` which is a suspension date.
// This private moderation field is part of the public-facing game type and
// included in API responses. It should not be in a public-facing interface.
// Fix: Remove canHostUntil from GameWithHost.host. Only include it in admin types.
// Risk: Suspension details leaked to frontend and potentially rendered in UI.

// TODO [MEDIUM][Architecture]:
// ISRAELI_CITIES duplicates CITY_COORDS keys in src/lib/utils.ts.
// Any city added to one list must be manually added to the other.
// Fix: Single source of truth: define cities with coordinates in one place.
// Risk: Cities appear in dropdown but have no coordinates → distance shows null.

// TODO [LOW][Architecture]:
// No API response types or API error types defined. Frontend components use
// raw `any` or assumed shapes from API calls with no compile-time guarantees.
// Fix: Define ApiResponse<T>, ApiError types. Use these as return types
// for all fetch calls in components.
// Risk: API shape changes break frontend silently at runtime.

export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'PRO'
export type GameType = 'CASH' | 'TOURNAMENT' | 'SIT_AND_GO'
export type GameStatus = 'OPEN' | 'FULL' | 'CLOSED' | 'CANCELLED'
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WAITLIST'

export const SKILL_LABELS: Record<SkillLevel, string> = {
  BEGINNER: 'מתחיל',
  INTERMEDIATE: 'בינוני',
  PRO: 'מקצועי',
}

export const GAME_TYPE_LABELS: Record<GameType, string> = {
  CASH: 'מזומן',
  TOURNAMENT: 'טורניר',
  SIT_AND_GO: 'סיט אנד גו',
}

export const GAME_STATUS_LABELS: Record<GameStatus, string> = {
  OPEN: 'פתוח',
  FULL: 'מלא',
  CLOSED: 'סגור',
  CANCELLED: 'בוטל',
}

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: 'ממתין',
  APPROVED: 'אושר',
  REJECTED: 'נדחה',
  WAITLIST: 'רשימת המתנה',
}

export const ISRAELI_CITIES = [
  'תל אביב',
  'ירושלים',
  'חיפה',
  'באר שבע',
  'נתניה',
  'פתח תקווה',
  'ראשון לציון',
  'אשדוד',
  'רמת גן',
  'הרצליה',
  'כפר סבא',
  'רעננה',
  'בת ים',
  'בני ברק',
  'חולון',
  'אילת',
  'ים המלח',
  'נצרת',
  'אשקלון',
  'רחובות',
]

export const STAKES_OPTIONS = [
  '0.25/0.5',
  '0.5/1',
  '1/2',
  '1/3',
  '2/5',
  '5/10',
  '10/20',
  '25/50',
]

export interface UserProfile {
  id: string
  name: string
  email: string
  age?: number | null
  city?: string | null
  skillLevel: SkillLevel
  image?: string | null
  canHostUntil?: string | null
  createdAt: string
  _count?: {
    gamesHosted: number
    gameRequests: number
    strikes: number
  }
  hostStats?: HostStats
  playerStats?: PlayerStats
}

export interface GameWithHost {
  id: string
  title: string
  neighborhood?: string | null
  location: string | null
  locationRevealed?: boolean
  city: string
  dateTime: string
  buyIn: number
  gameType: GameType
  stakes: string
  houseFeeType?: string | null
  houseFee?: number | null
  houseFeePct?: number | null
  houseFeeMax?: number | null
  maxPlayers: number
  currentPlayers: number
  notes?: string | null
  status: GameStatus
  stackMin?: number | null
  stackMax?: number | null
  rebuyType?: string | null
  rebuyCap?: number | null
  gamePace?: string | null
  vibeTags?: string | null
  expectedDuration?: number | null
  hasFood?: boolean
  hasDrinks?: boolean
  createdAt: string
  hostId: string
  host: {
    id: string
    name: string
    image?: string | null
    city?: string | null
    skillLevel: SkillLevel
    canHostUntil?: string | null
    avgRating?: number | null
    isPremium?: boolean
    _count?: { strikes: number; gamesHosted: number }
  }
  boost?: { boostedUntil: string } | null
  requests?: GameRequestWithUser[]
  hostRatings?: HostRatingItem[]
  playerRatings?: PlayerRatingItem[]
  _count?: { requests: number }
  hostStats?: HostStats
  playerStats?: Record<string, PlayerStats>
}

export interface HostStats {
  gamesHosted: number
  lateStrikes: number
  avgOverall: number | null
  avgPunctuality: number | null
  avgLocationAccuracy: number | null
  avgFairDealing: number | null
  avgSafety: number | null
  totalRatings: number
  returnRate: number | null
}

export interface PlayerStats {
  avgOverall: number | null
  avgBehavior: number | null
  avgPunctuality: number | null
  avgPayment: number | null
  totalRatings: number
}

export interface HostRatingItem {
  id: string
  raterId: string
  rater: { id: string; name: string; image?: string | null }
  punctuality: number | null
  locationAccuracy: number | null
  fairDealing: number | null
  safety: number | null
  comment: string | null
  declined: boolean
  createdAt: string
}

export interface PlayerRatingItem {
  id: string
  raterId: string
  playerId: string
  player: { id: string; name: string; image?: string | null }
  behavior: number | null
  punctuality: number | null
  payment: number | null
  comment: string | null
  declined: boolean
  createdAt: string
}

export interface GameRequestWithUser {
  id: string
  status: RequestStatus
  message?: string | null
  createdAt: string
  userId: string
  user: {
    id: string
    name: string
    image?: string | null
    city?: string | null
    skillLevel: SkillLevel
  }
}

export interface MessageWithUsers {
  id: string
  content: string
  read: boolean
  createdAt: string
  senderId: string
  receiverId: string
  sender: {
    id: string
    name: string
    image?: string | null
  }
  receiver: {
    id: string
    name: string
    image?: string | null
  }
}

export interface GameNotification {
  id: string
  type: string
  message: string
  gameId?: string | null
  read: boolean
  createdAt: string
}

export interface PendingRequestNotif {
  id: string
  gameId: string
  gameName: string
  message?: string | null
  createdAt: string
  user: { id: string; name: string; image?: string | null }
}

export interface LfgPost {
  id: string
  userId: string
  city: string
  availableText: string
  buyIn?: number | null
  gameTypes?: string | null
  notes?: string | null
  status: string
  expiresAt: string
  createdAt: string
  user: {
    id: string
    name: string
    image?: string | null
    skillLevel: SkillLevel
    city?: string | null
    avgRating: number | null
    totalRatings: number
  }
}

export interface TournamentData {
  id: string
  name: string
  location: string
  city: string
  date: string
  website?: string | null
  description?: string | null
  prizePool?: string | null
  buyIn?: number | null
}

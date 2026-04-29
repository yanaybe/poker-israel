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
}

export interface GameWithHost {
  id: string
  title: string
  location: string
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
    _count?: { strikes: number; gamesHosted: number }
  }
  requests?: GameRequestWithUser[]
  ratings?: GameRatingItem[]
  _count?: { requests: number }
  hostStats?: HostStats
}

export interface HostStats {
  gamesHosted: number
  lateStrikes: number
  avgRating: number | null
  returnRate: number | null
  totalRatings: number
}

export interface GameRatingItem {
  id: string
  raterId: string
  score: number
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

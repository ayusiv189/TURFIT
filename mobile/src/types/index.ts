export type UserRole = 'PLAYER' | 'OWNER';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber: string;
  role: UserRole;
  city?: string;
  preferredSports?: string[];
  bio?: string;
  photoURL?: string;
  createdAt: string;
}

export interface Turf {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  address: string;
  area: string;
  city: string;
  phoneNumber: string;
  supportedSports: string[];
  amenities: string[];
  startingPrice: number;
  openTime: string;
  closeTime: string;
  photos: string[];
  latitude?: number;
  longitude?: number;
  rating?: number;
  reviewCount?: number;
  createdAt: string;
}

export interface Arena {
  id: string;
  turfId: string;
  ownerId: string;
  name: string;
  supportedSports: string[];
  capacity: number;
  pricePerHour: number;
  isActive: boolean;
  createdAt: string;
}

export type SlotStatus = 'AVAILABLE' | 'BOOKED_BY_PLAYER' | 'BOOKED_BY_OWNER' | 'BLOCKED';

export interface Slot {
  id: string;
  turfId: string;
  arenaId: string;
  ownerId: string;
  date: string; // YYYY-MM-DD
  day: string; // Monday, Tuesday, etc.
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  price: number;
  status: SlotStatus;
  visibleToPlayers: boolean;
  bookedByUserId?: string;
  bookedByName?: string;
  bookingId?: string;
  createdAt: string;
}

export type PaymentMethod = 'PAY_NOW_UPI' | 'PAY_NOW_CARD' | 'PAY_NOW_NETBANKING' | 'PAY_LATER';
export type PaymentStatus = 'PAID' | 'PARTIALLY_PAID' | 'PENDING' | 'FAILED' | 'REFUNDED' | 'OVERDUE';
export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface Booking {
  id: string;
  bookingId: string;
  turfId: string;
  turfName: string;
  turfAddress?: string;
  turfCity?: string;
  arenaId: string;
  arenaName: string;
  slotId: string;
  playerId: string;
  playerName: string;
  playerEmail: string;
  playerPhone: string;
  ownerId: string;
  date: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  couponCode?: string;
  discountAmount?: number;
  createdAt: string;
}

export interface PaymentTransaction {
  id: string;
  bookingId: string;
  playerId: string;
  ownerId: string;
  amount: number;
  method: PaymentMethod;
  status: 'SUCCESS' | 'FAILED';
  note?: string;
  createdAt: string;
}

// Phase 2: Community Types
export interface LobbyParticipant {
  userId: string;
  userName: string;
  userPhone?: string;
  joinedAt: string;
  role: 'HOST' | 'MEMBER';
}

export interface Lobby {
  id: string;
  title: string;
  description: string;
  sport: string;
  turfId?: string;
  turfName?: string;
  arenaId?: string;
  arenaName?: string;
  date: string;
  time: string;
  requiredPlayers: number;
  currentPlayers: number;
  participants: LobbyParticipant[];
  hostId: string;
  hostName: string;
  status: 'OPEN' | 'FULL' | 'CANCELLED' | 'COMPLETED';
  skillLevel: 'ALL' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  isPublic: boolean;
  createdAt: string;
}

export interface TeamMember {
  userId: string;
  userName: string;
  userEmail?: string;
  role: 'CAPTAIN' | 'VICE_CAPTAIN' | 'MEMBER';
  joinedAt: string;
  jerseyNumber?: number;
  position?: string;
}

export interface Team {
  id: string;
  name: string;
  sport: string;
  captainId: string;
  captainName: string;
  members: TeamMember[];
  memberCount: number;
  logoUrl?: string;
  city: string;
  bio?: string;
  matchesPlayed: number;
  matchesWon: number;
  createdAt: string;
}

export interface FriendlyMatch {
  id: string;
  title: string;
  sport: string;
  turfId: string;
  turfName: string;
  arenaId?: string;
  arenaName?: string;
  date: string;
  time: string;
  hostId: string;
  hostName: string;
  hostTeamId?: string;
  hostTeamName?: string;
  opposingTeamId?: string;
  opposingTeamName?: string;
  format: string; // e.g. 5v5, 7v7, 11v11
  status: 'OPEN_CHALLENGE' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  description?: string;
  rules?: string;
  isPublic: boolean;
  maxPlayers: number;
  participants: {
    userId: string;
    userName: string;
    teamSide?: 'HOST' | 'AWAY';
    joinedAt: string;
  }[];
  createdAt: string;
}

export type NotificationType =
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_DUE'
  | 'LOBBY_JOIN'
  | 'LOBBY_FULL'
  | 'TEAM_INVITE'
  | 'TEAM_JOINED'
  | 'MATCH_CHALLENGE'
  | 'MATCH_ACCEPTED'
  | 'OFFER_ALERT'
  | 'REWARD_EARNED';

export interface InAppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedId?: string;
  relatedType?: 'LOBBY' | 'TEAM' | 'MATCH' | 'BOOKING' | 'OFFER' | 'REWARD' | 'TURF';
  linkId?: string;
  linkType?: string;
  isRead?: boolean;
  read?: boolean;
  createdAt: string;
}

// Phase 3: Analytics, Reviews, Offers, Rewards
export interface TurfReview {
  id: string;
  turfId: string;
  turfName: string;
  playerId: string;
  playerName: string;
  bookingId?: string;
  rating: number; // 1 - 5
  comment: string;
  tags?: string[];
  ownerResponse?: string;
  ownerRespondedAt?: string;
  isFlagged?: boolean;
  createdAt: string;
}

export interface CouponOffer {
  id: string;
  turfId: string;
  turfName: string;
  ownerId: string;
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  minBookingValue: number;
  maxDiscount?: number;
  validDays?: string[];
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface RewardRecord {
  id: string;
  userId: string;
  points: number;
  type: 'EARNED' | 'REDEEMED';
  reason: string;
  bookingId?: string;
  createdAt: string;
}

export interface PlayerRewardProfile {
  userId: string;
  totalPoints: number;
  currentTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  pointsToNextTier: number;
  totalSpent: number;
}

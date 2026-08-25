export type UserRole = 'PLAYER' | 'OWNER' | 'ADMIN';

export type TurfVerificationStatus =
  | 'draft'
  | 'pending_verification'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'suspended';

export type TurfVerificationLevel = 1 | 2 | 3; // 1: Contact Verified, 2: Turf Verified, 3: Physically Verified

export type DocumentType =
  | 'BUSINESS_REGISTRATION'
  | 'GST_CERTIFICATE'
  | 'TRADE_LICENSE'
  | 'LEASE_AGREEMENT'
  | 'OWNERSHIP_DEED'
  | 'ELECTRICITY_BILL'
  | 'OTHER_PROOF';

export type DocumentStatus = 'uploaded' | 'under_review' | 'verified' | 'rejected';

export type PhysicalVerificationStatus =
  | 'pending'
  | 'requested'
  | 'submitted'
  | 'verified'
  | 'rejected';

export interface VerificationDocument {
  id: string;
  turfId: string;
  ownerId: string;
  documentType: DocumentType;
  documentName: string;
  fileUrl: string;
  status: DocumentStatus;
  uploadedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface VerificationHistory {
  id: string;
  turfId: string;
  action:
    | 'submitted'
    | 'under_review'
    | 'approved'
    | 'rejected'
    | 'suspended'
    | 'resubmitted'
    | 'physical_requested'
    | 'physical_approved'
    | 'more_info_requested';
  previousStatus: TurfVerificationStatus;
  newStatus: TurfVerificationStatus;
  performedBy: string;
  performedByName?: string;
  reason?: string;
  notes?: string;
  createdAt: string;
}

export interface TurfPhotoVerification {
  entrancePhoto?: string;
  signboardPhoto?: string;
  playingAreaPhotos?: string[];
  facilitiesPhotos?: string[];
  additionalPhotos?: string[];
  verified?: boolean;
}

export interface TurfVerificationDetails {
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  rejectionReason?: string;
  adminNotes?: string;
  moreInfoRequestedNotes?: string;
  physicalVerificationStatus?: PhysicalVerificationStatus;
  physicalVerificationCode?: string;
  physicalVerificationVideoUrl?: string;
  physicalVerificationSubmittedAt?: string;
  physicalVerificationReviewedAt?: string;
  photoVerification?: TurfPhotoVerification;
  duplicateWarning?: {
    flagged: boolean;
    existingTurfId?: string;
    existingTurfName?: string;
    distanceMeters?: number;
    adminReviewed?: boolean;
  };
}

export type SlotStatus =
  | 'AVAILABLE'
  | 'BOOKED_BY_PLAYER'
  | 'BOOKED_BY_OWNER'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentStatus =
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'PENDING'
  | 'FAILED'
  | 'CANCELLED';

export type BookingStatus =
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED';

export type BookingType = 'PLAYER' | 'OWNER' | 'MANUAL' | 'NONE';

export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PRO';

export interface OwnerPaymentSettings {
  upiId?: string;
  beneficiaryName?: string;
  bankAccount?: string;
  ifscCode?: string;
  qrCodeUrl?: string;
  razorpayKeyId?: string;
  updatedAt?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  username?: string;
  role: UserRole;
  emailVerified: boolean;
  phoneNumber?: string;
  photoURL?: string;
  city?: string;
  preferredSport?: string;
  preferredSports?: string[];
  experienceLevel?: ExperienceLevel;
  preferredPosition?: string;
  preferredPositions?: string[];
  bio?: string;
  playstyle?: string;
  availability?: string;
  businessName?: string;
  isOwnerAccount?: boolean;
  paymentSettings?: OwnerPaymentSettings;
  matchesPlayed?: number;
  teamsCount?: number;
  isPublic?: boolean;
  createdAt: string;
  updatedAt: string;
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
  openingTime: string;
  closingTime: string;
  openTime?: string;
  closeTime?: string;
  sports: string[];
  facilities: string[];
  basePrice: number;
  latitude: number;
  longitude: number;
  photos: string[];
  active: boolean;
  upiId?: string;
  beneficiaryName?: string;
  qrCodeUrl?: string;
  isClosed?: boolean;
  closureReason?: string;
  closureNotice?: string;
  verificationStatus?: TurfVerificationStatus;
  verificationLevel?: TurfVerificationLevel;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  verification?: TurfVerificationDetails;
  createdAt: string;
  updatedAt: string;
}

export interface Arena {
  id: string;
  turfId: string;
  ownerId: string;
  name: string;
  sport: string;
  description: string;
  capacity: number;
  pricePerSlot: number;
  photos: string[];
  active: boolean;
  isUnderMaintenance?: boolean;
  maintenanceReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Slot {
  id: string;
  turfId: string;
  arenaId: string;
  ownerId: string;
  sport?: string;
  date: string;
  day: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  price: number;
  maxPlayers?: number;
  visibleToPlayers: boolean;
  status: SlotStatus;
  bookingType?: BookingType;
  creationType?: 'AUTO' | 'MANUAL';
  recurringScheduleId?: string;
  bookedByPlayerId?: string;
  bookedByPlayerName?: string;
  activeBookingId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  bookingId?: string;
  playerId: string;
  playerName: string;
  playerEmail: string;
  playerPhone?: string;
  playerPhotoURL?: string;
  ownerId: string;
  turfId: string;
  turfName: string;
  turfAddress: string;
  turfArea: string;
  turfCity: string;
  arenaId: string;
  arenaName: string;
  sport: string;
  slotId: string;
  date: string;
  day: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  bookingType: BookingType;
  paymentMethod?: 'PAY_NOW' | 'PAY_LATER_AT_TURF';
  numberOfPlayers?: number;
  playerShareAmount?: number;
  lobbyCreated?: boolean;
  lobbyId?: string;
  cancelledBy?: 'PLAYER' | 'OWNER';
  cancelledAt?: string;
  cancellationReason?: string;
  refundAmount?: number;
  refundStatus?: 'NONE' | 'PENDING' | 'REFUNDED' | 'NOT_APPLICABLE';
  createdAt: string;
  updatedAt: string;
}

export interface PlayerDue {
  id: string;
  playerId: string;
  playerName: string;
  playerEmail: string;
  playerPhone?: string;
  playerPhotoURL?: string;
  ownerId: string;
  turfId: string;
  turfName: string;
  arenaName?: string;
  sport?: string;
  bookingId: string;
  bookingRef?: string;
  slotId?: string;
  date: string;
  day?: string;
  startTime?: string;
  endTime?: string;
  totalAmount: number;
  amountPaid: number;
  remainingAmount: number;
  status: 'PENDING' | 'PAID' | 'PARTIAL' | 'CANCELLED_REVERSED';
  notes?: string;
  lastPaymentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PoolInterestedPlayer {
  uid: string;
  name: string;
  phone?: string;
  photoURL?: string;
  joinedAt: string;
}

export type PoolStatus = 'OPEN' | 'CONVERTED_TO_LOBBY' | 'CANCELLED' | 'EXPIRED';

export interface PlayerPool {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorPhone?: string;
  creatorPhotoURL?: string;
  sport: string;
  city: string;
  area?: string;
  preferredDate: string;
  preferredTime: string;
  requiredPlayers: number;
  currentPlayersCount: number;
  maxPricePerPlayer: number;
  preferredTurfId?: string;
  preferredTurfName?: string;
  description?: string;
  status: PoolStatus;
  convertedLobbyId?: string;
  convertedBookingId?: string;
  interestedPlayers: PoolInterestedPlayer[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  paymentId: string;
  bookingId?: string;
  dueId?: string;
  poolId?: string;
  lobbyId?: string;
  playerId: string;
  playerName: string;
  playerEmail?: string;
  ownerId: string;
  turfId: string;
  turfName?: string;
  slotId?: string;
  amount: number;
  currency: string;
  paymentMethod: 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET' | 'CASH';
  upiId?: string;
  upiTxnRef?: string;
  gatewayTransactionId?: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED';
  notes?: string;
  refundReason?: string;
  refundAmount?: number;
  refundedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RefundRecord {
  id: string;
  bookingId: string;
  paymentId?: string;
  playerId: string;
  playerName: string;
  ownerId: string;
  turfId: string;
  amount: number;
  reason: string;
  status: 'PROCESSED' | 'PENDING';
  createdAt: string;
}

export interface PaymentTransaction {
  id: string;
  transactionId: string;
  bookingId: string;
  playerId: string;
  ownerId: string;
  amount: number;
  paymentMethod: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  providerTransactionId?: string;
  notes?: string;
  createdAt: string;
}

export interface OwnerDashboardStats {
  todayBookingsCount: number;
  upcomingBookingsCount: number;
  availableSlotsCount: number;
  pendingPaymentsTotal: number;
  totalRevenue: number;
  totalTurfs: number;
  totalArenas: number;
}

export type LobbyStatus = 'OPEN' | 'FULL' | 'CLOSED' | 'CANCELLED' | 'MATCH_STARTED';

export interface Lobby {
  id: string;
  name: string;
  sport: string;
  turfId: string;
  turfName: string;
  turfAddress: string;
  turfCity: string;
  turfLatitude?: number;
  turfLongitude?: number;
  arenaId: string;
  arenaName: string;
  bookingId: string;
  slotId: string;
  hostId: string;
  hostName: string;
  hostPhotoURL?: string;
  date: string;
  day: string;
  startTime: string;
  endTime: string;
  maxPlayers: number;
  minPlayers: number;
  currentPlayers: number;
  pricePerPlayer: number;
  description: string;
  rules?: string;
  isPublic: boolean;
  allowNewPlayers: boolean;
  status: LobbyStatus;
  matchId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LobbyPlayer {
  id: string;
  lobbyId: string;
  uid: string;
  playerName: string;
  playerPhotoURL?: string;
  preferredSport?: string;
  skillLevel?: string;
  isHost: boolean;
  paymentMethod?: 'PAY_NOW' | 'PAY_LATER_AT_TURF';
  paymentStatus?: 'PAID' | 'DUE' | 'PARTIAL';
  amountDue?: number;
  amountPaid?: number;
  remainingAmount?: number;
  joinedAt: string;
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export interface LobbyInvitation {
  id: string;
  lobbyId: string;
  lobbyName: string;
  sport: string;
  turfName: string;
  date: string;
  startTime: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  receiverPhotoURL?: string;
  status: InvitationStatus;
  createdAt: string;
  expiresAt?: string;
}

export interface Team {
  id: string;
  name: string;
  sport: string;
  logoURL?: string;
  description: string;
  city: string;
  maxMembers: number;
  memberCount: number;
  isPublic: boolean;
  captainId: string;
  captainName: string;
  captainPhotoURL?: string;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  createdAt: string;
  updatedAt: string;
}

export type TeamMemberRole = 'CAPTAIN' | 'CO-CAPTAIN' | 'MEMBER';

export interface TeamMember {
  id: string;
  teamId: string;
  uid: string;
  name: string;
  photoURL?: string;
  preferredSport?: string;
  position?: string;
  role: TeamMemberRole;
  joinedAt: string;
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  teamName: string;
  sport: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  receiverPhotoURL?: string;
  status: InvitationStatus;
  createdAt: string;
}

export type MatchStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'FULL'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type MatchType = 'FRIENDLY' | 'COMPETITIVE' | 'TOURNAMENT';

export interface Match {
  id: string;
  matchName: string;
  sport: string;
  turfId: string;
  turfName: string;
  turfAddress: string;
  turfCity: string;
  turfLatitude?: number;
  turfLongitude?: number;
  arenaId: string;
  arenaName: string;
  date: string;
  day: string;
  startTime: string;
  endTime: string;
  matchType: MatchType;
  maxPlayers: number;
  currentPlayers: number;
  hostId: string;
  hostName: string;
  teamAId?: string;
  teamAName?: string;
  teamBId?: string;
  teamBName?: string;
  description: string;
  rules?: string;
  isPublic: boolean;
  status: MatchStatus;
  lobbyId?: string;
  bookingId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchPlayer {
  id: string;
  matchId: string;
  uid: string;
  name: string;
  photoURL?: string;
  teamId?: string;
  teamName?: string;
  joinedAt: string;
}

export type NotificationType =
  | 'LOBBY_INVITE'
  | 'TEAM_INVITE'
  | 'MATCH_INVITE'
  | 'LOBBY_JOINED'
  | 'LOBBY_LEFT'
  | 'LOBBY_CANCELLED'
  | 'MATCH_CANCELLED'
  | 'MATCH_REMINDER'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_DUE'
  | 'PAYMENT_PARTIAL'
  | 'SLOT_REMINDER'
  | 'REVIEW_REQUEST'
  | 'OFFER_AVAILABLE'
  | 'LOYALTY_REWARD'
  | 'REWARD'
  | 'TEAM'
  | 'LOBBY'
  | 'RECURRING_BOOKING_REMINDER'
  | 'GENERAL';

export interface InAppNotification {
  id: string;
  recipientId: string;
  senderId?: string;
  senderName?: string;
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

export interface TurfReview {
  id: string;
  turfId: string;
  turfName: string;
  bookingId: string;
  playerId: string;
  playerName: string;
  playerPhotoURL?: string | null;
  rating: number;
  comment: string;
  photos?: string[];
  ownerResponse?: string | null;
  ownerResponseAt?: string | null;
  reported?: boolean;
  reportReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TurfRatingStats {
  averageRating: number;
  totalReviews: number;
  starBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface Offer {
  id: string;
  ownerId: string;
  turfId: string;
  turfName?: string;
  arenaId?: string;
  code: string;
  name: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  minBookingAmount?: number;
  maxDiscount?: number;
  startDate: string;
  endDate: string;
  applicableDays?: string[];
  usageLimit?: number;
  usedCount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserRewardWallet {
  userId: string;
  pointsBalance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  updatedAt: string;
}

export interface RewardVoucher {
  id: string;
  userId: string;
  code: string;
  discountAmount: number;
  pointsCost: number;
  isUsed: boolean;
  usedBookingId?: string;
  usedAt?: string;
  expiresAt: string;
  createdAt: string;
}

export interface BookingPlayerShare {
  id: string;
  bookingId: string;
  turfId: string;
  ownerId: string;
  playerId: string;
  playerName: string;
  playerEmail: string;
  playerPhotoURL?: string | null;
  shareAmount: number;
  amountPaid: number;
  amountDue: number;
  status: PaymentStatus;
  lastPaymentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerDueSummary {
  playerId: string;
  playerName: string;
  playerEmail: string;
  playerPhone?: string;
  playerPhotoURL?: string | null;
  totalBookings: number;
  totalAmount: number;
  totalPaid: number;
  totalPending: number;
  lastPaymentDate?: string;
  bookings: Booking[];
}

export interface PlayerRealStats {
  matchesPlayed: number;
  matchesHosted: number;
  lobbiesJoined: number;
  teamsJoined: number;
  bookingsCompleted: number;
  hoursPlayed: number;
  sportsPlayed: string[];
  favoriteSport: string;
  favoriteTurf: string;
  totalAmountSpent: number;
}

export interface OwnerRealAnalytics {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  todayBookings: number;
  weeklyBookings: number;
  monthlyBookings: number;
  totalBookingValue: number;
  amountCollected: number;
  amountPending: number;
  refundedAmount: number;
  cancelledAmount: number;
  discountAmount: number;
  netRevenue: number;
  popularArenaName: string;
  popularTimeSlot: string;
  popularDay: string;
  mostBookedSport: string;
  repeatPlayersCount: number;
  averageBookingValue: number;
  occupancyRatePercent: number;
}

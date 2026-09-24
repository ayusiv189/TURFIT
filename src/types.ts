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
  | 'PARTIAL'
  | 'PENDING'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED';

export type BookingStatus =
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED';

export type BookingType = 'PLAYER' | 'OWNER';

export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PRO';

export type ProfileVisibility = 'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE';

export interface PrivacySettings {
  profileVisibility: ProfileVisibility;
  showPhoneNumber: boolean;
  showEmail: boolean;
  showExactLocation: boolean;
  showMatchHistory: boolean;
  allowPlayerInvitations: boolean;
  allowDirectMessages: boolean;
}

export interface UserBlock {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

export interface UserReport {
  id: string;
  reporterId: string;
  targetId: string;
  targetType: 'user' | 'post' | 'turf';
  reason: string;
  details?: string;
  createdAt: string;
}

export interface UserRestriction {
  id: string;
  userId: string;
  restrictedId: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  username?: string;
  role: UserRole;
  isOwnerRegistered?: boolean;
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
  businessName?: string;
  facilities?: string[];
  matchesPlayed?: number;
  teamsCount?: number;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  sportsmanshipRating?: number;
  totalRatingsReceived?: number;
  rating?: number;
  ratingsCount?: number;
  badges?: string[];
  isPublic?: boolean;
  profileVisibility?: ProfileVisibility;
  privacySettings?: PrivacySettings;
  notificationSettings?: {
    socialLikes?: boolean;
    socialComments?: boolean;
    socialFollows?: boolean;
    matchAlerts?: boolean;
    bookingAlerts?: boolean;
  };
  instagram?: string;
  discord?: string;
  phoneVerified?: boolean;
  paymentSettings?: OwnerPaymentSettings;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
}

export interface OwnerPaymentSettings {
  upiId?: string; // e.g. "turfvenue@okaxis" or "9876543210@paytm"
  beneficiaryName?: string; // e.g. "Apex Sports Arena LLP"
  razorpayKeyId?: string; // e.g. "rzp_live_..." or "rzp_test_..."
  razorpayAccountId?: string; // e.g. "acc_..."
  bankName?: string; // e.g. "HDFC Bank"
  accountNumber?: string; // e.g. "501000..."
  ifscCode?: string; // e.g. "HDFC0001234"
  qrCodeUrl?: string; // Custom uploaded QR image or data URL
  allowDirectUpi?: boolean;
  allowOnlineRazorpay?: boolean;
  allowPayAtVenue?: boolean;
  paymentInstructions?: string; // e.g. "Please enter booking ID in UPI note"
  updatedAt?: string;
}

export type FacilityType = 'OUTDOOR_TURF' | 'INDOOR_GAME';
export type IndoorGameType =
  | 'Pool'
  | 'Snooker'
  | 'Table Tennis'
  | 'Carrom'
  | 'Foosball'
  | 'Air Hockey'
  | 'Console PS5'
  | 'Board Games';

export interface Turf {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  address: string;
  area: string;
  city: string;
  phoneNumber: string;
  openingTime: string; // e.g. "06:00"
  closingTime: string; // e.g. "23:00"
  sports: string[]; // e.g. ["Football", "Cricket", "Badminton", "Table Tennis", "Pool"]
  facilities: string[]; // e.g. ["Floodlights", "Parking", "Changing Room", "Drinking Water", "Air Conditioning", "Sofa Lounge"]
  basePrice: number; // ₹ per slot
  latitude: number;
  longitude: number;
  photos: string[]; // URLs or base64 storage refs
  locationUrl?: string; // Compulsory Google Maps location link (e.g. https://maps.app.goo.gl/...)
  active: boolean;
  isClosed?: boolean;
  closureReason?: string;
  closureNotice?: string;
  hasGamingZone?: boolean;
  indoorGames?: string[]; // e.g. ["Pool", "Table Tennis", "Carrom"]
  upiId?: string;
  beneficiaryName?: string;
  allowPayAtVenue?: boolean;
  allowPayLater?: boolean;
  paymentSettings?: OwnerPaymentSettings;
  verificationStatus?: TurfVerificationStatus;
  verificationLevel?: TurfVerificationLevel;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  verification?: TurfVerificationDetails;
  isFeatured?: boolean;
  featuredUntil?: string;
  sponsoredPriority?: number;
  featuredBadge?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Arena {
  id: string;
  turfId: string;
  ownerId: string;
  name: string; // e.g. "Arena 1 - 7v7 Turf" or "Table #1 - 8-Ball Pool"
  sport: string; // e.g. "Football", "Pool", "Table Tennis"
  sports?: string[]; // e.g. ["Football", "Cricket"]
  facilityType?: FacilityType; // 'OUTDOOR_TURF' | 'INDOOR_GAME'
  indoorGameType?: IndoorGameType | string;
  tableOrBoardNumber?: string; // e.g. "Table #1", "Board A", "Station 2"
  equipmentIncluded?: string[]; // e.g. ["2 Cues", "Chalk", "Triangle", "Balls"]
  hasAirConditioning?: boolean;
  hasLoungeAccess?: boolean;
  slotDurationOption?: 30 | 60 | 120; // in minutes
  description: string;
  capacity: number; // e.g. 14 for 7v7, 2-4 for TT/Pool
  pricePerSlot: number; // ₹
  amenities?: string[]; // e.g. ["FIFA Approved 50mm Turf", "Pro LED Floodlights", "Changing Rooms & Showers", "Air Conditioned Lounge", "Drinking Water", "Spectator Seating", "Cues & Balls", "First Aid Kit", "Free Parking"]
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
  date: string; // YYYY-MM-DD
  day: string; // "Monday", "Tuesday", etc.
  startTime: string; // e.g. "18:00" or "06:00 PM"
  endTime: string; // e.g. "19:00" or "07:00 PM"
  durationMinutes: number; // e.g. 60
  price: number; // ₹
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
  date: string; // YYYY-MM-DD
  day: string;
  startTime: string;
  endTime: string;
  duration: number; // minutes
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  bookingType: BookingType;
  paymentMethod?: 'PAY_NOW' | 'PAY_LATER_AT_TURF' | 'PARTIAL_ADVANCE' | 'UPI_QR' | 'RAZORPAY' | 'DIRECT_UPI' | 'ONLINE_RAZORPAY';
  paymentMode?: 'PAY_FULL' | 'PAY_PARTIAL' | 'PAY_LATER_AT_TURF';
  advancePaid?: number;
  counterAmountPaid?: number;
  paymentTxId?: string;
  upiTxnId?: string;
  upiTxnRef?: string;
  ownerPaymentId?: string;
  lobbyCreated?: boolean;
  lobbyId?: string;
  bookedVia?: 'INDIVIDUAL' | 'LOBBY';
  numberOfPlayers?: number;
  playerShareAmount?: number;
  splitWith?: Array<{
    name: string;
    phone?: string;
    email?: string;
    shareAmount?: number;
    isPaid?: boolean;
    paymentStatus?: string;
    amountDue?: number;
    amountPaid?: number;
  }>;
  isNoShow?: boolean;
  noShowPenaltyAmount?: number;
  convenienceFee?: number;
  ownerShare?: number;
  verifiedAutomatically?: boolean;
  settlementStatus?: 'PENDING' | 'SETTLED' | 'PROCESSING';
  settlementPayoutId?: string;
  settlementDate?: string;
  whatsappNotificationSent?: boolean;
  whatsappNotificationSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTransaction {
  id: string;
  transactionId: string;
  bookingId: string;
  playerId: string;
  ownerId: string;
  amount: number;
  convenienceFee?: number;
  ownerShare?: number;
  paymentMethod: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  providerTransactionId?: string;
  gatewayPaymentId?: string;
  gatewayOrderId?: string;
  verifiedAutomatically?: boolean;
  notes?: string;
  createdAt: string;
}

export interface OwnerPayoutRecord {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail?: string;
  ownerPhone?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  totalBookingsCount: number;
  grossAmount: number;
  platformFeeTotal: number;
  netPayoutAmount: number;
  status: 'PENDING' | 'PAID' | 'PROCESSING';
  payoutTxnRef?: string;
  paidAt?: string;
  createdAt: string;
  notes?: string;
}

export interface OwnerPayoutRequest {
  id: string;
  ownerId: string;
  ownerName?: string;
  turfId?: string;
  turfName?: string;
  amount: number;
  destination: string;
  payoutMode?: 'UPI' | 'BANK';
  upiId?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  beneficiaryName?: string;
  availableBalanceBefore?: number;
  status: 'REQUESTED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  date: string;
  utr?: string;
  notes?: string;
  processedAt?: string;
  processedBy?: string;
  rejectionReason?: string;
  isTest?: boolean;
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

// ==========================================
// PHASE 2: SPORTS COMMUNITY & MATCHMAKING
// ==========================================

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
  date: string; // YYYY-MM-DD
  day: string;
  startTime: string;
  endTime: string;
  maxPlayers: number;
  minPlayers: number;
  currentPlayers: number;
  pricePerPlayer: number;
  totalSlotPrice?: number;
  dynamicCostPerPlayer?: number;
  initialSquadCount?: number;
  hostAnnouncement?: string;
  costDivisionNote?: string;
  upiTxnRef?: string;
  description: string;
  rules?: string;
  isPublic: boolean;
  allowNewPlayers: boolean;
  status: LobbyStatus;
  players?: any[];
  playerUids?: string[];
  isExpired?: boolean;
  matchId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LobbyPlayer {
  id: string; // lobbyId_uid
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
  paymentTxId?: string;
  razorpay_payment_id?: string;
  joinedAt: string;
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export type LobbyMessageType = 'TEXT' | 'SYSTEM' | 'ANNOUNCEMENT';

export interface LobbyMessage {
  id: string;
  lobbyId: string;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string | null;
  text: string;
  type?: LobbyMessageType;
  createdAt: string;
  expiresAt: string;
  isHost?: boolean;
}

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
  followersCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type FollowTargetType = 'PLAYER' | 'OWNER' | 'TEAM';

export interface UserFollow {
  id: string; // `${followerId}_${targetId}`
  followerId: string;
  followerName: string;
  followerUsername?: string;
  followerAvatar?: string;
  followerRole?: UserRole;
  targetId: string;
  targetType: FollowTargetType;
  targetName: string;
  targetUsername?: string;
  targetAvatar?: string;
  targetCity?: string;
  targetSport?: string;
  createdAt: string; // ISO String
}

export type TeamMemberRole = 'CAPTAIN' | 'CO-CAPTAIN' | 'MEMBER';

export interface TeamMember {
  id: string; // teamId_uid
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
  date: string; // YYYY-MM-DD
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
  id: string; // matchId_uid
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
  | 'RECURRING_BOOKING_REMINDER'
  | 'POST_LIKE'
  | 'POST_COMMENT'
  | 'USER_FOLLOW'
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
  relatedType?: 'LOBBY' | 'TEAM' | 'MATCH' | 'BOOKING' | 'OFFER' | 'REWARD' | 'TURF' | 'POST' | 'PROFILE';
  linkId?: string;
  linkType?: string;
  isRead?: boolean;
  read?: boolean;
  createdAt: string;
}

// ==========================================
// PHASE 3: RATINGS, REVIEWS & MODERATION
// ==========================================

export type PlayerBadgeType =
  | 'Fair Play Champion'
  | 'Playmaker / MVP'
  | 'Defensive Wall'
  | 'Team Motivator'
  | 'Clockwork Punctual'
  | 'Clutch Performer'
  | 'Tactical Genius'
  | 'Sharpshooter';

export interface PlayerRating {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerPhotoURL?: string | null;
  targetId: string;
  targetName: string;
  targetPhotoURL?: string | null;
  matchId?: string;
  lobbyId?: string;
  turfName?: string;
  sport: string;
  sportsmanshipRating: number; // 1 to 5
  skillRating: number; // 1 to 5
  punctualityRating: number; // 1 to 5
  overallRating: number; // average 1 to 5
  badges: (PlayerBadgeType | string)[];
  feedback?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PlayerSportsmanshipStats {
  averageRating: number;
  totalRatings: number;
  sportsmanshipAvg: number;
  skillAvg: number;
  punctualityAvg: number;
  badgeCounts: Record<string, number>;
  tier: 'ELITE' | 'PRO' | 'VETERAN' | 'RISING';
  recentFeedback: Array<{
    id: string;
    reviewerName: string;
    reviewerPhotoURL?: string | null;
    sportsmanshipRating: number;
    overallRating: number;
    badges: string[];
    feedback?: string;
    sport: string;
    turfName?: string;
    createdAt: string;
  }>;
}

export interface TurfReview {
  id: string;
  turfId: string;
  turfName: string;
  bookingId: string;
  playerId: string;
  playerName: string;
  playerPhotoURL?: string | null;
  rating: number; // 1 to 5
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
  starPercentages: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

// ==========================================
// PHASE 3: OFFERS & PROMOTIONAL DISCOUNTS
// ==========================================

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface Offer {
  id: string;
  ownerId: string;
  turfId: string; // 'ALL' or specific turfId
  turfName?: string;
  arenaId?: string; // 'ALL' or specific arenaId
  arenaName?: string;
  code: string; // e.g. "WEEKDAY10", "TURFIT20"
  name: string; // e.g. "10% Off Weekday Evenings"
  description: string;
  discountType: DiscountType;
  discountValue: number; // e.g. 10 for 10% or 200 for ₹200
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  applicableDays?: string[]; // e.g. ["Monday", "Tuesday", "Wednesday", "Thursday"]
  usageLimit: number; // Maximum redemption limit e.g. 50
  usedCount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// PHASE 3: LOYALTY & REWARDS PROGRAM
// ==========================================

export interface UserRewardWallet {
  userId: string;
  pointsBalance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  updatedAt: string;
}

export interface RewardHistoryItem {
  id: string;
  userId: string;
  points: number;
  type: 'EARNED' | 'REDEEMED';
  reason: string;
  bookingId?: string;
  createdAt: string;
}

export interface RewardVoucher {
  id: string;
  userId: string;
  code: string;
  discountAmount: number; // ₹ value
  pointsCost: number; // e.g. 500 points = ₹100 discount
  isUsed: boolean;
  usedBookingId?: string;
  usedAt?: string;
  expiresAt: string;
  createdAt: string;
}

// ==========================================
// PHASE 3: RECURRING SLOTS SCHEDULES
// ==========================================

export interface RecurringSlotSchedule {
  id: string;
  ownerId: string;
  turfId: string;
  turfName?: string;
  arenaId: string;
  arenaName?: string;
  days: string[]; // ["Monday", "Wednesday", "Friday"]
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime: string; // "18:00"
  endTime: string; // "19:00"
  durationMinutes: number;
  price: number;
  teamPassDiscountPercent?: number;
  teamPassPrice?: number;
  allowTeamPassBooking?: boolean;
  visibleToPlayers: boolean;
  active: boolean;
  slotsGeneratedCount: number;
  reservedTeamId?: string;
  reservedTeamName?: string;
  reservedCaptainId?: string;
  reservedCaptainName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SquadPassBooking {
  id: string;
  scheduleId?: string;
  teamId?: string;
  teamName: string;
  captainId: string;
  captainName: string;
  captainPhone?: string;
  turfId: string;
  turfName: string;
  arenaId: string;
  arenaName: string;
  sport: string;
  startDate: string;
  endDate: string;
  days: string[];
  startTime: string;
  endTime: string;
  totalMatches: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  discountApplied?: number;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  bookingIds: string[];
  createdAt: string;
}

// ==========================================
// PHASE 3: PAYMENT SPLITTING & PLAYER DUES
// ==========================================

export interface BookingPlayerShare {
  id: string; // bookingId_uid
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

// ==========================================
// GAMING ZONE & INDOOR STATIONS
// ==========================================

export interface GamingStation {
  id: string;
  turfId: string;
  turfName: string;
  area: string;
  city: string;
  rating: number;
  gameType: string;
  category: string;
  title: string;
  specification: string;
  photoUrl: string;
  photos: string[];
  hourlyPrice: number;
  minDuration: number;
  equipmentChecklist: string[];
  amenities: string[];
  distanceKm?: number;
  availableSlotsCount: number;
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

export interface HourlyOccupancySlot {
  hourLabel: string; // e.g., "06:00 AM", "07:00 AM", ... "11:00 PM"
  bookingsCount: number;
  occupancyPercent: number;
}

export interface DayOccupancyItem {
  dayName: string; // "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
  bookingsCount: number;
  occupancyPercent: number;
  revenue: number;
}

export interface TimeBlockOccupancy {
  block: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
  label: string; // e.g. "Morning (6 AM - 11 AM)"
  hours: string; // "06:00 - 11:00"
  bookingsCount: number;
  occupancyPercent: number;
  revenue: number;
}

export interface SportRevenueShare {
  sport: string;
  revenue: number;
  bookingsCount: number;
  percentage: number;
}

export interface ArenaPerformance {
  arenaId: string;
  arenaName: string;
  sport: string;
  revenue: number;
  bookingsCount: number;
  occupancyPercent: number;
}

export interface TopRegularPlayer {
  playerId: string;
  playerName: string;
  playerPhone?: string;
  playerPhotoURL?: string | null;
  totalBookings: number;
  totalSpent: number;
  favoriteSport?: string;
  lastBookingDate?: string;
}

export interface AnalyticsSmartRecommendation {
  id: string;
  title: string;
  description: string;
  type: 'PRICING' | 'OCCUPANCY' | 'RETENTION' | 'ARENA';
  impactLevel: 'HIGH' | 'MEDIUM' | 'GROWTH';
  actionLabel?: string;
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
  onlineRevenue: number;
  cashRevenue: number;
  popularArenaName: string;
  popularTimeSlot: string;
  popularDay: string;
  mostBookedSport: string;
  repeatPlayersCount: number;
  newPlayersCount: number;
  repeatRatePercent: number;
  averageBookingValue: number;
  occupancyRatePercent: number;
  leadTimeHoursAvg: number;
  
  // Advanced granular breakdowns
  hourlyHeatmap: HourlyOccupancySlot[];
  dayBreakdown: DayOccupancyItem[];
  timeBlocks: TimeBlockOccupancy[];
  sportShares: SportRevenueShare[];
  arenaPerformances: ArenaPerformance[];
  topRegularPlayers: TopRegularPlayer[];
  smartRecommendations: AnalyticsSmartRecommendation[];

  // Individual Arena Filtering & Breakdown
  selectedArenaId?: string;
  selectedArenaName?: string;
  availableArenas?: { id: string; name: string; sport: string }[];
}

export interface PlayerTabVisibility {
  home: boolean;
  explore: boolean;
  gaming: boolean;
  lobbies: boolean;
  teams: boolean;
  matches: boolean;
  rewards: boolean;
  stats: boolean;
  bookings: boolean;
  payments: boolean;
}

export interface OwnerTabVisibility {
  dashboard: boolean;
  analytics: boolean;
  'my-turf': boolean;
  slots: boolean;
  bookings: boolean;
  dues: boolean;
  payments: boolean;
  offers: boolean;
  reviews: boolean;
  profile: boolean;
}

export interface TabVisibilityConfig {
  playerTabs: PlayerTabVisibility;
  ownerTabs: OwnerTabVisibility;
  updatedAt?: string;
  updatedBy?: string;
}

// ==========================================
// PLAYER POOLS & COMMUNITY MATCHMAKING
// ==========================================

export type MatchHoursCategory = 'ALL' | 'MORNING' | 'MIDDAY' | 'EVENING' | 'NIGHT';

export interface PoolInterestedPlayer {
  uid: string;
  name: string;
  phone?: string;
  photoURL?: string | null;
  skillLevel?: string;
  paymentPreference?: 'UPI' | 'PAY_LATER';
  joinedAt: string;
}

export interface PlayerPool {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorPhone?: string;
  creatorPhotoURL?: string | null;
  sport: string;
  city: string;
  area: string;
  preferredDate: string;
  preferredTime: string;
  preferredHours?: string;
  matchHoursCategory: 'MORNING' | 'MIDDAY' | 'EVENING' | 'NIGHT';
  requiredPlayers: number;
  currentPlayersCount: number;
  maxPricePerPlayer: number;
  estimatedTotalBudget?: number;
  preferredTurfId?: string;
  preferredTurfName?: string;
  description?: string;
  status: 'OPEN' | 'READY_TO_CONVERT' | 'CONVERTED_TO_LOBBY' | 'CANCELLED' | 'EXPIRED';
  interestedPlayers: PoolInterestedPlayer[];
  convertedLobbyId?: string;
  convertedBookingId?: string;
  convertedTurfName?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// OWNER SUBSCRIPTION MANAGEMENT
// ==========================================

export interface PlanFeatureConfig {
  analytics: boolean;          // Revenue & Occupancy Analytics Console
  analytics7Days?: boolean;    // 7-Day Weekly Analytics & Trends
  analytics30Days?: boolean;   // 30-Day Monthly Analytics & Performance
  analyticsAllTime?: boolean;  // All-Time Lifetime Financial Audit & VIPs
  individualArenaAnalytics?: boolean; // Individual Arena & Court Analytics Drilldown
  downloadReports?: boolean;   // Download Weekly, Monthly, All-Time & Daily CSV/PDF Reports
  whatsappNotifications?: boolean; // Instant WhatsApp Booking Passes & Ticket Alerts
  offers: boolean;             // Custom Coupons & Promo Codes
  duesTracker: boolean;        // Player Dues & Cash Settlement Tracker
  athleteAccounts?: boolean;   // Athlete Accounts & Player Profiles View
  reviewsManager: boolean;     // Ratings & Customer Reviews
  allowPayAtVenue: boolean;    // Counter Cash / Pay at Venue Payment Acceptance
  autoSlotGenerator: boolean;  // 7-Day Auto Slot Generator & Recurring Slots
  customPricing: boolean;      // Peak Hour & Dynamic Weekend Pricing
  slotPriceEditing?: boolean;
  multiCourtSetup?: boolean;
  featuredTurf?: boolean;
  whatsappAlerts?: boolean;
  monthlyEmailReport?: boolean;
  individualArenaOffers?: boolean; // Individual Arena & Gaming Zone Offers Feature
}

export const DEFAULT_PLAN_FEATURES: PlanFeatureConfig = {
  analytics: true,
  analytics7Days: true,
  analytics30Days: true,
  analyticsAllTime: true,
  individualArenaAnalytics: true,
  downloadReports: true,
  whatsappNotifications: true,
  offers: true,
  duesTracker: true,
  athleteAccounts: true,
  reviewsManager: true,
  allowPayAtVenue: true,
  autoSlotGenerator: true,
  customPricing: true,
  individualArenaOffers: false,
};

export interface OwnerSubscriptionPlan {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  billingPeriod?: string;
  durationDays: number; // e.g. 365 for annual, 30 for monthly
  features: string[];
  featuresConfig?: PlanFeatureConfig;
  entitlements?: {
    maxCourts?: number;
    commissionPercent?: number;
    whatsappNotifications?: boolean;
    verificationBadgeIncluded?: boolean;
  };
  maxArenas: number;
  maxBookingsPerMonth: number;
  trialDays: number;
  badgeIncluded?: boolean; // Owner Verification Badge included in this plan
  popular?: boolean;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_OWNER_PLANS: OwnerSubscriptionPlan[] = [
  {
    id: 'starter_arena',
    name: 'Starter Arena (30d Trial)',
    price: 999,
    originalPrice: 1499,
    billingPeriod: 'MONTHLY',
    durationDays: 30,
    features: [
      'Up to 2 Pitches / Courts',
      'Real-time slot availability & booking engine',
      'WhatsApp QR check-in pass generator',
      'Automated Razorpay & UPI settlement',
      '30-Day Free Full Access Trial',
    ],
    entitlements: {
      maxCourts: 2,
      commissionPercent: 2,
      whatsappNotifications: true,
      verificationBadgeIncluded: false,
    },
    maxArenas: 2,
    maxBookingsPerMonth: 200,
    trialDays: 30,
    badgeIncluded: false,
    popular: false,
    isActive: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pro_arena',
    name: 'Pro Arena SaaS',
    price: 1999,
    originalPrice: 2999,
    billingPeriod: 'MONTHLY',
    durationDays: 30,
    features: [
      'Up to 6 Pitches & Sports types',
      'Verified Turf Owner Gold Badge included',
      'Dynamic peak & floodlight surge pricing',
      'Advanced revenue & slot occupancy analytics',
      'Unlimited WhatsApp digital guest passes',
      'Priority placement on city discovery searches',
    ],
    entitlements: {
      maxCourts: 6,
      commissionPercent: 1,
      whatsappNotifications: true,
      verificationBadgeIncluded: true,
    },
    maxArenas: 6,
    maxBookingsPerMonth: 1000,
    trialDays: 30,
    badgeIncluded: true,
    popular: true,
    isActive: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'enterprise_network',
    name: 'Enterprise Franchise',
    price: 4999,
    originalPrice: 7999,
    billingPeriod: 'MONTHLY',
    durationDays: 30,
    features: [
      'Unlimited Pitches, Arenas & Multi-location venues',
      'Multi-manager & groundkeeper role permissions',
      'Custom tournament hosting & cash league payouts',
      '0% platform commission on direct bookings',
      'Dedicated key account manager & 24/7 priority support',
    ],
    entitlements: {
      maxCourts: 99,
      commissionPercent: 0,
      whatsappNotifications: true,
      verificationBadgeIncluded: true,
    },
    maxArenas: 99,
    maxBookingsPerMonth: 99999,
    trialDays: 30,
    badgeIncluded: true,
    popular: false,
    isActive: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export type OwnerSubscriptionState =
  | 'TRIAL_ACTIVE'
  | 'TRIAL_EXPIRED'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'PENDING'
  | 'TRIAL';

export interface OwnerSubscriptionStatus {
  ownerId: string;
  planId: string;
  planName: string;
  status: OwnerSubscriptionState;
  startDate: string;
  expiryDate: string;
  trialEndsAt: string;
  isTrialActive: boolean;
  trialDurationDays?: number; // Standard 30-day trial
  updatedAt: string;
  customFeatures?: Partial<PlanFeatureConfig>;
  maxArenasOverride?: number;
  writeAccessBlocked?: boolean;
  notes?: string;
}

export interface SubscriptionSystemConfig {
  enabled: boolean;
  trialDurationDays?: number; // default 30 days
  playerSubscriptionsEnabled?: boolean;
  ownerSubscriptionsEnabled?: boolean;
  updatedAt: string;
  updatedBy: string;
}

// ==========================================
// PLAYER SAAS SUBSCRIPTION SYSTEM
// ==========================================

export interface PlayerPlanEntitlements {
  bookingDiscountPercent: number; // e.g. 10% off turf slot bookings
  priorityLobbyAccess: boolean;   // First-in-line match & squad joining
  freeTournamentEntryMonthly: number; // e.g. 1 free tournament entry / mo
  advancedMatchStats: boolean;    // Advanced player analytics & heatmaps
  customSquadBadges: boolean;     // Pro squad logos & animated banner
  verifiedBadgeIncluded: boolean; // Player verified badge included for free
  zeroCancellationFee: boolean;   // 100% refund on cancellations before cutoff
  unlimitedDMs: boolean;          // Unrestricted direct messaging
}

export const DEFAULT_PLAYER_ENTITLEMENTS: PlayerPlanEntitlements = {
  bookingDiscountPercent: 10,
  priorityLobbyAccess: true,
  freeTournamentEntryMonthly: 1,
  advancedMatchStats: true,
  customSquadBadges: true,
  verifiedBadgeIncluded: true,
  zeroCancellationFee: true,
  unlimitedDMs: true,
};

export interface PlayerSubscriptionPlan {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  billingPeriod: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  durationDays: number;
  features: string[];
  entitlements: PlayerPlanEntitlements;
  badgeIncluded: boolean;
  popular?: boolean;
  trialDays?: number;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_PLAYER_SUBSCRIPTION_PLANS: PlayerSubscriptionPlan[] = [
  {
    id: 'player_pass_monthly',
    name: 'Athlete Pro Pass (Monthly)',
    price: 199,
    originalPrice: 399,
    billingPeriod: 'MONTHLY',
    durationDays: 30,
    features: [
      'Official Gold Athlete Verified Tick',
      '10% instant discount on all slot bookings',
      'Priority joining queue for squad match lobbies',
      '1 Free corporate/open tournament entry per month',
      'Advanced match radar stats and performance analytics',
    ],
    entitlements: {
      bookingDiscountPercent: 10,
      priorityLobbyAccess: true,
      freeTournamentEntryMonthly: 1,
      advancedMatchStats: true,
      customSquadBadges: true,
      verifiedBadgeIncluded: true,
      zeroCancellationFee: true,
      unlimitedDMs: true,
    },
    badgeIncluded: true,
    popular: true,
    trialDays: 0,
    isActive: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'player_pass_quarterly',
    name: 'Athlete Pro Pass (Quarterly)',
    price: 499,
    originalPrice: 899,
    billingPeriod: 'QUARTERLY',
    durationDays: 90,
    features: [
      'Everything in Monthly Pass',
      '15% instant discount on all turf slots',
      '3 Free tournament passes across 90 days',
      'Custom animated squad team badge',
      'VIP Match lobby host badge',
    ],
    entitlements: {
      bookingDiscountPercent: 15,
      priorityLobbyAccess: true,
      freeTournamentEntryMonthly: 2,
      advancedMatchStats: true,
      customSquadBadges: true,
      verifiedBadgeIncluded: true,
      zeroCancellationFee: true,
      unlimitedDMs: true,
    },
    badgeIncluded: true,
    popular: false,
    trialDays: 0,
    isActive: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'player_pass_annual',
    name: 'Athlete Pro Elite (Annual)',
    price: 1499,
    originalPrice: 2999,
    billingPeriod: 'ANNUAL',
    durationDays: 365,
    features: [
      'Gold Athlete Badge for 365 full days',
      '20% exclusive partner turf discounts',
      'Unlimited tournament registrations',
      'Zero platform fee & zero cancellation charge',
      'Official TruFit verified player ranking card',
    ],
    entitlements: {
      bookingDiscountPercent: 20,
      priorityLobbyAccess: true,
      freeTournamentEntryMonthly: 99,
      advancedMatchStats: true,
      customSquadBadges: true,
      verifiedBadgeIncluded: true,
      zeroCancellationFee: true,
      unlimitedDMs: true,
    },
    badgeIncluded: true,
    popular: false,
    trialDays: 0,
    isActive: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export interface PlayerSubscriptionStatus {
  userId: string;
  userEmail?: string;
  userName?: string;
  planId: string;
  planName: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING';
  startDate: string;
  expiryDate: string;
  amountPaid: number;
  paymentTxnId: string;
  entitlements: PlayerPlanEntitlements;
  updatedAt: string;
}

export interface PlayerSubscriptionTransaction {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  planId: string;
  planName: string;
  amountPaid: number;
  paymentTxnId: string;
  createdAt: string;
}

// ==========================================
// VERIFICATION BADGE SYSTEM (OWNER & PLAYER)
// ==========================================

export interface VerificationBadgeConfig {
  id: 'verification_badge_config';
  enabled: boolean;
  playerBadgeEnabled: boolean;
  ownerBadgeEnabled: boolean;
  playerBadgePrice: number; // e.g. ₹299 / year
  playerBadgeDurationDays: number; // e.g. 365
  ownerBadgePrice: number; // e.g. ₹1999 / year
  ownerBadgeDurationDays: number; // e.g. 365
  ownerSaaSInclusion: Record<string, boolean>; // e.g. { 'plan_pro_annual': true }
  requirements: {
    minMatchesPlayed?: number;
    minSportsmanshipRating?: number;
    emailVerifiedRequired?: boolean;
    phoneVerifiedRequired?: boolean;
  };
  perks: {
    player: string[];
    owner: string[];
  };
  updatedAt: string;
  updatedBy: string;
}

export const DEFAULT_VERIFICATION_BADGE_CONFIG: VerificationBadgeConfig = {
  id: 'verification_badge_config',
  enabled: true,
  playerBadgeEnabled: true,
  ownerBadgeEnabled: true,
  playerBadgePrice: 499,
  playerBadgeDurationDays: 365,
  ownerBadgePrice: 1999,
  ownerBadgeDurationDays: 365,
  ownerSaaSInclusion: {
    pro_arena: true,
    enterprise_network: true,
  },
  requirements: {
    minMatchesPlayed: 3,
    minSportsmanshipRating: 4.0,
    emailVerifiedRequired: true,
    phoneVerifiedRequired: false,
  },
  perks: {
    player: [
      'Gold Profile Tick beside name across all lobbies & tournaments',
      'Priority squad join queue for open match lobbies',
      'Exemption from platform matchmaking fees',
      'Protected athlete identity & sportsmanship rating lock',
    ],
    owner: [
      'TruFit Certified Venue Gold Badge on search results',
      '3x higher customer conversion and booking confidence',
      'Featured placement on city map discover list',
      'Direct priority dispute & payout support channel',
    ],
  },
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};

export interface PlayerVerificationBadge {
  id: string; // userId
  userId: string;
  userName: string;
  userEmail: string;
  isVerified: boolean;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'PENDING';
  badgeType: 'GOLD' | 'BLUE' | 'PRO';
  purchasedAt: string;
  expiresAt: string;
  amountPaid: number;
  paymentTxnId: string;
  source: 'DIRECT_PURCHASE' | 'SAAS_PLAN_INCLUDED' | 'ADMIN_GRANT';
  updatedAt: string;
}

// ==========================================
// AUDIT LOGGING SYSTEM
// ==========================================

export interface SubscriptionAuditLog {
  id: string;
  type: 'OWNER_SUBSCRIPTION' | 'PLAYER_SUBSCRIPTION' | 'COACH_SUBSCRIPTION';
  targetId: string; // ownerId or playerId
  targetName: string;
  targetEmail?: string;
  action: 'TRIAL_STARTED' | 'TRIAL_EXPIRED' | 'ACTIVATED' | 'RENEWED' | 'EXPIRED' | 'CANCELLED' | 'ADMIN_OVERRIDE';
  planId?: string;
  planName?: string;
  amount?: number;
  paymentTxnId?: string;
  performedBy: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface VerificationAuditLog {
  id: string;
  type: 'PLAYER_VERIFICATION' | 'OWNER_VERIFICATION' | 'VENUE_VERIFICATION';
  targetId: string;
  targetName: string;
  action: 'PURCHASED' | 'ACTIVATED' | 'REVOKED' | 'EXPIRED' | 'ADMIN_GRANTED';
  amount?: number;
  paymentTxnId?: string;
  performedBy: string;
  notes?: string;
  timestamp: string;
}

export interface UserControl {
  uid: string;
  userEmail: string;
  userName: string;
  role: UserRole;
  playerProfileEnabled: boolean;
  ownerProfileEnabled: boolean;
  publicProfileVisible: boolean;
  venueProfileVisible: boolean;
  socialPostsEnabled: boolean;
  commentsEnabled: boolean;
  messagingEnabled: boolean;
  followersFollowingEnabled: boolean;
  communityParticipationEnabled: boolean;
  tournamentParticipationEnabled: boolean;
  bookingAllowed: boolean;
  tournamentOrganizerAccess: boolean;
  membershipAccess: boolean;
  offersAccess: boolean;
  updatedAt: string;
  updatedBy: string;
  disableReason?: string;
}

export interface GlobalFeatureControls {
  id: string; // 'global'
  playerProfilesEnabled: boolean;
  ownerProfilesEnabled: boolean;
  socialPostsEnabled: boolean;
  messagingEnabled: boolean;
  tournamentsEnabled: boolean;
  bookingsEnabled: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface OwnerSubscriptionTransaction {
  id: string;
  ownerId: string;
  ownerEmail?: string;
  ownerName?: string;
  planId: string;
  planName: string;
  amountPaid: number;
  paymentTxnId: string;
  createdAt: string;
}
// ==========================================
// PROMOTIONAL BANNER MANAGEMENT
// ==========================================

export type BannerAudience = 'ALL' | 'PLAYERS' | 'OWNERS';

export interface PromotionalBanner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  buttonText: string;
  targetScreen: string; // e.g. 'explore', 'lobbies', 'tournaments', 'home'
  startDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  displayOrder: number;
  isActive: boolean;
  targetAudience: BannerAudience;
  createdAt: string;
  updatedAt: string;
}

export interface PricingConfig {
  id: 'main_pricing';
  cancellationFeeFixed: number;
  cancellationFeeEnabled: boolean;
  convenienceFee: number;
  convenienceFeeEnabled: boolean;
  updatedAt: string;
}

export interface FeatureFlag {
  id: string; // The feature key (e.g., 'enable_subscriptions')
  name: string;
  enabled: boolean;
  description: string;
  updatedAt: string;
}

export interface AppConfig {
  id: 'main_config';
  customerSupportEmail: string;
  customerSupportPhone: string;
  bookingCancellationWindowMinutes: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowPlayerLoginOnWebsite: boolean;
  updatedAt: string;
}

// ==========================================
// 1. COACH & ACADEMY HUB
// ==========================================

export interface CoachCertification {
  title: string;
  issuer: string;
  year: number;
  docUrl?: string;
}

export type CoachVerificationStatus = 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED' | 'DOCUMENT_REQUIRED';
export type CoachIdProofType = 'AADHAAR' | 'PASSPORT' | 'DRIVING_LICENSE' | 'VOTER_ID' | 'NATIONAL_ID';

export interface CoachSubscriptionPlan {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  durationDays: number; // e.g. 365
  duration: string; // e.g. '1 Year (365 Days)'
  role: 'COACH' | 'ACADEMY' | 'ALL';
  popular?: boolean;
  features: string[];
  maxBatches?: number;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CoachSubscription {
  planId: string;
  planName: string;
  amountPaid: number;
  paymentStatus: 'PAID' | 'PENDING' | 'EXPIRED';
  paymentId?: string;
  paymentMethod?: string;
  subscribedAt: string;
  expiresAt: string;
  isActive: boolean;
}

export interface CoachSubscriptionTransaction {
  id: string;
  coachId: string;
  coachName?: string;
  coachEmail?: string;
  coachPhone?: string;
  academyName?: string;
  planId: string;
  planName: string;
  amountPaid: number;
  paymentTxnId: string;
  paymentMethod?: string;
  durationDays: number;
  createdAt: string;
}

export const DEFAULT_COACH_SUBSCRIPTION_PLANS: CoachSubscriptionPlan[] = [
  {
    id: 'YEARLY_COACH_PRO',
    name: 'Pro Coach Annual Pass',
    price: 2999,
    originalPrice: 4999,
    durationDays: 365,
    duration: '1 Year (365 Days)',
    role: 'COACH',
    popular: true,
    maxBatches: 5,
    features: [
      'Official Gold Coach Verified Tick',
      'Host up to 5 concurrent training batches',
      'Direct athlete & student discovery across city',
      'Automated batch attendance & fee register',
      '0% platform commission on student fees',
      'Direct partner turf slot booking access',
    ],
    isActive: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'YEARLY_ACADEMY_ELITE',
    name: 'Academy Elite Annual Pass',
    price: 6999,
    originalPrice: 9999,
    durationDays: 365,
    duration: '1 Year (365 Days)',
    role: 'ACADEMY',
    popular: false,
    maxBatches: 15,
    features: [
      'Verified Sports Academy Gold Badge',
      'Host up to 15 multi-sport coaching batches',
      'Multi-coach staff sub-accounts & roster assignment',
      'Direct student online payments & installment tracking',
      'Featured placement on TruFit Academy explorer',
      'Priority turf block booking with partner venues',
    ],
    isActive: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'YEARLY_FRANCHISE_ENTERPRISE',
    name: 'Multi-Location Academy Franchise',
    price: 14999,
    originalPrice: 24999,
    durationDays: 365,
    duration: '1 Year (365 Days)',
    role: 'ALL',
    popular: false,
    maxBatches: 999,
    features: [
      'Unlimited batches across all partner cities & venues',
      'Custom branded academy certificates & skill progress cards',
      '0% commission on tournament & camp registrations',
      'Dedicated relationship manager & VIP phone support',
      'Bulk student WhatsApp broadcasts & performance cards',
    ],
    isActive: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export interface CoachProfile {
  id: string;
  userId: string;
  name: string;
  academyName?: string;
  city?: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  bio: string;
  sports: string[];
  experienceYears: number;
  certifications: CoachCertification[];
  rates: {
    perSession: number;
    monthly: number;
  };
  rating: number;
  reviewCount: number;
  specialization: string;
  venueIds: string[];
  venueNames: string[];

  // Verification
  isVerified: boolean;
  verificationStatus: CoachVerificationStatus;
  idProofType?: CoachIdProofType;
  idProofNumber?: string;
  idProofImageUrl?: string;
  isPhoneVerified: boolean;
  phoneOtpVerifiedAt?: string;
  certificationProofUrls?: string[];
  verificationNotes?: string;
  verifiedAt?: string;
  verifiedBy?: string;

  // Yearly subscription to admin
  subscription?: CoachSubscription;

  // Revenue & Students Metrics
  totalEnrolledStudents: number;
  totalEarnings: number;
  platformFeePaid: number;

  status: 'ACTIVE' | 'PENDING' | 'PAUSED' | 'SUSPENDED';
  createdAt: string;
  updatedAt?: string;
}

export type BatchLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';
export type BatchAgeGroup = 'KIDS_5_12' | 'TEENS_13_18' | 'ADULTS' | 'ALL_AGES';

export interface CoachBatch {
  id: string;
  coachId: string;
  coachName: string;
  coachAvatar?: string;
  coachPhone?: string;
  title: string;
  sport: string;
  description: string;
  level: BatchLevel;
  ageGroup: BatchAgeGroup;
  turfId: string;
  turfName: string;
  arenaId?: string;
  arenaName?: string;
  scheduleDays: string[]; // e.g. ['Mon', 'Wed', 'Fri']
  timeSlot: string; // e.g. "06:30 AM - 08:00 AM"
  maxCapacity: number;
  enrolledCount: number;
  feePerMonth: number;
  feePerSession: number;
  startDate: string;
  status: 'OPEN' | 'FULL' | 'COMPLETED';
  createdAt: string;
}

export interface CoachEnrollment {
  id: string;
  batchId: string;
  batchTitle: string;
  coachId: string;
  coachName: string;
  playerId: string;
  playerName: string;
  playerEmail: string;
  playerPhone: string;
  planType: 'MONTHLY' | 'SINGLE_SESSION';
  amountPaid: number;
  paymentStatus: 'PAID' | 'PENDING';
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  enrolledAt: string;
  validUntil?: string;
}

// ==========================================
// 2. OPEN COMMUNITY & 3. CORPORATE TOURNAMENTS
// ==========================================

export type TournamentCategory = 'COMMUNITY_OPEN' | 'CORPORATE';
export type TournamentFormat = 'KNOCKOUT' | 'ROUND_ROBIN_KNOCKOUT' | 'LEAGUE';
export type TournamentStatus =
  | 'UPCOMING'
  | 'REGISTRATION_OPEN'
  | 'REGISTRATION_CLOSED'
  | 'ONGOING'
  | 'COMPLETED';

export interface TournamentPrizePool {
  champion: number;
  runnerUp: number;
  thirdPlace?: number;
  bestPlayer?: number;
  trophies?: boolean;
  total: number;
}

export interface CorporateTournamentDetails {
  companyName?: string;
  corporateDomain?: string; // e.g. "google.com"
  gstin?: string;
  division?: string;
  isInterCompany?: boolean;
  amenities?: string[]; // e.g. 'Pro Referees', 'Custom Sublimation Jerseys', 'Hydration & Snack Lounge', 'Live Photography & Video', 'Custom Trophies & Medals'
  invoiceRequired?: boolean;
}

export interface Tournament {
  id: string;
  organizerId: string;
  organizerName: string;
  organizerPhone: string;
  organizerEmail: string;
  title: string;
  city?: string;
  category: TournamentCategory;
  sport: string;
  format: TournamentFormat;
  squadSize: number;
  maxTeams: number;
  registeredTeamsCount: number;
  registrationFeePerTeam: number;
  organizerFeePaid: number;
  organizerPaymentStatus: 'PAID' | 'PENDING';
  prizePool: TournamentPrizePool;
  turfId: string;
  turfName: string;
  turfLocation: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  bannerUrl?: string;
  rules: string[];
  status: TournamentStatus;
  corporateDetails?: CorporateTournamentDetails;
  createdAt: string;
  updatedAt?: string;
}

export interface TournamentRosterMember {
  name: string;
  jerseyNumber?: number;
  role?: string; // e.g. 'Captain', 'Striker', 'Goalkeeper', 'Batsman', 'Bowler'
}

export interface TournamentTeam {
  id: string;
  tournamentId: string;
  tournamentTitle?: string;
  teamName: string;
  companyName?: string;
  captainId: string;
  captainName: string;
  captainPhone: string;
  captainEmail: string;
  playersCount: number;
  playerRoster: TournamentRosterMember[];
  paymentStatus: 'PAID' | 'PENDING';
  amountPaid: number;
  registeredAt: string;
  groupOrSeed?: string;
  status: 'CONFIRMED' | 'WAITLISTED' | 'DISQUALIFIED';
}

export interface TournamentFixtureTeam {
  id?: string;
  name: string;
  score?: string;
  scoreNum?: number;
  setsWon?: number;
}

export interface TournamentFixture {
  id: string;
  tournamentId: string;
  round: string; // 'Round of 16' | 'Quarter Final' | 'Semi Final' | 'Grand Final'
  matchNumber: number;
  teamA: TournamentFixtureTeam;
  teamB: TournamentFixtureTeam;
  winnerId?: string;
  winnerName?: string;
  scheduledTime: string;
  pitchName?: string;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED';
}

export interface SocialComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: string;
}

export type SocialMediaType = 'IMAGE' | 'VIDEO' | 'NONE';

export interface SocialPost {
  id: string;
  authorId: string;
  authorType: 'PLAYER' | 'OWNER';
  authorName: string;
  authorUsername?: string;
  authorAvatar?: string;
  authorRole?: string;
  authorCity?: string;
  isVerified?: boolean;
  ownerTurfId?: string;
  ownerTurfName?: string;
  caption: string;
  mediaUrl?: string;
  mediaUrls?: string[];
  mediaType?: SocialMediaType;
  sport?: string;
  city?: string;
  isPromotional?: boolean;
  promoTag?: string;
  ctaText?: string;
  likesCount: number;
  likedBy?: string[];
  commentsCount: number;
  comments?: SocialComment[];
  createdAt: string;
  updatedAt?: string;
}

export interface OwnerBrandProfile {
  id: string; // owner uid or custom document id
  ownerId: string;
  handle: string; // e.g. "@PowerPlayArena"
  brandName: string;
  tagline?: string;
  logoUrl?: string;
  coverUrl?: string;
  bio: string;
  city: string;
  address?: string;
  amenities?: string[];
  phone?: string;
  whatsapp?: string;
  instagramHandle?: string;
  isVerified: boolean;
  saasPlanName?: string;
  followersCount: number;
  followers?: string[];
  turfIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string | null;
  text: string;
  createdAt: string;
  read?: boolean;
  status?: 'sending' | 'sent' | 'error';
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaName?: string | null;
  mediaSize?: number | null;
}

export interface DirectConversation {
  id: string;
  participants: string[];
  participantProfiles: Record<string, { displayName: string; photoURL?: string; role?: string; username?: string }>;
  lastMessage: string;
  lastMessageSenderId: string;
  lastMessageAt: string;
  updatedAt: string;
  unreadCount?: Record<string, number>;
  status?: 'pending' | 'accepted';
  requestSenderId?: string;
  requestRecipientId?: string;
}




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

export type DocumentStatus =
  | 'uploaded'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'APPROVED'
  | 'REJECTED'
  | 'PENDING'
  | 'VERIFIED';

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
  verificationStatus?: DocumentStatus;
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
  | 'BOOKED'
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

export type PaymentMode = 'PAY_FULL' | 'PAY_PARTIAL' | 'PAY_LATER';

export interface OwnerPaymentSettings {
  upiId?: string;
  beneficiaryName?: string;
  bankAccount?: string;
  accountNumber?: string;
  bankName?: string;
  ifscCode?: string;
  qrCodeUrl?: string;
  razorpayKeyId?: string;
  allowFullPayment?: boolean;
  allowPartialPayment?: boolean;
  allowPayLater?: boolean;
  minAdvanceAmount?: number;
  cancellationCutoffHours?: number;
  lateCancellationPenaltyType?: 'FLAT' | 'PERCENTAGE';
  lateCancellationPenaltyAmount?: number;
  noShowPenaltyAmount?: number;
  autoRefundEnabled?: boolean;
  enableLobbyPlayerDues?: boolean;
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
  isPhoneVerified?: boolean;
  phoneVerifiedAt?: string;
  phoneVerificationProvider?: 'truecaller' | 'firebase_sms' | 'sms_gateway';
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
  sportsmanshipRating?: number;
  totalRatingsReceived?: number;
  badges?: string[];
  isPublic?: boolean;
  pushToken?: string;
  pushTokens?: string[];
  pushNotificationsEnabled?: boolean;
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
  latitude?: number;
  longitude?: number;
  photos: string[];
  locationUrl?: string;
  googleMapsUrl?: string;
  active?: boolean;
  upiId?: string;
  beneficiaryName?: string;
  qrCodeUrl?: string;
  // Partner policy configurations
  allowFullPayment?: boolean;
  allowPartialPayment?: boolean;
  allowPayLater?: boolean;
  allowPayAtVenue?: boolean;
  paymentSettings?: OwnerPaymentSettings;
  minAdvanceAmount?: number;
  cancellationCutoffHours?: number;
  lateCancellationPenaltyType?: 'FLAT' | 'PERCENTAGE';
  lateCancellationPenaltyAmount?: number;
  noShowPenaltyAmount?: number;
  merchantUpiId?: string;
  merchantBeneficiaryName?: string;
  merchantBankAccount?: string;
  merchantIfscCode?: string;
  autoRefundEnabled?: boolean;
  enableLobbyPlayerDues?: boolean;
  isClosed?: boolean;
  closureReason?: string;
  closureNotice?: string;
  hasGamingZone?: boolean;
  merchantUpiConfig?: any;
  indoorGames?: string[];
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

export type BannerAudience = 'ALL' | 'PLAYERS' | 'OWNERS';

export interface PromotionalBanner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  buttonText: string;
  targetScreen: string; // e.g. 'ExploreTurfs', 'Lobbies', 'GamingZone', 'PlayerBookings', etc.
  startDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  displayOrder: number;
  isActive: boolean;
  targetAudience: BannerAudience;
  createdAt: string;
  updatedAt: string;
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

export interface Arena {
  id: string;
  turfId: string;
  ownerId?: string;
  name: string;
  sport: string;
  sports?: string[];
  facilityType?: FacilityType;
  indoorGameType?: IndoorGameType | string;
  tableOrBoardNumber?: string;
  equipmentIncluded?: string[];
  hasAirConditioning?: boolean;
  hasLoungeAccess?: boolean;
  slotDurationOption?: 30 | 60 | 120;
  description?: string;
  capacity: number;
  pricePerSlot: number;
  surface?: string;
  format?: string;
  photos?: string[];
  active?: boolean;
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
  turfLocationUrl?: string;
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
  paymentMethod?: 'PAY_NOW' | 'PAY_LATER_AT_TURF' | 'PAY_PARTIAL';
  paymentMode?: PaymentMode;
  advancePaid?: number;
  counterAmountPaid?: number;
  dueAmount?: number;
  numberOfPlayers?: number;
  playerShareAmount?: number;
  convenienceFee?: number;
  ownerShare?: number;
  lobbyCreated?: boolean;
  lobbyId?: string;
  bookedVia?: 'INDIVIDUAL' | 'LOBBY';
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
  cancelledBy?: 'PLAYER' | 'OWNER';
  cancelledAt?: string;
  cancellationReason?: string;
  cancellationHoursBefore?: number;
  cancellationFeeApplied?: number;
  refundAmount?: number;
  refundStatus?: 'NONE' | 'PENDING' | 'REFUNDED' | 'NOT_APPLICABLE' | 'PARTIAL_AFTER_PENALTY';
  isNoShow?: boolean;
  noShowMarkedAt?: string;
  noShowFee?: number;
  noShowPenaltyAmount?: number;
  settlementStatus?: 'SETTLED' | 'PENDING' | 'REFUNDED' | 'NO_SHOW_PENALTY';
  ledgerTxnId?: string;
  merchantOrderRef?: string;
  bankUtr?: string;
  verificationSource?: 'MERCHANT_UPI_WEBHOOK' | 'MANUAL_SELF_REPORT' | 'CASH_VERIFIED';
  webhookVerifiedAt?: string;
  whatsappNotificationSent?: boolean;
  whatsappNotificationSentAt?: string;
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
  status: 'PENDING' | 'PAID' | 'PARTIAL' | 'CANCELLED_REVERSED' | 'NO_SHOW_PENALTY' | 'CANCELLED';
  dueType?: string;
  isPenaltyDue?: boolean;
  notes?: string;
  lastPaymentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialLedgerEntry {
  id: string;
  idempotencyKey: string;
  bookingId: string;
  bookingRef?: string;
  slotId?: string;
  turfId: string;
  turfName: string;
  ownerId: string;
  playerId: string;
  playerName: string;
  type:
    | 'PAY_FULL'
    | 'PAY_PARTIAL_ADVANCE'
    | 'DUE_CREATED'
    | 'DUE_SETTLED_CASH'
    | 'DUE_SETTLED_UPI'
    | 'REFUND_FULL'
    | 'REFUND_PARTIAL_AFTER_PENALTY'
    | 'NO_SHOW_PENALTY';
  entryType?: string;
  description?: string;
  timestamp?: string;
  amount: number;
  advanceAmount?: number;
  dueAmount?: number;
  convenienceFee?: number;
  ownerShare?: number;
  penaltyAmount?: number;
  refundAmount?: number;
  paymentMethod: 'UPI' | 'CASH' | 'WALLET' | 'SYSTEM_REVERSAL';
  upiTxnRef?: string;
  status: 'SUCCESS' | 'PENDING' | 'REVERSED';
  notes?: string;
  createdAt: string;
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

export type MatchHoursCategory = 'ALL' | 'MORNING' | 'MIDDAY' | 'EVENING' | 'NIGHT';

export interface PoolInterestedPlayer {
  uid: string;
  name: string;
  phone?: string;
  photoURL?: string;
  skillLevel?: string;
  preferredPosition?: string;
  paymentPreference?: 'UPI' | 'PAY_LATER';
  joinedAt: string;
}

export type PoolStatus = 'OPEN' | 'READY_TO_CONVERT' | 'CONVERTED_TO_LOBBY' | 'CANCELLED' | 'EXPIRED';

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
  preferredHours?: string;
  matchHoursCategory?: MatchHoursCategory;
  requiredPlayers: number;
  currentPlayersCount: number;
  maxPricePerPlayer: number;
  estimatedTotalBudget?: number;
  preferredTurfId?: string;
  preferredTurfName?: string;
  description?: string;
  status: PoolStatus;
  convertedLobbyId?: string;
  convertedBookingId?: string;
  convertedTurfName?: string;
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
  playerPhone?: string;
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

export type MerchantProvider =
  | 'RAZORPAY_MERCHANT'
  | 'PHONEPE_BUSINESS'
  | 'PAYTM_BUSINESS'
  | 'BHIM_MERCHANT'
  | 'HDFC_SMARTHUB'
  | 'ICICI_EAZYPAY'
  | 'BANK_NPCI';

export interface MerchantWebhookEvent {
  id: string;
  orderRef: string; // The unique transaction reference tagged in UPI Intent & Dynamic QR
  turfId: string;
  ownerId?: string;
  playerId?: string;
  amount: number;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  bankUtr: string; // 12-digit Bank RRN / UTR, e.g. 508219382910
  payerVpa?: string; // e.g. athlete@okhdfcbank
  payeeVpa: string; // e.g. turfvenue@icici
  merchantProvider: MerchantProvider;
  eventType: 'payment.captured' | 'payment.authorized' | 'upi.settled';
  timestamp: string;
  receivedAt: string;
  verificationSource: 'BANK_WEBHOOK' | 'GATEWAY_CALLBACK' | 'NPCI_SETTLEMENT' | 'SIMULATED_TEST';
  rawPayload?: any;
}

export interface MerchantUpiConfig {
  merchantUpiId?: string;
  merchantBeneficiaryName?: string;
  merchantProvider?: MerchantProvider;
  merchantWebhookEnabled?: boolean;
  upiMode?: 'PERSONAL_UPI' | 'MERCHANT_UPI';
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
  ownerId?: string;
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
  matchId?: string;
  playerUids?: string[];
  players?: Array<{
    playerId?: string;
    uid: string;
    playerName: string;
    playerPhotoURL?: string | null;
    isHost?: boolean;
    paymentMethod?: 'PAY_NOW' | 'PAY_LATER_AT_TURF';
    paymentStatus?: 'PAID' | 'DUE' | 'PARTIAL';
    amountPaid?: number;
    amountDue?: number;
    upiTxnRef?: string;
    joinedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface LobbyPlayer {
  id: string;
  lobbyId: string;
  uid: string;
  playerName: string;
  playerEmail?: string;
  playerPhone?: string;
  playerPhotoURL?: string;
  preferredSport?: string;
  skillLevel?: string;
  isHost: boolean;
  paymentMethod?: 'PAY_NOW' | 'PAY_LATER_AT_TURF';
  paymentStatus?: 'PAID' | 'DUE' | 'PARTIAL';
  amountDue?: number;
  amountPaid?: number;
  remainingAmount?: number;
  upiTxnRef?: string;
  refundStatus?: 'NONE' | 'PENDING' | 'PROCESSED' | 'REFUNDED_TO_SOURCE';
  refundTxnId?: string;
  refundAmount?: number;
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
  members?: any[];
  matchesWon?: number;
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
  hostTeamName?: string;
  hostScore?: number | string;
  opponentTeamName?: string;
  opponentScore?: number | string;
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
  arenaName?: string;
  code: string;
  name: string;
  title?: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  discountPercent?: number;
  startDate: string;
  endDate: string;
  applicableDays?: string[];
  usageLimit: number;
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
  tier?: string;
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

export interface CancellationBreakdown {
  hoursRemaining: number;
  isFreeCancellation: boolean;
  cutoffHours: number;
  penaltyFee: number;
  penaltyType: 'FLAT' | 'PERCENTAGE';
  penaltyRate: number;
  refundAmount: number;
  reversalAmount: number;
  windowLabel: string;
  policyDescription: string;
  originalPaid?: number;
  originalDue?: number;
}

export interface HourlyOccupancySlot {
  hourLabel: string;
  bookingsCount: number;
  occupancyPercent: number;
}

export interface DayOccupancyItem {
  dayName: string;
  bookingsCount: number;
  occupancyPercent: number;
  revenue: number;
}

export interface TimeBlockOccupancy {
  block: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
  label: string;
  hours: string;
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

export interface RecurringSlotSchedule {
  id: string;
  ownerId: string;
  turfId: string;
  turfName?: string;
  arenaId: string;
  arenaName?: string;
  days: string[]; // ["Monday", "Wednesday", "Friday"] or ["Mon", "Wed", "Fri"]
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

export interface PricingConfig {
  convenienceFee: number;
  convenienceFeeEnabled: boolean;
  cancellationCutoffHours?: number;
  refundPercentage?: number;
}

// ==========================================
// OWNER SUBSCRIPTION & FEATURE GATING TYPES
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
  featuredTurf?: boolean;      // Sponsored / Featured Turf Ranking System
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
  featuredTurf: true,
  individualArenaOffers: false,
};

export interface OwnerSubscriptionPlan {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  features: string[];
  featuresConfig?: PlanFeatureConfig;
  maxArenas: number;
  maxBookingsPerMonth: number;
  trialDays: number;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OwnerSubscriptionStatus {
  ownerId: string;
  planId: string;
  planName: string;
  status: 'TRIAL' | 'ACTIVE' | 'EXPIRED';
  startDate: string;
  expiryDate: string;
  trialEndsAt: string;
  isTrialActive: boolean;
  updatedAt: string;
  customFeatures?: Partial<PlanFeatureConfig>;
  maxArenasOverride?: number;
  notes?: string;
}

export interface SubscriptionSystemConfig {
  enabled: boolean;
  updatedAt: string;
  updatedBy: string;
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
  durationDays: number;
  duration: string;
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

export interface CoachProfile {
  id: string;
  userId: string;
  name: string;
  academyName?: string;
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
  scheduleDays: string[];
  timeSlot: string;
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
  corporateDomain?: string;
  gstin?: string;
  division?: string;
  isInterCompany?: boolean;
  amenities?: string[];
  invoiceRequired?: boolean;
}

export interface Tournament {
  id: string;
  organizerId: string;
  organizerName: string;
  organizerPhone: string;
  organizerEmail: string;
  title: string;
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
  role?: string;
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
  round: string;
  matchNumber: number;
  teamA: TournamentFixtureTeam;
  teamB: TournamentFixtureTeam;
  winnerId?: string;
  winnerName?: string;
  scheduledTime: string;
  pitchName?: string;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED';
}



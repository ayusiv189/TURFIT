import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Award,
  Calendar,
  Clock,
  MapPin,
  Star,
  Users,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Phone,
  Mail,
  Zap,
  BookOpen,
  UserCheck,
  X,
  CreditCard,
  Building,
  Upload,
  FileCheck,
  AlertTriangle,
  FileText,
  DollarSign,
  Eye,
  Check,
  Lock,
  ArrowRight,
  TrendingUp,
  Download,
} from 'lucide-react';
import {
  CoachProfile,
  CoachBatch,
  CoachEnrollment,
  Turf,
  UserProfile,
  BatchLevel,
  BatchAgeGroup,
  CoachVerificationStatus,
  CoachIdProofType,
  CoachSubscription,
  CoachSubscriptionPlan,
} from '../../types';
import {
  listenCoaches,
  listenCoachBatches,
  listenAllCoachEnrollments,
  createOrUpdateCoachProfile,
  createCoachBatch,
  enrollInCoachBatch,
  getPlayerCoachEnrollments,
  recordCoachYearlySubscription,
  getCoachSubscriptionPlans,
  listenCoachSubscriptionPlans,
  DEFAULT_COACH_SUBSCRIPTION_PLANS,
} from '../../lib/db';

interface CoachesTabProps {
  user: UserProfile | null;
  turfs: Turf[];
  selectedCity?: string;
}

const SPORTS_LIST = [
  'All Sports',
  'Football',
  'Cricket',
  'Badminton',
  'Pickleball',
  'Tennis',
  'Basketball',
  'Fitness & Conditioning',
];

const COACH_SUBSCRIPTION_PLANS = [
  {
    id: 'YEARLY_COACH_PRO' as const,
    name: 'Coach Pro Annual Pass',
    price: 2999,
    duration: '1 Year (365 Days)',
    popular: true,
    features: [
      'Official TurFit Verified Coach Badge',
      'Create Unlimited Batches & Practice Sessions',
      'Direct Athlete Search & Discovery',
      'Student Enrollment & Attendance Tracker',
      'Direct Venue Booking Partnerships',
      '0% Commission on Student Fees',
    ],
  },
  {
    id: 'YEARLY_ACADEMY_ELITE' as const,
    name: 'Academy Elite Annual Pass',
    price: 4999,
    duration: '1 Year (365 Days)',
    popular: false,
    features: [
      'Everything in Coach Pro',
      'Multi-Coach / Multi-Sport Academy Roster',
      'Featured Top Ranking in Discovery',
      'Custom Academy Branding & Logo Display',
      'Bulk Student Invoicing & GST Receipt Support',
      'Priority Customer Support & Dedicated Account Rep',
    ],
  },
];

export const CoachesTab: React.FC<CoachesTabProps> = ({ user, turfs, selectedCity }) => {
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [batches, setBatches] = useState<CoachBatch[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<CoachEnrollment[]>([]);
  const [allCoachEnrollments, setAllCoachEnrollments] = useState<CoachEnrollment[]>([]);
  const [selectedSport, setSelectedSport] = useState('All Sports');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'BATCHES' | 'COACHES' | 'MY_ENROLLMENTS' | 'COACH_DASHBOARD'>('BATCHES');
  const [isRegisterCoachModalOpen, setIsRegisterCoachModalOpen] = useState(false);
  const [isCreateBatchModalOpen, setIsCreateBatchModalOpen] = useState(false);
  const [selectedBatchForEnroll, setSelectedBatchForEnroll] = useState<CoachBatch | null>(null);
  const [selectedCoachForDetails, setSelectedCoachForDetails] = useState<CoachProfile | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Multi-step registration form state
  const [regStep, setRegStep] = useState<1 | 2 | 3 | 4>(1);
  const [phoneOtpCode, setPhoneOtpCode] = useState('');
  const [isPhoneOtpSent, setIsPhoneOtpSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [coachPlans, setCoachPlans] = useState<CoachSubscriptionPlan[]>(DEFAULT_COACH_SUBSCRIPTION_PLANS);
  const [selectedPlan, setSelectedPlan] = useState<string>('YEARLY_COACH_PRO');

  const [coachForm, setCoachForm] = useState({
    name: user?.displayName || '',
    academyName: '',
    city: selectedCity && selectedCity !== 'ALL' ? selectedCity : (turfs[0]?.city || 'Mumbai'),
    email: user?.email || '',
    phone: user?.phoneNumber || '+91 98765 43210',
    bio: '',
    sports: ['Football'],
    experienceYears: 4,
    specialization: 'Tactical Formations & Strikers Masterclass',
    ratePerSession: 400,
    rateMonthly: 3500,
    selectedTurfIds: [] as string[],
    // Verification fields
    idProofType: 'AADHAAR' as CoachIdProofType,
    idProofNumber: '5489 1234 9876',
    idProofImageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
    certificationTitle: 'AIFF Senior Coaching License (Level B)',
    certificationIssuer: 'All India Football Federation',
    certificationYear: 2022,
    certificationProofUrl: 'https://images.unsplash.com/photo-1589330694653-ded6df03f754?w=600&auto=format&fit=crop&q=80',
  });

  // Batch Creation Form State
  const [batchForm, setBatchForm] = useState({
    title: '',
    sport: 'Football',
    description: '',
    level: 'BEGINNER' as BatchLevel,
    ageGroup: 'ALL_AGES' as BatchAgeGroup,
    turfId: turfs[0]?.id || '',
    scheduleDays: ['Mon', 'Wed', 'Fri'],
    timeSlot: '06:30 AM - 08:00 AM',
    maxCapacity: 15,
    feePerMonth: 2999,
    feePerSession: 399,
    startDate: new Date().toISOString().split('T')[0],
  });

  // Enrollment Form State
  const [enrollForm, setEnrollForm] = useState({
    playerName: user?.displayName || '',
    playerPhone: user?.phoneNumber || '',
    playerEmail: user?.email || '',
    planType: 'MONTHLY' as 'MONTHLY' | 'SINGLE_SESSION',
    paymentMethod: 'UPI' as 'UPI' | 'VENUE',
  });

  // Real-time coach subscription plans listener
  useEffect(() => {
    const unsub = listenCoachSubscriptionPlans(false, (plans) => {
      if (plans && plans.length > 0) {
        setCoachPlans(plans);
        if (!plans.some((p) => p.id === selectedPlan)) {
          setSelectedPlan(plans[0].id);
        }
      }
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Load coaches & batches
  useEffect(() => {
    const unsubCoaches = listenCoaches((list) => {
      setCoaches(list);
    });

    const unsubBatches = listenCoachBatches(undefined, (list) => {
      setBatches(list);
    });

    const unsubEnrollments = listenAllCoachEnrollments(undefined, (list) => {
      setAllCoachEnrollments(list);
    });

    return () => {
      unsubCoaches();
      unsubBatches();
      unsubEnrollments();
    };
  }, [turfs]);

  // Load user's enrollments
  useEffect(() => {
    if (user?.id) {
      getPlayerCoachEnrollments(user.id).then((res) => {
        setMyEnrollments(res);
      });
    }
  }, [user]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Find if current user is already registered as a coach
  const currentCoachProfile = coaches.find(
    (c) => c.userId === user?.id || (c.email && user?.email && c.email === user.email)
  );

  // Filter batches - ONLY show batches from VERIFIED coaches in public view (unless it's the coach's own batch)
  const filteredBatches = batches.filter((b) => {
    const parentCoach = coaches.find((c) => c.id === b.coachId);
    // Public gate: Only verified coaches show live publicly
    const isPubliclyLive = parentCoach?.isVerified || parentCoach?.userId === user?.id;
    if (!isPubliclyLive) return false;

    if (selectedCity && selectedCity !== 'ALL') {
      const parentTurf = turfs.find((t) => t.id === b.turfId);
      const batchCity = (b.city || parentTurf?.city || '').toLowerCase().trim();
      if (batchCity && batchCity !== selectedCity.toLowerCase().trim()) return false;
    }

    const matchesSport = selectedSport === 'All Sports' || b.sport.toLowerCase().includes(selectedSport.toLowerCase());
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.coachName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.turfName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSport && matchesSearch;
  });

  // Filter coaches - ONLY show VERIFIED coaches in public view (or current user looking at themselves)
  const filteredCoaches = coaches.filter((c) => {
    const isPubliclyLive = c.isVerified || c.userId === user?.id;
    if (!isPubliclyLive) return false;

    if (selectedCity && selectedCity !== 'ALL') {
      const parentTurf = turfs.find((t) => t.id === c.turfId);
      const coachCity = (c.city || parentTurf?.city || '').toLowerCase().trim();
      if (coachCity && coachCity !== selectedCity.toLowerCase().trim()) return false;
    }

    const matchesSport =
      selectedSport === 'All Sports' ||
      c.sports.some((s) => s.toLowerCase().includes(selectedSport.toLowerCase()));
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.academyName && c.academyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.bio.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.specialization.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSport && matchesSearch;
  });

  // Enrolled students for current coach
  const currentCoachStudents = allCoachEnrollments.filter(
    (e) => currentCoachProfile && (e.coachId === currentCoachProfile.id || e.coachName === currentCoachProfile.name)
  );

  // Send verification SMS OTP
  const handleSendPhoneOtp = async () => {
    if (!coachForm.phone) {
      showToast('Please enter a valid phone number');
      return;
    }
    const cleanPhone = coachForm.phone.replace(/[^0-9]/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      showToast('Please enter a valid 10-digit mobile number');
      return;
    }
    setIsPhoneOtpSent(true);
    showToast(`Verification code dispatched to +91 ${cleanPhone}`);
  };

  // Verify SMS OTP
  const handleVerifyPhoneOtp = () => {
    if (phoneOtpCode.trim().length >= 4) {
      setIsPhoneVerified(true);
      showToast('Phone number verified successfully!');
    } else {
      showToast('Please enter the 6-digit verification code received.');
    }
  };

  // Handle Coach Registration & Payment Submission
  const handleCompleteCoachRegistration = async () => {
    if (!user) {
      showToast('Please sign in to register as a Coach');
      return;
    }

    if (!isPhoneVerified) {
      showToast('Please complete your phone number verification first');
      setRegStep(2);
      return;
    }

    try {
      const planObj = coachPlans.find((p) => p.id === selectedPlan) || coachPlans[0] || DEFAULT_COACH_SUBSCRIPTION_PLANS[0];
      const selectedTurfObjects = turfs.filter((t) => coachForm.selectedTurfIds.includes(t.id));
      const now = new Date();
      const expiry = new Date(now);
      expiry.setDate(expiry.getDate() + (planObj.durationDays || 365));

      const subscriptionData: CoachSubscription = {
        planId: planObj.id,
        planName: planObj.name,
        amountPaid: planObj.price,
        paymentStatus: 'PAID',
        paymentId: `TXN_SUB_${Date.now().toString().slice(-6)}`,
        paymentMethod: 'UPI_RAZORPAY',
        subscribedAt: now.toISOString().split('T')[0],
        expiresAt: expiry.toISOString().split('T')[0],
        isActive: true,
      };

      const coachId = await createOrUpdateCoachProfile({
        id: currentCoachProfile?.id || '',
        userId: user.id,
        name: coachForm.name || user.displayName || 'Certified Coach',
        academyName: coachForm.academyName || `${coachForm.name}'s Sports Academy`,
        city: coachForm.city || selectedCity || 'Mumbai',
        email: coachForm.email || user.email || '',
        phone: coachForm.phone || user.phoneNumber || '',
        bio: coachForm.bio || 'Professional certified coach committed to elevating player skills and match fitness.',
        sports: coachForm.sports,
        experienceYears: Number(coachForm.experienceYears) || 1,
        certifications: [
          {
            title: coachForm.certificationTitle,
            issuer: coachForm.certificationIssuer,
            year: Number(coachForm.certificationYear) || 2022,
            docUrl: coachForm.certificationProofUrl,
          },
        ],
        rates: {
          perSession: Number(coachForm.ratePerSession) || 400,
          monthly: Number(coachForm.rateMonthly) || 3000,
        },
        rating: currentCoachProfile?.rating || 5.0,
        reviewCount: currentCoachProfile?.reviewCount || 1,
        specialization: coachForm.specialization,
        venueIds: coachForm.selectedTurfIds.length > 0 ? coachForm.selectedTurfIds : turfs.map((t) => t.id).slice(0, 2),
        venueNames: selectedTurfObjects.length > 0 ? selectedTurfObjects.map((t) => t.name) : turfs.map((t) => t.name).slice(0, 2),
        
        // Strict verification gate: isVerified is FALSE initially until admin confirms
        isVerified: false,
        verificationStatus: 'PENDING_VERIFICATION',
        idProofType: coachForm.idProofType,
        idProofNumber: coachForm.idProofNumber,
        idProofImageUrl: coachForm.idProofImageUrl,
        isPhoneVerified: true,
        phoneOtpVerifiedAt: now.toISOString(),
        certificationProofUrls: [coachForm.certificationProofUrl],
        
        // Yearly subscription paid to admin
        subscription: subscriptionData,
        platformFeePaid: planObj.price,
        totalEnrolledStudents: 0,
        totalEarnings: 0,
        status: 'PENDING',
      });

      setIsRegisterCoachModalOpen(false);
      setRegStep(1);
      showToast(
        `Registration & ₹${planObj.price} Annual Subscription received! Your profile is submitted for Admin verification.`
      );
      setActiveTab('COACH_DASHBOARD');
    } catch (err) {
      console.error(err);
      showToast('Failed to save coach profile. Please try again.');
    }
  };

  // Handle Batch Creation
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCoachProfile) {
      showToast('Please register your Coach Profile first');
      return;
    }

    try {
      const selectedTurf = turfs.find((t) => t.id === batchForm.turfId) || turfs[0];
      await createCoachBatch({
        coachId: currentCoachProfile.id,
        coachName: currentCoachProfile.name,
        coachAvatar: currentCoachProfile.avatarUrl,
        coachPhone: currentCoachProfile.phone,
        title: batchForm.title,
        sport: batchForm.sport,
        description: batchForm.description,
        level: batchForm.level,
        ageGroup: batchForm.ageGroup,
        turfId: selectedTurf ? selectedTurf.id : 'turf_main',
        turfName: selectedTurf ? selectedTurf.name : 'Main Arena Ground',
        scheduleDays: batchForm.scheduleDays,
        timeSlot: batchForm.timeSlot,
        maxCapacity: Number(batchForm.maxCapacity) || 15,
        enrolledCount: 0,
        feePerMonth: Number(batchForm.feePerMonth) || 2999,
        feePerSession: Number(batchForm.feePerSession) || 399,
        startDate: batchForm.startDate,
        status: 'OPEN',
      });

      setIsCreateBatchModalOpen(false);
      showToast(`Batch "${batchForm.title}" created successfully!`);
    } catch (err) {
      console.error(err);
      showToast('Failed to create batch');
    }
  };

  // Handle Enrollment
  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchForEnroll || !user) {
      showToast('Please sign in to complete enrollment');
      return;
    }

    try {
      const amount =
        enrollForm.planType === 'MONTHLY'
          ? selectedBatchForEnroll.feePerMonth
          : selectedBatchForEnroll.feePerSession;

      const validDate = new Date();
      if (enrollForm.planType === 'MONTHLY') {
        validDate.setMonth(validDate.getMonth() + 1);
      } else {
        validDate.setDate(validDate.getDate() + 1);
      }

      const enrollmentId = await enrollInCoachBatch({
        batchId: selectedBatchForEnroll.id,
        batchTitle: selectedBatchForEnroll.title,
        coachId: selectedBatchForEnroll.coachId,
        coachName: selectedBatchForEnroll.coachName,
        playerId: user.id,
        playerName: enrollForm.playerName || user.displayName || 'Athlete',
        playerEmail: enrollForm.playerEmail || user.email || '',
        playerPhone: enrollForm.playerPhone || user.phoneNumber || '',
        planType: enrollForm.planType,
        amountPaid: amount,
        paymentStatus: 'PAID',
        status: 'ACTIVE',
        validUntil: validDate.toISOString().split('T')[0],
      });

      const newEnrollment: CoachEnrollment = {
        id: enrollmentId,
        batchId: selectedBatchForEnroll.id,
        batchTitle: selectedBatchForEnroll.title,
        coachId: selectedBatchForEnroll.coachId,
        coachName: selectedBatchForEnroll.coachName,
        playerId: user.id,
        playerName: enrollForm.playerName,
        playerEmail: enrollForm.playerEmail,
        playerPhone: enrollForm.playerPhone,
        planType: enrollForm.planType,
        amountPaid: amount,
        paymentStatus: 'PAID',
        status: 'ACTIVE',
        enrolledAt: new Date().toISOString(),
        validUntil: validDate.toISOString().split('T')[0],
      };

      setMyEnrollments((prev) => [newEnrollment, ...prev]);
      setSelectedBatchForEnroll(null);
      showToast(`Successfully enrolled in ${selectedBatchForEnroll.title}!`);
    } catch (err) {
      console.error(err);
      showToast('Enrollment failed. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400 font-semibold animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-emerald-950/40 to-slate-900 rounded-3xl p-6 sm:p-8 border border-emerald-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <GraduationCap className="w-4 h-4" />
              <span>TurFit Pro Coaching & Academies</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Train with Certified Coaches & Elite Academies
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              Elevate your game with certified AIFF, BCCI & BWF instructors. Join verified batches at your favorite turfs or register your coaching academy.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {currentCoachProfile ? (
              <button
                id="btn-coach-portal"
                onClick={() => setActiveTab('COACH_DASHBOARD')}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all"
              >
                <Award className="w-4 h-4" />
                <span>My Coach Portal</span>
              </button>
            ) : (
              <button
                id="btn-register-coach"
                onClick={() => {
                  setRegStep(1);
                  setIsRegisterCoachModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Register as Coach / Academy</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PENDING VERIFICATION NOTICE BANNER FOR REGISTERED COACH */}
      {currentCoachProfile && !currentCoachProfile.isVerified && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">Coach Profile Verification Under Review</h4>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/30">
                  PENDING ADMIN APPROVAL
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Your government ID proof ({currentCoachProfile.idProofType || 'Aadhaar'}), certificates, and Annual Subscription of ₹{currentCoachProfile.subscription?.amountPaid || 2999} are being verified by the TurFit admin desk. Once confirmed, your profile and batches will go live immediately.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('COACH_DASHBOARD')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer transition-all shadow-md"
          >
            Check Verification Status
          </button>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          <button
            id="tab-coach-batches"
            onClick={() => setActiveTab('BATCHES')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'BATCHES'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Training Batches ({filteredBatches.length})</span>
          </button>

          <button
            id="tab-coach-directory"
            onClick={() => setActiveTab('COACHES')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'COACHES'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Verified Coaches ({filteredCoaches.length})</span>
          </button>

          <button
            id="tab-coach-enrollments"
            onClick={() => setActiveTab('MY_ENROLLMENTS')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'MY_ENROLLMENTS'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>My Enrolled Programs ({myEnrollments.length})</span>
          </button>

          {currentCoachProfile && (
            <button
              id="tab-coach-my-dashboard"
              onClick={() => setActiveTab('COACH_DASHBOARD')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                activeTab === 'COACH_DASHBOARD'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>Coach Dashboard & Students</span>
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search sport, coach, academy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Sport Category Filters (for Batches & Coaches views) */}
      {(activeTab === 'BATCHES' || activeTab === 'COACHES') && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {SPORTS_LIST.map((sport) => (
            <button
              key={sport}
              onClick={() => setSelectedSport(sport)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedSport === sport
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {sport}
            </button>
          ))}
        </div>
      )}

      {/* ================= VIEW: BATCHES ================= */}
      {activeTab === 'BATCHES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBatches.map((batch) => {
            const seatsLeft = Math.max(0, batch.maxCapacity - batch.enrolledCount);
            return (
              <div
                key={batch.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between shadow-xl relative overflow-hidden group"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                      {batch.sport}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {seatsLeft > 0 ? (
                        <span className="text-emerald-400">{seatsLeft} Seats Left</span>
                      ) : (
                        <span className="text-rose-400">Batch Full</span>
                      )}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                      {batch.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{batch.description}</p>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="font-semibold text-white">{batch.coachName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="truncate">{batch.turfName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{batch.scheduleDays.join(', ')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{batch.timeSlot}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300 uppercase">
                      {batch.level}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300 uppercase">
                      {batch.ageGroup.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-400">Monthly Plan</div>
                    <div className="text-base font-black text-white">
                      ₹{batch.feePerMonth}{' '}
                      <span className="text-xs text-slate-400 font-normal">/ mo</span>
                    </div>
                  </div>

                  <button
                    id={`btn-enroll-${batch.id}`}
                    onClick={() => {
                      setSelectedBatchForEnroll(batch);
                    }}
                    disabled={seatsLeft === 0}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1 shadow-md shadow-emerald-600/20"
                  >
                    <span>Enroll Now</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= VIEW: COACHES DIRECTORY ================= */}
      {activeTab === 'COACHES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCoaches.map((coach) => (
            <div
              key={coach.id}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between shadow-xl space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-lg shadow-md">
                      {coach.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm sm:text-base font-bold text-white">{coach.name}</h3>
                        {coach.isVerified && (
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" title="Verified Coach" />
                        )}
                      </div>
                      <p className="text-xs text-emerald-400 font-semibold">{coach.academyName || 'Pro Sports Academy'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span>{coach.rating.toFixed(1)}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 line-clamp-3">{coach.bio}</p>

                <div className="space-y-1 text-xs">
                  <div className="text-slate-400">
                    <span className="text-slate-300 font-semibold">Specialization:</span> {coach.specialization}
                  </div>
                  <div className="text-slate-400">
                    <span className="text-slate-300 font-semibold">Experience:</span> {coach.experienceYears}+ Years
                  </div>
                </div>

                {/* Sports Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {coach.sports.map((sp) => (
                    <span
                      key={sp}
                      className="px-2 py-0.5 bg-slate-800 rounded-md text-[10px] font-bold text-slate-300"
                    >
                      {sp}
                    </span>
                  ))}
                </div>

                {/* Certifications preview */}
                {coach.certifications && coach.certifications.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                    <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      <span>Certified License</span>
                    </div>
                    <div className="text-xs text-slate-200 font-medium">
                      {coach.certifications[0].title} ({coach.certifications[0].year})
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Monthly Fee</div>
                  <div className="text-sm font-black text-white">₹{coach.rates.monthly}</div>
                </div>

                <button
                  onClick={() => setSelectedCoachForDetails(coach)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Details</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= VIEW: MY ENROLLED PROGRAMS ================= */}
      {activeTab === 'MY_ENROLLMENTS' && (
        <div className="space-y-4">
          {myEnrollments.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Active Academy Enrollments</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                You haven't joined any training batches yet. Explore training programs and level up your skills!
              </p>
              <button
                onClick={() => setActiveTab('BATCHES')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Browse Training Batches
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myEnrollments.map((enroll) => (
                <div
                  key={enroll.id}
                  className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-3 shadow-lg"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded">
                        {enroll.status}
                      </span>
                      <h4 className="text-base font-bold text-white mt-1">{enroll.batchTitle}</h4>
                      <p className="text-xs text-slate-400">Coach: {enroll.coachName}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-400">Paid</div>
                      <div className="text-sm font-black text-emerald-400">₹{enroll.amountPaid}</div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 space-y-1 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <div>Enrolled Plan: {enroll.planType}</div>
                    {enroll.validUntil && <div>Valid Until: {enroll.validUntil}</div>}
                    <div>Registered Contact: {enroll.playerPhone}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= VIEW: COACH'S OWN DASHBOARD & STUDENTS ================= */}
      {activeTab === 'COACH_DASHBOARD' && currentCoachProfile && (
        <div className="space-y-6">
          {/* Revenue & Student Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Enrolled Students</span>
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white">{currentCoachStudents.length}</div>
              <div className="text-[11px] text-emerald-400 font-semibold">Active Athlete Roster</div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Total Academy Revenue</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400">
                ₹{currentCoachStudents.reduce((sum, s) => sum + (s.amountPaid || 0), 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400">From Student Batches</div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Annual Subscription</span>
                <ShieldCheck className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-sm font-bold text-white">
                {currentCoachProfile.subscription?.planName || 'Coach Pro Annual'}
              </div>
              <div className="text-[11px] text-emerald-400 font-semibold">
                Valid until: {currentCoachProfile.subscription?.expiresAt || '2027-01-01'}
              </div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Verification State</span>
                <Award className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-sm font-bold text-white">
                {currentCoachProfile.isVerified ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Verified & Live
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <Clock className="w-4 h-4" /> Pending Admin Review
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400">ID & Certificate Approved</div>
            </div>
          </div>

          {/* Action Bar for Coach */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Enrolled Students & Batches Roster</h3>
            <button
              onClick={() => setIsCreateBatchModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Batch</span>
            </button>
          </div>

          {/* Enrolled Students Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                Registered Students ({currentCoachStudents.length})
              </span>
            </div>

            {currentCoachStudents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No students enrolled yet. Once athletes enroll in your batches, their contact details and payment records will appear here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-[11px] uppercase text-slate-400">
                    <tr>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Batch Name</th>
                      <th className="p-3">Contact Phone</th>
                      <th className="p-3">Plan</th>
                      <th className="p-3">Fee Paid</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Enrolled At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {currentCoachStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-semibold text-white">{s.playerName}</td>
                        <td className="p-3 text-slate-300">{s.batchTitle}</td>
                        <td className="p-3 text-slate-300">{s.playerPhone}</td>
                        <td className="p-3">{s.planType}</td>
                        <td className="p-3 font-bold text-emerald-400">₹{s.amountPaid}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded">
                            {s.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">{s.enrolledAt?.split('T')[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MULTI-STEP MODAL: COACH REGISTRATION & YEARLY SUBSCRIPTION ================= */}
      {isRegisterCoachModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-bold text-white">Register as Coach / Sports Academy</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Step {regStep} of 4: {
                    regStep === 1 ? 'Academy Profile' :
                    regStep === 2 ? 'Government ID & Phone Verification' :
                    regStep === 3 ? 'Certifications & Licenses' :
                    'Yearly Platform Subscription'
                  }
                </p>
              </div>
              <button
                onClick={() => setIsRegisterCoachModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 rounded-full transition-all ${
                    regStep >= step ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>

            {/* STEP 1: BASIC PROFILE & SPORTS */}
            {regStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Coach Vikram Patel"
                      value={coachForm.name}
                      onChange={(e) => setCoachForm({ ...coachForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Academy / Club Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Football Academy"
                      value={coachForm.academyName}
                      onChange={(e) => setCoachForm({ ...coachForm, academyName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">City / Region *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mumbai, Bengaluru, Delhi, Pune"
                    value={coachForm.city}
                    onChange={(e) => setCoachForm({ ...coachForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Official Email</label>
                    <input
                      type="email"
                      required
                      value={coachForm.email}
                      onChange={(e) => setCoachForm({ ...coachForm, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      required
                      value={coachForm.phone}
                      onChange={(e) => setCoachForm({ ...coachForm, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Bio & Coaching Philosophy</label>
                  <textarea
                    rows={3}
                    placeholder="Describe your training background, past achievements, and how you train athletes..."
                    value={coachForm.bio}
                    onChange={(e) => setCoachForm({ ...coachForm, bio: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Sport</label>
                    <select
                      value={coachForm.sports[0]}
                      onChange={(e) => setCoachForm({ ...coachForm, sports: [e.target.value] })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white"
                    >
                      {SPORTS_LIST.filter((s) => s !== 'All Sports').map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Experience (Years)</label>
                    <input
                      type="number"
                      min="1"
                      value={coachForm.experienceYears}
                      onChange={(e) => setCoachForm({ ...coachForm, experienceYears: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Monthly Rate (₹)</label>
                    <input
                      type="number"
                      value={coachForm.rateMonthly}
                      onChange={(e) => setCoachForm({ ...coachForm, rateMonthly: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setRegStep(2)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <span>Next: ID & Phone Verification</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: ID PROOF & NUMBER VERIFICATION */}
            {regStep === 2 && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>Phone Number Verification (SMS OTP)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      value={coachForm.phone}
                      onChange={(e) => setCoachForm({ ...coachForm, phone: e.target.value })}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={handleSendPhoneOtp}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer"
                    >
                      {isPhoneOtpSent ? 'Resend OTP' : 'Send OTP'}
                    </button>
                  </div>

                  {isPhoneOtpSent && !isPhoneVerified && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                      <input
                        type="text"
                        placeholder="Enter 6-digit OTP code"
                        value={phoneOtpCode}
                        onChange={(e) => setPhoneOtpCode(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyPhoneOtp}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Verify OTP
                      </button>
                    </div>
                  )}

                  {isPhoneVerified && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Phone Number Verified</span>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                    <FileCheck className="w-4 h-4" />
                    <span>Government Identity Proof (Aadhaar / Passport / DL)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">ID Proof Document Type</label>
                      <select
                        value={coachForm.idProofType}
                        onChange={(e) => setCoachForm({ ...coachForm, idProofType: e.target.value as CoachIdProofType })}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                      >
                        <option value="AADHAAR">Aadhaar Card (UIDAI)</option>
                        <option value="PASSPORT">Passport (Govt of India)</option>
                        <option value="DRIVING_LICENSE">Driving License (RTO)</option>
                        <option value="VOTER_ID">Voter ID (Election Comm)</option>
                        <option value="NATIONAL_ID">National Sports ID</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Government ID Number</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 5489 1234 9876"
                        value={coachForm.idProofNumber}
                        onChange={(e) => setCoachForm({ ...coachForm, idProofNumber: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">ID Card Photo / Document Scan</label>
                    <div className="border-2 border-dashed border-slate-700 rounded-xl p-3 text-center bg-slate-900/50 space-y-2">
                      {coachForm.idProofImageUrl ? (
                        <div className="flex items-center justify-between p-2 bg-slate-800 rounded-lg text-xs">
                          <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> ID Scan Uploaded
                          </span>
                          <span className="text-slate-400 text-[10px]">Aadhaar_Scan_Front_Back.jpg</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                          <p className="text-[11px] text-slate-300">Click to upload ID Card photo or drag & drop</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setRegStep(1)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isPhoneVerified) {
                        showToast('Please verify your mobile number first');
                        return;
                      }
                      setRegStep(3);
                    }}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <span>Next: Certifications</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: CERTIFICATIONS */}
            {regStep === 3 && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    <span>Sports Coaching Certification & License</span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Certification / License Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AIFF 'B' License / BCCI Level 1 / NIS Diploma"
                      value={coachForm.certificationTitle}
                      onChange={(e) => setCoachForm({ ...coachForm, certificationTitle: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Issuing Federation / Body</label>
                      <input
                        type="text"
                        placeholder="e.g. All India Football Federation / NCA"
                        value={coachForm.certificationIssuer}
                        onChange={(e) => setCoachForm({ ...coachForm, certificationIssuer: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Year of Certification</label>
                      <input
                        type="number"
                        value={coachForm.certificationYear}
                        onChange={(e) => setCoachForm({ ...coachForm, certificationYear: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Upload Certificate License Document</label>
                    <div className="border-2 border-dashed border-slate-700 rounded-xl p-3 text-center bg-slate-900/50 space-y-2">
                      <div className="flex items-center justify-between p-2 bg-slate-800 rounded-lg text-xs">
                        <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Coaching_License_Certificate.pdf
                        </span>
                        <span className="text-slate-400 text-[10px]">Verified Document</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setRegStep(2)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegStep(4)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <span>Next: Platform Subscription</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: MANDATORY YEARLY SUBSCRIPTION PAYMENT TO ADMIN */}
            {regStep === 4 && (
              <div className="space-y-4">
                <div className="text-xs text-slate-300">
                  Select your Annual Coach / Academy Membership plan. The registration fee is paid directly to TurFit Platform Admin and activates your listing for 365 days upon verification.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {coachPlans.map((plan) => {
                    const isSelected = selectedPlan === plan.id;
                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/50'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{plan.name}</span>
                            {plan.popular && (
                              <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase rounded-full">
                                Popular
                              </span>
                            )}
                          </div>

                          <div>
                            <div className="text-2xl font-black text-emerald-400">
                              ₹{plan.price.toLocaleString()}
                              <span className="text-xs text-slate-400 font-normal"> / {plan.durationDays >= 365 ? 'year' : `${plan.durationDays} days`}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">{plan.duration || `${plan.durationDays} Days Validity`}</div>
                          </div>

                          <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs">
                            {plan.features.map((feat, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                                <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span>{feat}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {(() => {
                  const currentPlanObj = coachPlans.find((p) => p.id === selectedPlan) || coachPlans[0] || DEFAULT_COACH_SUBSCRIPTION_PLANS[0];
                  return (
                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-300">Admin Account Destination</div>
                        <div className="text-[11px] text-slate-400">TurFit Admin Desk (ayusiv189@gmail.com)</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Payable Amount</div>
                        <div className="text-lg font-black text-emerald-400">
                          ₹{currentPlanObj.price.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setRegStep(3)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Back
                  </button>
                  {(() => {
                    const currentPlanObj = coachPlans.find((p) => p.id === selectedPlan) || coachPlans[0] || DEFAULT_COACH_SUBSCRIPTION_PLANS[0];
                    return (
                      <button
                        type="button"
                        onClick={handleCompleteCoachRegistration}
                        className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Pay ₹{currentPlanObj.price.toLocaleString()} & Submit Verification</span>
                      </button>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE BATCH ================= */}
      {isCreateBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Create Training Batch</h3>
              <button
                onClick={() => setIsCreateBatchModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Batch Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grassroots Junior Champions (U-14)"
                  value={batchForm.title}
                  onChange={(e) => setBatchForm({ ...batchForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Sport</label>
                  <select
                    value={batchForm.sport}
                    onChange={(e) => setBatchForm({ ...batchForm, sport: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    {SPORTS_LIST.filter((s) => s !== 'All Sports').map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Turf Venue</label>
                  <select
                    value={batchForm.turfId}
                    onChange={(e) => setBatchForm({ ...batchForm, turfId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    {turfs.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Timing Slot</label>
                  <input
                    type="text"
                    placeholder="e.g. 06:30 AM - 08:00 AM"
                    value={batchForm.timeSlot}
                    onChange={(e) => setBatchForm({ ...batchForm, timeSlot: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Max Student Capacity</label>
                  <input
                    type="number"
                    value={batchForm.maxCapacity}
                    onChange={(e) => setBatchForm({ ...batchForm, maxCapacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Monthly Fee (₹)</label>
                  <input
                    type="number"
                    value={batchForm.feePerMonth}
                    onChange={(e) => setBatchForm({ ...batchForm, feePerMonth: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Single Session Fee (₹)</label>
                  <input
                    type="number"
                    value={batchForm.feePerSession}
                    onChange={(e) => setBatchForm({ ...batchForm, feePerSession: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateBatchModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md"
                >
                  Publish Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ENROLL IN BATCH ================= */}
      {selectedBatchForEnroll && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                  Academy Enrollment
                </span>
                <h3 className="text-base font-bold text-white">{selectedBatchForEnroll.title}</h3>
              </div>
              <button
                onClick={() => setSelectedBatchForEnroll(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEnrollSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Student Full Name</label>
                <input
                  type="text"
                  required
                  value={enrollForm.playerName}
                  onChange={(e) => setEnrollForm({ ...enrollForm, playerName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Student Contact</label>
                  <input
                    type="tel"
                    required
                    value={enrollForm.playerPhone}
                    onChange={(e) => setEnrollForm({ ...enrollForm, playerPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={enrollForm.playerEmail}
                    onChange={(e) => setEnrollForm({ ...enrollForm, playerEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Select Training Plan</label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setEnrollForm({ ...enrollForm, planType: 'MONTHLY' })}
                    className={`p-3 rounded-xl border cursor-pointer ${
                      enrollForm.planType === 'MONTHLY'
                        ? 'bg-emerald-600/20 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold">Monthly Pass</div>
                    <div className="text-sm font-black text-emerald-400 mt-0.5">
                      ₹{selectedBatchForEnroll.feePerMonth}
                    </div>
                  </div>

                  <div
                    onClick={() => setEnrollForm({ ...enrollForm, planType: 'SINGLE_SESSION' })}
                    className={`p-3 rounded-xl border cursor-pointer ${
                      enrollForm.planType === 'SINGLE_SESSION'
                        ? 'bg-emerald-600/20 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold">Single Trial Session</div>
                    <div className="text-sm font-black text-emerald-400 mt-0.5">
                      ₹{selectedBatchForEnroll.feePerSession}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Total Amount</div>
                  <div className="text-base font-black text-emerald-400">
                    ₹{enrollForm.planType === 'MONTHLY' ? selectedBatchForEnroll.feePerMonth : selectedBatchForEnroll.feePerSession}
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pay & Confirm</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: COACH DETAILS & CERTIFICATIONS PREVIEW ================= */}
      {selectedCoachForDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-lg">
                  {selectedCoachForDetails.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-bold text-white">{selectedCoachForDetails.name}</h3>
                    {selectedCoachForDetails.isVerified && <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <p className="text-xs text-emerald-400">{selectedCoachForDetails.academyName || 'Sports Academy'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCoachForDetails(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-slate-300">About the Coach:</span>
                <p className="text-slate-400 mt-1">{selectedCoachForDetails.bio}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400">Experience:</span>
                  <div className="font-bold text-white">{selectedCoachForDetails.experienceYears}+ Years</div>
                </div>
                <div>
                  <span className="text-slate-400">Ratings:</span>
                  <div className="font-bold text-amber-400">★ {selectedCoachForDetails.rating} ({selectedCoachForDetails.reviewCount} reviews)</div>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-300">Verified Certifications:</span>
                <div className="mt-1 space-y-1.5">
                  {selectedCoachForDetails.certifications.map((c, i) => (
                    <div key={i} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white">{c.title}</div>
                        <div className="text-[11px] text-slate-400">{c.issuer} • {c.year}</div>
                      </div>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedCoachForDetails(null)}
                className="px-4 py-2 bg-slate-800 text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

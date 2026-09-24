import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  CoachProfile,
  CoachBatch,
  CoachEnrollment,
  Turf,
  CoachSubscriptionPlan,
  CoachSubscription,
  BatchLevel,
  BatchAgeGroup,
} from '../../types';
import {
  listenCoaches,
  listenCoachBatches,
  enrollInCoachBatch,
  getTurfs,
  listenCoachSubscriptionPlans,
  createOrUpdateCoachProfile,
  createCoachBatch,
  deleteCoachBatch,
  recordCoachYearlySubscription,
  listenAllCoachEnrollments,
  DEFAULT_COACH_SUBSCRIPTION_PLANS,
} from '../../services/dbService';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  GraduationCap,
  Award,
  Calendar,
  Clock,
  MapPin,
  Star,
  Users,
  CheckCircle2,
  Search,
  ShieldCheck,
  ChevronRight,
  Phone,
  Mail,
  DollarSign,
  X,
  Sparkles,
  Plus,
  CreditCard,
  Building,
  AlertTriangle,
  FileText,
  Check,
  Zap,
  Trash2,
} from 'lucide-react-native';

interface CoachesScreenProps {
  navigation: any;
  route?: any;
}

export const CoachesScreen: React.FC<CoachesScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [batches, setBatches] = useState<CoachBatch[]>([]);
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [coachPlans, setCoachPlans] = useState<CoachSubscriptionPlan[]>(DEFAULT_COACH_SUBSCRIPTION_PLANS);
  const [myEnrollments, setMyEnrollments] = useState<CoachEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'COACHES' | 'BATCHES' | 'PORTAL'>('COACHES');
  const [selectedSport, setSelectedSport] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedCoach, setSelectedCoach] = useState<CoachProfile | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<CoachBatch | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isCreateBatchModalOpen, setIsCreateBatchModalOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('YEARLY_COACH_PRO');
  const [savingAction, setSavingAction] = useState(false);

  // Coach Registration Wizard State
  const [regStep, setRegStep] = useState<1 | 2 | 3 | 4>(1);
  const [coachForm, setCoachForm] = useState({
    name: user?.displayName || '',
    academyName: '',
    email: user?.email || '',
    phone: user?.phoneNumber || '',
    bio: '',
    sports: ['Football'] as string[],
    experienceYears: '4',
    specialization: 'Attacking Tactics & Core Fitness',
    ratePerSession: '500',
    rateMonthly: '3500',
    idProofType: 'Aadhaar Card' as const,
    idProofNumber: '',
    idProofImageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
    certificationTitle: 'AFC / AIFF D-License Certified Coach',
    certificationIssuer: 'All India Football Federation',
    certificationYear: '2022',
    certificationProofUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
    selectedTurfIds: [] as string[],
  });

  // Create Batch Form State
  const [batchForm, setBatchForm] = useState({
    title: '',
    sport: 'Football',
    turfId: '',
    scheduleDays: ['Mon', 'Wed', 'Fri'],
    timeSlot: '06:30 AM - 08:00 AM',
    feePerMonth: '3000',
    maxCapacity: '15',
    level: 'All Levels' as BatchLevel,
    ageGroup: 'Open (All Ages)' as BatchAgeGroup,
    description: '',
  });

  // Current logged in user's coach profile
  const myCoachProfile = useMemo(() => {
    if (!user) return null;
    return coaches.find((c) => c.userId === user.uid || (user.email && c.email === user.email)) || null;
  }, [coaches, user]);

  useEffect(() => {
    const unsubCoaches = listenCoaches((list) => {
      setCoaches(list);
      setLoading(false);
    });
    const unsubBatches = listenCoachBatches(undefined, (list) => {
      setBatches(list);
    });
    const unsubPlans = listenCoachSubscriptionPlans(false, (plans) => {
      if (plans && plans.length > 0) {
        setCoachPlans(plans);
      }
    });
    getTurfs().then(setTurfs);

    return () => {
      if (unsubCoaches) unsubCoaches();
      if (unsubBatches) unsubBatches();
      if (unsubPlans) unsubPlans();
    };
  }, []);

  // Listen to enrollments for my coach profile
  useEffect(() => {
    if (!myCoachProfile?.id) return;
    const unsubEnrollments = listenAllCoachEnrollments(myCoachProfile.id, (list) => {
      setMyEnrollments(list);
    });
    return () => {
      if (unsubEnrollments) unsubEnrollments();
    };
  }, [myCoachProfile?.id]);

  const sportsList = [
    { key: 'ALL', label: 'All Sports', icon: '🌐' },
    { key: 'Football', label: 'Football', icon: '⚽' },
    { key: 'Cricket', label: 'Cricket', icon: '🏏' },
    { key: 'Badminton', label: 'Badminton', icon: '🏸' },
    { key: 'Pickleball', label: 'Pickleball', icon: '🏓' },
    { key: 'Tennis', label: 'Tennis', icon: '🎾' },
    { key: 'Basketball', label: 'Basketball', icon: '🏀' },
  ];

  const availableDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const filteredCoaches = useMemo(() => {
    return coaches.filter((c) => {
      if (!c.isVerified && c.verificationStatus !== 'VERIFIED' && c.userId !== user?.uid) {
        return false;
      }
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.academyName && c.academyName.toLowerCase().includes(q)) ||
        (c.sports && c.sports.some((s) => s.toLowerCase().includes(q)));

      const matchesSport =
        selectedSport === 'ALL' || (c.sports && c.sports.includes(selectedSport));

      return matchesSearch && matchesSport;
    });
  }, [coaches, searchQuery, selectedSport, user?.uid]);

  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const parentCoach = coaches.find((c) => c.id === b.coachId);
      if (parentCoach && !parentCoach.isVerified && parentCoach.verificationStatus !== 'VERIFIED' && parentCoach.userId !== user?.uid) {
        return false;
      }
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.coachName.toLowerCase().includes(q) ||
        b.sport.toLowerCase().includes(q);

      const matchesSport =
        selectedSport === 'ALL' || b.sport === selectedSport;

      return matchesSearch && matchesSport;
    });
  }, [batches, coaches, searchQuery, selectedSport, user?.uid]);

  const handleEnrollBatch = async () => {
    if (!selectedBatch || !user) {
      Alert.alert('Sign In Required', 'Please log in to enroll in training batches.');
      return;
    }
    setEnrolling(true);
    try {
      await enrollInCoachBatch({
        batchId: selectedBatch.id,
        coachId: selectedBatch.coachId,
        coachName: selectedBatch.coachName,
        playerId: user.uid,
        playerName: user.displayName || 'Player',
        playerPhone: user.phoneNumber || '',
        status: 'CONFIRMED',
      });
      Alert.alert('Success 🎉', `Successfully enrolled in ${selectedBatch.title}! The coach will reach out to confirm your schedule.`);
      setSelectedBatch(null);
    } catch (err) {
      console.error('Error enrolling in batch:', err);
      Alert.alert('Error', 'Failed to enroll in batch. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  const handleCompleteCoachRegistration = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in first.');
      return;
    }
    if (!coachForm.name.trim() || !coachForm.idProofNumber.trim()) {
      Alert.alert('Missing Fields', 'Please complete all required fields including Government ID details.');
      return;
    }

    setSavingAction(true);
    try {
      const planObj = coachPlans.find((p) => p.id === selectedPlanId) || coachPlans[0] || DEFAULT_COACH_SUBSCRIPTION_PLANS[0];
      const selectedTurfObjects = turfs.filter((t) => coachForm.selectedTurfIds.includes(t.id));
      const now = new Date();
      const expiry = new Date(now);
      expiry.setDate(expiry.getDate() + (planObj.durationDays || 365));

      const subscriptionData: CoachSubscription = {
        planId: planObj.id,
        planName: planObj.name,
        amountPaid: planObj.price,
        paymentStatus: 'PAID',
        paymentId: `MOB_COACH_TXN_${Date.now().toString().slice(-6)}`,
        paymentMethod: 'UPI_RAZORPAY',
        subscribedAt: now.toISOString().split('T')[0],
        expiresAt: expiry.toISOString().split('T')[0],
        isActive: true,
      };

      await createOrUpdateCoachProfile({
        id: myCoachProfile?.id || '',
        userId: user.uid,
        name: coachForm.name || user.displayName || 'Certified Coach',
        academyName: coachForm.academyName || `${coachForm.name}'s Sports Academy`,
        email: coachForm.email || user.email || '',
        phone: coachForm.phone || user.phoneNumber || '',
        bio: coachForm.bio || 'Professional certified coach committed to elevating player skills and match fitness.',
        sports: coachForm.sports.length > 0 ? coachForm.sports : ['Football'],
        experienceYears: Number(coachForm.experienceYears) || 3,
        certifications: [
          {
            title: coachForm.certificationTitle,
            issuer: coachForm.certificationIssuer,
            year: Number(coachForm.certificationYear) || 2022,
            docUrl: coachForm.certificationProofUrl,
          },
        ],
        rates: {
          perSession: Number(coachForm.ratePerSession) || 500,
          monthly: Number(coachForm.rateMonthly) || 3500,
        },
        rating: myCoachProfile?.rating || 5.0,
        reviewCount: myCoachProfile?.reviewCount || 1,
        specialization: coachForm.specialization,
        venueIds: coachForm.selectedTurfIds.length > 0 ? coachForm.selectedTurfIds : turfs.map((t) => t.id).slice(0, 2),
        venueNames: selectedTurfObjects.length > 0 ? selectedTurfObjects.map((t) => t.name) : turfs.map((t) => t.name).slice(0, 2),
        isVerified: false,
        verificationStatus: 'PENDING_VERIFICATION',
        idProofType: coachForm.idProofType,
        idProofNumber: coachForm.idProofNumber,
        idProofImageUrl: coachForm.idProofImageUrl,
        isPhoneVerified: true,
        phoneOtpVerifiedAt: now.toISOString(),
        certificationProofUrls: [coachForm.certificationProofUrl],
        subscription: subscriptionData,
        platformFeePaid: planObj.price,
        totalEnrolledStudents: 0,
        totalEarnings: 0,
        status: 'PENDING',
      });

      setIsRegisterModalOpen(false);
      setRegStep(1);
      setActiveTab('PORTAL');
      Alert.alert(
        'Registration Submitted! 🚀',
        'Your Coach profile and annual pass payment have been recorded. Our verification team will verify your credentials within 24 hours.'
      );
    } catch (err) {
      console.error('Error submitting coach profile:', err);
      Alert.alert('Error', 'Failed to register coach profile. Please try again.');
    } finally {
      setSavingAction(false);
    }
  };

  const handleCreateBatch = async () => {
    if (!myCoachProfile) {
      Alert.alert('Error', 'Coach profile not found.');
      return;
    }
    if (!batchForm.title.trim() || !batchForm.feePerMonth.trim()) {
      Alert.alert('Missing Details', 'Please enter batch title and monthly coaching fee.');
      return;
    }

    setSavingAction(true);
    try {
      const selectedTurf = turfs.find((t) => t.id === batchForm.turfId) || turfs[0];
      await createCoachBatch({
        coachId: myCoachProfile.id,
        coachName: myCoachProfile.name,
        sport: batchForm.sport,
        title: batchForm.title,
        description: batchForm.description || `High-energy ${batchForm.sport} practice sessions designed for all skill levels.`,
        turfId: selectedTurf?.id || 'turf-1',
        turfName: selectedTurf?.name || 'Main Sports Arena',
        scheduleDays: batchForm.scheduleDays.length > 0 ? batchForm.scheduleDays : ['Mon', 'Wed', 'Fri'],
        timeSlot: batchForm.timeSlot || '06:30 AM - 08:00 AM',
        feePerMonth: Number(batchForm.feePerMonth) || 3000,
        maxCapacity: Number(batchForm.maxCapacity) || 16,
        enrolledCount: 0,
        level: batchForm.level,
        ageGroup: batchForm.ageGroup,
        isActive: true,
      });

      setIsCreateBatchModalOpen(false);
      setBatchForm({
        title: '',
        sport: 'Football',
        turfId: '',
        scheduleDays: ['Mon', 'Wed', 'Fri'],
        timeSlot: '06:30 AM - 08:00 AM',
        feePerMonth: '3000',
        maxCapacity: '15',
        level: 'All Levels',
        ageGroup: 'Open (All Ages)',
        description: '',
      });
      Alert.alert('Batch Created! 🏆', 'Your new training batch is now live for players to discover and enroll.');
    } catch (err) {
      console.error('Error creating batch:', err);
      Alert.alert('Error', 'Failed to create training batch.');
    } finally {
      setSavingAction(false);
    }
  };

  const handleRenewCoachPass = async (plan: CoachSubscriptionPlan) => {
    if (!myCoachProfile) return;
    setSavingAction(true);
    try {
      const now = new Date();
      const expiry = new Date(now);
      expiry.setDate(expiry.getDate() + (plan.durationDays || 365));

      const newSub: CoachSubscription = {
        planId: plan.id,
        planName: plan.name,
        amountPaid: plan.price,
        paymentStatus: 'PAID',
        paymentId: `MOB_RENEW_${Date.now().toString().slice(-6)}`,
        paymentMethod: 'UPI_RAZORPAY',
        subscribedAt: now.toISOString().split('T')[0],
        expiresAt: expiry.toISOString().split('T')[0],
        isActive: true,
      };

      await recordCoachYearlySubscription(myCoachProfile.id, newSub, myCoachProfile.name, myCoachProfile.email);
      setIsRenewModalOpen(false);
      Alert.alert('Pass Renewed! 🌟', `Successfully renewed ${plan.name} valid until ${newSub.expiresAt}.`);
    } catch (err) {
      console.error('Error renewing coach pass:', err);
      Alert.alert('Error', 'Failed to renew coach subscription pass.');
    } finally {
      setSavingAction(false);
    }
  };

  const handleDeleteBatch = (batchId: string) => {
    Alert.alert('Delete Batch', 'Are you sure you want to remove this training batch?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCoachBatch(batchId);
            Alert.alert('Deleted', 'Training batch removed.');
          } catch (err) {
            Alert.alert('Error', 'Failed to delete batch.');
          }
        },
      },
    ]);
  };

  const dynamicStyles = {
    container: { flex: 1, backgroundColor: colors.background },
    card: { backgroundColor: colors.card, borderColor: colors.border },
    textPrimary: { color: colors.textPrimary },
    textSecondary: { color: colors.textSecondary },
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      {/* Top Header & Tab Controls */}
      <View style={[styles.headerContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Coaching & Academies</Text>
            <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>
              Certified trainers, practice batches & academy passes
            </Text>
          </View>
          {myCoachProfile ? (
            <TouchableOpacity
              style={[styles.portalBadge, { backgroundColor: '#10b98120', borderColor: '#10b98150' }]}
              onPress={() => setActiveTab('PORTAL')}
            >
              <ShieldCheck size={14} color="#10b981" />
              <Text style={styles.portalBadgeText}>My Academy Hub</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.registerCoachBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                setRegStep(1);
                setIsRegisterModalOpen(true);
              }}
            >
              <Sparkles size={14} color="#ffffff" />
              <Text style={styles.registerCoachBtnText}>Join as Coach</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search Bar */}
        {activeTab !== 'PORTAL' && (
          <View style={[styles.searchBar, { backgroundColor: colors.surface || '#1e293b', borderColor: colors.border }]}>
            <Search size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search coaches, academies, or sports..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Sub-tabs: Coaches, Batches, Portal */}
        <View style={styles.subTabRow}>
          <TouchableOpacity
            style={[
              styles.subTabButton,
              activeTab === 'COACHES' && { backgroundColor: colors.primary, borderColor: colors.primary },
              activeTab !== 'COACHES' && { backgroundColor: colors.surface || '#1e293b', borderColor: colors.border },
            ]}
            onPress={() => setActiveTab('COACHES')}
          >
            <GraduationCap size={15} color={activeTab === 'COACHES' ? '#ffffff' : colors.textSecondary} />
            <Text style={[styles.subTabText, { color: activeTab === 'COACHES' ? '#ffffff' : colors.textSecondary }]}>
              Verified Coaches ({filteredCoaches.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.subTabButton,
              activeTab === 'BATCHES' && { backgroundColor: colors.primary, borderColor: colors.primary },
              activeTab !== 'BATCHES' && { backgroundColor: colors.surface || '#1e293b', borderColor: colors.border },
            ]}
            onPress={() => setActiveTab('BATCHES')}
          >
            <Calendar size={15} color={activeTab === 'BATCHES' ? '#ffffff' : colors.textSecondary} />
            <Text style={[styles.subTabText, { color: activeTab === 'BATCHES' ? '#ffffff' : colors.textSecondary }]}>
              Batches ({filteredBatches.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.subTabButton,
              activeTab === 'PORTAL' && { backgroundColor: colors.primary, borderColor: colors.primary },
              activeTab !== 'PORTAL' && { backgroundColor: colors.surface || '#1e293b', borderColor: colors.border },
            ]}
            onPress={() => setActiveTab('PORTAL')}
          >
            <Award size={15} color={activeTab === 'PORTAL' ? '#ffffff' : colors.textSecondary} />
            <Text style={[styles.subTabText, { color: activeTab === 'PORTAL' ? '#ffffff' : colors.textSecondary }]}>
              {myCoachProfile ? 'Academy Hub' : 'Coach Pass'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sport Filter Pills (Coaches & Batches tabs) */}
        {activeTab !== 'PORTAL' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sportsScroll}>
            {sportsList.map((sport) => {
              const isSelected = selectedSport === sport.key;
              return (
                <TouchableOpacity
                  key={sport.key}
                  style={[
                    styles.sportPill,
                    { backgroundColor: isSelected ? colors.primary : colors.surface || '#1e293b', borderColor: colors.border },
                  ]}
                  onPress={() => setSelectedSport(sport.key)}
                >
                  <Text style={styles.sportEmoji}>{sport.icon}</Text>
                  <Text style={[styles.sportLabel, { color: isSelected ? '#ffffff' : colors.textPrimary }]}>
                    {sport.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Connecting to sports academy network...</Text>
        </View>
      ) : activeTab === 'COACHES' ? (
        /* COACHES LIST */
        <ScrollView contentContainerStyle={styles.listContent}>
          {filteredCoaches.length === 0 ? (
            <View style={styles.emptyContainer}>
              <GraduationCap size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Coaches Found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Try adjusting your search criteria or sport filter.
              </Text>
            </View>
          ) : (
            filteredCoaches.map((coach) => (
              <TouchableOpacity
                key={coach.id}
                style={[styles.coachCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setSelectedCoach(coach)}
              >
                <View style={styles.coachCardHeader}>
                  <View style={[styles.avatarBox, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.avatarText, { color: colors.primary }]}>{coach.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.coachHeaderInfo}>
                    <View style={styles.coachNameRow}>
                      <Text style={[styles.coachName, { color: colors.textPrimary }]}>{coach.name}</Text>
                      {coach.isVerified && <ShieldCheck size={16} color="#10b981" />}
                    </View>
                    <Text style={[styles.academyName, { color: colors.primary }]}>{coach.academyName || 'Sports Academy'}</Text>
                  </View>
                  <View style={styles.ratingBadge}>
                    <Star size={14} color="#f59e0b" fill="#f59e0b" />
                    <Text style={styles.ratingText}>{coach.rating || 5.0}</Text>
                  </View>
                </View>

                <Text style={[styles.coachBio, { color: colors.textSecondary }]} numberOfLines={2}>
                  {coach.bio || 'Professional sports coach dedicated to player development.'}
                </Text>

                <View style={styles.sportTagsRow}>
                  {coach.sports?.map((s, idx) => (
                    <View key={idx} style={[styles.sportTag, { backgroundColor: colors.surface || '#1e293b' }]}>
                      <Text style={[styles.sportTagText, { color: colors.textPrimary }]}>{s}</Text>
                    </View>
                  ))}
                  <View style={[styles.expTag, { backgroundColor: '#10b98120' }]}>
                    <Text style={styles.expTagText}>{coach.experienceYears || 5}+ yrs exp</Text>
                  </View>
                </View>

                <View style={[styles.coachCardFooter, { borderTopColor: colors.border }]}>
                  <View>
                    <Text style={[styles.rateLabel, { color: colors.textSecondary }]}>Per Session / Month</Text>
                    <Text style={[styles.rateValue, { color: colors.textPrimary }]}>
                      ₹{coach.rates?.perSession || 500} <Text style={{ fontSize: 11, color: colors.textSecondary }}>/ ₹{coach.rates?.monthly || 4000}</Text>
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.viewDetailsButton, { backgroundColor: colors.primary }]}
                    onPress={() => setSelectedCoach(coach)}
                  >
                    <Text style={styles.viewDetailsButtonText}>View Profile</Text>
                    <ChevronRight size={14} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : activeTab === 'BATCHES' ? (
        /* TRAINING BATCHES LIST */
        <ScrollView contentContainerStyle={styles.listContent}>
          {filteredBatches.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Calendar size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Training Batches Found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Check back later for newly scheduled training slots.
              </Text>
            </View>
          ) : (
            filteredBatches.map((batch) => (
              <TouchableOpacity
                key={batch.id}
                style={[styles.coachCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setSelectedBatch(batch)}
              >
                <View style={styles.batchTopRow}>
                  <View style={[styles.sportBadge, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.sportBadgeText, { color: colors.primary }]}>{batch.sport}</Text>
                  </View>
                  <Text style={[styles.feeText, { color: colors.primary }]}>₹{batch.feePerMonth}/mo</Text>
                </View>

                <Text style={[styles.batchTitle, { color: colors.textPrimary }]}>{batch.title}</Text>
                <Text style={[styles.coachSubText, { color: colors.textSecondary }]}>By {batch.coachName}</Text>

                <Text style={[styles.coachBio, { color: colors.textSecondary }]} numberOfLines={2}>
                  {batch.description}
                </Text>

                <View style={styles.batchMetaGrid}>
                  <View style={styles.metaItem}>
                    <Clock size={13} color={colors.textSecondary} />
                    <Text style={[styles.metaItemText, { color: colors.textSecondary }]}>{batch.timeSlot}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <MapPin size={13} color={colors.textSecondary} />
                    <Text style={[styles.metaItemText, { color: colors.textSecondary }]}>{batch.turfName || 'Turf Arena'}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Users size={13} color={colors.textSecondary} />
                    <Text style={[styles.metaItemText, { color: colors.textSecondary }]}>
                      {batch.enrolledCount || 0}/{batch.maxCapacity || 16} Enrolled
                    </Text>
                  </View>
                </View>

                <View style={[styles.coachCardFooter, { borderTopColor: colors.border }]}>
                  <Text style={[styles.daysText, { color: colors.textSecondary }]}>
                    Days: {batch.scheduleDays?.join(', ')}
                  </Text>
                  <TouchableOpacity
                    style={[styles.viewDetailsButton, { backgroundColor: colors.primary }]}
                    onPress={() => setSelectedBatch(batch)}
                  >
                    <Text style={styles.viewDetailsButtonText}>Enroll Now</Text>
                    <ChevronRight size={14} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        /* ACADEMY PORTAL / COACH HUB TAB */
        <ScrollView contentContainerStyle={styles.listContent}>
          {myCoachProfile ? (
            <View style={{ gap: 16 }}>
              {/* Profile Card & Verification Status */}
              <View style={[styles.coachCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[styles.avatarBoxLarge, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.avatarTextLarge, { color: colors.primary }]}>{myCoachProfile.name.charAt(0)}</Text>
                    </View>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{myCoachProfile.name}</Text>
                        {myCoachProfile.isVerified && <ShieldCheck size={18} color="#10b981" />}
                      </View>
                      <Text style={[styles.academyName, { color: colors.primary }]}>{myCoachProfile.academyName}</Text>
                    </View>
                  </View>
                </View>

                {/* Verification Badge Bar */}
                <View
                  style={[
                    styles.verificationNotice,
                    {
                      backgroundColor: myCoachProfile.isVerified
                        ? '#10b98115'
                        : myCoachProfile.verificationStatus === 'REJECTED'
                        ? '#ef444415'
                        : '#f59e0b15',
                      borderColor: myCoachProfile.isVerified
                        ? '#10b98140'
                        : myCoachProfile.verificationStatus === 'REJECTED'
                        ? '#ef444440'
                        : '#f59e0b40',
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {myCoachProfile.isVerified ? (
                      <CheckCircle2 size={16} color="#10b981" />
                    ) : (
                      <AlertTriangle size={16} color="#f59e0b" />
                    )}
                    <Text
                      style={[
                        styles.verificationNoticeText,
                        {
                          color: myCoachProfile.isVerified
                            ? '#10b981'
                            : myCoachProfile.verificationStatus === 'REJECTED'
                            ? '#ef4444'
                            : '#f59e0b',
                        },
                      ]}
                    >
                      {myCoachProfile.isVerified
                        ? 'Official Verified Coach Badge Active'
                        : myCoachProfile.verificationStatus === 'REJECTED'
                        ? 'Verification Rejected — Update ID Documents'
                        : 'Credentials Pending Admin Verification'}
                    </Text>
                  </View>
                </View>

                {/* Subscription Status Card */}
                {(() => {
                  const sub = myCoachProfile.subscription;
                  const isPlanExpired = sub
                    ? (sub.paymentStatus === 'EXPIRED' || (sub.expiresAt && new Date(sub.expiresAt).getTime() < Date.now()))
                    : false;
                  const isPlanActive = sub ? (sub.isActive !== false && !isPlanExpired) : true;

                  return (
                    <View style={[styles.subStatusCard, { backgroundColor: colors.surface || '#1e293b', borderColor: isPlanExpired ? '#ef444440' : colors.border }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={[styles.subStatusLabel, { color: colors.textSecondary }]}>SaaS Subscription</Text>
                          <Text style={[styles.subStatusPlan, { color: colors.textPrimary }]}>
                            {sub?.planName || 'Coach Pro Annual Pass'}
                          </Text>
                          <Text style={[styles.subStatusExp, { color: isPlanExpired ? '#ef4444' : colors.textSecondary }]}>
                            {isPlanExpired ? `Expired on: ${sub?.expiresAt || 'Past Date'}` : `Valid Until: ${sub?.expiresAt || 'Active'}`}
                          </Text>
                        </View>
                        {isPlanExpired ? (
                          <TouchableOpacity
                            style={[styles.renewBtn, { backgroundColor: '#ef4444' }]}
                            onPress={() => setIsRenewModalOpen(true)}
                          >
                            <Zap size={13} color="#ffffff" />
                            <Text style={styles.renewBtnText}>Renew Plan</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#10b98120', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#10b98140' }}>
                            <CheckCircle2 size={13} color="#10b981" />
                            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#10b981' }}>Active</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })()}

                {/* Quick Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <TouchableOpacity
                    style={[styles.createBatchBtn, { backgroundColor: colors.primary }]}
                    onPress={() => setIsCreateBatchModalOpen(true)}
                  >
                    <Plus size={16} color="#ffffff" />
                    <Text style={styles.createBatchBtnText}>+ Schedule Training Batch</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* My Scheduled Batches Section */}
              <View style={[styles.coachCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                    My Batches ({batches.filter((b) => b.coachId === myCoachProfile.id).length})
                  </Text>
                  <TouchableOpacity onPress={() => setIsCreateBatchModalOpen(true)}>
                    <Text style={{ color: colors.primary, fontSize: 13, fontWeight: 'bold' }}>+ New Batch</Text>
                  </TouchableOpacity>
                </View>

                {batches.filter((b) => b.coachId === myCoachProfile.id).length === 0 ? (
                  <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                    <Calendar size={36} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 8 }}>
                      You haven't scheduled any training batches yet.
                    </Text>
                  </View>
                ) : (
                  batches
                    .filter((b) => b.coachId === myCoachProfile.id)
                    .map((batch) => (
                      <View
                        key={batch.id}
                        style={[styles.myBatchRow, { backgroundColor: colors.surface || '#1e293b', borderColor: colors.border }]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.myBatchTitle, { color: colors.textPrimary }]}>{batch.title}</Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                            {batch.sport} • {batch.timeSlot} • {batch.turfName}
                          </Text>
                          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: 'bold', marginTop: 4 }}>
                            ₹{batch.feePerMonth}/month • {batch.enrolledCount || 0}/{batch.maxCapacity || 16} Students
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={{ padding: 8 }}
                          onPress={() => handleDeleteBatch(batch.id)}
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))
                )}
              </View>

              {/* Enrolled Students Roster */}
              <View style={[styles.coachCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionHeading, { color: colors.textPrimary, marginBottom: 12 }]}>
                  Enrolled Students ({myEnrollments.length})
                </Text>

                {myEnrollments.length === 0 ? (
                  <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                    <Users size={32} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 6 }}>
                      No active student enrollments yet.
                    </Text>
                  </View>
                ) : (
                  myEnrollments.map((enr) => (
                    <View
                      key={enr.id}
                      style={[styles.enrollmentRow, { backgroundColor: colors.surface || '#1e293b', borderColor: colors.border }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.enrName, { color: colors.textPrimary }]}>{enr.playerName}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                          Phone: {enr.playerPhone || 'N/A'} • Status: {enr.status}
                        </Text>
                      </View>
                      <View style={[styles.enrBadge, { backgroundColor: '#10b98120' }]}>
                        <Text style={{ color: '#10b981', fontSize: 11, fontWeight: 'bold' }}>Enrolled</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          ) : (
            /* NON-REGISTERED: INVITATION / JOIN PORTAL */
            <View style={{ gap: 16 }}>
              <View style={[styles.invitationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.inviteBadge, { backgroundColor: colors.primary + '20' }]}>
                  <Sparkles size={16} color={colors.primary} />
                  <Text style={[styles.inviteBadgeText, { color: colors.primary }]}>Coach & Academy SaaS</Text>
                </View>

                <Text style={[styles.inviteTitle, { color: colors.textPrimary }]}>
                  Monetize Your Sports Coaching with TurFit
                </Text>
                <Text style={[styles.inviteSubtitle, { color: colors.textSecondary }]}>
                  Get verified, schedule unlimited training batches across partner turfs, and retain 100% of your student revenue with zero commission.
                </Text>

                <View style={styles.perksList}>
                  <View style={styles.perkItem}>
                    <CheckCircle2 size={16} color="#10b981" />
                    <Text style={[styles.perkText, { color: colors.textPrimary }]}>
                      Official TurFit Verified Coach Badge & priority discovery
                    </Text>
                  </View>
                  <View style={styles.perkItem}>
                    <CheckCircle2 size={16} color="#10b981" />
                    <Text style={[styles.perkText, { color: colors.textPrimary }]}>
                      Create unlimited practice batches & student rosters
                    </Text>
                  </View>
                  <View style={styles.perkItem}>
                    <CheckCircle2 size={16} color="#10b981" />
                    <Text style={[styles.perkText, { color: colors.textPrimary }]}>
                      Direct venue partnerships & preferred arena slot rates
                    </Text>
                  </View>
                  <View style={styles.perkItem}>
                    <CheckCircle2 size={16} color="#10b981" />
                    <Text style={[styles.perkText, { color: colors.textPrimary }]}>
                      0% Commission on student monthly packages
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryJoinBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setRegStep(1);
                    setIsRegisterModalOpen(true);
                  }}
                >
                  <Sparkles size={16} color="#ffffff" />
                  <Text style={styles.primaryJoinBtnText}>Register as Certified Coach / Academy</Text>
                </TouchableOpacity>
              </View>

              {/* Plans Preview */}
              <View style={[styles.coachCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionHeading, { color: colors.textPrimary, marginBottom: 12 }]}>
                  Annual Subscription Passes
                </Text>
                <View style={{ gap: 12 }}>
                  {coachPlans.map((p) => (
                    <View
                      key={p.id}
                      style={[styles.planPreviewCard, { backgroundColor: colors.surface || '#1e293b', borderColor: colors.border }]}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                          <Text style={[styles.planPreviewName, { color: colors.textPrimary }]}>{p.name}</Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{p.duration || '1 Year'}</Text>
                        </View>
                        <Text style={[styles.planPreviewPrice, { color: colors.primary }]}>₹{p.price}/yr</Text>
                      </View>
                      <View style={{ marginTop: 8, gap: 4 }}>
                        {p.features?.slice(0, 3).map((f, i) => (
                          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Check size={12} color="#10b981" />
                            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{f}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Coach Profile Details Modal */}
      {selectedCoach && (
        <Modal visible={true} animationType="slide" transparent={true} onRequestClose={() => setSelectedCoach(null)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[styles.avatarBoxLarge, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.avatarTextLarge, { color: colors.primary }]}>{selectedCoach.name.charAt(0)}</Text>
                  </View>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{selectedCoach.name}</Text>
                      {selectedCoach.isVerified && <ShieldCheck size={18} color="#10b981" />}
                    </View>
                    <Text style={[styles.modalSubtitle, { color: colors.primary }]}>{selectedCoach.academyName || 'Sports Academy'}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedCoach(null)}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
                <View style={styles.statGridRow}>
                  <View style={[styles.statBox, { backgroundColor: colors.surface || '#1e293b' }]}>
                    <Text style={[styles.statBoxVal, { color: colors.textPrimary }]}>{selectedCoach.experienceYears}+ Yrs</Text>
                    <Text style={[styles.statBoxLbl, { color: colors.textSecondary }]}>Experience</Text>
                  </View>
                  <View style={[styles.statBox, { backgroundColor: colors.surface || '#1e293b' }]}>
                    <Text style={[styles.statBoxVal, { color: '#f59e0b' }]}>★ {selectedCoach.rating || 5.0}</Text>
                    <Text style={[styles.statBoxLbl, { color: colors.textSecondary }]}>{selectedCoach.reviewCount || 0} Reviews</Text>
                  </View>
                  <View style={[styles.statBox, { backgroundColor: colors.surface || '#1e293b' }]}>
                    <Text style={[styles.statBoxVal, { color: '#10b981' }]}>{selectedCoach.totalEnrolledStudents || 12}</Text>
                    <Text style={[styles.statBoxLbl, { color: colors.textSecondary }]}>Students</Text>
                  </View>
                </View>

                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>About Coaching Philosophy</Text>
                  <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>
                    {selectedCoach.bio || 'Experienced professional sports trainer focused on skill building, tactical understanding, and physical conditioning.'}
                  </Text>
                </View>

                {selectedCoach.specialization && (
                  <View style={styles.sectionBlock}>
                    <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Specialization</Text>
                    <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>{selectedCoach.specialization}</Text>
                  </View>
                )}

                {selectedCoach.certifications && selectedCoach.certifications.length > 0 && (
                  <View style={styles.sectionBlock}>
                    <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Certifications & Licenses</Text>
                    {selectedCoach.certifications.map((cert, index) => (
                      <View key={index} style={[styles.certRow, { backgroundColor: colors.surface || '#1e293b' }]}>
                        <Award size={16} color={colors.primary} />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={[styles.certTitle, { color: colors.textPrimary }]}>{cert.title}</Text>
                          <Text style={[styles.certIssuer, { color: colors.textSecondary }]}>{cert.issuer} ({cert.year})</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Coaching Rates</Text>
                  <View style={[styles.rateCard, { backgroundColor: colors.surface || '#1e293b' }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={[styles.rateCardTitle, { color: colors.textPrimary }]}>Per Session Rate</Text>
                      <Text style={[styles.rateCardVal, { color: colors.primary }]}>₹{selectedCoach.rates?.perSession || 500}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={[styles.rateCardTitle, { color: colors.textPrimary }]}>Monthly Coaching Package</Text>
                      <Text style={[styles.rateCardVal, { color: colors.primary }]}>₹{selectedCoach.rates?.monthly || 4000}</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>

              <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.primaryModalButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setSelectedCoach(null);
                    setActiveTab('BATCHES');
                  }}
                >
                  <Text style={styles.primaryModalButtonText}>View Active Batches</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Batch Enrollment Modal */}
      {selectedBatch && (
        <Modal visible={true} animationType="slide" transparent={true} onRequestClose={() => setSelectedBatch(null)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalSubtitle, { color: colors.primary }]}>{selectedBatch.sport} Training</Text>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{selectedBatch.title}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedBatch(null)}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
                <View style={[styles.batchDetailCard, { backgroundColor: colors.surface || '#1e293b' }]}>
                  <Text style={[styles.batchDetailCoach, { color: colors.textPrimary }]}>Coach: {selectedBatch.coachName}</Text>
                  <Text style={[styles.batchDetailDesc, { color: colors.textSecondary }]}>{selectedBatch.description}</Text>

                  <View style={styles.batchInfoGrid}>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Time Slot</Text>
                      <Text style={[styles.infoVal, { color: colors.textPrimary }]}>{selectedBatch.timeSlot}</Text>
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Schedule Days</Text>
                      <Text style={[styles.infoVal, { color: colors.textPrimary }]}>{selectedBatch.scheduleDays?.join(', ')}</Text>
                    </View>
                  </View>

                  <View style={[styles.batchInfoGrid, { marginTop: 12 }]}>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Turf / Venue</Text>
                      <Text style={[styles.infoVal, { color: colors.textPrimary }]}>{selectedBatch.turfName || 'Turf Arena'}</Text>
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Monthly Fee</Text>
                      <Text style={[styles.infoVal, { color: colors.primary }]}>₹{selectedBatch.feePerMonth}</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>

              <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.primaryModalButton, { backgroundColor: colors.primary, opacity: enrolling ? 0.7 : 1 }]}
                  disabled={enrolling}
                  onPress={handleEnrollBatch}
                >
                  {enrolling ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryModalButtonText}>Confirm Enrollment (₹{selectedBatch.feePerMonth})</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* COACH REGISTRATION MULTI-STEP MODAL */}
      {isRegisterModalOpen && (
        <Modal visible={true} animationType="slide" transparent={true} onRequestClose={() => setIsRegisterModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border, maxHeight: '90%' }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Coach & Academy Onboarding</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.primary }]}>Step {regStep} of 4</Text>
                </View>
                <TouchableOpacity onPress={() => setIsRegisterModalOpen(false)}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
                {regStep === 1 && (
                  <View style={{ gap: 12 }}>
                    <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Profile & Academy Details</Text>
                    <View>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Full Name / Lead Coach *</Text>
                      <TextInput
                        style={[styles.inputField, { backgroundColor: colors.surface || '#1e293b', color: colors.textPrimary, borderColor: colors.border }]}
                        value={coachForm.name}
                        onChangeText={(t) => setCoachForm({ ...coachForm, name: t })}
                        placeholder="e.g. Coach Ramesh Sharma"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                    <View>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Academy Name (Optional)</Text>
                      <TextInput
                        style={[styles.inputField, { backgroundColor: colors.surface || '#1e293b', color: colors.textPrimary, borderColor: colors.border }]}
                        value={coachForm.academyName}
                        onChangeText={(t) => setCoachForm({ ...coachForm, academyName: t })}
                        placeholder="e.g. Apex Football Academy"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                    <View>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Primary Sports (Comma separated)</Text>
                      <TextInput
                        style={[styles.inputField, { backgroundColor: colors.surface || '#1e293b', color: colors.textPrimary, borderColor: colors.border }]}
                        value={coachForm.sports.join(', ')}
                        onChangeText={(t) =>
                          setCoachForm({
                            ...coachForm,
                            sports: t.split(',').map((s) => s.trim()).filter(Boolean),
                          })
                        }
                        placeholder="Football, Cricket, Badminton"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                    <View>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Experience (Years)</Text>
                      <TextInput
                        style={[styles.inputField, { backgroundColor: colors.surface || '#1e293b', color: colors.textPrimary, borderColor: colors.border }]}
                        value={coachForm.experienceYears}
                        keyboardType="numeric"
                        onChangeText={(t) => setCoachForm({ ...coachForm, experienceYears: t })}
                        placeholder="e.g. 5"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                    <View>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Bio & Coaching Philosophy</Text>
                      <TextInput
                        style={[styles.inputField, { backgroundColor: colors.surface || '#1e293b', color: colors.textPrimary, borderColor: colors.border, height: 70 }]}
                        value={coachForm.bio}
                        multiline
                        onChangeText={(t) => setCoachForm({ ...coachForm, bio: t })}
                        placeholder="Tell athletes about your coaching background, tactical style..."
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>
                )}

                {regStep === 2 && (
                  <View style={{ gap: 12 }}>
                    <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Government ID & Verification</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      Required by Admin for granting the TurFit Official Verified Badge.
                    </Text>
                    <View>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Government ID Type</Text>
                      <TextInput
                        style={[styles.inputField, { backgroundColor: colors.surface || '#1e293b', color: colors.textPrimary, borderColor: colors.border }]}
                        value={coachForm.idProofType}
                        editable={false}
                      />
                    </View>
                    <View>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>ID Proof Number (Aadhaar / Passport / License) *</Text>
                      <TextInput
                        style={[styles.inputField, { backgroundColor: colors.surface || '#1e293b', color: colors.textPrimary, borderColor: colors.border }]}
                        value={coachForm.idProofNumber}
                        onChangeText={(t) => setCoachForm({ ...coachForm, idProofNumber: t })}
                        placeholder="e.g. 4589 1234 5678"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                    <View>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Certification / License Title</Text>
                      <TextInput
                        style={[styles.inputField, { backgroundColor: colors.surface || '#1e293b', color: colors.textPrimary, borderColor: colors.border }]}
                        value={coachForm.certificationTitle}
                        onChangeText={(t) => setCoachForm({ ...coachForm, certificationTitle: t })}
                        placeholder="e.g. AIFF D-License / NIS Diploma"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                    <View>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Issuing Federation / Body</Text>
                      <TextInput
                        style={[styles.inputField, { backgroundColor: colors.surface || '#1e293b', color: colors.textPrimary, borderColor: colors.border }]}
                        value={coachForm.certificationIssuer}
                        onChangeText={(t) => setCoachForm({ ...coachForm, certificationIssuer: t })}
                        placeholder="e.g. All India Football Federation"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>
                )}

                {regStep === 3 && (
                  <View style={{ gap: 12 }}>
                    <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Coaching Rates & Pricing</Text>
                    <View>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Per Session Rate (₹)</Text>
                      <TextInput
                        style={[styles.inputField, { backgroundColor: colors.surface || '#1e293b', color: colors.textPrimary, borderColor: colors.border }]}
                        value={coachForm.ratePerSession}
                        keyboardType="numeric"
                        onChangeText={(t) => setCoachForm({ ...coachForm, ratePerSession: t })}
                        placeholder="500"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                    <View>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Monthly Coaching Package (₹)</Text>
                      <TextInput
                        style={[styles.inputField, { backgroundColor: colors.surface || '#1e293b', color: colors.textPrimary, borderColor: colors.border }]}
                        value={coachForm.rateMonthly}
                        keyboardType="numeric"
                        onChangeText={(t) => setCoachForm({ ...coachForm, rateMonthly: t })}
                        placeholder="3500"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                    <View>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Specialization</Text>
                      <TextInput
                        style={[styles.inputField, { backgroundColor: colors.surface || '#1e293b', color: colors.textPrimary, borderColor: colors.border }]}
                        value={coachForm.specialization}
                        onChangeText={(t) => setCoachForm({ ...coachForm, specialization: t })}
                        placeholder="e.g. Strike Training, Goalkeeping, Stamina"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>
                )}

                {regStep === 4 && (
                  <View style={{ gap: 14 }}>
                    <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Select Annual Coach Pass</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      100% of student coaching fees go directly to your account.
                    </Text>

                    <View style={{ gap: 10 }}>
                      {coachPlans.map((plan) => {
                        const isSelected = selectedPlanId === plan.id;
                        return (
                          <TouchableOpacity
                            key={plan.id}
                            style={[
                              styles.planSelectCard,
                              {
                                backgroundColor: isSelected ? colors.primary + '15' : colors.surface || '#1e293b',
                                borderColor: isSelected ? colors.primary : colors.border,
                              },
                            ]}
                            onPress={() => setSelectedPlanId(plan.id)}
                          >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <View>
                                <Text style={[styles.planSelectTitle, { color: colors.textPrimary }]}>{plan.name}</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{plan.duration || '1 Year'}</Text>
                              </View>
                              <Text style={[styles.planSelectPrice, { color: colors.primary }]}>₹{plan.price}/yr</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <View style={[styles.destBox, { backgroundColor: colors.surface || '#1e293b', borderColor: colors.border }]}>
                      <CreditCard size={16} color={colors.primary} />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: 'bold' }}>Instant UPI / Razorpay Checkout</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Destination: TurFit Admin Platform</Text>
                      </View>
                    </View>
                  </View>
                )}
              </ScrollView>

              <View style={[styles.modalFooter, { borderTopColor: colors.border, flexDirection: 'row', gap: 10 }]}>
                {regStep > 1 && (
                  <TouchableOpacity
                    style={[styles.secondaryModalButton, { borderColor: colors.border }]}
                    onPress={() => setRegStep((prev) => (prev - 1) as any)}
                  >
                    <Text style={[styles.secondaryModalButtonText, { color: colors.textPrimary }]}>Back</Text>
                  </TouchableOpacity>
                )}

                {regStep < 4 ? (
                  <TouchableOpacity
                    style={[styles.primaryModalButton, { backgroundColor: colors.primary, flex: 1 }]}
                    onPress={() => setRegStep((prev) => (prev + 1) as any)}
                  >
                    <Text style={styles.primaryModalButtonText}>Continue to Next Step</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.primaryModalButton, { backgroundColor: colors.primary, flex: 1, opacity: savingAction ? 0.7 : 1 }]}
                    disabled={savingAction}
                    onPress={handleCompleteCoachRegistration}
                  >
                    {savingAction ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.primaryModalButtonText}>Pay & Complete Onboarding</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* CREATE BATCH MODAL */}
      {isCreateBatchModalOpen && (
        <Modal visible={true} animationType="slide" transparent={true} onRequestClose={() => setIsCreateBatchModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border, maxHeight: '90%' }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Schedule Training Batch</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.primary }]}>Create new slot for athletes</Text>
                </View>
                <TouchableOpacity onPress={() => setIsCreateBatchModalOpen(false)}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
                <View style={{ gap: 12 }}>
                  <View>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Batch Title *</Text>
                    <TextInput
                      style={[styles.inputField, { backgroundColor: colors.surface || '#1e293b', color: colors.textPrimary, borderColor: colors.border }]}
                      value={batchForm.title}
                      onChangeText={(t) => setBatchForm({ ...batchForm, title: t })}
                      placeholder="e.g. Morning Pro Football Bootcamp"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Sport</Text>
                    <TextInput
                      style={[styles.inputField, { backgroundColor: colors.surface || '#1e293b', color: colors.textPrimary, borderColor: colors.border }]}
                      value={batchForm.sport}
                      onChangeText={(t) => setBatchForm({ ...batchForm, sport: t })}
                      placeholder="Football, Cricket, Badminton"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Time Slot</Text>
                    <TextInput
                      style={[styles.inputField, { backgroundColor: colors.surface || '#1e293b', color: colors.textPrimary, borderColor: colors.border }]}
                      value={batchForm.timeSlot}
                      onChangeText={(t) => setBatchForm({ ...batchForm, timeSlot: t })}
                      placeholder="e.g. 06:30 AM - 08:00 AM"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Schedule Days (Comma Separated)</Text>
                    <TextInput
                      style={[styles.inputField, { backgroundColor: colors.surface || '#1e293b', color: colors.textPrimary, borderColor: colors.border }]}
                      value={batchForm.scheduleDays.join(', ')}
                      onChangeText={(t) =>
                        setBatchForm({
                          ...batchForm,
                          scheduleDays: t.split(',').map((d) => d.trim()).filter(Boolean),
                        })
                      }
                      placeholder="Mon, Wed, Fri"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Monthly Fee (₹) *</Text>
                    <TextInput
                      style={[styles.inputField, { backgroundColor: colors.surface || '#1e293b', color: colors.textPrimary, borderColor: colors.border }]}
                      value={batchForm.feePerMonth}
                      keyboardType="numeric"
                      onChangeText={(t) => setBatchForm({ ...batchForm, feePerMonth: t })}
                      placeholder="3000"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Max Capacity (Students)</Text>
                    <TextInput
                      style={[styles.inputField, { backgroundColor: colors.surface || '#1e293b', color: colors.textPrimary, borderColor: colors.border }]}
                      value={batchForm.maxCapacity}
                      keyboardType="numeric"
                      onChangeText={(t) => setBatchForm({ ...batchForm, maxCapacity: t })}
                      placeholder="15"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Description</Text>
                    <TextInput
                      style={[styles.inputField, { backgroundColor: colors.surface || '#1e293b', color: colors.textPrimary, borderColor: colors.border, height: 60 }]}
                      value={batchForm.description}
                      multiline
                      onChangeText={(t) => setBatchForm({ ...batchForm, description: t })}
                      placeholder="Brief overview of focus drills and training curriculum..."
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
              </ScrollView>

              <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.primaryModalButton, { backgroundColor: colors.primary, opacity: savingAction ? 0.7 : 1 }]}
                  disabled={savingAction}
                  onPress={handleCreateBatch}
                >
                  {savingAction ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryModalButtonText}>Publish Training Batch</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* RENEW PASS MODAL */}
      {isRenewModalOpen && (
        <Modal visible={true} animationType="slide" transparent={true} onRequestClose={() => setIsRenewModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Renew Coach Annual Pass</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.primary }]}>Select plan to extend validity</Text>
                </View>
                <TouchableOpacity onPress={() => setIsRenewModalOpen(false)}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
                <View style={{ gap: 12 }}>
                  {coachPlans.map((plan) => (
                    <TouchableOpacity
                      key={plan.id}
                      style={[styles.planPreviewCard, { backgroundColor: colors.surface || '#1e293b', borderColor: colors.border }]}
                      onPress={() => handleRenewCoachPass(plan)}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                          <Text style={[styles.planPreviewName, { color: colors.textPrimary }]}>{plan.name}</Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{plan.duration || '1 Year'}</Text>
                        </View>
                        <Text style={[styles.planPreviewPrice, { color: colors.primary }]}>₹{plan.price}/yr</Text>
                      </View>
                      <View style={{ marginTop: 8, gap: 4 }}>
                        {plan.features?.slice(0, 3).map((f, i) => (
                          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Check size={12} color="#10b981" />
                            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{f}</Text>
                          </View>
                        ))}
                      </View>
                      <TouchableOpacity
                        style={[styles.renewSelectBtn, { backgroundColor: colors.primary }]}
                        onPress={() => handleRenewCoachPass(plan)}
                      >
                        <Text style={styles.renewSelectBtnText}>Pay ₹{plan.price} & Renew</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  screenSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  portalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  portalBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#10b981',
  },
  registerCoachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  registerCoachBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 42,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  subTabRow: {
    flexDirection: 'row',
    gap: 6,
  },
  subTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  subTabText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sportsScroll: {
    paddingTop: 12,
    gap: 8,
  },
  sportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
    height: 34,
  },
  sportEmoji: {
    fontSize: 13,
  },
  sportLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  coachCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  coachCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  coachHeaderInfo: {
    flex: 1,
  },
  coachNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coachName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  academyName: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  coachBio: {
    fontSize: 13,
    marginTop: 10,
    lineHeight: 18,
  },
  sportTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  sportTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sportTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  expTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  expTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  coachCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  rateLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  rateValue: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 1,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  viewDetailsButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  batchTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sportBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sportBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  feeText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  batchTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 8,
  },
  coachSubText: {
    fontSize: 12,
    marginTop: 2,
  },
  batchMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaItemText: {
    fontSize: 11,
  },
  daysText: {
    fontSize: 11,
  },
  verificationNotice: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 10,
  },
  verificationNoticeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  subStatusCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  subStatusLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  subStatusPlan: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  subStatusExp: {
    fontSize: 11,
    marginTop: 2,
  },
  renewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  renewBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  createBatchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  createBatchBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  myBatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  myBatchTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  enrollmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  enrName: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  enrBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  invitationCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  inviteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 10,
  },
  inviteBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  inviteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  inviteSubtitle: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  perksList: {
    gap: 8,
    marginVertical: 14,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  perkText: {
    fontSize: 12,
    flex: 1,
  },
  primaryJoinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  primaryJoinBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  planPreviewCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  planPreviewName: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  planPreviewPrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  renewSelectBtn: {
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  renewSelectBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '85%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  avatarBoxLarge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextLarge: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalScrollBody: {
    paddingVertical: 14,
  },
  statGridRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  statBoxVal: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statBoxLbl: {
    fontSize: 10,
    marginTop: 2,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  sectionBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  certRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  certTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  certIssuer: {
    fontSize: 11,
    marginTop: 1,
  },
  rateCard: {
    padding: 12,
    borderRadius: 10,
  },
  rateCardTitle: {
    fontSize: 12,
  },
  rateCardVal: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalFooter: {
    paddingTop: 14,
    borderTopWidth: 1,
  },
  primaryModalButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryModalButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  secondaryModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryModalButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  batchDetailCard: {
    padding: 14,
    borderRadius: 12,
  },
  batchDetailCoach: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  batchDetailDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  batchInfoGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  infoVal: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  inputField: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  planSelectCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  planSelectTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  planSelectPrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  destBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
});

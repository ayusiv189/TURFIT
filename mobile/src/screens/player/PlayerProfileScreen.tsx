import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getUserRewardWallet } from '../../services/communityService';
import { getOwnerTurfs } from '../../services/dbService';
import { UserRewardWallet } from '../../types';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Award,
  Sparkles,
  LogOut,
  Edit2,
  X,
  CheckCircle,
  ArrowRightLeft,
  Building,
  CreditCard,
  Plus,
  Activity,
  Check,
  Calendar,
  ShieldCheck,
} from 'lucide-react-native';
import { PhoneVerificationModal } from '../../components/PhoneVerificationModal';

interface PlayerProfileScreenProps {
  navigation?: any;
}

const AVAILABLE_SPORTS = [
  'Football',
  'Box Cricket',
  'Badminton',
  'Basketball',
  'Pickleball',
  'Tennis',
  'Volleyball',
  'Padel',
  'Table Tennis',
];

const SPORT_POSITIONS: Record<string, string[]> = {
  Football: ['Striker (ST)', 'Winger (LW/RW)', 'Center Midfielder (CM)', 'Defensive Mid (CDM)', 'Center Back (CB)', 'Full Back (LB/RB)', 'Goalkeeper (GK)'],
  'Box Cricket': ['Top-Order Batsman', 'Power Hitter / Finisher', 'Fast Bowler', 'Spin Bowler', 'All-Rounder', 'Wicketkeeper Batsman'],
  Badminton: ['Singles Specialist', 'Doubles Specialist', 'Attacking Smasher', 'Net Control Specialist'],
  Basketball: ['Point Guard (PG)', 'Shooting Guard (SG)', 'Small Forward (SF)', 'Power Forward (PF)', 'Center (C)'],
  Pickleball: ['Dink Specialist', 'Power Driver', 'Kitchen Master', 'Doubles Strategist'],
  Tennis: ['Baseline Grinder', 'Serve & Volleyer', 'Aggressive Baseliner', 'All-Court Player'],
  Volleyball: ['Setter', 'Outside Hitter', 'Opposite Hitter', 'Middle Blocker', 'Libero'],
  Padel: ['Bandeja Specialist', 'Vibora Attacker', 'Right-Side Strategist', 'Left-Side Finisher'],
  'Table Tennis': ['Offensive Looper', 'Close-Table Attacker', 'Defensive Chopper', 'Penhold Attacker'],
};

const AVAILABILITY_OPTIONS = [
  'Weekday Evenings (6 PM - 11 PM)',
  'Weekend Mornings (6 AM - 11 AM)',
  'Weekend Evenings (4 PM - 10 PM)',
  'Flexible / Any Slot',
  'Night Matches Only',
];

export const PlayerProfileScreen: React.FC<PlayerProfileScreenProps> = ({ navigation }) => {
  const { user, profile, updateProfileData, switchRole, logout } = useAuth();
  const [rewardWallet, setRewardWallet] = useState<UserRewardWallet | null>(null);
  const [isOwnerUser, setIsOwnerUser] = useState(false);
  const [checkingOwner, setCheckingOwner] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  // Profile Form States
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || '');
  const [city, setCity] = useState(profile?.city || 'Mumbai');
  const [bio, setBio] = useState(profile?.bio || '');
  const [playstyle, setPlaystyle] = useState(profile?.playstyle || '');
  const [availability, setAvailability] = useState(profile?.availability || 'Weekday Evenings (6 PM - 11 PM)');
  const [selectedSports, setSelectedSports] = useState<string[]>(
    profile?.preferredSports && profile.preferredSports.length > 0
      ? profile.preferredSports
      : [profile?.preferredSport || 'Football']
  );
  const [selectedPositions, setSelectedPositions] = useState<string[]>(
    profile?.preferredPositions && profile.preferredPositions.length > 0
      ? profile.preferredPositions
      : [profile?.preferredPosition || 'Striker (ST)']
  );
  const [customPosition, setCustomPosition] = useState('');
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleSwitchToOwner = async () => {
    setSwitching(true);
    try {
      await switchRole('OWNER');
    } catch (err) {
      console.warn('Error switching role to Owner:', err);
    } finally {
      setSwitching(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      getUserRewardWallet(user.uid).then(setRewardWallet);

      if (profile?.isOwnerAccount || profile?.businessName) {
        setIsOwnerUser(true);
        setCheckingOwner(false);
      } else {
        getOwnerTurfs(user.uid)
          .then((turfs) => {
            setIsOwnerUser(turfs.length > 0);
            setCheckingOwner(false);
          })
          .catch(() => {
            setIsOwnerUser(false);
            setCheckingOwner(false);
          });
      }
    } else {
      setCheckingOwner(false);
    }
  }, [user, profile]);

  const toggleSport = (sport: string) => {
    if (selectedSports.includes(sport)) {
      if (selectedSports.length > 1) {
        setSelectedSports(selectedSports.filter((s) => s !== sport));
      } else {
        Alert.alert('Selection Required', 'Please keep at least one primary sport selected.');
      }
    } else {
      setSelectedSports([...selectedSports, sport]);
    }
  };

  const togglePosition = (pos: string) => {
    if (selectedPositions.includes(pos)) {
      setSelectedPositions(selectedPositions.filter((p) => p !== pos));
    } else {
      setSelectedPositions([...selectedPositions, pos]);
    }
  };

  const handleAddCustomPosition = () => {
    if (!customPosition.trim()) return;
    const trimmed = customPosition.trim();
    if (!selectedPositions.includes(trimmed)) {
      setSelectedPositions([...selectedPositions, trimmed]);
    }
    setCustomPosition('');
  };

  const handleOpenEdit = () => {
    setDisplayName(profile?.displayName || '');
    setPhoneNumber(profile?.phoneNumber || '');
    setCity(profile?.city || 'Mumbai');
    setBio(profile?.bio || '');
    setPlaystyle(profile?.playstyle || '');
    setAvailability(profile?.availability || 'Weekday Evenings (6 PM - 11 PM)');
    setSelectedSports(
      profile?.preferredSports && profile.preferredSports.length > 0
        ? profile.preferredSports
        : [profile?.preferredSport || 'Football']
    );
    setSelectedPositions(
      profile?.preferredPositions && profile.preferredPositions.length > 0
        ? profile.preferredPositions
        : [profile?.preferredPosition || 'Striker (ST)']
    );
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfileData({
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim(),
        city: city.trim(),
        bio: bio.trim(),
        playstyle: playstyle.trim(),
        availability: availability.trim(),
        preferredSport: selectedSports[0] || 'Football',
        preferredSports: selectedSports,
        preferredPosition: selectedPositions[0] || 'Striker (ST)',
        preferredPositions: selectedPositions,
      });
      setShowEditModal(false);
      Alert.alert('Profile Updated', 'Your athlete bio, sports, and roles have been saved successfully.');
    } catch (err) {
      console.warn('Error saving profile:', err);
      Alert.alert('Error', 'Could not save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  const activeSportsList = profile?.preferredSports && profile.preferredSports.length > 0
    ? profile.preferredSports
    : [profile?.preferredSport || 'Football'];

  const activePositionsList = profile?.preferredPositions && profile.preferredPositions.length > 0
    ? profile.preferredPositions
    : [profile?.preferredPosition || 'Striker (ST)'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Profile Header Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarBox}>
          <Text style={styles.avatarText}>
            {profile?.displayName?.charAt(0).toUpperCase() || 'A'}
          </Text>
        </View>

        <Text style={styles.name}>{profile?.displayName || 'Athlete'}</Text>
        <Text style={styles.roleBadge}>ATHLETE / PLAYER PROFILE</Text>

        {/* Bio summary */}
        {profile?.bio ? (
          <Text style={styles.bioText}>"{profile.bio}"</Text>
        ) : (
          <Text style={styles.bioPlaceholder}>No playstyle bio added yet. Tap edit to introduce yourself!</Text>
        )}

        <TouchableOpacity style={styles.editBtn} onPress={handleOpenEdit}>
          <Edit2 size={14} color="#10b981" />
          <Text style={styles.editBtnText}>Edit Profile & Sports</Text>
        </TouchableOpacity>
      </View>

      {/* Multi-Sport & Positions Badges */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Award size={18} color="#38bdf8" />
          <Text style={styles.sectionTitle}>Sports & Pitch Roles</Text>
        </View>

        <Text style={styles.subHeading}>Active Sports</Text>
        <View style={styles.chipsWrap}>
          {activeSportsList.map((sport) => (
            <View key={sport} style={styles.sportBadge}>
              <Text style={styles.sportBadgeText}>{sport}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.subHeading, { marginTop: 12 }]}>Preferred Roles & Positions</Text>
        <View style={styles.chipsWrap}>
          {activePositionsList.map((pos) => (
            <View key={pos} style={styles.positionBadge}>
              <Text style={styles.positionBadgeText}>{pos}</Text>
            </View>
          ))}
        </View>

        {profile?.playstyle ? (
          <View style={styles.playstyleBox}>
            <Activity size={14} color="#a855f7" />
            <Text style={styles.playstyleText}>Playstyle: {profile.playstyle}</Text>
          </View>
        ) : null}

        {profile?.availability ? (
          <View style={styles.availabilityBox}>
            <Calendar size={14} color="#10b981" />
            <Text style={styles.availabilityText}>Available: {profile.availability}</Text>
          </View>
        ) : null}
      </View>

      {/* Rewards Card */}
      <View style={styles.rewardsCard}>
        <View style={styles.rewardsHeader}>
          <View>
            <Text style={styles.rewardsTitle}>TurFit Rewards Wallet</Text>
            <Text style={styles.rewardsSub}>Tier: {rewardWallet?.tier || 'BRONZE'}</Text>
          </View>
          <View style={styles.pointsBadge}>
            <Sparkles size={14} color="#f59e0b" />
            <Text style={styles.pointsText}>{rewardWallet?.pointsBalance || 150} pts</Text>
          </View>
        </View>

        <Text style={styles.rewardsNote}>
          Earn 10 points for every ₹100 spent on turf bookings. Redeemable on next booking checkout.
        </Text>
      </View>

      {/* Quick Navigation: Payments & Dues */}
      <TouchableOpacity
        style={styles.duesNavCard}
        onPress={() => navigation?.navigate('PlayerPayments')}
      >
        <View style={styles.duesNavLeft}>
          <View style={styles.duesIconBox}>
            <CreditCard size={18} color="#10b981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.duesNavTitle}>My Payments & Outstanding Dues</Text>
            <Text style={styles.duesNavSub}>View booking breakdown, dues ledger & payment receipts</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Profile Details List */}
      <View style={styles.detailsCard}>
        <Text style={styles.detailsTitle}>Account Contact</Text>

        <View style={styles.detailRow}>
          <Mail size={16} color="#94a3b8" />
          <View style={styles.detailTextWrapper}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Phone size={16} color="#94a3b8" />
          <View style={styles.detailTextWrapper}>
            <View style={styles.phoneLabelRow}>
              <Text style={styles.detailLabel}>Phone Number</Text>
              {profile?.isPhoneVerified ? (
                <View style={styles.verifiedBadgeRow}>
                  <ShieldCheck size={11} color="#10b981" />
                  <Text style={styles.verifiedBadgeText}>VERIFIED</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.verifyNowBtn}
                  onPress={() => setShowPhoneModal(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.verifyNowBtnText}>Verify Phone</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.detailValue}>{profile?.phoneNumber || 'Not provided'}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <MapPin size={16} color="#94a3b8" />
          <View style={styles.detailTextWrapper}>
            <Text style={styles.detailLabel}>City</Text>
            <Text style={styles.detailValue}>{profile?.city || 'Mumbai'}</Text>
          </View>
        </View>
      </View>

      {/* Switch to Turf Owner Mode (Only visible if the user is an owner) */}
      {!checkingOwner && isOwnerUser && (
        <TouchableOpacity
          style={styles.switchModeButton}
          onPress={handleSwitchToOwner}
          disabled={switching}
        >
          {switching ? (
            <ActivityIndicator color="#10b981" size="small" />
          ) : (
            <>
              <ArrowRightLeft size={18} color="#34d399" />
              <View style={styles.switchTextContainer}>
                <Text style={styles.switchModeTitle}>Switch to Turf Owner / Partner Mode</Text>
                <Text style={styles.switchModeSubtitle}>Manage arenas, slots, incoming bookings & analytics</Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <LogOut size={18} color="#ef4444" />
        <Text style={styles.logoutText}>Sign Out of TurFit</Text>
      </TouchableOpacity>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Athlete Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your Name"
                placeholderTextColor="#64748b"
              />

              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="+91 98765 43210"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="e.g. Mumbai, Bangalore, Delhi"
                placeholderTextColor="#64748b"
              />

              {/* Multi-Sport Selector */}
              <Text style={styles.label}>Multi-Sport Selection</Text>
              <Text style={styles.helperText}>Select all the sports you actively play:</Text>
              <View style={styles.chipsWrap}>
                {AVAILABLE_SPORTS.map((sport) => {
                  const active = selectedSports.includes(sport);
                  return (
                    <TouchableOpacity
                      key={sport}
                      style={[styles.chipSelect, active && styles.chipSelectActive]}
                      onPress={() => toggleSport(sport)}
                    >
                      {active && <Check size={12} color="#064e3b" style={{ marginRight: 4 }} />}
                      <Text style={[styles.chipSelectText, active && styles.chipSelectTextActive]}>
                        {sport}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Roles & Positions based on sports */}
              <Text style={[styles.label, { marginTop: 14 }]}>Positions & Pitch Roles</Text>
              <Text style={styles.helperText}>Select the roles you play across your chosen sports:</Text>
              <View style={styles.chipsWrap}>
                {selectedSports.flatMap((sport) => SPORT_POSITIONS[sport] || []).map((pos, idx) => {
                  const active = selectedPositions.includes(pos);
                  return (
                    <TouchableOpacity
                      key={`${pos}-${idx}`}
                      style={[styles.chipSelect, active && styles.positionChipActive]}
                      onPress={() => togglePosition(pos)}
                    >
                      {active && <Check size={12} color="#0369a1" style={{ marginRight: 4 }} />}
                      <Text style={[styles.chipSelectText, active && styles.positionChipTextActive]}>
                        {pos}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom Role Input */}
              <View style={styles.customPosRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Add custom position (e.g. Box-to-box CM)"
                  placeholderTextColor="#64748b"
                  value={customPosition}
                  onChangeText={setCustomPosition}
                />
                <TouchableOpacity style={styles.addPosBtn} onPress={handleAddCustomPosition}>
                  <Plus size={16} color="#064e3b" />
                  <Text style={styles.addPosBtnText}>Add</Text>
                </TouchableOpacity>
              </View>

              {/* Athlete Bio */}
              <Text style={[styles.label, { marginTop: 14 }]}>Athlete Bio & Playstyle</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                multiline
                numberOfLines={3}
                placeholder="Describe your playstyle, fitness level, preferred tactics or experience..."
                placeholderTextColor="#64748b"
                value={bio}
                onChangeText={setBio}
              />

              <Text style={styles.label}>Playstyle Tag</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. High Pressing, Fast Break Counter-Attack"
                placeholderTextColor="#64748b"
                value={playstyle}
                onChangeText={setPlaystyle}
              />

              <Text style={styles.label}>Match Availability</Text>
              <View style={styles.chipsWrap}>
                {AVAILABILITY_OPTIONS.map((opt) => {
                  const active = availability === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.chipSelect, active && styles.chipSelectActive]}
                      onPress={() => setAvailability(opt)}
                    >
                      <Text style={[styles.chipSelectText, active && styles.chipSelectTextActive]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.disabledBtn]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#064e3b" />
              ) : (
                <Text style={styles.saveBtnText}>Save Athlete Profile</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Mobile Number Verification Modal */}
      <PhoneVerificationModal
        visible={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        title="Verify Mobile Number"
        subtitle="Keep your player profile verified for instant WhatsApp booking passes and priority court access."
        actionLabel="Verify Mobile"
        onSuccess={(verifiedPhone) => {
          setShowPhoneModal(false);
          setPhoneNumber(verifiedPhone.replace('+91', ''));
          Alert.alert('Phone Verified! 🎉', `${verifiedPhone} is now verified on your player profile.`);
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  avatarBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#064e3b',
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  roleBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  bioText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 14,
    paddingHorizontal: 12,
    lineHeight: 18,
  },
  bioPlaceholder: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 14,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  editBtnText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  subHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  sportBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  sportBadgeText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  positionBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  positionBadgeText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  playstyleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
  },
  playstyleText: {
    color: '#c084fc',
    fontSize: 11,
    fontWeight: '700',
  },
  availabilityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 6,
  },
  availabilityText: {
    color: '#6ee7b7',
    fontSize: 11,
    fontWeight: '600',
  },
  rewardsCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f59e0b',
    marginBottom: 16,
  },
  rewardsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rewardsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  rewardsSub: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '700',
    marginTop: 2,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pointsText: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '800',
  },
  rewardsNote: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
  },
  duesNavCard: {
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  duesNavLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  duesIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  duesNavTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  duesNavSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  detailsCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 20,
  },
  detailsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  detailTextWrapper: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#cbd5e1',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  switchModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 14,
  },
  switchTextContainer: {
    flex: 1,
  },
  switchModeTitle: {
    color: '#6ee7b7',
    fontSize: 14,
    fontWeight: '700',
  },
  switchModeSubtitle: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#131b2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 4,
    marginTop: 8,
  },
  helperText: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0b1120',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  bioInput: {
    height: 70,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  chipSelect: {
    backgroundColor: '#0b1120',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipSelectActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  chipSelectText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  chipSelectTextActive: {
    color: '#064e3b',
    fontWeight: '800',
  },
  positionChipActive: {
    backgroundColor: '#38bdf8',
    borderColor: '#38bdf8',
  },
  positionChipTextActive: {
    color: '#082f49',
    fontWeight: '800',
  },
  customPosRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    alignItems: 'center',
  },
  addPosBtn: {
    backgroundColor: '#10b981',
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
  },
  addPosBtnText: {
    color: '#064e3b',
    fontSize: 12,
    fontWeight: '800',
  },
  saveBtn: {
    backgroundColor: '#10b981',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 10,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#064e3b',
    fontSize: 14,
    fontWeight: '800',
  },
  themeSectionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  themeSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 2,
  },
  themeSectionSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 14,
  },
  themeOptionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#131d31',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  themeOptionBtnActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  themeOptionTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  phoneLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verifiedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: 0.5,
  },
  verifyNowBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  verifyNowBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38bdf8',
  },
});

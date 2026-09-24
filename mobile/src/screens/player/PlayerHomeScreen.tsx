import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { getTurfs, getPlayerBookings, isBookingConcluded, getLocalDateString, parseTimeToMinutes } from '../../services/dbService';
import { getLobbies, getUserRewardWallet, isLobbyConcluded, getAllActiveOffers } from '../../services/communityService';
import { Turf, Booking, Lobby, UserRewardWallet, Offer } from '../../types';
import { TurfCard } from '../../components/TurfCard';
import { LobbyCard } from '../../components/LobbyCard';
import { PromotionalBannerCarousel } from '../../components/PromotionalBannerCarousel';
import { GoogleAdMobBanner } from '../../components/GoogleAdMobBanner';
import {
  MapPin,
  Calendar,
  Award,
  Zap,
  ChevronRight,
  Shield,
  Clock,
  Sparkles,
  ChevronDown,
  X,
  Building2,
  Check,
  Gamepad2,
} from 'lucide-react-native';

const SPORT_ICONS: Record<string, string> = {
  Football: '⚽',
  Cricket: '🏏',
  'Box Cricket': '🏏',
  Badminton: '🏸',
  Tennis: '🎾',
  Basketball: '🏀',
  Pickleball: '🏓',
  'Table Tennis': '🏓',
  Volleyball: '🏐',
  Squash: '🎾',
  Snooker: '🎱',
  Pool: '🎱',
  Carrom: '🎯',
  Foosball: '⚽',
  'Air Hockey': '🕹️',
  'Console PS5': '🎮',
  'Board Games': '♟️',
  Futsal: '⚽',
  Padel: '🎾',
  Golf: '⛳',
};

interface PlayerHomeScreenProps {
  navigation: any;
}

export const PlayerHomeScreen: React.FC<PlayerHomeScreenProps> = ({ navigation }) => {
  const { profile } = useAuth();
  const { city, setCity, formatDistance } = useLocation();
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [upcomingBooking, setUpcomingBooking] = useState<Booking | null>(null);
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [rewardWallet, setRewardWallet] = useState<UserRewardWallet | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [selectedSport, setSelectedSport] = useState<string>('ALL');

  // Derive registered sports dynamically from the loaded turfs
  const registeredSports = useMemo(() => {
    const sportSet = new Set<string>();
    turfs.forEach((t) => {
      if (Array.isArray(t.sports)) {
        t.sports.forEach((s) => {
          if (s && typeof s === 'string' && s.trim()) {
            sportSet.add(s.trim());
          }
        });
      }
    });

    const popularOrder = [
      'Football',
      'Cricket',
      'Box Cricket',
      'Badminton',
      'Tennis',
      'Pickleball',
      'Basketball',
      'Table Tennis',
      'Volleyball',
      'Snooker',
    ];

    const sorted = Array.from(sportSet).sort((a, b) => {
      const idxA = popularOrder.indexOf(a);
      const idxB = popularOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    if (sorted.length === 0) {
      return ['Football', 'Cricket', 'Badminton', 'Tennis', 'Pickleball', 'Basketball'];
    }
    return sorted;
  }, [turfs]);

  // Filter turfs based on the selected sport chip
  const displayedTurfs = useMemo(() => {
    if (selectedSport === 'ALL') {
      return turfs;
    }
    return turfs.filter((turf) => {
      if (!turf.sports || !Array.isArray(turf.sports)) return false;
      return turf.sports.some(
        (s) => s.toLowerCase() === selectedSport.toLowerCase()
      );
    });
  }, [turfs, selectedSport]);

  const loadData = async () => {
    try {
      const [allTurfs, allLobbies, allOffers] = await Promise.all([
        getTurfs(),
        getLobbies(),
        getAllActiveOffers().catch(() => []),
      ]);
      setTurfs(allTurfs);
      setOffers(allOffers || []);
      // Only show active (non-concluded) community lobbies on the home screen
      const activeLobbies = allLobbies.filter((l) => !isLobbyConcluded(l) && l.status !== 'CLOSED');
      setLobbies(activeLobbies.slice(0, 3));

      if (profile?.uid) {
        const [bookings, wallet] = await Promise.all([
          getPlayerBookings(profile.uid),
          getUserRewardWallet(profile.uid),
        ]);
        // Only show truly upcoming confirmed bookings (never concluded matches)
        const upcoming = bookings.find(
          (b) => b.bookingStatus === 'CONFIRMED' && !isBookingConcluded(b)
        );
        setUpcomingBooking(upcoming || null);
        setRewardWallet(wallet);
      }
    } catch (err) {
      console.warn('Error loading player home data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile?.uid]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Extract cities from turfs
  const availableCities = Array.from(
    new Set([
      'Mumbai',
      'Delhi',
      'Bengaluru',
      'Pune',
      'Hyderabad',
      'Chennai',
      ...turfs.map((t) => t.city).filter(Boolean),
    ])
  );

  const filteredCities = availableCities.filter((c) =>
    c.toLowerCase().includes(citySearch.toLowerCase())
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <TouchableOpacity
            style={styles.locationTag}
            onPress={() => setShowCityPicker(true)}
            activeOpacity={0.8}
          >
            <MapPin size={13} color="#10b981" />
            <Text style={styles.locationCity}>{city || 'Mumbai'}</Text>
            <ChevronDown size={12} color="#10b981" />
          </TouchableOpacity>
          <Text style={styles.greeting}>Hey, {profile?.displayName?.split(' ')[0] || 'Athlete'}</Text>
          <Text style={styles.subGreeting}>Ready for your next game?</Text>
        </View>

        <TouchableOpacity
          style={styles.rewardsPill}
          onPress={() => navigation.navigate('PlayerProfile')}
        >
          <Sparkles size={14} color="#f59e0b" />
          <Text style={styles.rewardsPillText}>{rewardWallet?.pointsBalance || 150} pts</Text>
        </TouchableOpacity>
      </View>

      {/* City Switcher Modal */}
      <Modal visible={showCityPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.cityModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Building2 size={20} color="#10b981" />
                <Text style={styles.modalTitle}>Change Active City</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.citySearchInput}
              placeholder="Search your city..."
              placeholderTextColor="#64748b"
              value={citySearch}
              onChangeText={setCitySearch}
            />

            <ScrollView style={{ maxHeight: 280 }}>
              {filteredCities.map((c) => {
                const isSelected = city.toLowerCase() === c.toLowerCase();
                const turfCount = turfs.filter(
                  (t) => t.city && t.city.toLowerCase() === c.toLowerCase()
                ).length;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.cityRowItem, isSelected && styles.cityRowItemActive]}
                    onPress={() => {
                      setCity(c);
                      setShowCityPicker(false);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <MapPin size={16} color={isSelected ? '#10b981' : '#94a3b8'} />
                      <Text style={[styles.cityNameText, isSelected && styles.cityNameTextActive]}>
                        {c}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.cityCountText}>{turfCount} turfs</Text>
                      {isSelected && <Check size={16} color="#10b981" strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Upcoming / Active Booking Banner */}
      {upcomingBooking && !isBookingConcluded(upcomingBooking) && (() => {
        const todayStr = getLocalDateString();
        const now = new Date();
        const curMinutes = now.getHours() * 60 + now.getMinutes();
        const startMin = parseTimeToMinutes(upcomingBooking.startTime || '00:00');
        const endMin = parseTimeToMinutes(upcomingBooking.endTime || '23:59');
        const isLive =
          upcomingBooking.date === todayStr &&
          curMinutes >= startMin &&
          curMinutes < endMin;

        return (
          <View
            style={[
              styles.upcomingCard,
              isLive && { borderColor: '#10b981', borderWidth: 1.5, backgroundColor: '#0c1a1f' },
            ]}
          >
            <View style={styles.upcomingHeader}>
              <View
                style={[
                  styles.upcomingBadge,
                  isLive && { backgroundColor: '#064e3b', borderColor: '#10b981', borderWidth: 1 },
                ]}
              >
                <Clock
                  size={12}
                  color={isLive ? '#34d399' : '#10b981'}
                />
                <Text
                  style={[
                    styles.upcomingBadgeText,
                    isLive && { color: '#34d399' },
                  ]}
                >
                  {isLive ? '● LIVE MATCH NOW' : 'UPCOMING MATCH'}
                </Text>
              </View>
              <Text style={styles.upcomingDate}>{upcomingBooking.date}</Text>
            </View>

            <Text style={styles.upcomingTurfName}>{upcomingBooking.turfName}</Text>
            <Text style={styles.upcomingDetails}>
              {upcomingBooking.arenaName} • {upcomingBooking.startTime} - {upcomingBooking.endTime}
            </Text>

            <TouchableOpacity
              style={styles.upcomingAction}
              onPress={() => navigation.navigate('PlayerBookings')}
            >
              <Text style={styles.upcomingActionText}>View Booking Pass</Text>
              <ChevronRight size={14} color="#064e3b" />
            </TouchableOpacity>
          </View>
        );
      })()}

      {/* Admin Promotional Banner Carousel */}
      <PromotionalBannerCarousel audience="PLAYERS" navigation={navigation} />

      {/* Primary Hero: 🟢 Book Outdoor Turf */}
      <TouchableOpacity
        style={styles.outdoorHeroCard}
        onPress={() => navigation.navigate('ExploreTurfs')}
        activeOpacity={0.85}
      >
        <View style={styles.outdoorHeroLeft}>
          <View style={styles.outdoorHeroBadge}>
            <Text style={{ fontSize: 10 }}>🟢</Text>
            <Text style={styles.outdoorHeroBadgeText}>BOOK OUTDOOR TURF</Text>
          </View>
          <Text style={styles.outdoorHeroTitle}>Outdoor Turf & Pitches</Text>
          <Text style={styles.outdoorHeroSubtitle}>
            Football, Box Cricket, Badminton, Tennis & Pickleball
          </Text>
        </View>
        <View style={styles.outdoorHeroBtn}>
          <Text style={styles.outdoorHeroBtnText}>Explore Arenas</Text>
          <ChevronRight size={14} color="#ffffff" />
        </View>
      </TouchableOpacity>

      {/* Dual 50/50 Cards: Match Lobby & Gaming Zone */}
      <View style={styles.dualCardRow}>
        <TouchableOpacity
          style={styles.dualCard}
          onPress={() => navigation.navigate('Lobbies')}
          activeOpacity={0.85}
        >
          <View style={[styles.dualCardIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
            <Shield size={18} color="#38bdf8" />
          </View>
          <Text style={styles.dualCardTitle}>Match Lobby</Text>
          <Text style={styles.dualCardSubtitle}>Find teammates & rivals</Text>
          <View style={styles.dualCardAction}>
            <Text style={[styles.dualCardActionText, { color: '#38bdf8' }]}>
              Explore Matches →
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dualCard, styles.dualCardGaming]}
          onPress={() => navigation.navigate('GamingZone')}
          activeOpacity={0.85}
        >
          <View style={[styles.dualCardIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
            <Gamepad2 size={18} color="#f59e0b" />
          </View>
          <Text style={styles.dualCardTitle}>Gaming Zone</Text>
          <Text style={styles.dualCardSubtitle}>Pool, Snooker, TT, Carrom</Text>
          <View style={styles.dualCardAction}>
            <Text style={[styles.dualCardActionText, { color: '#f59e0b' }]}>
              Book a Table / Board →
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Horizontal Scrollable Row of Sport Category Chips */}
      <View style={styles.sportFilterSection}>
        <View style={styles.sportFilterHeader}>
          <Text style={styles.sportFilterTitle}>Explore by Sport</Text>
          {selectedSport !== 'ALL' && (
            <TouchableOpacity
              style={styles.resetFilterButton}
              onPress={() => setSelectedSport('ALL')}
            >
              <Text style={styles.resetFilterText}>Clear filter ✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sportScrollContent}
        >
          {/* 'All Sports' chip */}
          <TouchableOpacity
            style={[
              styles.sportChip,
              selectedSport === 'ALL' && styles.sportChipActive,
            ]}
            onPress={() => setSelectedSport('ALL')}
            activeOpacity={0.7}
          >
            <Text style={styles.sportChipIcon}>⚡</Text>
            <Text
              style={[
                styles.sportChipText,
                selectedSport === 'ALL' && styles.sportChipTextActive,
              ]}
            >
              All Sports
            </Text>
            <View
              style={[
                styles.sportChipBadge,
                selectedSport === 'ALL' && styles.sportChipBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.sportChipBadgeText,
                  selectedSport === 'ALL' && styles.sportChipBadgeTextActive,
                ]}
              >
                {turfs.length}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Dynamic Registered Sport Chips */}
          {registeredSports.map((sport) => {
            const isSelected = selectedSport.toLowerCase() === sport.toLowerCase();
            const count = turfs.filter(
              (t) =>
                t.sports &&
                t.sports.some((s) => s.toLowerCase() === sport.toLowerCase())
            ).length;
            const icon = SPORT_ICONS[sport] || '🏅';

            return (
              <TouchableOpacity
                key={sport}
                style={[
                  styles.sportChip,
                  isSelected && styles.sportChipActive,
                ]}
                onPress={() => {
                  if (isSelected) {
                    setSelectedSport('ALL');
                  } else {
                    setSelectedSport(sport);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.sportChipIcon}>{icon}</Text>
                <Text
                  style={[
                    styles.sportChipText,
                    isSelected && styles.sportChipTextActive,
                  ]}
                >
                  {sport}
                </Text>
                <View
                  style={[
                    styles.sportChipBadge,
                    isSelected && styles.sportChipBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.sportChipBadgeText,
                      isSelected && styles.sportChipBadgeTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Active Lobbies Slider */}
      {lobbies.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Community Lobbies</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Lobbies')}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>
          {lobbies.map((lobby) => (
            <LobbyCard
              key={lobby.id}
              lobby={lobby}
              onJoinToggle={() => navigation.navigate('Lobbies')}
            />
          ))}
        </View>
      )}

      {/* Google AdMob Sponsored Feed Unit */}
      <View style={{ paddingHorizontal: 16 }}>
        <GoogleAdMobBanner
          format="MEDIUM_RECTANGLE"
          placement="PlayerHomeScreenFeed"
          adUnitId="ca-app-pub-3940256099942544/6300978111"
        />
      </View>

      {/* Featured / Nearby Turfs */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              {selectedSport === 'ALL' ? 'Nearby & Popular Turfs' : `${selectedSport} Venues & Pitches`}
            </Text>
            {selectedSport !== 'ALL' && (
              <Text style={styles.sectionSubtitleText}>
                Showing {displayedTurfs.length} {displayedTurfs.length === 1 ? 'venue' : 'venues'} hosting {selectedSport}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('ExploreTurfs', {
                sport: selectedSport === 'ALL' ? undefined : selectedSport,
              })
            }
          >
            <Text style={styles.seeAllText}>See all ({displayedTurfs.length})</Text>
          </TouchableOpacity>
        </View>

        {displayedTurfs.length === 0 ? (
          <View style={styles.emptySportContainer}>
            <Text style={styles.emptySportIcon}>{SPORT_ICONS[selectedSport] || '🏟️'}</Text>
            <Text style={styles.emptySportTitle}>No {selectedSport} Venues Found</Text>
            <Text style={styles.emptySportDesc}>
              No registered venues currently host {selectedSport} in {city || 'this area'}.
            </Text>
            <TouchableOpacity
              style={styles.emptyResetBtn}
              onPress={() => setSelectedSport('ALL')}
            >
              <Text style={styles.emptyResetBtnText}>Show All Sports</Text>
            </TouchableOpacity>
          </View>
        ) : (
          displayedTurfs.map((turf) => {
            const turfOffers = offers.filter((o) => o.turfId === turf.id || o.turfId === 'ALL');
            return (
              <TurfCard
                key={turf.id}
                turf={turf}
                offers={turfOffers}
                distance={formatDistance(turf.latitude, turf.longitude)}
                onPress={() => navigation.navigate('TurfDetails', { turfId: turf.id })}
              />
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  locationCity: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  greeting: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
  },
  subGreeting: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  rewardsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#131b2e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  rewardsPillText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '800',
  },
  upcomingCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#10b981',
    marginBottom: 20,
  },
  upcomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  upcomingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  upcomingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
  },
  upcomingDate: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  upcomingTurfName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  upcomingDetails: {
    fontSize: 12,
    color: '#cbd5e1',
    marginBottom: 12,
  },
  upcomingAction: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10b981',
    paddingVertical: 8,
    borderRadius: 10,
  },
  upcomingActionText: {
    color: '#064e3b',
    fontSize: 12,
    fontWeight: '700',
  },
  outdoorHeroCard: {
    backgroundColor: '#0a161f',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  outdoorHeroLeft: {
    flex: 1,
    paddingRight: 12,
  },
  outdoorHeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  outdoorHeroBadgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  outdoorHeroTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 2,
  },
  outdoorHeroSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 15,
  },
  outdoorHeroBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  outdoorHeroBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  dualCardRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  dualCard: {
    flex: 1,
    backgroundColor: '#0d1527',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    justifyContent: 'space-between',
  },
  dualCardGaming: {
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  dualCardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  dualCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  dualCardSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 10,
  },
  dualCardAction: {
    marginTop: 4,
  },
  dualCardActionText: {
    fontSize: 11,
    fontWeight: '800',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  cityModalCard: {
    backgroundColor: '#131b2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '75%',
    borderTopWidth: 1,
    borderColor: '#10b981',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
  },
  citySearchInput: {
    backgroundColor: '#0a0f1d',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    height: 42,
    color: '#f8fafc',
    fontSize: 13,
    marginBottom: 12,
  },
  cityRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  cityRowItemActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderBottomColor: '#10b981',
  },
  cityNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  cityNameTextActive: {
    color: '#10b981',
    fontWeight: '800',
  },
  cityCountText: {
    fontSize: 11,
    color: '#64748b',
  },
  sportFilterSection: {
    marginBottom: 20,
  },
  sportFilterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sportFilterTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  resetFilterButton: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  resetFilterText: {
    fontSize: 11,
    color: '#f87171',
    fontWeight: '700',
  },
  sportScrollContent: {
    gap: 8,
    paddingVertical: 2,
    paddingRight: 12,
  },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 6,
  },
  sportChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  sportChipIcon: {
    fontSize: 14,
  },
  sportChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
  },
  sportChipTextActive: {
    color: '#10b981',
    fontWeight: '800',
  },
  sportChipBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 2,
  },
  sportChipBadgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
  },
  sportChipBadgeText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '800',
  },
  sportChipBadgeTextActive: {
    color: '#34d399',
  },
  sectionSubtitleText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 2,
  },
  emptySportContainer: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  emptySportIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptySportTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  emptySportDesc: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 18,
    maxWidth: 240,
  },
  emptyResetBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  emptyResetBtnText: {
    color: '#064e3b',
    fontSize: 12,
    fontWeight: '800',
  },
});

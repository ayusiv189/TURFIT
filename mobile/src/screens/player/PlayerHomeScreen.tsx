import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { getTurfs, getPlayerBookings } from '../../services/dbService';
import { getLobbies, getUserRewardWallet } from '../../services/communityService';
import { Turf, Booking, Lobby, UserRewardWallet } from '../../types';
import { TurfCard } from '../../components/TurfCard';
import { LobbyCard } from '../../components/LobbyCard';
import {
  MapPin,
  Calendar,
  Award,
  Zap,
  ChevronRight,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react-native';

interface PlayerHomeScreenProps {
  navigation: any;
}

export const PlayerHomeScreen: React.FC<PlayerHomeScreenProps> = ({ navigation }) => {
  const { profile } = useAuth();
  const { city, formatDistance } = useLocation();
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [upcomingBooking, setUpcomingBooking] = useState<Booking | null>(null);
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [rewardWallet, setRewardWallet] = useState<UserRewardWallet | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [allTurfs, allLobbies] = await Promise.all([getTurfs(), getLobbies()]);
      setTurfs(allTurfs);
      setLobbies(allLobbies.slice(0, 3));

      if (profile?.uid) {
        const [bookings, wallet] = await Promise.all([
          getPlayerBookings(profile.uid),
          getUserRewardWallet(profile.uid),
        ]);
        const todayStr = new Date().toISOString().split('T')[0];
        const upcoming = bookings.find(
          (b) => b.bookingStatus === 'CONFIRMED' && b.date >= todayStr
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
          <View style={styles.locationTag}>
            <MapPin size={12} color="#10b981" />
            <Text style={styles.locationCity}>{city || 'Mumbai'}</Text>
          </View>
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

      {/* Upcoming Booking Banner */}
      {upcomingBooking && (
        <View style={styles.upcomingCard}>
          <View style={styles.upcomingHeader}>
            <View style={styles.upcomingBadge}>
              <Clock size={12} color="#10b981" />
              <Text style={styles.upcomingBadgeText}>UPCOMING MATCH</Text>
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
      )}

      {/* Quick Action Grid */}
      <View style={styles.quickGrid}>
        <TouchableOpacity
          style={styles.quickCard}
          onPress={() => navigation.navigate('ExploreTurfs')}
        >
          <View style={[styles.quickIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <Zap size={20} color="#10b981" />
          </View>
          <Text style={styles.quickTitle}>Book Turf</Text>
          <Text style={styles.quickDesc}>Explore Arenas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickCard}
          onPress={() => navigation.navigate('Lobbies')}
        >
          <View style={[styles.quickIcon, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
            <Shield size={20} color="#38bdf8" />
          </View>
          <Text style={styles.quickTitle}>Join Lobby</Text>
          <Text style={styles.quickDesc}>Find Teammates</Text>
        </TouchableOpacity>
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

      {/* Featured / Nearby Turfs */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby & Popular Turfs</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ExploreTurfs')}>
            <Text style={styles.seeAllText}>See all ({turfs.length})</Text>
          </TouchableOpacity>
        </View>

        {turfs.map((turf) => (
          <TurfCard
            key={turf.id}
            turf={turf}
            distance={formatDistance(turf.latitude, turf.longitude)}
            onPress={() => navigation.navigate('TurfDetails', { turfId: turf.id })}
          />
        ))}
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
  quickGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  quickDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
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
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getPlayerBookings } from '../../services/dbService';
import { getUserRewardWallet } from '../../services/communityService';
import { Booking, UserRewardWallet } from '../../types';
import {
  Trophy,
  Flame,
  Clock,
  Zap,
  Award,
  Star,
  CheckCircle,
} from 'lucide-react-native';

export const PlayerStatsScreen: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rewardWallet, setRewardWallet] = useState<UserRewardWallet | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    if (!user) return;
    try {
      const [bData, wData] = await Promise.all([
        getPlayerBookings(user.uid),
        getUserRewardWallet(user.uid),
      ]);
      setBookings(bData);
      setRewardWallet(wData);
    } catch (err) {
      console.warn('Error loading stats:', err);
    }
  };

  useEffect(() => {
    loadStats();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const totalMatches = bookings.length;
  const totalHours = bookings.reduce((acc, b) => acc + (b.duration ? b.duration / 60 : 1), 0);
  const totalSpent = bookings.reduce((acc, b) => acc + (b.totalAmount || 0), 0);

  // Sports breakdown
  const sportCounts: Record<string, number> = {};
  bookings.forEach((b) => {
    sportCounts[b.sport] = (sportCounts[b.sport] || 0) + 1;
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
    >
      {/* Top Banner */}
      <View style={styles.topCard}>
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.topTitle}>Athlete Performance</Text>
            <Text style={styles.topSub}>Your TruFit career analytics</Text>
          </View>
          <View style={styles.levelBadge}>
            <Award size={14} color="#f59e0b" />
            <Text style={styles.levelText}>{rewardWallet?.tier || 'BRONZE'}</Text>
          </View>
        </View>

        <View style={styles.heroGrid}>
          <View style={styles.heroMetric}>
            <Flame size={20} color="#f59e0b" />
            <Text style={styles.heroNum}>{totalMatches}</Text>
            <Text style={styles.heroLabel}>Games Played</Text>
          </View>

          <View style={styles.heroMetric}>
            <Clock size={20} color="#10b981" />
            <Text style={styles.heroNum}>{Math.round(totalHours)}h</Text>
            <Text style={styles.heroLabel}>Pitch Time</Text>
          </View>

          <View style={styles.heroMetric}>
            <Zap size={20} color="#38bdf8" />
            <Text style={styles.heroNum}>{rewardWallet?.pointsBalance || 150}</Text>
            <Text style={styles.heroLabel}>Reward Points</Text>
          </View>
        </View>
      </View>

      {/* Badges / Milestones */}
      <Text style={styles.sectionTitle}>Earned Milestones & Badges</Text>
      <View style={styles.badgesRow}>
        <View style={styles.badgeCard}>
          <View style={[styles.badgeIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <Trophy size={20} color="#10b981" />
          </View>
          <Text style={styles.badgeName}>Early Bird</Text>
          <Text style={styles.badgeDesc}>First turf match booked</Text>
        </View>

        <View style={styles.badgeCard}>
          <View style={[styles.badgeIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
            <Star size={20} color="#f59e0b" />
          </View>
          <Text style={styles.badgeName}>Squad Leader</Text>
          <Text style={styles.badgeDesc}>Joined 3+ games</Text>
        </View>

        <View style={styles.badgeCard}>
          <View style={[styles.badgeIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
            <CheckCircle size={20} color="#38bdf8" />
          </View>
          <Text style={styles.badgeName}>Verified Athlete</Text>
          <Text style={styles.badgeDesc}>Profile complete</Text>
        </View>
      </View>

      {/* Sports Activity Breakdown */}
      <Text style={styles.sectionTitle}>Sports Breakdown</Text>
      <View style={styles.sportsBreakdownCard}>
        {Object.entries(sportCounts).length === 0 ? (
          <Text style={styles.noSportsText}>Play matches to see your sport activity breakdown.</Text>
        ) : (
          Object.entries(sportCounts).map(([sp, count]) => {
            const pct = Math.round((count / (totalMatches || 1)) * 100);
            return (
              <View key={sp} style={styles.sportBarRow}>
                <View style={styles.sportBarHeader}>
                  <Text style={styles.sportBarTitle}>{sp}</Text>
                  <Text style={styles.sportBarCount}>{count} matches ({pct}%)</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
                </View>
              </View>
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
    padding: 16,
    paddingBottom: 30,
  },
  topCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 20,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  topSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fbbf24',
  },
  heroGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  heroMetric: {
    flex: 1,
    backgroundColor: '#0b1120',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  heroNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 6,
  },
  heroLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  badgeCard: {
    flex: 1,
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  badgeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  badgeDesc: {
    fontSize: 9,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 2,
  },
  sportsBreakdownCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  noSportsText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 10,
  },
  sportBarRow: {
    marginBottom: 12,
  },
  sportBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sportBarTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  sportBarCount: {
    fontSize: 11,
    color: '#94a3b8',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#0b1120',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
});

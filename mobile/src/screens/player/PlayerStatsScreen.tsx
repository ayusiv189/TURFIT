import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getPlayerBookings } from '../../services/dbService';
import { getUserRewardWallet, getPlayerSportsmanshipStats } from '../../services/communityService';
import { Booking, UserRewardWallet, PlayerSportsmanshipStats } from '../../types';
import {
  Trophy,
  Flame,
  Clock,
  Zap,
  Award,
  Star,
  CheckCircle,
  Shield,
  Sparkles,
  MessageSquare,
} from 'lucide-react-native';

const BADGE_ICONS: Record<string, { icon: string; color: string }> = {
  'Fair Play Champion': { icon: '🌟', color: '#38bdf8' },
  'Playmaker / MVP': { icon: '👑', color: '#f59e0b' },
  'Team Motivator': { icon: '🤝', color: '#10b981' },
  'Defensive Wall': { icon: '🛡️', color: '#818cf8' },
  'Clockwork Punctual': { icon: '⏱️', color: '#06b6d4' },
  'Clutch Performer': { icon: '🔥', color: '#ef4444' },
  'Tactical Genius': { icon: '🎯', color: '#a855f7' },
  'Sharpshooter': { icon: '⚡', color: '#ec4899' },
};

export const PlayerStatsScreen: React.FC = () => {
  const { user, profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rewardWallet, setRewardWallet] = useState<UserRewardWallet | null>(null);
  const [sportsmanshipStats, setSportsmanshipStats] = useState<PlayerSportsmanshipStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    if (!user) return;
    try {
      const [bData, wData, sData] = await Promise.all([
        getPlayerBookings(user.uid),
        getUserRewardWallet(user.uid),
        getPlayerSportsmanshipStats(user.uid, profile),
      ]);
      setBookings(bData);
      setRewardWallet(wData);
      setSportsmanshipStats(sData);
    } catch (err) {
      console.warn('Error loading stats:', err);
    }
  };

  useEffect(() => {
    loadStats();
  }, [user, profile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const totalMatches = bookings.length;
  const totalHours = bookings.reduce((acc: number, b: Booking) => acc + (b.duration ? b.duration / 60 : 1), 0);

  // Sports breakdown
  const sportCounts: Record<string, number> = {};
  bookings.forEach((b: Booking) => {
    sportCounts[b.sport] = (sportCounts[b.sport] || 0) + 1;
  });

  const rawBadges = (sportsmanshipStats?.badgeCounts || {}) as Record<string, number>;
  const badgesList: [string, number][] = Object.entries(rawBadges).filter(
    ([_, count]: [string, number]) => count > 0
  );

  const tierColors: Record<string, { bg: string; text: string; border: string }> = {
    ELITE: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: '#f59e0b' },
    PRO: { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: '#0284c7' },
    VETERAN: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: '#10b981' },
    RISING: { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: '#9333ea' },
  };

  const currentTier = sportsmanshipStats?.tier || 'RISING';
  const tierStyle = tierColors[currentTier] || tierColors.RISING;

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
            <Text style={styles.topTitle}>Athlete Performance & Stats</Text>
            <Text style={styles.topSub}>Your verified sportsmanship & match career</Text>
          </View>
          <View style={[styles.levelBadge, { backgroundColor: tierStyle.bg, borderColor: tierStyle.border }]}>
            <Award size={14} color={tierStyle.text} />
            <Text style={[styles.levelText, { color: tierStyle.text }]}>{currentTier}</Text>
          </View>
        </View>

        <View style={styles.heroGrid}>
          <View style={styles.heroMetric}>
            <Flame size={20} color="#f59e0b" />
            <Text style={styles.heroNum}>{totalMatches}</Text>
            <Text style={styles.heroLabel}>Matches</Text>
          </View>

          <View style={styles.heroMetric}>
            <Clock size={20} color="#10b981" />
            <Text style={styles.heroNum}>{Math.round(totalHours)}h</Text>
            <Text style={styles.heroLabel}>Pitch Time</Text>
          </View>

          <View style={styles.heroMetric}>
            <Zap size={20} color="#38bdf8" />
            <Text style={styles.heroNum}>{rewardWallet?.pointsBalance || 150}</Text>
            <Text style={styles.heroLabel}>Reward Pts</Text>
          </View>

          <View style={styles.heroMetric}>
            <Star size={20} color="#fbbf24" fill="#fbbf24" />
            <Text style={styles.heroNum}>
              {sportsmanshipStats ? sportsmanshipStats.averageRating.toFixed(1) : '5.0'}
            </Text>
            <Text style={styles.heroLabel}>Fair Play</Text>
          </View>
        </View>
      </View>

      {/* Sportsmanship & Fair Play Reputation Card */}
      <Text style={styles.sectionTitle}>Peer Sportsmanship Rating</Text>
      <View style={styles.reputationCard}>
        <View style={styles.reputationHeader}>
          <View style={styles.reputationScoreLeft}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={20}
                  color="#f59e0b"
                  fill={s <= Math.round(sportsmanshipStats?.averageRating || 5) ? '#f59e0b' : 'transparent'}
                />
              ))}
            </View>
            <Text style={styles.reputationBigScore}>
              {sportsmanshipStats ? sportsmanshipStats.averageRating.toFixed(1) : '5.0'}
              <Text style={styles.reputationMax}> / 5.0</Text>
            </Text>
          </View>
          <View style={styles.reputationMetaRight}>
            <Text style={styles.reputationReviewsCount}>
              {sportsmanshipStats?.totalRatings || 0} Peer Reviews
            </Text>
            <Text style={styles.reputationVerifiedSub}>Verified Post-Match</Text>
          </View>
        </View>

        {/* Detailed Breakdown */}
        <View style={styles.breakdownRow}>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownNum}>
              {sportsmanshipStats ? sportsmanshipStats.sportsmanshipAvg.toFixed(1) : '5.0'}★
            </Text>
            <Text style={styles.breakdownTitle}>Sportsmanship</Text>
          </View>
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownNum}>
              {sportsmanshipStats ? sportsmanshipStats.skillAvg.toFixed(1) : '4.8'}★
            </Text>
            <Text style={styles.breakdownTitle}>Skill & IQ</Text>
          </View>
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownNum}>
              {sportsmanshipStats ? sportsmanshipStats.punctualityAvg.toFixed(1) : '5.0'}★
            </Text>
            <Text style={styles.breakdownTitle}>Punctuality</Text>
          </View>
        </View>
      </View>

      {/* Badges / Milestones */}
      <View style={styles.badgesHeaderRow}>
        <Text style={styles.sectionTitle}>Earned Sportsmanship Badges</Text>
        <Sparkles size={16} color="#f59e0b" />
      </View>

      {badgesList.length > 0 ? (
        <View style={styles.badgesGrid}>
          {badgesList.map(([badgeName, count]) => {
            const meta = BADGE_ICONS[badgeName] || { icon: '🏅', color: '#38bdf8' };
            return (
              <View
                key={badgeName}
                style={[
                  styles.badgeCardModern,
                  { borderColor: meta.color, backgroundColor: `${meta.color}12` },
                ]}
              >
                <View style={styles.badgeModernTop}>
                  <Text style={styles.badgeEmoji}>{meta.icon}</Text>
                  {count > 1 && (
                    <View style={[styles.badgeMultiTag, { backgroundColor: meta.color }]}>
                      <Text style={styles.badgeMultiText}>×{count}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.badgeTitleModern}>{badgeName}</Text>
                <Text style={styles.badgeCountSub}>Awarded by peers</Text>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyBadgesCard}>
          <Sparkles size={24} color="#f59e0b" style={{ marginBottom: 6 }} />
          <Text style={styles.emptyBadgesTitle}>Unlock Peer Badges</Text>
          <Text style={styles.emptyBadgesDesc}>
            Join lobbies, display fair play, and rate squad mates after matches to earn sportsmanship badges!
          </Text>
        </View>
      )}

      {/* Recent Teammate Feedback */}
      {sportsmanshipStats?.recentFeedback && sportsmanshipStats.recentFeedback.length > 0 && (
        <>
          <View style={styles.badgesHeaderRow}>
            <Text style={styles.sectionTitle}>Teammate Feedback & Quotes</Text>
            <MessageSquare size={16} color="#38bdf8" />
          </View>
          <View style={styles.feedbackContainer}>
            {sportsmanshipStats.recentFeedback.map((fb: any) => (
              <View key={fb.id} style={styles.feedbackCard}>
                <View style={styles.feedbackTop}>
                  <Text style={styles.feedbackReviewer}>{fb.reviewerName}</Text>
                  <View style={styles.feedbackRatingBox}>
                    <Star size={12} color="#f59e0b" fill="#f59e0b" />
                    <Text style={styles.feedbackRatingText}>{fb.sportsmanshipRating}★</Text>
                  </View>
                </View>
                <Text style={styles.feedbackText}>"{fb.feedback}"</Text>
                {fb.badges && fb.badges.length > 0 && (
                  <View style={styles.feedbackBadgesList}>
                    {fb.badges.map((b: string, idx: number) => (
                      <Text key={idx} style={styles.feedbackBadgePill}>
                        {BADGE_ICONS[b]?.icon || '🏅'} {b}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        </>
      )}

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
                  <Text style={styles.sportBarCount}>
                    {count} matches ({pct}%)
                  </Text>
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
    paddingBottom: 40,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '800',
  },
  heroGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  heroMetric: {
    flex: 1,
    backgroundColor: '#0b1120',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 10,
    alignItems: 'center',
  },
  heroNum: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 6,
  },
  heroLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 10,
    marginTop: 8,
  },
  reputationCard: {
    backgroundColor: '#131b2e',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 20,
  },
  reputationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  reputationScoreLeft: {
    gap: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 3,
  },
  reputationBigScore: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fbbf24',
    marginTop: 2,
  },
  reputationMax: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
  reputationMetaRight: {
    alignItems: 'flex-end',
  },
  reputationReviewsCount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  reputationVerifiedSub: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '700',
    marginTop: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0b1120',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownNum: {
    fontSize: 14,
    fontWeight: '800',
    color: '#38bdf8',
  },
  breakdownTitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  breakdownDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#1e293b',
  },
  badgesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 8,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  badgeCardModern: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  badgeModernTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeEmoji: {
    fontSize: 22,
  },
  badgeMultiTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeMultiText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ffffff',
  },
  badgeTitleModern: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 2,
  },
  badgeCountSub: {
    fontSize: 10,
    color: '#94a3b8',
  },
  emptyBadgesCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyBadgesTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  emptyBadgesDesc: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
  },
  feedbackContainer: {
    gap: 10,
    marginBottom: 20,
  },
  feedbackCard: {
    backgroundColor: '#131b2e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
  },
  feedbackTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  feedbackReviewer: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  feedbackRatingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feedbackRatingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fbbf24',
  },
  feedbackText: {
    fontSize: 13,
    color: '#cbd5e1',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  feedbackBadgesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  feedbackBadgePill: {
    fontSize: 10,
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sportsBreakdownCard: {
    backgroundColor: '#131b2e',
    borderRadius: 18,
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
    fontSize: 13,
    fontWeight: '700',
    color: '#e2e8f0',
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

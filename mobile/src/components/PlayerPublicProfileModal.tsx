import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  MapPin,
  Award,
  Activity,
  Calendar,
  Sparkles,
  Shield,
  Clock,
  User,
  Star,
  CheckCircle,
  ThumbsUp,
  Heart,
  Trophy,
  Zap,
  Flame,
  MessageSquare,
} from 'lucide-react-native';
import { UserProfile, PlayerSportsmanshipStats, PlayerBadgeType } from '../types';
import { getPlayerSportsmanshipStats } from '../services/communityService';
import { RatePlayerModal } from './RatePlayerModal';
import { useAuth } from '../contexts/AuthContext';

interface PlayerPublicProfileModalProps {
  visible: boolean;
  profile?: UserProfile | null;
  athlete?: UserProfile | null;
  matchContext?: {
    matchId?: string;
    lobbyId?: string;
    turfName?: string;
    sport?: string;
  };
  onClose: () => void;
  onRatePlayer?: (player: UserProfile) => void;
}

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

export const PlayerPublicProfileModal: React.FC<PlayerPublicProfileModalProps> = ({
  visible,
  profile,
  athlete,
  matchContext,
  onClose,
  onRatePlayer,
}) => {
  const activeProfile = profile || athlete;
  const { user } = useAuth();
  const [sportsmanshipStats, setSportsmanshipStats] = useState<PlayerSportsmanshipStats | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);
  const [showRateModal, setShowRateModal] = useState<boolean>(false);

  useEffect(() => {
    if (activeProfile?.uid && visible) {
      setLoadingStats(true);
      getPlayerSportsmanshipStats(activeProfile.uid, activeProfile)
        .then((stats) => setSportsmanshipStats(stats))
        .catch((err) => console.warn('Error loading player sportsmanship stats:', err))
        .finally(() => setLoadingStats(false));
    }
  }, [activeProfile?.uid, visible]);

  if (!activeProfile) return null;

  const sports =
    activeProfile.preferredSports && activeProfile.preferredSports.length > 0
      ? activeProfile.preferredSports
      : [activeProfile.preferredSport || 'Football'];

  const positions =
    activeProfile.preferredPositions && activeProfile.preferredPositions.length > 0
      ? activeProfile.preferredPositions
      : activeProfile.preferredPosition
      ? [activeProfile.preferredPosition]
      : [];

  const isSelf = user?.uid === activeProfile.uid;

  const handleOpenRate = () => {
    if (onRatePlayer) {
      onRatePlayer(activeProfile);
    } else {
      setShowRateModal(true);
    }
  };

  const handleRatingSuccess = () => {
    if (activeProfile?.uid) {
      getPlayerSportsmanshipStats(activeProfile.uid, activeProfile).then((stats) => setSportsmanshipStats(stats));
    }
  };

  const badgesList = sportsmanshipStats?.badgeCounts
    ? Object.entries(sportsmanshipStats.badgeCounts).filter(([_, count]) => count > 0)
    : [];

  const tierColors: Record<string, { bg: string; text: string; border: string }> = {
    ELITE: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: '#f59e0b' },
    PRO: { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: '#0284c7' },
    VETERAN: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: '#10b981' },
    RISING: { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: '#9333ea' },
  };

  const currentTier = sportsmanshipStats?.tier || 'RISING';
  const tierStyle = tierColors[currentTier] || tierColors.RISING;

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Header Bar */}
            <View style={styles.modalHeader}>
              <View style={styles.headerTitleRow}>
                <Activity size={18} color="#38bdf8" />
                <Text style={styles.modalTitle}>Athlete Profile & Stats</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Athlete Avatar & Main Info */}
              <View style={styles.athleteHeader}>
                {activeProfile.photoURL ? (
                  <Image source={{ uri: activeProfile.photoURL }} style={styles.athleteAvatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {(activeProfile.displayName || 'A').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}

                <View style={styles.athleteMainInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.athleteName}>{activeProfile.displayName || 'Sports Athlete'}</Text>
                    <View style={[styles.tierTag, { backgroundColor: tierStyle.bg, borderColor: tierStyle.border }]}>
                      <Text style={[styles.tierTagText, { color: tierStyle.text }]}>{currentTier}</Text>
                    </View>
                  </View>

                  <View style={styles.cityRow}>
                    <MapPin size={13} color="#94a3b8" />
                    <Text style={styles.cityText}>{activeProfile.city || 'Mumbai'}</Text>
                    <View style={styles.dot} />
                    <Text style={styles.levelBadge}>{activeProfile.experienceLevel || 'Intermediate'}</Text>
                  </View>
                </View>
              </View>

              {/* Sportsmanship & Community Trust Card */}
              <View style={styles.reputationCard}>
                <View style={styles.reputationHeader}>
                  <View style={styles.ratingScoreBox}>
                    <Star size={24} color="#f59e0b" fill="#f59e0b" />
                    <Text style={styles.ratingScoreNum}>
                      {sportsmanshipStats ? sportsmanshipStats.averageRating.toFixed(1) : '5.0'}
                    </Text>
                    <Text style={styles.ratingScoreMax}>/ 5.0</Text>
                  </View>
                  <View style={styles.ratingReviewsMeta}>
                    <Text style={styles.reputationTitle}>Community Reputation</Text>
                    <Text style={styles.reviewsCountText}>
                      {sportsmanshipStats?.totalRatings || 0} Peer Post-Match Ratings
                    </Text>
                  </View>
                </View>

                {/* Sub-ratings Breakdown Bar */}
                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownVal}>
                      {sportsmanshipStats ? sportsmanshipStats.sportsmanshipAvg.toFixed(1) : '5.0'}★
                    </Text>
                    <Text style={styles.breakdownLabel}>Sportsmanship</Text>
                  </View>
                  <View style={styles.breakdownDivider} />
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownVal}>
                      {sportsmanshipStats ? sportsmanshipStats.skillAvg.toFixed(1) : '4.8'}★
                    </Text>
                    <Text style={styles.breakdownLabel}>Skill & Impact</Text>
                  </View>
                  <View style={styles.breakdownDivider} />
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownVal}>
                      {sportsmanshipStats ? sportsmanshipStats.punctualityAvg.toFixed(1) : '5.0'}★
                    </Text>
                    <Text style={styles.breakdownLabel}>Punctuality</Text>
                  </View>
                </View>
              </View>

              {/* Earned Sportsmanship Badges Showcase */}
              <View style={styles.sectionBox}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionLabel}>Earned Sportsmanship Badges</Text>
                  <Sparkles size={14} color="#f59e0b" />
                </View>
                {badgesList.length > 0 ? (
                  <View style={styles.badgesContainer}>
                    {badgesList.map(([badgeName, count]) => {
                      const meta = BADGE_ICONS[badgeName] || { icon: '🏅', color: '#38bdf8' };
                      return (
                        <View
                          key={badgeName}
                          style={[
                            styles.badgePill,
                            { borderColor: meta.color, backgroundColor: `${meta.color}15` },
                          ]}
                        >
                          <Text style={styles.badgePillIcon}>{meta.icon}</Text>
                          <Text style={styles.badgePillName}>{badgeName}</Text>
                          {count > 1 && (
                            <View style={[styles.badgeCountBadge, { backgroundColor: meta.color }]}>
                              <Text style={styles.badgeCountText}>×{count}</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.emptyBadgesText}>
                    This athlete will unlock verified sportsmanship badges after upcoming matches.
                  </Text>
                )}
              </View>

              {/* Recent Teammate Feedback / Testimonials */}
              {sportsmanshipStats?.recentFeedback && sportsmanshipStats.recentFeedback.length > 0 && (
                <View style={styles.sectionBox}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionLabel}>Teammate Endorsements</Text>
                    <MessageSquare size={14} color="#38bdf8" />
                  </View>
                  <View style={styles.feedbackList}>
                    {sportsmanshipStats.recentFeedback.map((fb) => (
                      <View key={fb.id} style={styles.feedbackCard}>
                        <View style={styles.feedbackHeader}>
                          <Text style={styles.reviewerName}>{fb.reviewerName}</Text>
                          <View style={styles.feedbackRating}>
                            <Star size={12} color="#f59e0b" fill="#f59e0b" />
                            <Text style={styles.feedbackRatingNum}>{fb.sportsmanshipRating}★</Text>
                          </View>
                        </View>
                        <Text style={styles.feedbackQuote}>"{fb.feedback}"</Text>
                        {fb.badges && fb.badges.length > 0 && (
                          <View style={styles.feedbackBadgesRow}>
                            {fb.badges.map((b, idx) => (
                              <Text key={idx} style={styles.feedbackBadgeTag}>
                                {BADGE_ICONS[b]?.icon || '🏅'} {b}
                              </Text>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Bio Section */}
              {activeProfile.bio ? (
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionLabel}>Athlete Bio & Playstyle</Text>
                  <Text style={styles.bioText}>{activeProfile.bio}</Text>
                </View>
              ) : null}

              {/* Sports Played */}
              <View style={styles.sectionBox}>
                <Text style={styles.sectionLabel}>Sports & Specialties</Text>
                <View style={styles.chipsContainer}>
                  {sports.map((sport) => (
                    <View key={sport} style={styles.sportChip}>
                      <Text style={styles.sportChipText}>{sport}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Positions & Roles */}
              {positions.length > 0 && (
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionLabel}>Preferred Positions & Roles</Text>
                  <View style={styles.chipsContainer}>
                    {positions.map((pos) => (
                      <View key={pos} style={styles.positionChip}>
                        <Text style={styles.positionChipText}>{pos}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Availability */}
              {(activeProfile as any).availability && (
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionLabel}>Match Availability</Text>
                  <View style={styles.availRow}>
                    <Clock size={14} color="#10b981" />
                    <Text style={styles.availText}>{(activeProfile as any).availability}</Text>
                  </View>
                </View>
              )}

              {/* Match Stats Summary */}
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Award size={18} color="#f59e0b" />
                  <Text style={styles.statValue}>{activeProfile.matchesPlayed || 0}</Text>
                  <Text style={styles.statLabel}>Matches</Text>
                </View>
                <View style={styles.statCard}>
                  <Shield size={18} color="#818cf8" />
                  <Text style={styles.statValue}>{activeProfile.teamsCount || 0}</Text>
                  <Text style={styles.statLabel}>Squads</Text>
                </View>
                <View style={styles.statCard}>
                  <Sparkles size={18} color="#10b981" />
                  <Text style={styles.statValue}>Verified</Text>
                  <Text style={styles.statLabel}>Community</Text>
                </View>
              </View>
            </ScrollView>

            {/* Footer Action */}
            <View style={styles.modalFooter}>
              {!isSelf && (
                <TouchableOpacity
                  style={styles.rateAthleteBtn}
                  onPress={handleOpenRate}
                  activeOpacity={0.85}
                >
                  <Star size={16} color="#ffffff" fill="#ffffff" />
                  <Text style={styles.rateAthleteBtnText}>Rate Athlete Sportsmanship</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeFullBtn} onPress={onClose} activeOpacity={0.85}>
                <Text style={styles.closeFullBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Internal Rating Modal */}
      <RatePlayerModal
        visible={showRateModal}
        targetPlayer={{
          uid: activeProfile.uid,
          displayName: activeProfile.displayName || 'Sports Athlete',
          photoURL: activeProfile.photoURL,
          sport: sports[0],
        }}
        matchContext={matchContext}
        onClose={() => setShowRateModal(false)}
        onSuccess={handleRatingSuccess}
      />
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 20, 0.82)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#1e293b',
    maxHeight: '88%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0b1120',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  athleteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  athleteAvatar: {
    width: 60,
    height: 60,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#38bdf8',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#38bdf8',
  },
  athleteMainInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  athleteName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    flex: 1,
  },
  tierTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  tierTagText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  cityText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#475569',
  },
  levelBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  reputationCard: {
    backgroundColor: '#0b1120',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
    marginBottom: 14,
  },
  reputationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  ratingScoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  ratingScoreNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fbbf24',
  },
  ratingScoreMax: {
    fontSize: 11,
    color: '#94a3b8',
  },
  ratingReviewsMeta: {
    flex: 1,
  },
  reputationTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  reviewsCountText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131d33',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#38bdf8',
  },
  breakdownLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  breakdownDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#1e293b',
  },
  sectionBox: {
    backgroundColor: '#0b1120',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bioText: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 18,
    marginTop: 4,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgePillIcon: {
    fontSize: 14,
  },
  badgePillName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  badgeCountBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  badgeCountText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ffffff',
  },
  emptyBadgesText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 2,
  },
  feedbackList: {
    gap: 8,
    marginTop: 4,
  },
  feedbackCard: {
    backgroundColor: '#131d33',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  feedbackRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feedbackRatingNum: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fbbf24',
  },
  feedbackQuote: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  feedbackBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  feedbackBadgeTag: {
    fontSize: 10,
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  sportChip: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sportChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
  },
  positionChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  positionChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  availRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  availText: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#0b1120',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  modalFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0b1120',
    flexDirection: 'row',
    gap: 10,
  },
  rateAthleteBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    borderRadius: 12,
  },
  rateAthleteBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeFullBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeFullBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#cbd5e1',
  },
});

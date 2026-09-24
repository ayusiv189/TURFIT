import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  X,
  Star,
  Award,
  Sparkles,
  Shield,
  Clock,
  Heart,
  Zap,
  Flame,
  Check,
  User,
} from 'lucide-react-native';
import { PlayerBadgeType, PlayerRating, UserProfile, UserRewardWallet, InAppNotification } from '../types';
import { submitPlayerRating } from '../services/playerRatingService';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { sanitizeData } from '../services/dbService';

interface RatePlayerModalProps {
  visible: boolean;
  targetPlayer: {
    uid: string;
    displayName: string;
    photoURL?: string | null;
    sport?: string;
  } | null;
  matchContext?: {
    matchId?: string;
    lobbyId?: string;
    turfName?: string;
    sport?: string;
  };
  onClose: () => void;
  onSuccess?: () => void;
}

const AVAILABLE_BADGES: { id: PlayerBadgeType; title: string; desc: string; icon: string; color: string }[] = [
  {
    id: 'Fair Play Champion',
    title: 'Fair Play Champion',
    desc: 'Respectful, honest, and humble on the pitch',
    icon: '🌟',
    color: '#38bdf8',
  },
  {
    id: 'Playmaker / MVP',
    title: 'Playmaker / MVP',
    desc: 'Game-changing skill and vision',
    icon: '👑',
    color: '#f59e0b',
  },
  {
    id: 'Team Motivator',
    title: 'Team Motivator',
    desc: 'Lifts up teammates and keeps energy high',
    icon: '🤝',
    color: '#10b981',
  },
  {
    id: 'Defensive Wall',
    title: 'Defensive Wall',
    desc: 'Rock-solid defense and relentless work rate',
    icon: '🛡️',
    color: '#818cf8',
  },
  {
    id: 'Clockwork Punctual',
    title: 'Clockwork Punctual',
    desc: 'Arrived early, warmed up and ready',
    icon: '⏱️',
    color: '#06b6d4',
  },
  {
    id: 'Clutch Performer',
    title: 'Clutch Performer',
    desc: 'Thrives under pressure when it matters most',
    icon: '🔥',
    color: '#ef4444',
  },
  {
    id: 'Tactical Genius',
    title: 'Tactical Genius',
    desc: 'Smart positioning and team coordination',
    icon: '🎯',
    color: '#a855f7',
  },
  {
    id: 'Sharpshooter',
    title: 'Sharpshooter',
    desc: 'Clinical finishing and high accuracy',
    icon: '⚡',
    color: '#ec4899',
  },
];

const SPORTSMANSHIP_LABELS: Record<number, string> = {
  1: 'Needs Improvement',
  2: 'Average Sportsmanship',
  3: 'Fair & Respectful',
  4: 'Great Sportsman',
  5: 'Role Model Athlete ⭐',
};

const SKILL_LABELS: Record<number, string> = {
  1: 'Developing',
  2: 'Solid Player',
  3: 'Skilled Competitor',
  4: 'High Impact',
  5: 'MVP Caliber ⚡',
};

const PUNCTUALITY_LABELS: Record<number, string> = {
  1: 'Late to Pitch',
  2: 'Arrived Last Minute',
  3: 'On Time',
  4: 'Early & Ready',
  5: 'Always Dependable ⏱️',
};

export const RatePlayerModal: React.FC<RatePlayerModalProps> = ({
  visible,
  targetPlayer,
  matchContext,
  onClose,
  onSuccess,
}) => {
  const { user, profile } = useAuth();
  const [sportsmanship, setSportsmanship] = useState<number>(5);
  const [skill, setSkill] = useState<number>(5);
  const [punctuality, setPunctuality] = useState<number>(5);
  const [selectedBadges, setSelectedBadges] = useState<PlayerBadgeType[]>(['Fair Play Champion']);
  const [feedback, setFeedback] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!targetPlayer) return null;

  const toggleBadge = (badge: PlayerBadgeType) => {
    if (selectedBadges.includes(badge)) {
      setSelectedBadges((prev) => prev.filter((b) => b !== badge));
    } else {
      if (selectedBadges.length >= 3) {
        Alert.alert('Badge Limit', 'You can select up to 3 badges per rating.');
        return;
      }
      setSelectedBadges((prev) => [...prev, badge]);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please log in to rate athletes.');
      return;
    }
    if (user.uid === targetPlayer.uid) {
      Alert.alert('Cannot Rate Self', 'Athletes can only rate teammates and opponents.');
      return;
    }

    setSubmitting(true);
    try {
      const matchOrLobby = matchContext?.matchId || matchContext?.lobbyId || 'match';
      const ratingParams = {
        reviewerId: user.uid,
        reviewerName: profile?.displayName || user.displayName || 'Teammate',
        reviewerPhotoURL: profile?.photoURL || user.photoURL || null,
        targetId: targetPlayer.uid,
        targetName: targetPlayer.displayName,
        targetPhotoURL: targetPlayer.photoURL || null,
        matchId: matchContext?.matchId,
        lobbyId: matchContext?.lobbyId,
        turfName: matchContext?.turfName,
        sport: matchContext?.sport || targetPlayer.sport || 'Sports',
        sportsmanshipRating: sportsmanship,
        skillRating: skill,
        punctualityRating: punctuality,
        badges: selectedBadges,
        feedback: feedback.trim(),
      };

      if (typeof submitPlayerRating === 'function') {
        await submitPlayerRating(ratingParams);
      } else {
        // Direct resilient fallback
        const customDocId = `${user.uid}_${targetPlayer.uid}_${matchOrLobby}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        const ratingDocRef = doc(db, 'playerRatings', customDocId);
        const overall = Number(((sportsmanship + skill + punctuality) / 3).toFixed(1));
        const now = new Date().toISOString();

        const payload: PlayerRating = {
          id: customDocId,
          reviewerId: user.uid,
          reviewerName: ratingParams.reviewerName,
          reviewerPhotoURL: ratingParams.reviewerPhotoURL,
          targetId: targetPlayer.uid,
          targetName: targetPlayer.displayName,
          targetPhotoURL: targetPlayer.photoURL,
          matchId: matchContext?.matchId,
          lobbyId: matchContext?.lobbyId,
          turfName: matchContext?.turfName,
          sport: ratingParams.sport,
          sportsmanshipRating: sportsmanship,
          skillRating: skill,
          punctualityRating: punctuality,
          overallRating: overall,
          badges: selectedBadges,
          feedback: feedback.trim(),
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(ratingDocRef, sanitizeData(payload));

        try {
          const userRef = doc(db, 'users', targetPlayer.uid);
          const uSnap = await getDoc(userRef);
          if (uSnap.exists()) {
            const uData = uSnap.data() as UserProfile;
            const currentCount = uData.totalRatingsReceived || 0;
            const currentRating = uData.sportsmanshipRating || 5.0;
            const newCount = currentCount + 1;
            const newRating = Number(((currentRating * currentCount + sportsmanship) / newCount).toFixed(1));
            const existingBadges: string[] = uData.badges || [];
            const updatedBadges = Array.from(new Set([...existingBadges, ...selectedBadges]));
            await updateDoc(userRef, {
              sportsmanshipRating: newRating,
              totalRatingsReceived: newCount,
              badges: updatedBadges,
              updatedAt: now,
            });
          }
        } catch (uErr) {
          console.warn('Could not update user stats:', uErr);
        }
      }

      Alert.alert(
        'Rating Submitted! ⭐',
        `Thank you for rating ${targetPlayer.displayName}! You've earned 15 TurFit Reward Points for promoting positive sportsmanship.`,
        [
          {
            text: 'Awesome',
            onPress: () => {
              if (onSuccess) onSuccess();
              onClose();
            },
          },
        ]
      );
    } catch (err: any) {
      console.warn('Error submitting rating:', err);
      Alert.alert('Error', err?.message || 'Could not submit rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (value: number, onChange: (val: number) => void) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= value;
          return (
            <TouchableOpacity
              key={star}
              onPress={() => onChange(star)}
              activeOpacity={0.7}
              style={styles.starBtn}
            >
              <Star
                size={26}
                color={isFilled ? '#f59e0b' : '#334155'}
                fill={isFilled ? '#f59e0b' : 'transparent'}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <Award size={18} color="#f59e0b" />
              <Text style={styles.headerTitle}>Post-Match Player Rating</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Target Athlete Banner */}
            <View style={styles.athleteBanner}>
              {targetPlayer.photoURL ? (
                <Image source={{ uri: targetPlayer.photoURL }} style={styles.athleteAvatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {(targetPlayer.displayName || 'P').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.athleteDetails}>
                <Text style={styles.athleteName}>{targetPlayer.displayName}</Text>
                <Text style={styles.matchSub}>
                  {matchContext?.turfName ? `${matchContext.turfName} • ` : ''}
                  {matchContext?.sport || targetPlayer.sport || 'Match Participant'}
                </Text>
              </View>
            </View>

            {/* TurFit Reward Bonus Notice */}
            <View style={styles.rewardNotice}>
              <Sparkles size={16} color="#fbbf24" />
              <Text style={styles.rewardNoticeText}>
                Rate your squad mate to earn <Text style={{ fontWeight: '800', color: '#fbbf24' }}>+15 TurFit Points</Text> and foster fair play!
              </Text>
            </View>

            {/* Rating Category 1: Sportsmanship */}
            <View style={styles.ratingSection}>
              <View style={styles.ratingSectionHeader}>
                <Text style={styles.ratingLabel}>🤝 Sportsmanship & Fair Play</Text>
                <Text style={styles.ratingValueLabel}>{SPORTSMANSHIP_LABELS[sportsmanship]}</Text>
              </View>
              {renderStars(sportsmanship, setSportsmanship)}
            </View>

            {/* Rating Category 2: Skill & Impact */}
            <View style={styles.ratingSection}>
              <View style={styles.ratingSectionHeader}>
                <Text style={styles.ratingLabel}>⚡ Skill & Game Performance</Text>
                <Text style={styles.ratingValueLabel}>{SKILL_LABELS[skill]}</Text>
              </View>
              {renderStars(skill, setSkill)}
            </View>

            {/* Rating Category 3: Punctuality */}
            <View style={styles.ratingSection}>
              <View style={styles.ratingSectionHeader}>
                <Text style={styles.ratingLabel}>⏱️ Punctuality & Commitment</Text>
                <Text style={styles.ratingValueLabel}>{PUNCTUALITY_LABELS[punctuality]}</Text>
              </View>
              {renderStars(punctuality, setPunctuality)}
            </View>

            {/* Award Badges Section */}
            <View style={styles.badgesSection}>
              <View style={styles.badgesHeaderRow}>
                <Text style={styles.sectionTitle}>Award Sportsmanship Badges</Text>
                <Text style={styles.badgesCountHint}>{selectedBadges.length}/3 selected</Text>
              </View>
              <Text style={styles.badgesSub}>Select up to 3 badges to highlight this athlete's strengths:</Text>

              <View style={styles.badgesGrid}>
                {AVAILABLE_BADGES.map((b) => {
                  const isSelected = selectedBadges.includes(b.id);
                  return (
                    <TouchableOpacity
                      key={b.id}
                      style={[
                        styles.badgeItem,
                        isSelected && { borderColor: b.color, backgroundColor: `${b.color}18` },
                      ]}
                      onPress={() => toggleBadge(b.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.badgeTopRow}>
                        <Text style={styles.badgeEmoji}>{b.icon}</Text>
                        {isSelected && (
                          <View style={[styles.badgeCheckDot, { backgroundColor: b.color }]}>
                            <Check size={11} color="#ffffff" />
                          </View>
                        )}
                      </View>
                      <Text style={[styles.badgeTitle, isSelected && { color: '#ffffff', fontWeight: '800' }]}>
                        {b.title}
                      </Text>
                      <Text style={styles.badgeDesc} numberOfLines={2}>
                        {b.desc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Testimonial / Feedback Comment */}
            <View style={styles.commentSection}>
              <Text style={styles.sectionTitle}>Compliment or Constructive Feedback (Optional)</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="e.g. Great defending and great team attitude under pressure!"
                placeholderTextColor="#64748b"
                value={feedback}
                onChangeText={setFeedback}
                multiline
                maxLength={300}
                numberOfLines={3}
              />
              <Text style={styles.charCount}>{feedback.length}/300</Text>
            </View>
          </ScrollView>

          {/* Footer Submit Button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Sparkles size={16} color="#ffffff" />
                  <Text style={styles.submitBtnText}>Submit Athlete Rating</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 20, 0.84)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#1e293b',
    maxHeight: '90%',
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 18,
  },
  athleteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#131d33',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  athleteAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#38bdf8',
  },
  athleteDetails: {
    flex: 1,
  },
  athleteName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  matchSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  rewardNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    marginBottom: 16,
  },
  rewardNoticeText: {
    fontSize: 12,
    color: '#f8fafc',
    flex: 1,
  },
  ratingSection: {
    backgroundColor: '#0b1120',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  ratingSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ratingLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  ratingValueLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fbbf24',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  starBtn: {
    padding: 6,
  },
  badgesSection: {
    marginTop: 10,
    marginBottom: 14,
  },
  badgesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  badgesCountHint: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8',
  },
  badgesSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 10,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeItem: {
    width: '48%',
    backgroundColor: '#0b1120',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    padding: 10,
  },
  badgeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  badgeEmoji: {
    fontSize: 20,
  },
  badgeCheckDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 2,
  },
  badgeDesc: {
    fontSize: 10,
    color: '#64748b',
    lineHeight: 13,
  },
  commentSection: {
    marginTop: 6,
    marginBottom: 16,
  },
  commentInput: {
    backgroundColor: '#0b1120',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    color: '#ffffff',
    fontSize: 13,
    marginTop: 8,
    textAlignVertical: 'top',
    minHeight: 70,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0b1120',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 14,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});

export default RatePlayerModal;


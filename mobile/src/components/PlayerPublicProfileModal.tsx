import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
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
} from 'lucide-react-native';
import { UserProfile } from '../types';

interface PlayerPublicProfileModalProps {
  visible: boolean;
  profile: UserProfile | null;
  onClose: () => void;
}

export const PlayerPublicProfileModal: React.FC<PlayerPublicProfileModalProps> = ({
  visible,
  profile,
  onClose,
}) => {
  if (!profile) return null;

  const sports = profile.preferredSports && profile.preferredSports.length > 0
    ? profile.preferredSports
    : [profile.preferredSport || 'Football'];

  const positions = profile.preferredPositions && profile.preferredPositions.length > 0
    ? profile.preferredPositions
    : profile.preferredPosition ? [profile.preferredPosition] : [];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header Bar */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <Activity size={18} color="#38bdf8" />
              <Text style={styles.modalTitle}>Athlete Profile</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Athlete Avatar & Main Info */}
            <View style={styles.athleteHeader}>
              {profile.photoURL ? (
                <Image source={{ uri: profile.photoURL }} style={styles.athleteAvatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {(profile.displayName || 'A').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}

              <View style={styles.athleteMainInfo}>
                <Text style={styles.athleteName}>{profile.displayName || 'Sports Athlete'}</Text>
                <View style={styles.cityRow}>
                  <MapPin size={13} color="#94a3b8" />
                  <Text style={styles.cityText}>{profile.city || 'Mumbai'}</Text>
                  <View style={styles.dot} />
                  <Text style={styles.levelBadge}>{profile.experienceLevel || 'Intermediate'}</Text>
                </View>
              </View>
            </View>

            {/* Bio Section */}
            {profile.bio ? (
              <View style={styles.sectionBox}>
                <Text style={styles.sectionLabel}>Athlete Bio & Playstyle</Text>
                <Text style={styles.bioText}>{profile.bio}</Text>
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
            {(profile as any).availability && (
              <View style={styles.sectionBox}>
                <Text style={styles.sectionLabel}>Match Availability</Text>
                <View style={styles.availRow}>
                  <Clock size={14} color="#10b981" />
                  <Text style={styles.availText}>{(profile as any).availability}</Text>
                </View>
              </View>
            )}

            {/* Match Stats Summary */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Award size={18} color="#f59e0b" />
                <Text style={styles.statValue}>{profile.matchesPlayed || 0}</Text>
                <Text style={styles.statLabel}>Matches</Text>
              </View>
              <View style={styles.statCard}>
                <Shield size={18} color="#818cf8" />
                <Text style={styles.statValue}>{profile.teamsCount || 0}</Text>
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
            <TouchableOpacity style={styles.closeFullBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.closeFullBtnText}>Close Profile</Text>
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
    backgroundColor: 'rgba(5, 10, 20, 0.82)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    maxHeight: '85%',
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
    fontWeight: '700',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 18,
  },
  athleteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
    backgroundColor: '#131d33',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  athleteAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1e293b',
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#38bdf8',
  },
  athleteMainInfo: {
    flex: 1,
  },
  athleteName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cityText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#64748b',
  },
  levelBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8',
  },
  sectionBox: {
    backgroundColor: '#131b2e',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  bioText: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 20,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sportChip: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  sportChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
  },
  positionChip: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  positionChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#a5b4fc',
  },
  availRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  availText: {
    fontSize: 13,
    color: '#e2e8f0',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#131b2e',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  modalFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0b1120',
  },
  closeFullBtn: {
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeFullBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});

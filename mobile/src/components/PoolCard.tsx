import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import {
  Users,
  MapPin,
  Calendar,
  Clock,
  Crown,
  Zap,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Trash2,
} from 'lucide-react-native';
import { PlayerPool } from '../types';

interface PoolCardProps {
  pool: PlayerPool;
  currentUserId?: string;
  onJoin: (pool: PlayerPool) => void;
  onLeave: (pool: PlayerPool) => void;
  onConvert: (pool: PlayerPool) => void;
  onDelete?: (pool: PlayerPool) => void;
  onViewLobby?: (lobbyId: string) => void;
  onPressProfile?: (uid: string) => void;
}

export const PoolCard: React.FC<PoolCardProps> = ({
  pool,
  currentUserId,
  onJoin,
  onLeave,
  onConvert,
  onDelete,
  onViewLobby,
  onPressProfile,
}) => {
  const isJoined = (pool.interestedPlayers || []).some((p) => p.uid === currentUserId);
  const isCreator = pool.creatorId === currentUserId;
  const currentCount = pool.currentPlayersCount || (pool.interestedPlayers?.length || 0);
  const requiredCount = pool.requiredPlayers || 6;
  const progressPercent = Math.min(100, Math.round((currentCount / requiredCount) * 100));
  const isFullyBacked = currentCount >= requiredCount || pool.status === 'READY_TO_CONVERT';
  const isConverted = pool.status === 'CONVERTED_TO_LOBBY';

  const formatHoursCategory = (cat?: string) => {
    switch (cat) {
      case 'MORNING':
        return 'Morning (6 - 9 AM)';
      case 'MIDDAY':
        return 'Midday (9 AM - 4 PM)';
      case 'EVENING':
        return 'Evening (4 - 8 PM)';
      case 'NIGHT':
        return 'Night (8 - 11 PM)';
      default:
        return pool.preferredHours || 'Preferred Hours';
    }
  };

  return (
    <View style={[styles.card, isFullyBacked && styles.cardBacked, isConverted && styles.cardConverted]}>
      {/* Header Badges */}
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <Text style={styles.sportBadge}>{(pool.sport || 'Sports').toUpperCase()}</Text>
          <View style={styles.hoursBadge}>
            <Clock size={11} color="#38bdf8" />
            <Text style={styles.hoursBadgeText}>{formatHoursCategory(pool.matchHoursCategory)}</Text>
          </View>
          {isCreator && (
            <View style={styles.creatorBadge}>
              <Crown size={10} color="#f59e0b" />
              <Text style={styles.creatorBadgeText}>Your Pool</Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {isCreator && onDelete && !isConverted && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.deletePoolIconBtn}
              onPress={() => onDelete(pool)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2 size={12} color="#f43f5e" />
            </TouchableOpacity>
          )}

          {isConverted ? (
            <View style={styles.statusBadgeConverted}>
              <CheckCircle2 size={12} color="#10b981" />
              <Text style={styles.statusBadgeConvertedText}>LIVE LOBBY</Text>
            </View>
          ) : isFullyBacked ? (
            <View style={styles.statusBadgeReady}>
              <Sparkles size={12} color="#f59e0b" />
              <Text style={styles.statusBadgeReadyText}>BACKED 100%</Text>
            </View>
          ) : (
            <View style={styles.statusBadgeOpen}>
              <Users size={12} color="#38bdf8" />
              <Text style={styles.statusBadgeOpenText}>
                {currentCount}/{requiredCount} ATHLETES
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Title / Description */}
      <Text style={styles.title} numberOfLines={2}>
        {pool.description || `${pool.sport} Squad Matchmaking Pool`}
      </Text>

      {/* Location & Preferred Date */}
      <View style={styles.metaRow}>
        <MapPin size={13} color="#94a3b8" />
        <Text style={styles.metaText} numberOfLines={1}>
          {pool.city} {pool.area ? `• ${pool.area}` : ''}{' '}
          {pool.preferredTurfName ? `• Prefers: ${pool.preferredTurfName}` : ''}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Calendar size={13} color="#94a3b8" />
        <Text style={styles.metaText}>
          Preferred Date: <Text style={styles.boldWhite}>{pool.preferredDate}</Text> ({pool.preferredTime || pool.preferredHours})
        </Text>
      </View>

      {/* Quota Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>Squad Quota Progress</Text>
          <Text style={[styles.progressPercent, isFullyBacked && styles.progressPercentBacked]}>
            {currentCount} / {requiredCount} Players ({progressPercent}%)
          </Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressPercent}%` },
              isFullyBacked && styles.progressBarFillBacked,
            ]}
          />
        </View>
      </View>

      {/* Roster of Interested Athletes */}
      <View style={styles.rosterContainer}>
        <Text style={styles.rosterTitle}>Interested Athletes ({currentCount})</Text>
        <View style={styles.avatarRow}>
          {(pool.interestedPlayers || []).slice(0, 6).map((player, idx) => (
            <TouchableOpacity
              key={player.uid || String(idx)}
              activeOpacity={0.75}
              onPress={() => onPressProfile && onPressProfile(player.uid)}
              style={styles.avatarWrapper}
            >
              {player.photoURL ? (
                <Image source={{ uri: player.photoURL }} style={styles.avatar} />
              ) : (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    player.uid === pool.creatorId && styles.creatorAvatarPlaceholder,
                  ]}
                >
                  <Text style={styles.avatarInitial}>
                    {(player.name || 'A').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              {player.uid === pool.creatorId && (
                <View style={styles.crownDot}>
                  <Crown size={7} color="#000000" />
                </View>
              )}
            </TouchableOpacity>
          ))}
          {currentCount > 6 && (
            <View style={styles.moreAvatarBadge}>
              <Text style={styles.moreAvatarText}>+{currentCount - 6}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Per-Player Cost & Action Bar */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.costLabel}>Target Share / Player</Text>
          <Text style={styles.costValue}>₹{pool.maxPricePerPlayer || 200}</Text>
        </View>

        <View style={styles.actionGroup}>
          {isConverted ? (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.viewLobbyBtn}
              onPress={() => pool.convertedLobbyId && onViewLobby && onViewLobby(pool.convertedLobbyId)}
            >
              <Text style={styles.viewLobbyBtnText}>View Lobby</Text>
              <ArrowRight size={14} color="#064e3b" />
            </TouchableOpacity>
          ) : isFullyBacked ? (
            <View style={styles.convertBtnGroup}>
              {isJoined && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.stepOutBtn}
                  onPress={() => onLeave(pool)}
                >
                  <Text style={styles.stepOutBtnText}>Step Out</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.convertBtn}
                onPress={() => onConvert(pool)}
              >
                <Zap size={14} color="#000000" />
                <Text style={styles.convertBtnText}>Convert to Turf Lobby</Text>
              </TouchableOpacity>
            </View>
          ) : isJoined ? (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.leaveBtn}
              onPress={() => onLeave(pool)}
            >
              <Text style={styles.leaveBtnText}>Leave Pool</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.joinBtn}
              onPress={() => onJoin(pool)}
            >
              <Text style={styles.joinBtnText}>Back Squad</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardBacked: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: '#161e33',
  },
  cardConverted: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: '#0f1d2e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  sportBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hoursBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hoursBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38bdf8',
  },
  creatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  creatorBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#f59e0b',
  },
  statusBadgeOpen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeOpenText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38bdf8',
  },
  statusBadgeReady: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeReadyText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#f59e0b',
  },
  statusBadgeConverted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeConvertedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  metaText: {
    fontSize: 12,
    color: '#94a3b8',
    flex: 1,
  },
  boldWhite: {
    color: '#ffffff',
    fontWeight: '700',
  },
  progressContainer: {
    backgroundColor: '#0c1220',
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38bdf8',
  },
  progressPercentBacked: {
    color: '#f59e0b',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#38bdf8',
    borderRadius: 3,
  },
  progressBarFillBacked: {
    backgroundColor: '#f59e0b',
  },
  rosterContainer: {
    marginBottom: 12,
  },
  rosterTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    marginRight: 6,
    position: 'relative',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  creatorAvatarPlaceholder: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: 'rgba(245, 158, 11, 0.5)',
  },
  avatarInitial: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  crownDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#f59e0b',
    width: 11,
    height: 11,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreAvatarBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreAvatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 10,
  },
  costLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  costValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  joinBtn: {
    backgroundColor: '#38bdf8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  joinBtnText: {
    color: '#082f49',
    fontSize: 12,
    fontWeight: '800',
  },
  leaveBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  leaveBtnText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
  stepOutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  stepOutBtnText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '700',
  },
  convertBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  convertBtn: {
    backgroundColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  convertBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  viewLobbyBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  viewLobbyBtnText: {
    color: '#064e3b',
    fontSize: 12,
    fontWeight: '800',
  },
  deletePoolIconBtn: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.35)',
    padding: 5,
    borderRadius: 8,
  },
});

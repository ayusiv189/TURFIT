import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Users, MapPin, Calendar, Clock, Crown, Trash2, User, ChevronRight, Check } from 'lucide-react-native';
import { Lobby } from '../types';

interface LobbyCardProps {
  lobby: Lobby;
  isJoined?: boolean;
  isHost?: boolean;
  onJoinToggle: () => void;
  onPressCard?: () => void;
  onDeleteLobby?: () => void;
  onPressHostProfile?: (hostId: string) => void;
  onPressPlayerProfile?: (playerId: string) => void;
}

export const LobbyCard: React.FC<LobbyCardProps> = ({
  lobby,
  isJoined,
  isHost,
  onJoinToggle,
  onPressCard,
  onDeleteLobby,
  onPressHostProfile,
  onPressPlayerProfile,
}) => {
  const isFull = lobby.currentPlayers >= lobby.maxPlayers;
  const spotsRemaining = Math.max(0, lobby.maxPlayers - (lobby.currentPlayers || 0));

  // Extract players array safely
  const playerList = lobby.players || [];

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPressCard}
      style={[styles.card, isJoined && styles.cardJoined]}
    >
      {/* Header & Badges */}
      <View style={styles.header}>
        <View style={styles.titleArea}>
          <View style={styles.sportBadgeRow}>
            <Text style={styles.sportBadge}>{(lobby.sport || 'Sports').toUpperCase()}</Text>
            {isHost && (
              <View style={styles.myLobbyTag}>
                <Crown size={10} color="#f59e0b" />
                <Text style={styles.myLobbyTagText}>Your Lobby</Text>
              </View>
            )}
            {isJoined && !isHost && (
              <View style={styles.joinedTag}>
                <Check size={10} color="#10b981" />
                <Text style={styles.joinedTagText}>You're In</Text>
              </View>
            )}
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {lobby.name}
          </Text>
        </View>

        <View style={[styles.playerBadge, isFull && styles.playerBadgeFull]}>
          <Users size={12} color={isFull ? '#ef4444' : '#10b981'} />
          <Text style={[styles.playerBadgeText, isFull && styles.playerBadgeTextFull]}>
            {lobby.currentPlayers}/{lobby.maxPlayers}
          </Text>
        </View>
      </View>

      {/* Created By Section */}
      <View style={styles.creatorRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onPressHostProfile && lobby.hostId && onPressHostProfile(lobby.hostId)}
          style={styles.creatorProfileBtn}
        >
          {lobby.hostPhotoURL ? (
            <Image source={{ uri: lobby.hostPhotoURL }} style={styles.creatorAvatar} />
          ) : (
            <View style={styles.creatorAvatarPlaceholder}>
              <Text style={styles.creatorAvatarText}>
                {(lobby.hostName || 'H').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.creatorInfo}>
            <Text style={styles.createdLabel}>Created by</Text>
            <Text style={styles.creatorName} numberOfLines={1}>
              {lobby.hostName || 'Lobby Host'} {isHost ? '(You)' : ''}
            </Text>
          </View>
        </TouchableOpacity>

        {isHost && onDeleteLobby && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={(e) => {
              e.stopPropagation();
              onDeleteLobby();
            }}
            style={styles.deleteIconButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Trash2 size={15} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>

      {/* Venue & Location */}
      <View style={styles.metaRow}>
        <MapPin size={13} color="#94a3b8" />
        <Text style={styles.metaText} numberOfLines={1}>
          {lobby.turfName} {lobby.turfCity ? `• ${lobby.turfCity}` : ''}
        </Text>
      </View>

      {/* Schedule Time & Date */}
      <View style={styles.timeRow}>
        <View style={styles.metaRow}>
          <Calendar size={13} color="#94a3b8" />
          <Text style={styles.metaText}>{lobby.date} ({lobby.day?.slice(0, 3) || 'Match'})</Text>
        </View>
        <View style={styles.metaRow}>
          <Clock size={13} color="#94a3b8" />
          <Text style={styles.metaText}>{lobby.startTime} - {lobby.endTime}</Text>
        </View>
      </View>

      {/* Players Who Are In (Roster Mini-Bar) */}
      <View style={styles.rosterSection}>
        <View style={styles.rosterHeader}>
          <Text style={styles.rosterLabel}>
            Players In ({lobby.currentPlayers}/{lobby.maxPlayers})
          </Text>
          <Text style={styles.spotsLeftText}>
            {spotsRemaining > 0 ? `${spotsRemaining} spot${spotsRemaining === 1 ? '' : 's'} left` : 'Full'}
          </Text>
        </View>

        <View style={styles.playerAvatarsRow}>
          {playerList.slice(0, 5).map((player, idx) => (
            <TouchableOpacity
              key={player.id || player.playerId || player.uid || String(idx)}
              activeOpacity={0.75}
              onPress={() => {
                const uid = player.playerId || player.uid;
                if (uid && onPressPlayerProfile) {
                  onPressPlayerProfile(uid);
                } else if (onPressCard) {
                  onPressCard();
                }
              }}
              style={styles.rosterAvatarWrapper}
            >
              {player.playerPhotoURL ? (
                <Image source={{ uri: player.playerPhotoURL }} style={styles.rosterAvatar} />
              ) : (
                <View style={[styles.rosterAvatarPlaceholder, player.isHost && styles.hostAvatarPlaceholder]}>
                  <Text style={styles.rosterAvatarText}>
                    {(player.playerName || 'P').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              {player.isHost && (
                <View style={styles.hostCrownBadge}>
                  <Crown size={8} color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>
          ))}

          {lobby.currentPlayers > 5 && (
            <View style={styles.rosterMoreBadge}>
              <Text style={styles.rosterMoreText}>+{lobby.currentPlayers - 5}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.viewRosterLink}
            onPress={onPressCard}
            activeOpacity={0.7}
          >
            <Text style={styles.viewRosterText}>View Roster</Text>
            <ChevronRight size={12} color="#38bdf8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer: Price & In/Out Action */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.priceLabel}>Per player share</Text>
          <Text style={styles.priceValue}>₹{lobby.pricePerPlayer || 200}</Text>
        </View>

        <View style={styles.actionButtonGroup}>
          {isHost ? (
            <View style={styles.hostBadgeBox}>
              <Text style={styles.hostBadgeBoxText}>Host / Organizer</Text>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={(e) => {
                e.stopPropagation();
                onJoinToggle();
              }}
              style={[
                styles.actionButton,
                isJoined ? styles.leaveButton : styles.joinButton,
                isFull && !isJoined && styles.disabledButton,
              ]}
              disabled={isFull && !isJoined}
            >
              <Text style={[styles.actionButtonText, isJoined ? styles.leaveText : styles.joinText]}>
                {isJoined ? "I'm Out" : isFull ? 'Lobby Full' : "I'm In"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
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
  cardJoined: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: '#111d33',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  titleArea: {
    flex: 1,
    marginRight: 10,
  },
  sportBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sportBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  myLobbyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  myLobbyTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#f59e0b',
  },
  joinedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  joinedTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10b981',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  playerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  playerBadgeFull: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  playerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  playerBadgeTextFull: {
    color: '#ef4444',
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0c1220',
    padding: 8,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  creatorProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  creatorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1e293b',
  },
  creatorAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  creatorAvatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#818cf8',
  },
  creatorInfo: {
    flex: 1,
  },
  createdLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  creatorName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  deleteIconButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metaText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  rosterSection: {
    backgroundColor: '#0b111e',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#182235',
  },
  rosterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rosterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  spotsLeftText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38bdf8',
  },
  playerAvatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rosterAvatarWrapper: {
    marginRight: 6,
    position: 'relative',
  },
  rosterAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    backgroundColor: '#1e293b',
  },
  rosterAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostAvatarPlaceholder: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: 'rgba(245, 158, 11, 0.5)',
  },
  rosterAvatarText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  hostCrownBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#f59e0b',
    borderRadius: 6,
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rosterMoreBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  rosterMoreText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  viewRosterLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 2,
  },
  viewRosterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 12,
  },
  priceLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  actionButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hostBadgeBox: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  hostBadgeBoxText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f59e0b',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  joinButton: {
    backgroundColor: '#10b981',
  },
  leaveButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  disabledButton: {
    backgroundColor: '#334155',
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  joinText: {
    color: '#064e3b',
  },
  leaveText: {
    color: '#ef4444',
  },
});

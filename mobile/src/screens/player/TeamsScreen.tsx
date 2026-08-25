import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getTeams, createTeam, joinTeam } from '../../services/communityService';
import { Team } from '../../types';
import { Users, Shield, Plus, X, Trophy, Award } from 'lucide-react-native';

export const TeamsScreen: React.FC = () => {
  const { user, profile } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [teamName, setTeamName] = useState('');
  const [sport, setSport] = useState('Football');
  const [city, setCity] = useState('Mumbai');
  const [creating, setCreating] = useState(false);

  const sports = ['Football', 'Cricket', 'Badminton', 'Tennis', 'Basketball'];

  const loadTeams = async () => {
    try {
      const data = await getTeams();
      setTeams(data);
    } catch (err) {
      console.warn('Error loading teams:', err);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTeams();
    setRefreshing(false);
  };

  const handleJoinTeam = async (teamId: string) => {
    if (!user || !profile) return;
    try {
      await joinTeam(
        teamId,
        user.uid,
        profile.displayName || user.displayName || 'Athlete',
        profile.photoURL
      );
      loadTeams();
    } catch (err) {
      console.warn('Error joining team:', err);
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim() || !user || !profile) return;
    setCreating(true);
    try {
      await createTeam({
        name: teamName.trim(),
        sport,
        city: city.trim() || 'Mumbai',
        captainId: user.uid,
        captainName: profile.displayName || 'Athlete',
        captainPhotoURL: profile.photoURL,
      });
      setShowCreateModal(false);
      setTeamName('');
      loadTeams();
    } catch (err) {
      console.warn('Error creating team:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={teams}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
        ListHeaderComponent={
          <View style={styles.headerBox}>
            <Text style={styles.headerTitle}>Squads & Teams</Text>
            <Text style={styles.headerSubtitle}>
              Join an existing sports squad or create your own team roster.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMember = item.members?.some((m) => m.playerId === user?.uid);
          const isCaptain = item.captainId === user?.uid;

          return (
            <View style={styles.teamCard}>
              <View style={styles.teamHeader}>
                <View style={styles.shieldCircle}>
                  <Shield size={20} color="#10b981" />
                </View>
                <View style={styles.teamInfo}>
                  <Text style={styles.teamName}>{item.name}</Text>
                  <Text style={styles.teamSport}>
                    {item.sport} • {item.city}
                  </Text>
                </View>
                {isCaptain && (
                  <View style={styles.captainBadge}>
                    <Trophy size={10} color="#f59e0b" />
                    <Text style={styles.captainText}>CAPTAIN</Text>
                  </View>
                )}
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Members</Text>
                  <Text style={styles.statVal}>{item.members?.length || 1}</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Matches Won</Text>
                  <Text style={styles.statVal}>{item.matchesWon || 0}</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Total Matches</Text>
                  <Text style={styles.statVal}>{item.matchesPlayed || 0}</Text>
                </View>
              </View>

              <View style={styles.teamFooter}>
                <Text style={styles.captainNameText}>Captain: {item.captainName}</Text>
                {!isMember && (
                  <TouchableOpacity
                    style={styles.joinBtn}
                    onPress={() => handleJoinTeam(item.id)}
                  >
                    <Text style={styles.joinBtnText}>Join Squad</Text>
                  </TouchableOpacity>
                )}
                {isMember && !isCaptain && (
                  <View style={styles.joinedBadge}>
                    <Text style={styles.joinedText}>Squad Member</Text>
                  </View>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Shield size={40} color="#64748b" />
            <Text style={styles.emptyTitle}>No Teams Yet</Text>
            <Text style={styles.emptyDesc}>Create your club or squad to compete in friendly matches!</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
        activeOpacity={0.85}
      >
        <Plus size={20} color="#064e3b" />
        <Text style={styles.fabText}>Create Team</Text>
      </TouchableOpacity>

      {/* Create Team Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register New Squad</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Team / Squad Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Bandra Strikers FC"
              placeholderTextColor="#64748b"
              value={teamName}
              onChangeText={setTeamName}
            />

            <Text style={styles.label}>Sport</Text>
            <View style={styles.sportPills}>
              {sports.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.sportPill, sport === s && styles.sportPillActive]}
                  onPress={() => setSport(s)}
                >
                  <Text style={[styles.sportPillText, sport === s && styles.sportPillTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Home City</Text>
            <TextInput
              style={styles.input}
              placeholder="Mumbai"
              placeholderTextColor="#64748b"
              value={city}
              onChangeText={setCity}
            />

            <TouchableOpacity
              style={[styles.createBtn, creating && styles.disabledBtn]}
              onPress={handleCreateTeam}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#064e3b" />
              ) : (
                <Text style={styles.createBtnText}>Found Team</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  headerBox: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  teamCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shieldCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  teamSport: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  captainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  captainText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fbbf24',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#0b1120',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 2,
  },
  statVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  teamFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  captainNameText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  joinBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  joinBtnText: {
    color: '#064e3b',
    fontSize: 11,
    fontWeight: '800',
  },
  joinedBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  joinedText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748b',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 25,
  },
  fabText: {
    color: '#064e3b',
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#0b1120',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  sportPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  sportPill: {
    backgroundColor: '#0b1120',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sportPillActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  sportPillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  sportPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  createBtn: {
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
  createBtnText: {
    color: '#064e3b',
    fontSize: 14,
    fontWeight: '800',
  },
});

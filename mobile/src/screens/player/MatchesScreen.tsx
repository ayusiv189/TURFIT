import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getMatches, joinMatch } from '../../services/communityService';
import { Match } from '../../types';
import { Swords, Calendar, Clock, MapPin, Trophy } from 'lucide-react-native';

export const MatchesScreen: React.FC = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadMatches = async () => {
    try {
      const data = await getMatches();
      setMatches(data);
    } catch (err) {
      console.warn('Error loading matches:', err);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMatches();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
        ListHeaderComponent={
          <View style={styles.headerBox}>
            <Text style={styles.headerTitle}>Matchmaking & Fixtures</Text>
            <Text style={styles.headerSubtitle}>
              Challenge other community squads and track competitive scores.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.matchCard}>
            <View style={styles.matchHeader}>
              <View style={styles.sportBadge}>
                <Text style={styles.sportText}>{item.sport.toUpperCase()}</Text>
              </View>
              <View style={[styles.statusBadge, item.status === 'COMPLETED' ? styles.statusCompleted : styles.statusScheduled]}>
                <Text style={[styles.statusText, item.status === 'COMPLETED' ? styles.statusTextCompleted : styles.statusTextScheduled]}>
                  {item.status}
                </Text>
              </View>
            </View>

            {/* Teams Duel Layout */}
            <View style={styles.duelRow}>
              <View style={styles.teamBox}>
                <Text style={styles.teamName} numberOfLines={1}>{item.hostTeamName}</Text>
                {item.status === 'COMPLETED' && (
                  <Text style={styles.scoreText}>{item.hostScore ?? '-'}</Text>
                )}
              </View>

              <View style={styles.vsBadge}>
                <Text style={styles.vsText}>VS</Text>
              </View>

              <View style={styles.teamBox}>
                <Text style={styles.teamName} numberOfLines={1}>
                  {item.opponentTeamName || 'Open Challenge'}
                </Text>
                {item.status === 'COMPLETED' && (
                  <Text style={styles.scoreText}>{item.opponentScore ?? '-'}</Text>
                )}
              </View>
            </View>

            {/* Match Meta */}
            <View style={styles.metaRow}>
              <MapPin size={12} color="#94a3b8" />
              <Text style={styles.metaText}>{item.turfName} • {item.arenaName}</Text>
            </View>

            <View style={styles.metaRow}>
              <Calendar size={12} color="#94a3b8" />
              <Text style={styles.metaText}>{item.date} ({item.startTime} - {item.endTime})</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Swords size={40} color="#64748b" />
            <Text style={styles.emptyTitle}>No Fixtures Scheduled</Text>
            <Text style={styles.emptyDesc}>Host a team match to start challenging local clubs!</Text>
          </View>
        }
      />
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
    paddingBottom: 30,
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
  matchCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sportBadge: {
    backgroundColor: '#0b1120',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  sportText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusScheduled: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  statusCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusTextScheduled: {
    color: '#38bdf8',
  },
  statusTextCompleted: {
    color: '#10b981',
  },
  duelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0b1120',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  teamBox: {
    flex: 1,
    alignItems: 'center',
  },
  teamName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  scoreText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#10b981',
    marginTop: 4,
  },
  vsBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginHorizontal: 8,
  },
  vsText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '900',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#cbd5e1',
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
});

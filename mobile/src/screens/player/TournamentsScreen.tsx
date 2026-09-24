import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { db } from '../../lib/firebase';
import {
  collection,
  getDocs,
  query,
  orderBy
} from 'firebase/firestore';
import { Trophy, Calendar, MapPin, Users, ChevronRight } from 'lucide-react-native';

interface Tournament {
  id: string;
  title: string;
  sport?: string;
  venueName?: string;
  startDate?: string;
  prizePool?: string;
  maxTeams?: number;
  registeredTeamsCount?: number;
  status?: string;
}

export const TournamentsScreen: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const q = query(collection(db, 'tournaments'), orderBy('startDate', 'desc'));
        const snapshot = await getDocs(q);
        const items: Tournament[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Tournament[];
        setTournaments(items);
      } catch (err) {
        console.error('Error fetching tournaments:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTournaments();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Open Tournaments</Text>
        <Text style={styles.headerSubtitle}>Compete in local championships, view brackets & register squads</Text>
      </View>

      <FlatList
        data={tournaments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.badge}>
                <Trophy size={14} color="#f59e0b" />
                <Text style={styles.badgeText}>{item.prizePool || 'Championship Cup'}</Text>
              </View>
              <Text style={styles.statusText}>{item.status || 'Upcoming'}</Text>
            </View>

            <Text style={styles.title}>{item.title || 'TruFit Open Tournament'}</Text>

            <View style={styles.metaRow}>
              <MapPin size={14} color="#94a3b8" />
              <Text style={styles.metaText}>{item.venueName || 'Premier Turf Arena'}</Text>
            </View>

            <View style={styles.metaRow}>
              <Calendar size={14} color="#94a3b8" />
              <Text style={styles.metaText}>{item.startDate || 'This Weekend'}</Text>
            </View>

            <View style={styles.footer}>
              <View style={styles.teamsRow}>
                <Users size={14} color="#10b981" />
                <Text style={styles.teamsText}>{item.registeredTeamsCount || 0} / {item.maxTeams || 16} Teams Registered</Text>
              </View>
              <TouchableOpacity style={styles.registerBtn}>
                <Text style={styles.registerBtnText}>View Brackets</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Trophy size={40} color="#334155" />
            <Text style={styles.emptyText}>No tournaments scheduled right now.</Text>
            <Text style={styles.emptySubtext}>Check back soon for upcoming championship cups and bracket tournaments.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#090d16' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
  headerSubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  listContainer: { padding: 16 },
  card: { backgroundColor: '#0f172a', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#1e293b' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f59e0b20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#f59e0b40' },
  badgeText: { color: '#f59e0b', fontSize: 11, fontWeight: 'bold' },
  statusText: { color: '#10b981', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  title: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  metaText: { color: '#94a3b8', fontSize: 12 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1e293b' },
  teamsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  teamsText: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  registerBtn: { backgroundColor: '#10b981', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  registerBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16, marginTop: 16 },
  emptySubtext: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 6, lineHeight: 18 }
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getOwnerBookings, getOwnerTurfs } from '../../services/dbService';
import { Booking, Turf } from '../../types';
import { TrendingUp, DollarSign, Users, Calendar, Award } from 'lucide-react-native';

export const OwnerAnalyticsScreen: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!user) return;
    try {
      const [bData, tData] = await Promise.all([
        getOwnerBookings(user.uid),
        getOwnerTurfs(user.uid),
      ]);
      setBookings(bData);
      setTurfs(tData);
    } catch (err) {
      console.warn('Error loading analytics:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalGross = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const totalSlots = bookings.length;
  const uniquePlayers = new Set(bookings.map((b) => b.playerId || b.playerPhone)).size;

  // Day breakdown
  const dayBookings: Record<string, number> = {
    Mon: 0,
    Tue: 0,
    Wed: 0,
    Thu: 0,
    Fri: 0,
    Sat: 0,
    Sun: 0,
  };

  bookings.forEach((b) => {
    try {
      const d = new Date(b.date);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayKey = days[d.getDay()];
      if (dayBookings[dayKey] !== undefined) {
        dayBookings[dayKey] += 1;
      }
    } catch {}
  });

  const maxDayCount = Math.max(...Object.values(dayBookings), 1);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
    >
      {/* Gross Summary */}
      <View style={styles.topCard}>
        <Text style={styles.topLabel}>Total Gross Arena Bookings</Text>
        <Text style={styles.topGross}>₹{totalGross}</Text>
        <Text style={styles.topSub}>Across {totalSlots} reserved match slots</Text>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Calendar size={18} color="#10b981" />
          <Text style={styles.metricVal}>{totalSlots}</Text>
          <Text style={styles.metricLabel}>Total Slots Booked</Text>
        </View>

        <View style={styles.metricCard}>
          <Users size={18} color="#38bdf8" />
          <Text style={styles.metricVal}>{uniquePlayers}</Text>
          <Text style={styles.metricLabel}>Unique Athletes</Text>
        </View>
      </View>

      {/* Weekly Occupancy Histogram */}
      <Text style={styles.sectionTitle}>Weekly Pitch Occupancy Distribution</Text>
      <View style={styles.chartCard}>
        <View style={styles.barGrid}>
          {Object.entries(dayBookings).map(([day, count]) => {
            const heightPct = Math.max(12, Math.round((count / maxDayCount) * 100));
            return (
              <View key={day} style={styles.barCol}>
                <Text style={styles.barCount}>{count}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: `${heightPct}%` }]} />
                </View>
                <Text style={styles.barLabel}>{day}</Text>
              </View>
            );
          })}
        </View>
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
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#10b981',
    marginBottom: 16,
  },
  topLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  topGross: {
    fontSize: 28,
    fontWeight: '900',
    color: '#10b981',
    marginTop: 4,
  },
  topSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 6,
  },
  metricLabel: {
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
  chartCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  barGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
    paddingTop: 20,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 4,
  },
  barTrack: {
    width: 20,
    height: 100,
    backgroundColor: '#0b1120',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#10b981',
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 6,
  },
});

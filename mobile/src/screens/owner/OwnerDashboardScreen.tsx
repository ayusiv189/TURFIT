import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getOwnerTurfs, getOwnerBookings } from '../../services/dbService';
import { Turf, Booking } from '../../types';
import {
  TrendingUp,
  Calendar,
  Users,
  AlertCircle,
  Plus,
  Clock,
  CheckCircle,
  CreditCard,
  Building,
} from 'lucide-react-native';

interface OwnerDashboardScreenProps {
  navigation: any;
}

export const OwnerDashboardScreen: React.FC<OwnerDashboardScreenProps> = ({ navigation }) => {
  const { user, profile } = useAuth();
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user) return;
    try {
      const [tData, bData] = await Promise.all([
        getOwnerTurfs(user.uid),
        getOwnerBookings(user.uid),
      ]);
      setTurfs(tData);
      setBookings(bData);
    } catch (err) {
      console.warn('Error loading owner dashboard data:', err);
    } finally {
      setLoading(false);
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

  const todayStr = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter((b) => b.date === todayStr);
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const todayRevenue = todayBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const pendingDues = bookings.reduce((sum, b) => sum + (b.amountDue || 0), 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.bizName}>{profile?.businessName || 'My Sports Arena'}</Text>
          <Text style={styles.subText}>Arena Control & Dispatch Center</Text>
        </View>
        <TouchableOpacity
          style={styles.newBookingBtn}
          onPress={() => navigation.navigate('OwnerBookings', { openManualModal: true })}
        >
          <Plus size={16} color="#064e3b" />
          <Text style={styles.newBookingBtnText}>Walk-in</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Cards Grid */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Today's Revenue</Text>
          <Text style={styles.kpiValue}>₹{todayRevenue}</Text>
          <Text style={styles.kpiSub}>{todayBookings.length} slots booked today</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Pending Counter Dues</Text>
          <Text style={[styles.kpiValue, { color: '#f59e0b' }]}>₹{pendingDues}</Text>
          <Text style={styles.kpiSub}>To collect from players</Text>
        </View>
      </View>

      {/* Quick Navigation Action Hub */}
      <View style={styles.hubRow}>
        <TouchableOpacity
          style={styles.hubBtn}
          onPress={() => navigation.navigate('OwnerSlots')}
        >
          <Clock size={20} color="#10b981" />
          <Text style={styles.hubBtnText}>7-Day Slots</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.hubBtn}
          onPress={() => navigation.navigate('OwnerPaymentSettings')}
        >
          <CreditCard size={20} color="#34d399" />
          <Text style={styles.hubBtnText}>Payment ID</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.hubBtn}
          onPress={() => navigation.navigate('OwnerPlayersDues')}
        >
          <AlertCircle size={20} color="#f59e0b" />
          <Text style={styles.hubBtnText}>Player Dues</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.hubBtn}
          onPress={() => navigation.navigate('OwnerAnalytics')}
        >
          <TrendingUp size={20} color="#38bdf8" />
          <Text style={styles.hubBtnText}>Analytics</Text>
        </TouchableOpacity>
      </View>

      {/* Today's Live Pitch Schedule */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Pitch Schedule ({todayBookings.length})</Text>
          <TouchableOpacity onPress={() => navigation.navigate('OwnerBookings')}>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {todayBookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Calendar size={32} color="#64748b" />
            <Text style={styles.emptyTitle}>No Bookings For Today Yet</Text>
            <Text style={styles.emptyDesc}>Walk-in entries or online bookings will show up here live.</Text>
          </View>
        ) : (
          todayBookings.map((b) => (
            <View key={b.id} style={styles.bookingRow}>
              <View style={styles.timePill}>
                <Text style={styles.timeText}>{b.startTime}</Text>
                <Text style={styles.timeEndText}>{b.endTime}</Text>
              </View>

              <View style={styles.bookingInfo}>
                <Text style={styles.playerName}>{b.playerName}</Text>
                <Text style={styles.arenaSport}>{b.arenaName} • {b.sport}</Text>
              </View>

              <View style={styles.paymentCol}>
                <Text style={styles.amountText}>₹{b.totalAmount}</Text>
                <View
                  style={[
                    styles.statusPill,
                    b.paymentStatus === 'PAID' ? styles.statusPaid : styles.statusPending,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      b.paymentStatus === 'PAID' ? styles.statusPaidText : styles.statusPendingText,
                    ]}
                  >
                    {b.paymentStatus}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Registered Arenas List */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Turfs & Venues ({turfs.length})</Text>
          <TouchableOpacity onPress={() => navigation.navigate('OwnerTurfs')}>
            <Text style={styles.seeAllText}>Manage</Text>
          </TouchableOpacity>
        </View>

        {turfs.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={styles.turfItem}
            onPress={() => navigation.navigate('OwnerTurfs')}
          >
            <View style={styles.turfIconBox}>
              <Building size={20} color="#10b981" />
            </View>
            <View style={styles.turfTextCol}>
              <Text style={styles.turfItemName}>{t.name}</Text>
              <Text style={styles.turfItemLoc}>{t.area}, {t.city}</Text>
            </View>
            <Text style={styles.turfItemPrice}>₹{t.basePrice}/hr</Text>
          </TouchableOpacity>
        ))}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  bizName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  subText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  newBookingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  newBookingBtnText: {
    color: '#064e3b',
    fontSize: 12,
    fontWeight: '800',
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#10b981',
    marginTop: 6,
  },
  kpiSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
  hubRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  hubBtn: {
    flex: 1,
    backgroundColor: '#131b2e',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  hubBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cbd5e1',
    marginTop: 6,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  emptyCard: {
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  timePill: {
    backgroundColor: '#0b1120',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10b981',
  },
  timeEndText: {
    fontSize: 9,
    color: '#64748b',
  },
  bookingInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  arenaSport: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  paymentCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPaid: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusPaidText: {
    color: '#10b981',
  },
  statusPendingText: {
    color: '#f59e0b',
  },
  turfItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  turfIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  turfTextCol: {
    flex: 1,
  },
  turfItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  turfItemLoc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  turfItemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10b981',
  },
});

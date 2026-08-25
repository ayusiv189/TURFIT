import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { listenOwnerDues, settleDueByOwner } from '../../services/dbService';
import { PlayerDue } from '../../types';
import { Phone, CheckCircle, AlertTriangle, CreditCard, Banknote, ShieldCheck } from 'lucide-react-native';

export const OwnerPlayersDuesScreen: React.FC = () => {
  const { user } = useAuth();
  const [dues, setDues] = useState<PlayerDue[]>([]);
  const [settlingId, setSettlingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = listenOwnerDues(user.uid, (updatedDues) => {
      setDues(updatedDues);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSettleDue = async (due: PlayerDue, method: 'CASH' | 'UPI') => {
    setSettlingId(due.id);
    try {
      await settleDueByOwner(due.id, due.remainingAmount, method);
    } catch (err) {
      console.warn('Error settling due:', err);
    } finally {
      setSettlingId(null);
    }
  };

  const totalOutstanding = dues.reduce((sum, d) => sum + (d.remainingAmount || 0), 0);

  return (
    <View style={styles.container}>
      {/* Top Banner */}
      <View style={styles.banner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerLabel}>Total Outstanding Player Dues (Live)</Text>
          <Text style={styles.bannerAmount}>₹{totalOutstanding}</Text>
          <Text style={styles.bannerSub}>{dues.length} uncollected ground dues across your turfs</Text>
        </View>
      </View>

      <FlatList
        data={dues}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.playerName}>{item.playerName}</Text>
                <Text style={styles.arenaName}>{item.turfName} • {item.date}</Text>
                {item.startTime && (
                  <Text style={styles.slotTimeText}>Slot: {item.startTime} - {item.endTime}</Text>
                )}
              </View>
              <View style={styles.dueBox}>
                <Text style={styles.dueLabel}>Outstanding</Text>
                <Text style={styles.dueAmount}>₹{item.remainingAmount}</Text>
              </View>
            </View>

            <View style={styles.actionsRow}>
              {!!item.playerPhone && (
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => Linking.openURL(`tel:${item.playerPhone}`)}
                >
                  <Phone size={13} color="#38bdf8" />
                  <Text style={styles.callText}>Call Player</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.settleBtn, settlingId === item.id && styles.disabledBtn]}
                disabled={settlingId === item.id}
                onPress={() => handleSettleDue(item, 'CASH')}
              >
                {settlingId === item.id ? (
                  <ActivityIndicator size="small" color="#064e3b" />
                ) : (
                  <>
                    <Banknote size={14} color="#064e3b" />
                    <Text style={styles.settleText}>Collect Cash</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settleUpiBtn, settlingId === item.id && styles.disabledBtn]}
                disabled={settlingId === item.id}
                onPress={() => handleSettleDue(item, 'UPI')}
              >
                <CreditCard size={13} color="#10b981" />
                <Text style={styles.settleUpiText}>UPI</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <CheckCircle size={44} color="#10b981" />
            <Text style={styles.emptyTitle}>All Player Dues Cleared!</Text>
            <Text style={styles.emptyDesc}>No uncollected balances or pending slot dues recorded.</Text>
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
  banner: {
    backgroundColor: '#131b2e',
    margin: 16,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  bannerLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
  },
  bannerAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#f59e0b',
    marginTop: 4,
  },
  bannerSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  arenaName: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  slotTimeText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  dueBox: {
    alignItems: 'flex-end',
  },
  dueLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  dueAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ef4444',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 10,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  callText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8',
  },
  settleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  settleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#064e3b',
  },
  settleUpiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  settleUpiText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
});

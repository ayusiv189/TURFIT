import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import {
  listenPlayerDues,
  listenPlayerBookings,
  payPlayerDue,
  payAllPlayerDues,
} from '../../services/dbService';
import { Booking, PlayerDue } from '../../types';
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  QrCode,
  Copy,
  Receipt,
  Wallet,
} from 'lucide-react-native';

export const PlayerPaymentsScreen: React.FC = () => {
  const { user, profile } = useAuth();
  const [dues, setDues] = useState<PlayerDue[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<'DUES' | 'HISTORY'>('DUES');
  const [refreshing, setRefreshing] = useState(false);

  // Pay Due Modal State
  const [selectedDueToPay, setSelectedDueToPay] = useState<PlayerDue | null>(null);
  const [payAllMode, setPayAllMode] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [upiRefId, setUpiRefId] = useState('');
  const [upiCopied, setUpiCopied] = useState(false);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Real-time listener for dues and bookings
  useEffect(() => {
    if (!user) return;
    const unsubDues = listenPlayerDues(user.uid, (updatedDues) => {
      setDues(updatedDues);
    });
    const unsubBookings = listenPlayerBookings(user.uid, (updatedBookings) => {
      setBookings(updatedBookings);
    });

    return () => {
      unsubDues();
      unsubBookings();
    };
  }, [user]);

  const totalOutstandingDue = dues.reduce((acc, d) => acc + (d.remainingAmount || 0), 0);
  const totalPaid = bookings.reduce((acc, b) => acc + (b.amountPaid || 0), 0);

  const handleOpenPaySingleDue = (due: PlayerDue) => {
    setSelectedDueToPay(due);
    setPayAllMode(false);
    setPaymentSuccess(false);
    setShowPayModal(true);
  };

  const handleOpenPayAllDues = () => {
    if (dues.length === 0) return;
    setPayAllMode(true);
    setSelectedDueToPay(null);
    setPaymentSuccess(false);
    setShowPayModal(true);
  };

  const handleConfirmDuePayment = async () => {
    if (!user) return;
    setPaymentInProgress(true);
    const txnRef = upiRefId.trim() || `UPI-DUE-${Date.now().toString().slice(-8)}`;

    try {
      if (payAllMode) {
        await payAllPlayerDues(dues, 'UPI', txnRef);
      } else if (selectedDueToPay) {
        await payPlayerDue(selectedDueToPay.id, selectedDueToPay.remainingAmount, 'UPI', txnRef);
      }
      setPaymentSuccess(true);
      setTimeout(() => {
        setShowPayModal(false);
        setPaymentSuccess(false);
        setUpiRefId('');
      }, 1800);
    } catch (err) {
      console.warn('Error paying due:', err);
    } finally {
      setPaymentInProgress(false);
    }
  };

  const amountToPayNow = payAllMode
    ? totalOutstandingDue
    : selectedDueToPay
    ? selectedDueToPay.remainingAmount
    : 0;

  return (
    <View style={styles.container}>
      {/* Summary Metrics */}
      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, styles.dueMetricCard]}>
          <Text style={styles.metricLabel}>Total Outstanding Dues</Text>
          <Text style={styles.metricValueDue}>₹{totalOutstandingDue}</Text>
          <Text style={styles.metricSub}>{dues.length} pending settlement{dues.length === 1 ? '' : 's'}</Text>
        </View>

        <View style={[styles.metricCard, styles.paidMetricCard]}>
          <Text style={styles.metricLabel}>Total Paid to Date</Text>
          <Text style={styles.metricValuePaid}>₹{totalPaid}</Text>
          <Text style={styles.metricSub}>Settled transactions</Text>
        </View>
      </View>

      {/* Pay All Banner if dues exist */}
      {totalOutstandingDue > 0 && (
        <View style={styles.payAllBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.payAllTitle}>Clear All Pending Dues</Text>
            <Text style={styles.payAllSub}>Total balance to clear: ₹{totalOutstandingDue}</Text>
          </View>
          <TouchableOpacity style={styles.payAllBtn} onPress={handleOpenPayAllDues}>
            <Wallet size={16} color="#064e3b" />
            <Text style={styles.payAllBtnText}>Pay All ₹{totalOutstandingDue}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'DUES' && styles.tabBtnActive]}
          onPress={() => setActiveTab('DUES')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'DUES' && styles.tabBtnTextActive]}>
            Active Dues ({dues.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'HISTORY' && styles.tabBtnActive]}
          onPress={() => setActiveTab('HISTORY')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'HISTORY' && styles.tabBtnTextActive]}>
            Booking & Txn History ({bookings.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'DUES' ? (
        <FlatList
          data={dues}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.dueCard}>
              <View style={styles.dueCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.turfName}>{item.turfName}</Text>
                  <Text style={styles.dueMeta}>
                    {item.date} • {item.startTime ? `${item.startTime} - ${item.endTime}` : 'Slot Due'}
                  </Text>
                  {item.bookingRef && (
                    <Text style={styles.dueRefText}>Ref: {item.bookingRef}</Text>
                  )}
                </View>
                <View style={styles.dueAmountBox}>
                  <Text style={styles.dueAmountLabel}>Due</Text>
                  <Text style={styles.dueAmountVal}>₹{item.remainingAmount}</Text>
                </View>
              </View>

              <View style={styles.dueCardFooter}>
                <View style={styles.dueStatusPill}>
                  <Clock size={12} color="#f59e0b" />
                  <Text style={styles.dueStatusText}>{item.status}</Text>
                </View>
                <TouchableOpacity
                  style={styles.paySingleBtn}
                  onPress={() => handleOpenPaySingleDue(item)}
                >
                  <CreditCard size={14} color="#064e3b" />
                  <Text style={styles.paySingleBtnText}>Pay ₹{item.remainingAmount}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <CheckCircle size={44} color="#10b981" />
              <Text style={styles.emptyTitle}>All Dues Cleared!</Text>
              <Text style={styles.emptyDesc}>You have no outstanding payments or dues.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.txCard}>
              <View style={styles.txHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.turfName}>{item.turfName}</Text>
                  <Text style={styles.txDate}>{item.date} • {item.startTime}</Text>
                </View>
                <Text style={styles.txAmount}>₹{item.totalAmount}</Text>
              </View>

              <View style={styles.splitRow}>
                <View style={styles.splitItem}>
                  <Text style={styles.splitLabel}>Paid Online</Text>
                  <Text style={styles.splitValuePaid}>₹{item.amountPaid || 0}</Text>
                </View>

                <View style={styles.splitItem}>
                  <Text style={styles.splitLabel}>Pending Due</Text>
                  <Text style={[styles.splitValueDue, (item.amountDue || 0) > 0 && styles.splitHighlight]}>
                    ₹{item.amountDue || 0}
                  </Text>
                </View>

                <View style={styles.splitItemRight}>
                  <View
                    style={[
                      styles.badge,
                      item.paymentStatus === 'PAID'
                        ? styles.badgePaid
                        : item.bookingStatus === 'CANCELLED'
                        ? styles.badgeCancelled
                        : styles.badgePending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        item.paymentStatus === 'PAID'
                          ? styles.badgeTextPaid
                          : item.bookingStatus === 'CANCELLED'
                          ? styles.badgeTextCancelled
                          : styles.badgeTextPending,
                      ]}
                    >
                      {item.bookingStatus === 'CANCELLED' ? 'CANCELLED' : item.paymentStatus}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Receipt size={40} color="#64748b" />
              <Text style={styles.emptyTitle}>No Booking History</Text>
              <Text style={styles.emptyDesc}>Your bookings and transaction receipts will appear here.</Text>
            </View>
          }
        />
      )}

      {/* Pay Due Modal */}
      <Modal visible={showPayModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.upiCard}>
            {paymentSuccess ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <CheckCircle size={56} color="#10b981" />
                <Text style={styles.successTitle}>Payment Verified!</Text>
                <Text style={styles.successSub}>₹{amountToPayNow} has been settled from your dues.</Text>
              </View>
            ) : (
              <>
                <View style={styles.upiHeader}>
                  <QrCode size={26} color="#10b981" />
                  <View>
                    <Text style={styles.upiTitle}>Pay Dues via UPI</Text>
                    <Text style={styles.upiSubtitle}>
                      {payAllMode ? 'Settling All Outstanding Dues' : `Settling Due for ${selectedDueToPay?.turfName}`}
                    </Text>
                  </View>
                </View>

                <View style={styles.upiAmountBox}>
                  <Text style={styles.upiAmountLabel}>Amount to Pay</Text>
                  <Text style={styles.upiAmountValue}>₹{amountToPayNow}</Text>
                  <Text style={styles.upiBeneficiary}>
                    Paying to: {selectedDueToPay?.turfName || 'TruFit Sports'}
                  </Text>
                </View>

                {/* UPI VPA Box */}
                <View style={styles.upiIdBox}>
                  <View>
                    <Text style={styles.upiIdLabel}>UPI ID / VPA</Text>
                    <Text style={styles.upiIdValue}>trufit.pay@okaxis</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={() => {
                      setUpiCopied(true);
                      setTimeout(() => setUpiCopied(false), 2000);
                    }}
                  >
                    <Copy size={14} color="#10b981" />
                    <Text style={styles.copyBtnText}>{upiCopied ? 'Copied' : 'Copy'}</Text>
                  </TouchableOpacity>
                </View>

                {/* UTR Input */}
                <Text style={styles.utrLabel}>UPI Reference / UTR Number (Optional)</Text>
                <TextInput
                  style={styles.utrInput}
                  placeholder="e.g. 508219382910"
                  placeholderTextColor="#64748b"
                  value={upiRefId}
                  onChangeText={setUpiRefId}
                />

                <TouchableOpacity
                  style={[styles.upiSubmitBtn, paymentInProgress && styles.disabledButton]}
                  disabled={paymentInProgress}
                  onPress={handleConfirmDuePayment}
                >
                  {paymentInProgress ? (
                    <ActivityIndicator color="#064e3b" />
                  ) : (
                    <Text style={styles.upiSubmitText}>Confirm Payment of ₹{amountToPayNow}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.upiCancelBtn}
                  onPress={() => setShowPayModal(false)}
                >
                  <Text style={styles.upiCancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
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
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  paidMetricCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  dueMetricCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  metricLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
    marginBottom: 4,
  },
  metricValuePaid: {
    fontSize: 22,
    fontWeight: '900',
    color: '#10b981',
  },
  metricValueDue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#f59e0b',
  },
  metricSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
  payAllBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payAllTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f59e0b',
  },
  payAllSub: {
    fontSize: 11,
    color: '#cbd5e1',
    marginTop: 2,
  },
  payAllBtn: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  payAllBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#064e3b',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#131b2e',
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#10b981',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  tabBtnTextActive: {
    color: '#064e3b',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  dueCard: {
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  dueCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  turfName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  dueMeta: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  dueRefText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  dueAmountBox: {
    alignItems: 'flex-end',
  },
  dueAmountLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  dueAmountVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#f59e0b',
  },
  dueCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 10,
  },
  dueStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dueStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#f59e0b',
  },
  paySingleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  paySingleBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#064e3b',
  },
  txCard: {
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  txDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  splitRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 10,
    alignItems: 'center',
  },
  splitItem: {
    flex: 1,
  },
  splitItemRight: {
    alignItems: 'flex-end',
  },
  splitLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  splitValuePaid: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10b981',
  },
  splitValueDue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#94a3b8',
  },
  splitHighlight: {
    color: '#f59e0b',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgePaid: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgePending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  badgeCancelled: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  badgeTextPaid: {
    color: '#10b981',
  },
  badgeTextPending: {
    color: '#f59e0b',
  },
  badgeTextCancelled: {
    color: '#ef4444',
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
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  upiCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  upiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  upiTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  upiSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
  },
  upiAmountBox: {
    backgroundColor: '#0b1120',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  upiAmountLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  upiAmountValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#10b981',
    marginVertical: 4,
  },
  upiBeneficiary: {
    fontSize: 11,
    color: '#cbd5e1',
  },
  upiIdBox: {
    backgroundColor: '#0b1120',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  upiIdLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  upiIdValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  utrLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 6,
  },
  utrInput: {
    backgroundColor: '#0b1120',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  upiSubmitBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  upiSubmitText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#064e3b',
  },
  upiCancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  upiCancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  disabledButton: {
    backgroundColor: '#334155',
    opacity: 0.6,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 12,
  },
  successSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
});

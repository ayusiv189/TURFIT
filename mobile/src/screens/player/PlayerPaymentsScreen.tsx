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
  listenPlayerFinancialLedger,
  payPlayerDue,
  payAllPlayerDues,
  getTurfById,
  getAdminPaymentConfig,
} from '../../services/dbService';
import { Booking, PlayerDue, FinancialLedgerEntry } from '../../types';
import { DirectUpiModal } from '../../components/DirectUpiModal';
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  QrCode,
  Copy,
  Receipt,
  Wallet,
  FileText,
  DollarSign,
  UserX,
  RotateCcw,
} from 'lucide-react-native';

export const PlayerPaymentsScreen: React.FC = () => {
  const { user, profile } = useAuth();
  const [dues, setDues] = useState<PlayerDue[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<FinancialLedgerEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'DUES' | 'HISTORY' | 'LEDGER'>('DUES');

  // Pay Due Modal State
  const [selectedDueToPay, setSelectedDueToPay] = useState<PlayerDue | null>(null);
  const [adminPaymentConfig, setAdminPaymentConfig] = useState<any>(null);
  const [dueTurfUpiId, setDueTurfUpiId] = useState('turfit.sports@okaxis');
  const [dueTurfBeneficiary, setDueTurfBeneficiary] = useState('TruFit Sports Admin');
  const [payAllMode, setPayAllMode] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [upiRefId, setUpiRefId] = useState('');
  const [upiCopied, setUpiCopied] = useState(false);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Real-time listeners & Admin Config
  useEffect(() => {
    getAdminPaymentConfig().then((cfg) => {
      if (cfg) {
        setAdminPaymentConfig(cfg);
        if (cfg.upiId) setDueTurfUpiId(cfg.upiId);
        if (cfg.beneficiaryName) setDueTurfBeneficiary(cfg.beneficiaryName);
      }
    }).catch((err) => console.warn('Error loading admin payment config:', err));
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubDues = listenPlayerDues(user.uid, (updatedDues) => {
      setDues(updatedDues);
    });
    const unsubBookings = listenPlayerBookings(user.uid, (updatedBookings) => {
      setBookings(updatedBookings);
    });
    const unsubLedger = listenPlayerFinancialLedger(user.uid, (updatedLedger) => {
      setLedgerEntries(updatedLedger);
    });

    return () => {
      unsubDues();
      unsubBookings();
      unsubLedger();
    };
  }, [user]);

  const totalOutstandingDue = dues.reduce((acc, d) => acc + (d.remainingAmount || 0), 0);
  const totalPaid = bookings.reduce((acc, b) => acc + (b.amountPaid || 0), 0);

  const handleOpenPaySingleDue = async (due: PlayerDue) => {
    setSelectedDueToPay(due);
    setPayAllMode(false);
    setPaymentSuccess(false);
    if (adminPaymentConfig?.upiId) {
      setDueTurfUpiId(adminPaymentConfig.upiId);
      setDueTurfBeneficiary(adminPaymentConfig.beneficiaryName || 'TruFit Sports Admin');
    }
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
            Bookings ({bookings.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'LEDGER' && styles.tabBtnActive]}
          onPress={() => setActiveTab('LEDGER')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'LEDGER' && styles.tabBtnTextActive]}>
            Ledger Trail ({ledgerEntries.length})
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
                  {item.dueType && (
                    <View style={styles.dueTypeBadge}>
                      <Text style={styles.dueTypeBadgeText}>
                        {item.dueType === 'NO_SHOW_PENALTY' ? 'NO-SHOW PENALTY' : item.dueType === 'PARTIAL_PAYMENT_BALANCE' ? 'ADVANCE BALANCE' : 'MATCH DUE'}
                      </Text>
                    </View>
                  )}
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
      ) : activeTab === 'HISTORY' ? (
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
      ) : (
        <FlatList
          data={ledgerEntries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isCredit = item.entryType === 'REFUND_CREDIT';
            return (
              <View style={styles.ledgerCard}>
                <View style={styles.ledgerHeader}>
                  <View style={styles.ledgerIconBox}>
                    {isCredit ? (
                      <ArrowDownLeft size={16} color="#10b981" />
                    ) : item.entryType === 'NO_SHOW_PENALTY' ? (
                      <UserX size={16} color="#ef4444" />
                    ) : item.entryType === 'DUE_SETTLEMENT' ? (
                      <CheckCircle size={16} color="#38bdf8" />
                    ) : (
                      <ArrowUpRight size={16} color="#f59e0b" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ledgerTitle}>{item.turfName || 'Match Transaction'}</Text>
                    <Text style={styles.ledgerDesc}>{item.description}</Text>
                    <Text style={styles.ledgerTime}>{new Date(item.timestamp || item.createdAt).toLocaleString()}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.ledgerAmount, isCredit && styles.ledgerAmountCredit]}>
                      {isCredit ? '+' : ''}₹{item.amount}
                    </Text>
                    <View style={styles.idempotencyBadge}>
                      <Text style={styles.idempotencyText}>Verified</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <FileText size={40} color="#64748b" />
              <Text style={styles.emptyTitle}>No Financial Entries</Text>
              <Text style={styles.emptyDesc}>Your immutable transaction logs will appear here.</Text>
            </View>
          }
        />
      )}

      {/* Direct UPI Intent & Dynamic QR Modal */}
      <DirectUpiModal
        visible={showPayModal}
        onClose={() => setShowPayModal(false)}
        amount={amountToPayNow}
        upiId={dueTurfUpiId}
        payeeName={dueTurfBeneficiary}
        transactionNote={
          payAllMode
            ? 'Settle All TurFit Player Dues'
            : `Due for ${selectedDueToPay?.turfName} (${selectedDueToPay?.date || 'Match'})`
        }
        bookingRef={selectedDueToPay?.bookingRef || selectedDueToPay?.id?.slice(-8) || `DUE${Date.now().toString().slice(-6)}`}
        subTitle={
          payAllMode
            ? '0% Fee Settlement for All Dues'
            : `0% Fee Direct Settlement to ${dueTurfBeneficiary}`
        }
        turfId={selectedDueToPay?.turfId}
        ownerId={selectedDueToPay?.ownerId}
        playerId={user?.uid}
        isMerchantUpi={true}
        merchantProvider="PHONEPE_BUSINESS"
        onConfirmPayment={async (utrRef) => {
          if (!user) return;
          if (payAllMode) {
            await payAllPlayerDues(dues, 'UPI', utrRef);
          } else if (selectedDueToPay) {
            await payPlayerDue(selectedDueToPay.id, selectedDueToPay.remainingAmount, 'UPI', utrRef);
          }
          setShowPayModal(false);
        }}
      />
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
    padding: 16,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  dueMetricCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  paidMetricCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  metricLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  metricValueDue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f59e0b',
    marginVertical: 2,
  },
  metricValuePaid: {
    fontSize: 22,
    fontWeight: '800',
    color: '#10b981',
    marginVertical: 2,
  },
  metricSub: {
    fontSize: 11,
    color: '#64748b',
  },
  payAllBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131b2e',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  payAllTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  payAllSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  payAllBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  payAllBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#064e3b',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#1e293b',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabBtnTextActive: {
    color: '#10b981',
  },
  listContent: {
    padding: 16,
    paddingBottom: 60,
  },
  dueCard: {
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  dueCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  turfName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
  dueMeta: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  dueTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  dueTypeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38bdf8',
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
    color: '#94a3b8',
  },
  dueAmountVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f59e0b',
  },
  dueCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  dueStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f59e0b',
  },
  paySingleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  paySingleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#064e3b',
  },
  txCard: {
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 10,
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  txDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  splitItem: {
    flex: 1,
  },
  splitItemRight: {
    alignItems: 'flex-end',
  },
  splitLabel: {
    fontSize: 10,
    color: '#94a3b8',
  },
  splitValuePaid: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  splitValueDue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  splitHighlight: {
    color: '#f59e0b',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
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
    fontWeight: '700',
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
  ledgerCard: {
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 8,
  },
  ledgerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ledgerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#0a0f1d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  ledgerDesc: {
    fontSize: 11,
    color: '#cbd5e1',
    marginTop: 1,
  },
  ledgerTime: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  ledgerAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#f8fafc',
  },
  ledgerAmountCredit: {
    color: '#10b981',
  },
  idempotencyBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  idempotencyText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10b981',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  upiCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  upiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  upiTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  upiSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
  },
  upiAmountBox: {
    backgroundColor: '#0a0f1d',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  upiAmountLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  upiAmountValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#10b981',
    marginVertical: 2,
  },
  upiBeneficiary: {
    fontSize: 11,
    color: '#cbd5e1',
  },
  upiIdBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0a0f1d',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  upiIdLabel: {
    fontSize: 10,
    color: '#94a3b8',
  },
  upiIdValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f8fafc',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
  utrLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
  },
  utrInput: {
    backgroundColor: '#0a0f1d',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#f8fafc',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  upiSubmitBtn: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  upiSubmitText: {
    color: '#064e3b',
    fontSize: 13,
    fontWeight: '700',
  },
  upiCancelBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  upiCancelText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
    marginTop: 8,
  },
  successSub: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
});

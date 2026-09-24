import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import {
  getOwnerTurfs,
  getOwnerBookings,
  requestOwnerWithdrawal,
  getOwnerPayoutRequests,
  deleteOwnerTestData,
  calculateBookingFinancialSplit,
} from '../../services/dbService';
import { Turf } from '../../types';
import {
  Building,
  ShieldCheck,
  CheckCircle,
  DollarSign,
  Landmark,
  Save,
  Info,
  Trash2,
  Receipt,
  ArrowDownToLine,
  Smartphone,
} from 'lucide-react-native';

export const OwnerPaymentSettingsScreen: React.FC = () => {
  const { user, profile, updateProfileData } = useAuth();
  const [turfs, setTurfs] = useState<Turf[]>([]);

  // Payout Destination Details for receiving settlements from Admin
  const existingPayout = profile?.paymentSettings || {};
  const [payoutUpi, setPayoutUpi] = useState(existingPayout.upiId || '');
  const [payoutBeneficiary, setPayoutBeneficiary] = useState(
    existingPayout.beneficiaryName || profile?.businessName || profile?.displayName || ''
  );
  const [payoutBankName, setPayoutBankName] = useState(existingPayout.bankName || '');
  const [payoutBankAccount, setPayoutBankAccount] = useState(existingPayout.bankAccount || existingPayout.accountNumber || '');
  const [payoutIfsc, setPayoutIfsc] = useState(existingPayout.ifscCode || '');
  const [savingPayoutPref, setSavingPayoutPref] = useState(false);

  // Withdrawal & Wallet State
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('5000');
  const [withdrawDestination, setWithdrawDestination] = useState(
    existingPayout.upiId || existingPayout.bankAccount || existingPayout.accountNumber || ''
  );
  const [requestingWithdrawal, setRequestingWithdrawal] = useState(false);

  const [bookings, setBookings] = useState<any[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  const [loadingWallet, setLoadingWallet] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      loadWalletData();
      getOwnerTurfs(user.uid).then((data) => setTurfs(data));
    }
  }, [user]);

  const loadWalletData = async () => {
    if (!user?.uid) return;
    try {
      setLoadingWallet(true);
      const ownerBookings = await getOwnerBookings(user.uid);
      setBookings(ownerBookings);
      const requests = await getOwnerPayoutRequests(user.uid);
      setPayoutHistory(requests);
    } catch (err) {
      console.warn('Error loading mobile wallet data:', err);
    } finally {
      setLoadingWallet(false);
    }
  };

  // Financial breakdown calculated accurately per-booking:
  // - Online Revenue: Payments made via Central Gateway into admin escrow (withdrawable by owner)
  // - Counter Cash: Payments collected directly by owner at turf desk (already in owner's hands)
  const financialTotals = bookings.reduce(
    (acc, b) => {
      const split = calculateBookingFinancialSplit(b);
      return {
        onlineRevenue: acc.onlineRevenue + split.onlineRevenue,
        cashRevenue: acc.cashRevenue + split.cashRevenue,
        pendingDue: acc.pendingDue + split.pendingDue,
      };
    },
    { onlineRevenue: 0, cashRevenue: 0, pendingDue: 0 }
  );

  const onlineRevenue = financialTotals.onlineRevenue;
  const cashRevenue = financialTotals.cashRevenue;
  const totalRevenue = onlineRevenue + cashRevenue;

  const alreadyWithdrawn = payoutHistory
    .filter((p) => p.status === 'COMPLETED' || p.status === 'REQUESTED')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const availableOnlineBalance = Math.max(0, onlineRevenue - alreadyWithdrawn);

  const handleSavePayoutPreferences = async () => {
    if (!user?.uid) return;
    setSavingPayoutPref(true);
    try {
      await updateProfileData({
        paymentSettings: {
          ...(profile?.paymentSettings || {}),
          upiId: payoutUpi.trim() || undefined,
          beneficiaryName: payoutBeneficiary.trim() || undefined,
          bankName: payoutBankName.trim() || undefined,
          bankAccount: payoutBankAccount.trim() || undefined,
          accountNumber: payoutBankAccount.trim() || undefined,
          ifscCode: payoutIfsc.trim().toUpperCase() || undefined,
          updatedAt: new Date().toISOString(),
        },
      });
      Alert.alert('Settlement Saved', 'Your receiving bank/UPI details have been updated for Admin payouts.');
    } catch (err) {
      console.warn('Error saving payout preferences:', err);
      Alert.alert('Error', 'Failed to save settlement preferences.');
    } finally {
      setSavingPayoutPref(false);
    }
  };

  const handleRequestWithdrawal = async () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid withdrawal amount.');
      return;
    }
    if (amt > availableOnlineBalance) {
      Alert.alert('Exceeds Balance', 'Withdrawal amount cannot exceed available online balance. Note: Counter cash is collected directly by you in-person.');
      return;
    }
    const destination = withdrawDestination.trim() || payoutUpi.trim() || payoutBankAccount.trim();
    if (!destination) {
      Alert.alert('Required', 'Please enter your payout UPI ID or Bank Account Number.');
      return;
    }

    try {
      setRequestingWithdrawal(true);
      const turfNames = turfs.map((t: any) => t.name).join(', ') || profile?.businessName || 'Turf Sports Arena';
      const ownerName = profile?.displayName || profile?.businessName || user?.displayName || user?.email || 'Turf Owner';
      await requestOwnerWithdrawal({
        ownerId: user!.uid,
        ownerName,
        turfId: turfs[0]?.id || undefined,
        turfName: turfNames,
        amount: amt,
        destination,
        notes: `Mobile withdrawal request for ${turfNames}`,
      });
      setShowWithdrawModal(false);
      loadWalletData();
      Alert.alert('Withdrawal Requested', `Submitted withdrawal request for ₹${amt.toLocaleString('en-IN')}. Admin will disburse to ${destination}.`);
    } catch (err) {
      Alert.alert('Error', 'Failed to submit withdrawal request.');
    } finally {
      setRequestingWithdrawal(false);
    }
  };

  const handleClearTestData = async () => {
    if (!user?.uid) return;
    try {
      await deleteOwnerTestData(user.uid);
      Alert.alert('Success', 'Test data cleared successfully.');
      loadWalletData();
    } catch (err) {
      Alert.alert('Error', 'Failed to clear test data.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Central Admin Gateway Escrow Header */}
      <View style={styles.policyCard}>
        <View style={styles.policyHeader}>
          <View style={styles.iconCircle}>
            <ShieldCheck size={22} color="#10b981" />
          </View>
          <View style={styles.policyTitleBox}>
            <Text style={styles.policyTag}>CENTRAL ADMIN ESCROW</Text>
            <Text style={styles.policyTitle}>Owner Earnings & Payout Wallet</Text>
          </View>
        </View>
        <Text style={styles.policyDesc}>
          All slot booking and matchmaking payments are processed securely through the <Text style={styles.boldText}>Master TruFit Admin Gateway</Text>. Turf owners do not need to configure personal payment gateways for athletes.
        </Text>
      </View>

      {/* Revenue & Balance Card */}
      <View style={styles.revenueCard}>
        <View style={styles.revenueHeader}>
          <View>
            <Text style={styles.sectionTitle}>Financial Breakdown</Text>
            <Text style={styles.sectionSubtitle}>Across all {turfs.length} managed venues</Text>
          </View>
          <TouchableOpacity
            style={[styles.withdrawBtn, availableOnlineBalance <= 0 && styles.disabledBtn]}
            onPress={() => {
              setWithdrawDestination(payoutUpi || payoutBankAccount || '');
              setShowWithdrawModal(true);
            }}
            disabled={availableOnlineBalance <= 0}
          >
            <ArrowDownToLine size={14} color="#ffffff" />
            <Text style={styles.withdrawBtnText}>Withdraw Online</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>TOTAL REVENUE</Text>
            <Text style={styles.statValue}>₹{totalRevenue.toLocaleString('en-IN')}</Text>
            <Text style={styles.statSub}>Online + Cash</Text>
          </View>

          <View style={[styles.statBox, styles.statBoxOnline]}>
            <Text style={[styles.statLabel, { color: '#10b981' }]}>ONLINE BALANCE</Text>
            <Text style={[styles.statValue, { color: '#10b981' }]}>₹{availableOnlineBalance.toLocaleString('en-IN')}</Text>
            <Text style={styles.statSub}>Held by Admin (Withdrawable)</Text>
          </View>

          <View style={[styles.statBox, styles.statBoxCash]}>
            <Text style={[styles.statLabel, { color: '#f59e0b' }]}>COUNTER CASH</Text>
            <Text style={[styles.statValue, { color: '#f59e0b' }]}>₹{cashRevenue.toLocaleString('en-IN')}</Text>
            <Text style={styles.statSub}>In-hand at Venue</Text>
          </View>
        </View>
      </View>

      {/* Admin Settlement Destination Form */}
      <View style={styles.formCard}>
        <View style={styles.cardHeader}>
          <Landmark size={20} color="#818cf8" />
          <Text style={styles.cardTitle}>Admin Settlement Receiving Account</Text>
        </View>
        <Text style={styles.cardSubtitle}>
          Provide the Bank Account or UPI ID where TruFit Admin will deposit your online booking withdrawals.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Account Holder / Beneficiary Name</Text>
          <TextInput
            style={styles.input}
            value={payoutBeneficiary}
            onChangeText={setPayoutBeneficiary}
            placeholder="e.g. Apex Sports Management LLP"
            placeholderTextColor="#64748b"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Payout UPI ID / VPA (Instant Settlement)</Text>
          <TextInput
            style={[styles.input, styles.monoInput]}
            value={payoutUpi}
            onChangeText={setPayoutUpi}
            placeholder="e.g. owner@okaxis or 9876543210@paytm"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Bank Name</Text>
            <TextInput
              style={styles.input}
              value={payoutBankName}
              onChangeText={setPayoutBankName}
              placeholder="e.g. HDFC Bank"
              placeholderTextColor="#64748b"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>IFSC Code</Text>
            <TextInput
              style={[styles.input, styles.monoInput]}
              value={payoutIfsc}
              onChangeText={setPayoutIfsc}
              placeholder="HDFC0001234"
              placeholderTextColor="#64748b"
              autoCapitalize="characters"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bank Account Number</Text>
          <TextInput
            style={[styles.input, styles.monoInput]}
            value={payoutBankAccount}
            onChangeText={setPayoutBankAccount}
            placeholder="50100234567890"
            placeholderTextColor="#64748b"
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSavePayoutPreferences}
          disabled={savingPayoutPref}
        >
          {savingPayoutPref ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Save size={16} color="#ffffff" />
              <Text style={styles.saveBtnText}>Save Receiving Details</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Settlement Logs & History */}
      <View style={styles.formCard}>
        <View style={styles.historyHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Receipt size={18} color="#818cf8" />
            <Text style={styles.cardTitle}>Withdrawal & Payout History</Text>
          </View>
          <TouchableOpacity style={styles.clearBtn} onPress={handleClearTestData}>
            <Trash2 size={12} color="#ef4444" />
            <Text style={styles.clearBtnText}>Clear Test</Text>
          </TouchableOpacity>
        </View>

        {payoutHistory.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No withdrawal requests yet. Use 'Withdraw Online' above when you have available earnings.</Text>
          </View>
        ) : (
          payoutHistory.map((req, idx) => (
            <View key={req.id || idx} style={styles.historyRow}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.historyAmount}>₹{req.amount?.toLocaleString('en-IN')}</Text>
                  <View style={[styles.badge, req.status === 'COMPLETED' ? styles.badgeSuccess : styles.badgePending]}>
                    <Text style={[styles.badgeText, req.status === 'COMPLETED' ? styles.badgeTextSuccess : styles.badgeTextPending]}>
                      {req.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.historyDest}>To: {req.destination}</Text>
                <Text style={styles.historyDate}>{new Date(req.date || Date.now()).toLocaleDateString()}</Text>
              </View>
              {req.utr && <Text style={styles.historyUtr}>UTR: {req.utr}</Text>}
            </View>
          ))
        )}
      </View>

      {/* Withdrawal Modal */}
      <Modal visible={showWithdrawModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Withdraw Online Earnings</Text>
              <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBalanceBox}>
              <Text style={styles.modalBalanceLabel}>AVAILABLE ONLINE BALANCE</Text>
              <Text style={styles.modalBalanceVal}>₹{availableOnlineBalance.toLocaleString('en-IN')}</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Withdrawal Amount (₹)</Text>
              <TextInput
                style={[styles.input, styles.monoInput]}
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                keyboardType="numeric"
                placeholder="5000"
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Settlement Destination (UPI or Bank)</Text>
              <TextInput
                style={[styles.input, styles.monoInput]}
                value={withdrawDestination}
                onChangeText={setWithdrawDestination}
                placeholder="e.g. owner@okaxis or Bank A/C"
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowWithdrawModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleRequestWithdrawal}
                disabled={requestingWithdrawal || parseFloat(withdrawAmount) > availableOnlineBalance}
              >
                {requestingWithdrawal ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Submit Payout</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  policyCard: {
    backgroundColor: '#064e3b20',
    borderColor: '#10b98140',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#10b98120',
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyTitleBox: {
    flex: 1,
  },
  policyTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: 1,
  },
  policyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  policyDesc: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '700',
    color: '#ffffff',
  },
  revenueCard: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
  },
  withdrawBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  disabledBtn: {
    opacity: 0.4,
  },
  withdrawBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#020617',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
  },
  statBoxOnline: {
    borderColor: '#10b98140',
  },
  statBoxCash: {
    borderColor: '#f59e0b40',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    marginVertical: 2,
  },
  statSub: {
    fontSize: 9,
    color: '#64748b',
  },
  formCard: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 14,
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#020617',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 12,
  },
  monoInput: {
    fontFamily: 'monospace',
  },
  row: {
    flexDirection: 'row',
  },
  saveBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#ef444415',
    borderRadius: 6,
  },
  clearBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ef4444',
  },
  emptyBox: {
    padding: 16,
    backgroundColor: '#020617',
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
  historyRow: {
    backgroundColor: '#020617',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  historyDest: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  historyDate: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  historyUtr: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#818cf8',
    backgroundColor: '#312e8130',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeSuccess: {
    backgroundColor: '#10b98120',
  },
  badgePending: {
    backgroundColor: '#f59e0b20',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  badgeTextSuccess: {
    color: '#10b981',
  },
  badgeTextPending: {
    color: '#f59e0b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000cc',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '700',
  },
  modalBalanceBox: {
    backgroundColor: '#020617',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  modalBalanceLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
  },
  modalBalanceVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#10b981',
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});

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
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getOwnerTurfs, updateTurfPaymentDetails } from '../../services/dbService';
import { Turf } from '../../types';
import {
  CreditCard,
  Building,
  ShieldCheck,
  QrCode,
  Smartphone,
  CheckCircle,
  Copy,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Eye,
  Edit3,
} from 'lucide-react-native';

export const OwnerPaymentSettingsScreen: React.FC = () => {
  const { user, profile, updateProfileData } = useAuth();
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [selectedTurf, setSelectedTurf] = useState<Turf | null>(null);

  // Global Owner Payment Settings
  const [upiId, setUpiId] = useState(profile?.paymentSettings?.upiId || '');
  const [beneficiaryName, setBeneficiaryName] = useState(
    profile?.paymentSettings?.beneficiaryName || profile?.businessName || profile?.displayName || ''
  );
  const [bankAccount, setBankAccount] = useState(profile?.paymentSettings?.bankAccount || '');
  const [ifscCode, setIfscCode] = useState(profile?.paymentSettings?.ifscCode || '');
  const [qrCodeUrl, setQrCodeUrl] = useState(profile?.paymentSettings?.qrCodeUrl || '');
  const [razorpayKeyId, setRazorpayKeyId] = useState(profile?.paymentSettings?.razorpayKeyId || '');

  // Turf-specific override state
  const [turfUpiId, setTurfUpiId] = useState('');
  const [turfBeneficiary, setTurfBeneficiary] = useState('');
  const [turfQrUrl, setTurfQrUrl] = useState('');

  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingTurf, setSavingTurf] = useState(false);
  const [simulatingPayment, setSimulatingPayment] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      getOwnerTurfs(user.uid).then((data) => {
        setTurfs(data);
        if (data.length > 0) {
          setSelectedTurf(data[0]);
          setTurfUpiId(data[0].upiId || '');
          setTurfBeneficiary(data[0].beneficiaryName || '');
          setTurfQrUrl(data[0].qrCodeUrl || '');
        }
      });
    }
  }, [user]);

  useEffect(() => {
    if (selectedTurf) {
      setTurfUpiId(selectedTurf.upiId || '');
      setTurfBeneficiary(selectedTurf.beneficiaryName || '');
      setTurfQrUrl(selectedTurf.qrCodeUrl || '');
    }
  }, [selectedTurf]);

  const handleSaveGlobalSettings = async () => {
    if (!upiId.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid UPI ID / VPA.');
      return;
    }
    setSavingGlobal(true);
    try {
      await updateProfileData({
        paymentSettings: {
          upiId: upiId.trim(),
          beneficiaryName: beneficiaryName.trim(),
          bankAccount: bankAccount.trim(),
          ifscCode: ifscCode.trim(),
          qrCodeUrl: qrCodeUrl.trim(),
          razorpayKeyId: razorpayKeyId.trim(),
          updatedAt: new Date().toISOString(),
        },
      });
      Alert.alert('Payment Hub Saved', 'Your primary UPI & direct payout settings are updated live.');
    } catch (err) {
      console.warn('Error saving global payment settings:', err);
      Alert.alert('Error', 'Failed to save payment settings.');
    } finally {
      setSavingGlobal(false);
    }
  };

  const handleSaveTurfOverride = async () => {
    if (!selectedTurf) return;
    setSavingTurf(true);
    try {
      await updateTurfPaymentDetails(selectedTurf.id, {
        upiId: turfUpiId.trim() || undefined,
        beneficiaryName: turfBeneficiary.trim() || undefined,
        qrCodeUrl: turfQrUrl.trim() || undefined,
      });

      // Update local turf list
      setTurfs((prev) =>
        prev.map((t) =>
          t.id === selectedTurf.id
            ? { ...t, upiId: turfUpiId.trim(), beneficiaryName: turfBeneficiary.trim(), qrCodeUrl: turfQrUrl.trim() }
            : t
        )
      );
      Alert.alert('Turf Override Saved', `Payment receiver for "${selectedTurf.name}" has been updated.`);
    } catch (err) {
      console.warn('Error saving turf override:', err);
      Alert.alert('Error', 'Failed to save turf payment override.');
    } finally {
      setSavingTurf(false);
    }
  };

  const handleSimulatePayment = () => {
    setSimulatingPayment(true);
    setTestSuccess(false);
    setTimeout(() => {
      setSimulatingPayment(false);
      setTestSuccess(true);
      Alert.alert('Test Settlement Successful', '₹1500 simulated payment reached your designated UPI VPA.');
    }, 1500);
  };

  const activeVpa = (selectedTurf?.upiId || upiId) || 'owner@okhdfcbank';
  const activeBeneficiary = (selectedTurf?.beneficiaryName || beneficiaryName) || profile?.businessName || 'TruFit Arena Partner';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Header Banner */}
      <View style={styles.headerCard}>
        <View style={styles.headerIconBox}>
          <CreditCard size={24} color="#10b981" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Owner Payment ID & Payouts</Text>
          <Text style={styles.headerSubtitle}>
            Configure your UPI VPA, QR standee & bank details to receive real-time direct player prepayments.
          </Text>
        </View>
      </View>

      {/* Primary Settlement Account */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <ShieldCheck size={18} color="#10b981" />
          <Text style={styles.cardTitle}>Global Payout & UPI Details</Text>
        </View>

        <Text style={styles.label}>Primary UPI ID / VPA (Instant Credit)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. yourturf@okhdfcbank or 9820012345@paytm"
          placeholderTextColor="#64748b"
          value={upiId}
          onChangeText={setUpiId}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Registered Beneficiary / Business Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. KickOff Sports Pvt Ltd"
          placeholderTextColor="#64748b"
          value={beneficiaryName}
          onChangeText={setBeneficiaryName}
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>Bank Account No.</Text>
            <TextInput
              style={styles.input}
              placeholder="50200012345678"
              placeholderTextColor="#64748b"
              value={bankAccount}
              onChangeText={setBankAccount}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>IFSC Code</Text>
            <TextInput
              style={styles.input}
              placeholder="HDFC0000123"
              placeholderTextColor="#64748b"
              value={ifscCode}
              onChangeText={setIfscCode}
              autoCapitalize="characters"
            />
          </View>
        </View>

        <Text style={styles.label}>QR Code Standee Image URL (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="https://example.com/my-turf-qr.png"
          placeholderTextColor="#64748b"
          value={qrCodeUrl}
          onChangeText={setQrCodeUrl}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Custom Razorpay Key ID (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="rzp_live_xxxxxxxxxxxxxxxx"
          placeholderTextColor="#64748b"
          value={razorpayKeyId}
          onChangeText={setRazorpayKeyId}
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.saveBtn, savingGlobal && styles.disabledBtn]}
          onPress={handleSaveGlobalSettings}
          disabled={savingGlobal}
        >
          {savingGlobal ? (
            <ActivityIndicator color="#064e3b" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save Global Payment Settings</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Turf Specific Overrides */}
      {turfs.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Building size={18} color="#38bdf8" />
            <Text style={styles.cardTitle}>Venue-Specific Payment Overrides</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            Have different partners or bank accounts for specific grounds? Set custom UPI receivers below:
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.turfChipsScroll}>
            {turfs.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.turfChip, selectedTurf?.id === t.id && styles.turfChipActive]}
                onPress={() => setSelectedTurf(t)}
              >
                <Text style={[styles.turfChipText, selectedTurf?.id === t.id && styles.turfChipTextActive]}>
                  {t.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedTurf && (
            <View style={styles.overrideBox}>
              <Text style={styles.overrideHeading}>Configuring: {selectedTurf.name}</Text>

              <Text style={styles.label}>Venue Specific UPI ID</Text>
              <TextInput
                style={styles.input}
                placeholder={upiId || 'e.g. ground1@okhdfcbank'}
                placeholderTextColor="#64748b"
                value={turfUpiId}
                onChangeText={setTurfUpiId}
                autoCapitalize="none"
              />

              <Text style={styles.label}>Venue Beneficiary Name</Text>
              <TextInput
                style={styles.input}
                placeholder={beneficiaryName || 'Venue Beneficiary'}
                placeholderTextColor="#64748b"
                value={turfBeneficiary}
                onChangeText={setTurfBeneficiary}
              />

              <TouchableOpacity
                style={[styles.turfSaveBtn, savingTurf && styles.disabledBtn]}
                onPress={handleSaveTurfOverride}
                disabled={savingTurf}
              >
                {savingTurf ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.turfSaveBtnText}>Save Override for {selectedTurf.name}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Live Player Checkout Simulation Preview */}
      <View style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Eye size={16} color="#10b981" />
            <Text style={styles.previewTitle}>Live Player Checkout Preview</Text>
          </View>
          <View style={styles.liveTag}>
            <Text style={styles.liveTagText}>SIMULATOR</Text>
          </View>
        </View>
        <Text style={styles.previewSub}>
          This is exactly what players see when booking a slot or joining a lobby at your venue:
        </Text>

        <View style={styles.mockCheckoutBox}>
          <View style={styles.mockMerchantRow}>
            <View style={styles.mockIconBox}>
              <Building size={20} color="#10b981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mockMerchantName}>{activeBeneficiary}</Text>
              <Text style={styles.mockUpiVpa}>{activeVpa}</Text>
            </View>
            <ShieldCheck size={18} color="#10b981" />
          </View>

          <View style={styles.mockAmountRow}>
            <Text style={styles.mockAmountLabel}>Payable Slot Prepayment</Text>
            <Text style={styles.mockAmountValue}>₹1,500.00</Text>
          </View>

          <View style={styles.mockQrSection}>
            <View style={styles.mockQrFrame}>
              <QrCode size={100} color="#0f172a" />
            </View>
            <Text style={styles.mockScanText}>Scan & Pay with any UPI App</Text>
          </View>

          <View style={styles.mockAppsRow}>
            <View style={styles.mockAppBadge}><Text style={styles.mockAppText}>GPay</Text></View>
            <View style={styles.mockAppBadge}><Text style={styles.mockAppText}>PhonePe</Text></View>
            <View style={styles.mockAppBadge}><Text style={styles.mockAppText}>Paytm</Text></View>
            <View style={styles.mockAppBadge}><Text style={styles.mockAppText}>BHIM</Text></View>
          </View>

          <TouchableOpacity
            style={[styles.testPayBtn, testSuccess && styles.testPayBtnSuccess]}
            onPress={handleSimulatePayment}
            disabled={simulatingPayment}
          >
            {simulatingPayment ? (
              <ActivityIndicator color="#064e3b" size="small" />
            ) : testSuccess ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={16} color="#064e3b" />
                <Text style={styles.testPayBtnText}>Payment Simulated & Verified</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Sparkles size={16} color="#064e3b" />
                <Text style={styles.testPayBtnText}>Test Player Checkout Flow</Text>
              </View>
            )}
          </TouchableOpacity>
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
    paddingBottom: 50,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#10b981',
    marginBottom: 16,
  },
  headerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 16,
  },
  card: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#0b1120',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: '#ffffff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
  },
  saveBtn: {
    backgroundColor: '#10b981',
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#064e3b',
    fontSize: 13,
    fontWeight: '800',
  },
  turfChipsScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  turfChip: {
    backgroundColor: '#0b1120',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  turfChipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38bdf8',
  },
  turfChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  turfChipTextActive: {
    color: '#38bdf8',
    fontWeight: '800',
  },
  overrideBox: {
    backgroundColor: '#0b1120',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginTop: 6,
  },
  overrideHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38bdf8',
    marginBottom: 6,
  },
  turfSaveBtn: {
    backgroundColor: '#0284c7',
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  turfSaveBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  previewCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  liveTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveTagText: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: '800',
  },
  previewSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 14,
  },
  mockCheckoutBox: {
    backgroundColor: '#0b1120',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  mockMerchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#131b2e',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  mockIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockMerchantName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  mockUpiVpa: {
    fontSize: 11,
    color: '#10b981',
    marginTop: 1,
  },
  mockAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    marginBottom: 14,
  },
  mockAmountLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  mockAmountValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#10b981',
  },
  mockQrSection: {
    alignItems: 'center',
    marginBottom: 14,
  },
  mockQrFrame: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  mockScanText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  mockAppsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  mockAppBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mockAppText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  testPayBtn: {
    backgroundColor: '#10b981',
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  testPayBtnSuccess: {
    backgroundColor: '#34d399',
  },
  testPayBtnText: {
    color: '#064e3b',
    fontSize: 13,
    fontWeight: '800',
  },
});

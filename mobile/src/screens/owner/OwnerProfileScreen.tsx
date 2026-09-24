import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import {
  Building,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  LogOut,
  Edit2,
  X,
  ShieldCheck,
  UserCheck,
  ArrowRightLeft,
} from 'lucide-react-native';

interface OwnerProfileScreenProps {
  navigation?: any;
}

export const OwnerProfileScreen: React.FC<OwnerProfileScreenProps> = ({ navigation }) => {
  const { user, profile, updateProfileData, switchRole, logout } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [businessName, setBusinessName] = useState(profile?.businessName || '');
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || '');
  const [city, setCity] = useState(profile?.city || 'Mumbai');
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleSwitchToPlayer = async () => {
    setSwitching(true);
    try {
      await switchRole('PLAYER');
    } catch (err) {
      console.warn('Error switching role to Player:', err);
    } finally {
      setSwitching(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfileData({
        businessName: businessName.trim(),
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim(),
        city: city.trim(),
      });
      setShowEditModal(false);
    } catch (err) {
      console.warn('Error saving owner profile:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.profileCard}>
        <View style={styles.avatarBox}>
          <Building size={32} color="#064e3b" />
        </View>

        <Text style={styles.bizName}>{profile?.businessName || 'Arena Business'}</Text>
        <Text style={styles.ownerName}>Owner: {profile?.displayName}</Text>
        <Text style={styles.roleBadge}>VERIFIED TURF PARTNER</Text>

        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => {
            setBusinessName(profile?.businessName || '');
            setDisplayName(profile?.displayName || '');
            setPhoneNumber(profile?.phoneNumber || '');
            setCity(profile?.city || 'Mumbai');
            setShowEditModal(true);
          }}
        >
          <Edit2 size={14} color="#10b981" />
          <Text style={styles.editBtnText}>Edit Business Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Payout & Settlement Info */}
      <TouchableOpacity
        style={styles.payoutCard}
        onPress={() => navigation?.navigate('OwnerPaymentSettings')}
        activeOpacity={0.85}
      >
        <View style={styles.payoutHeader}>
          <ShieldCheck size={18} color="#10b981" />
          <Text style={styles.payoutTitle}>Earnings Wallet & Admin Payouts</Text>
        </View>
        <Text style={styles.payoutText}>
          {profile?.paymentSettings?.upiId || profile?.paymentSettings?.accountNumber
            ? `Payout Settlement Destination: ${profile.paymentSettings.upiId || profile.paymentSettings.accountNumber} (${profile.paymentSettings.beneficiaryName || 'Admin Settlement'})`
            : 'View online booking earnings and configure receiving bank/UPI details for Admin settlements.'}
        </Text>
        <View style={styles.payoutActionRow}>
          <Text style={styles.payoutActionText}>Manage Earnings & Withdrawals →</Text>
        </View>
      </TouchableOpacity>

      {/* Details Card */}
      <View style={styles.detailsCard}>
        <Text style={styles.detailsTitle}>Contact & Business Details</Text>

        <View style={styles.detailRow}>
          <Mail size={16} color="#94a3b8" />
          <View style={styles.detailTextWrapper}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Phone size={16} color="#94a3b8" />
          <View style={styles.detailTextWrapper}>
            <Text style={styles.detailLabel}>Desk Contact</Text>
            <Text style={styles.detailValue}>{profile?.phoneNumber || 'Not configured'}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <MapPin size={16} color="#94a3b8" />
          <View style={styles.detailTextWrapper}>
            <Text style={styles.detailLabel}>Registered City</Text>
            <Text style={styles.detailValue}>{profile?.city || 'Mumbai'}</Text>
          </View>
        </View>
      </View>

      {/* Switch to Player Mode */}
      <TouchableOpacity
        style={styles.switchModeButton}
        onPress={handleSwitchToPlayer}
        disabled={switching}
      >
        {switching ? (
          <ActivityIndicator color="#6366f1" size="small" />
        ) : (
          <>
            <ArrowRightLeft size={18} color="#818cf8" />
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchModeTitle}>Switch to Athlete / Player Mode</Text>
              <Text style={styles.switchModeSubtitle}>Book turfs, join lobbies, and manage squads</Text>
            </View>
          </>
        )}
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <LogOut size={18} color="#ef4444" />
        <Text style={styles.logoutText}>Sign Out of Partner Portal</Text>
      </TouchableOpacity>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Partner Details</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Turf Business Name</Text>
            <TextInput
              style={styles.input}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Business Name"
              placeholderTextColor="#64748b"
            />

            <Text style={styles.label}>Owner Representative Name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Representative Name"
              placeholderTextColor="#64748b"
            />

            <Text style={styles.label}>Contact Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+91 98200 12345"
              placeholderTextColor="#64748b"
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="City"
              placeholderTextColor="#64748b"
            />

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.disabledBtn]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#064e3b" />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  profileCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  avatarBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  bizName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 2,
  },
  ownerName: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 6,
  },
  roleBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  editBtnText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
  },
  payoutCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#10b981',
    marginBottom: 16,
  },
  payoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  payoutTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  payoutText: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
  },
  payoutActionRow: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
  payoutActionText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '800',
  },
  detailsCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 20,
  },
  detailsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  detailTextWrapper: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#cbd5e1',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  switchModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    marginBottom: 14,
  },
  switchTextContainer: {
    flex: 1,
  },
  switchModeTitle: {
    color: '#a5b4fc',
    fontSize: 14,
    fontWeight: '700',
  },
  switchModeSubtitle: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
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
  saveBtn: {
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
  saveBtnText: {
    color: '#064e3b',
    fontSize: 14,
    fontWeight: '800',
  },
  themeSectionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  themeSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 2,
  },
  themeSectionSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 14,
  },
  themeOptionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#131d31',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  themeOptionBtnActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  themeOptionTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
});

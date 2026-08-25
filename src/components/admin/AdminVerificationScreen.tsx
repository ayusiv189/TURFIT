import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Turf, VerificationDocument, VerificationHistory } from '../../types';
import {
  getAllTurfsForAdmin,
  getVerificationDocuments,
  getVerificationHistory,
  adminApproveTurf,
  adminRejectTurf,
  adminRequestMoreInfo,
  adminSuspendTurf,
  adminRequestPhysicalVerification,
  adminReviewDocument,
  checkNearbyTurfDuplicates,
} from '../../services/dbService';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Video,
  Camera,
  MapPin,
  Phone,
  Search,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  User,
  Building2,
  Award,
  Ban,
  Check,
} from 'lucide-react-native';

export const AdminVerificationScreen: React.FC = () => {
  const { user, profile } = useAuth();
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTurf, setSelectedTurf] = useState<Turf | null>(null);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [history, setHistory] = useState<VerificationHistory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'REJECT' | 'MORE_INFO' | 'SUSPEND' | 'NONE'>('NONE');
  const [modalReason, setModalReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Duplicate Info
  const [duplicateInfo, setDuplicateInfo] = useState<{
    hasDuplicate: boolean;
    duplicateTurfName?: string;
    distanceMeters?: number;
  } | null>(null);

  const fetchTurfs = async () => {
    setLoading(true);
    try {
      const all = await getAllTurfsForAdmin();
      setTurfs(all);
      if (selectedTurf) {
        const up = all.find((t) => t.id === selectedTurf.id);
        if (up) setSelectedTurf(up);
      }
    } catch (err) {
      console.warn('Admin fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTurfs();
  }, []);

  const inspectTurf = async (turf: Turf) => {
    setSelectedTurf(turf);
    try {
      const [docs, hist, dup] = await Promise.all([
        getVerificationDocuments(turf.id),
        getVerificationHistory(turf.id),
        turf.latitude && turf.longitude
          ? checkNearbyTurfDuplicates(turf.latitude, turf.longitude, turf.id)
          : Promise.resolve({ hasDuplicate: false }),
      ]);
      setDocuments(docs as VerificationDocument[]);
      setHistory(hist as VerificationHistory[]);
      setDuplicateInfo(dup);
    } catch (err) {
      console.warn('Inspect error:', err);
    }
  };

  const handleApprove = async (level: 2 | 3) => {
    if (!selectedTurf) return;
    setActionLoading(true);
    try {
      const adminUid = user?.uid || 'admin';
      const adminName = profile?.displayName || 'TruFit Ops';
      await adminApproveTurf(selectedTurf.id, adminUid, adminName, level);
      Alert.alert('Success', `Turf verified at Level ${level}!`);
      await fetchTurfs();
      await inspectTurf(selectedTurf);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to approve turf.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActionConfirm = async () => {
    if (!selectedTurf || !modalReason.trim()) {
      Alert.alert('Required', 'Please enter notes or reason.');
      return;
    }
    setActionLoading(true);
    try {
      const adminUid = user?.uid || 'admin';
      const adminName = profile?.displayName || 'TruFit Ops';

      if (modalMode === 'REJECT') {
        await adminRejectTurf(selectedTurf.id, adminUid, adminName, modalReason.trim());
        Alert.alert('Rejected', 'Verification rejected with reason sent to owner.');
      } else if (modalMode === 'MORE_INFO') {
        await adminRequestMoreInfo(selectedTurf.id, adminUid, adminName, modalReason.trim());
        Alert.alert('Sent', 'More info requested from owner.');
      } else if (modalMode === 'SUSPEND') {
        await adminSuspendTurf(selectedTurf.id, adminUid, adminName, modalReason.trim());
        Alert.alert('Suspended', 'Turf suspended and bookings blocked.');
      }
      setModalVisible(false);
      setModalReason('');
      await fetchTurfs();
      await inspectTurf(selectedTurf);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDocReview = async (docId: string, status: 'verified' | 'rejected') => {
    if (!selectedTurf) return;
    try {
      const adminUid = user?.uid || 'admin';
      await adminReviewDocument(selectedTurf.id, docId, adminUid, status);
      const updated = await getVerificationDocuments(selectedTurf.id);
      setDocuments(updated as VerificationDocument[]);
    } catch (err) {
      Alert.alert('Error', 'Failed to update document review.');
    }
  };

  const handleRequestPhysical = async () => {
    if (!selectedTurf) return;
    try {
      const adminUid = user?.uid || 'admin';
      const adminName = profile?.displayName || 'TruFit Ops';
      const code = await adminRequestPhysicalVerification(selectedTurf.id, adminUid, adminName);
      Alert.alert('Code Generated', `Verification code generated: ${code}`);
      await fetchTurfs();
      await inspectTurf(selectedTurf);
    } catch (err) {
      Alert.alert('Error', 'Failed to request physical verification.');
    }
  };

  const filteredTurfs = turfs.filter((t) => {
    const match =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.city?.toLowerCase().includes(searchQuery.toLowerCase());
    const tStatus = t.verificationStatus || 'pending_verification';
    if (statusFilter !== 'ALL') {
      return match && tStatus === statusFilter;
    }
    return match;
  });

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <ShieldCheck color="#6366f1" size={22} />
          <Text style={styles.headerTitle}>TruFit Admin Verification</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchTurfs}>
          <RefreshCw color="#94a3b8" size={16} />
        </TouchableOpacity>
      </View>

      {/* Search & Filter */}
      <View style={styles.searchContainer}>
        <Search color="#64748b" size={16} />
        <TextInput
          placeholder="Search venue or city..."
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {['ALL', 'pending_verification', 'under_review', 'verified', 'rejected', 'suspended'].map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setStatusFilter(f)}
            style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, statusFilter === f && styles.filterChipTextActive]}>
              {f.replace('_', ' ').toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Main Content */}
      <ScrollView style={styles.scrollArea}>
        {selectedTurf ? (
          /* Inspection View */
          <View style={styles.detailCard}>
            <TouchableOpacity onPress={() => setSelectedTurf(null)} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Back to All Venues</Text>
            </TouchableOpacity>

            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>{selectedTurf.name}</Text>
              <Text style={styles.detailSub}>{selectedTurf.address}, {selectedTurf.city}</Text>
            </View>

            {duplicateInfo?.hasDuplicate && (
              <View style={styles.dupAlert}>
                <AlertTriangle color="#f59e0b" size={16} />
                <Text style={styles.dupAlertText}>
                  Duplicate Warning: Within {duplicateInfo.distanceMeters}m of "{duplicateInfo.duplicateTurfName}".
                </Text>
              </View>
            )}

            {/* Quick Action Buttons */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                onPress={() => handleApprove(2)}
                disabled={actionLoading}
                style={[styles.actionBtn, styles.approveBtn]}
              >
                <Check color="#fff" size={14} />
                <Text style={styles.actionBtnText}>Approve L2</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleApprove(3)}
                disabled={actionLoading}
                style={[styles.actionBtn, styles.physBtn]}
              >
                <Award color="#fff" size={14} />
                <Text style={styles.actionBtnText}>Approve L3</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setModalMode('MORE_INFO');
                  setModalReason('');
                  setModalVisible(true);
                }}
                style={[styles.actionBtn, styles.infoBtn]}
              >
                <Text style={styles.actionBtnText}>Req Info</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setModalMode('REJECT');
                  setModalReason('');
                  setModalVisible(true);
                }}
                style={[styles.actionBtn, styles.rejectBtn]}
              >
                <Text style={styles.actionBtnText}>Reject</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setModalMode('SUSPEND');
                  setModalReason('');
                  setModalVisible(true);
                }}
                style={[styles.actionBtn, styles.suspendBtn]}
              >
                <Text style={styles.actionBtnText}>Suspend</Text>
              </TouchableOpacity>
            </View>

            {/* Photos */}
            <Text style={styles.sectionLabel}>Photos ({selectedTurf.photos?.length || 0})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
              {selectedTurf.photos?.map((p, idx) => (
                <Image key={idx} source={{ uri: p }} style={styles.photoThumb} />
              ))}
            </ScrollView>

            {/* Documents */}
            <Text style={styles.sectionLabel}>Documents ({documents.length})</Text>
            {documents.map((d) => (
              <View key={d.id} style={styles.docItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docName}>{d.documentName}</Text>
                  <Text style={styles.docType}>{d.documentType}</Text>
                  <Text style={styles.docStatus}>Status: {d.status.toUpperCase()}</Text>
                </View>
                <View style={styles.docActions}>
                  {d.status !== 'verified' && (
                    <TouchableOpacity
                      onPress={() => handleDocReview(d.id, 'verified')}
                      style={styles.docApproveBtn}
                    >
                      <Text style={styles.docBtnText}>✓</Text>
                    </TouchableOpacity>
                  )}
                  {d.status !== 'rejected' && (
                    <TouchableOpacity
                      onPress={() => handleDocReview(d.id, 'rejected')}
                      style={styles.docRejectBtn}
                    >
                      <Text style={styles.docBtnText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            {/* Physical Verification */}
            <View style={styles.physBox}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.physTitle}>Level 3 Physical Video</Text>
                <TouchableOpacity onPress={handleRequestPhysical} style={styles.physCodeBtn}>
                  <Text style={styles.physCodeBtnText}>Gen Code</Text>
                </TouchableOpacity>
              </View>
              {selectedTurf.verification?.physicalVerificationCode && (
                <Text style={styles.physCode}>
                  Code: {selectedTurf.verification.physicalVerificationCode}
                </Text>
              )}
              {selectedTurf.verification?.physicalVerificationVideoUrl ? (
                <TouchableOpacity
                  onPress={() => Linking.openURL(selectedTurf.verification!.physicalVerificationVideoUrl!)}
                  style={styles.videoLink}
                >
                  <Video color="#6366f1" size={14} />
                  <Text style={styles.videoLinkText}>Open Submitted Video</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.emptyText}>No physical video submitted yet.</Text>
              )}
            </View>

            {/* History */}
            <Text style={styles.sectionLabel}>Audit Log</Text>
            {history.map((h) => (
              <View key={h.id} style={styles.histItem}>
                <Text style={styles.histAction}>{h.action.replace('_', ' ').toUpperCase()} by {h.performedByName}</Text>
                {h.notes ? <Text style={styles.histNotes}>{h.notes}</Text> : null}
                <Text style={styles.histDate}>{new Date(h.createdAt).toLocaleDateString()}</Text>
              </View>
            ))}
          </View>
        ) : (
          /* List Queue */
          <View style={styles.turfList}>
            {filteredTurfs.map((turf) => {
              const status = turf.verificationStatus || 'pending_verification';
              return (
                <TouchableOpacity
                  key={turf.id}
                  onPress={() => inspectTurf(turf)}
                  style={styles.turfCard}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.turfCardTitle}>{turf.name}</Text>
                    <Text style={styles.turfCardSub}>{turf.area}, {turf.city}</Text>
                    <Text style={styles.turfCardPhone}>Phone: {turf.phoneNumber}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{status.replace('_', ' ').toUpperCase()}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalMode === 'REJECT' && 'Reject Venue Verification'}
              {modalMode === 'MORE_INFO' && 'Request Information'}
              {modalMode === 'SUSPEND' && 'Suspend Venue'}
            </Text>
            <TextInput
              multiline
              numberOfLines={4}
              placeholder="Enter mandatory reason or notes..."
              placeholderTextColor="#64748b"
              value={modalReason}
              onChangeText={setModalReason}
              style={styles.modalInput}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleActionConfirm} style={styles.confirmBtn}>
                <Text style={styles.confirmBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  refreshBtn: { padding: 8, backgroundColor: '#1e293b', borderRadius: 8 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  searchInput: { flex: 1, color: '#f8fafc', paddingVertical: 8, paddingHorizontal: 8, fontSize: 12 },
  filterScroll: { paddingHorizontal: 12, marginBottom: 8, maxHeight: 36 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  filterChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  filterChipText: { color: '#94a3b8', fontSize: 10, fontWeight: '700' },
  filterChipTextActive: { color: '#ffffff' },
  scrollArea: { flex: 1, padding: 12 },
  turfList: { gap: 10 },
  turfCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  turfCardTitle: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  turfCardSub: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  turfCardPhone: { color: '#64748b', fontSize: 10, marginTop: 2 },
  statusBadge: { backgroundColor: '#1e293b', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { color: '#e2e8f0', fontSize: 9, fontWeight: '700' },
  detailCard: { backgroundColor: '#0f172a', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#1e293b', gap: 12 },
  backBtn: { paddingVertical: 4 },
  backBtnText: { color: '#818cf8', fontSize: 12, fontWeight: '600' },
  detailHeader: { borderBottomWidth: 1, borderBottomColor: '#1e293b', paddingBottom: 8 },
  detailTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  detailSub: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  dupAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#451a03',
    padding: 10,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#b45309',
  },
  dupAlertText: { color: '#fef3c7', fontSize: 11, flex: 1 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  approveBtn: { backgroundColor: '#059669' },
  physBtn: { backgroundColor: '#d97706' },
  infoBtn: { backgroundColor: '#2563eb' },
  rejectBtn: { backgroundColor: '#e11d48' },
  suspendBtn: { backgroundColor: '#991b1b' },
  sectionLabel: { color: '#f8fafc', fontSize: 12, fontWeight: '700', marginTop: 6 },
  photoRow: { flexDirection: 'row', gap: 8 },
  photoThumb: { width: 90, height: 60, borderRadius: 8, marginRight: 8, backgroundColor: '#020617' },
  docItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#020617',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  docName: { color: '#ffffff', fontSize: 11, fontWeight: '600' },
  docType: { color: '#94a3b8', fontSize: 9, marginTop: 1 },
  docStatus: { color: '#6366f1', fontSize: 9, marginTop: 2 },
  docActions: { flexDirection: 'row', gap: 6 },
  docApproveBtn: { backgroundColor: '#065f46', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  docRejectBtn: { backgroundColor: '#9f1239', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  docBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  physBox: { backgroundColor: '#020617', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#312e81', gap: 6 },
  physTitle: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  physCodeBtn: { backgroundColor: '#312e81', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  physCodeBtnText: { color: '#c7d2fe', fontSize: 10, fontWeight: '600' },
  physCode: { color: '#fbbf24', fontSize: 11, fontWeight: '700' },
  videoLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  videoLinkText: { color: '#818cf8', fontSize: 11, textDecorationLine: 'underline' },
  emptyText: { color: '#64748b', fontSize: 10 },
  histItem: { backgroundColor: '#020617', padding: 8, borderRadius: 6, marginBottom: 4 },
  histAction: { color: '#e2e8f0', fontSize: 10, fontWeight: '700' },
  histNotes: { color: '#94a3b8', fontSize: 9, marginTop: 1 },
  histDate: { color: '#64748b', fontSize: 8, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#0f172a', borderRadius: 16, padding: 16, width: '100%', maxWidth: 360, gap: 12 },
  modalTitle: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  modalInput: { backgroundColor: '#020617', color: '#f8fafc', padding: 10, borderRadius: 8, fontSize: 11, textAlignVertical: 'top' },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1e293b' },
  cancelBtnText: { color: '#94a3b8', fontSize: 11 },
  confirmBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#6366f1' },
  confirmBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
});

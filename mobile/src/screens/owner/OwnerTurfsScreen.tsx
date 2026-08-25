import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import {
  getOwnerTurfs,
  createTurfWithArenas,
  getArenasByTurf,
  toggleTurfClosure,
  toggleArenaMaintenance,
  updateTurfPaymentDetails,
  uploadVerificationDocument,
  submitTurfForReview,
  getVerificationDocuments,
} from '../../services/dbService';
import { Turf, Arena, VerificationDocument, DocumentType } from '../../types';
import {
  Building,
  Plus,
  X,
  MapPin,
  DollarSign,
  Check,
  AlertTriangle,
  Wrench,
  Power,
  CreditCard,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Clock,
  XCircle,
  FileText,
  Award,
} from 'lucide-react-native';

export const OwnerTurfsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { user, profile } = useAuth();
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [turfArenas, setTurfArenas] = useState<Record<string, Arena[]>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [expandedTurfId, setExpandedTurfId] = useState<string | null>(null);

  // Verification upload modal
  const [verificationModalTurf, setVerificationModalTurf] = useState<Turf | null>(null);
  const [docType, setDocType] = useState<DocumentType>('BUSINESS_REGISTRATION');
  const [docName, setDocName] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [turfDocs, setTurfDocs] = useState<Record<string, VerificationDocument[]>>({});

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('Bandra West');
  const [city, setCity] = useState('Mumbai');
  const [basePrice, setBasePrice] = useState('1500');
  const [phone, setPhone] = useState('+91 98200 12345');
  const [selectedSports, setSelectedSports] = useState<string[]>(['Football', 'Cricket']);
  const [creating, setCreating] = useState(false);

  // Closure / Maintenance Modals
  const [closureModalTurf, setClosureModalTurf] = useState<Turf | null>(null);
  const [closureReason, setClosureReason] = useState('');
  const [closureNotice, setClosureNotice] = useState('');
  const [savingClosure, setSavingClosure] = useState(false);

  const sportsOptions = ['Football', 'Cricket', 'Badminton', 'Tennis', 'Basketball', 'Pickleball', 'Padel', 'Volleyball'];

  const loadTurfs = async () => {
    if (!user) return;
    try {
      const data = await getOwnerTurfs(user.uid);
      setTurfs(data);

      // Load arenas & documents for each turf
      const arenasMap: Record<string, Arena[]> = {};
      const docsMap: Record<string, VerificationDocument[]> = {};
      for (const t of data) {
        const [aList, dList] = await Promise.all([
          getArenasByTurf(t.id),
          getVerificationDocuments(t.id),
        ]);
        arenasMap[t.id] = aList;
        docsMap[t.id] = dList as VerificationDocument[];
      }
      setTurfArenas(arenasMap);
      setTurfDocs(docsMap);
      if (data.length > 0 && !expandedTurfId) {
        setExpandedTurfId(data[0].id);
      }
    } catch (err) {
      console.warn('Error loading turfs:', err);
    }
  };

  useEffect(() => {
    loadTurfs();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTurfs();
    setRefreshing(false);
  };

  const handleUploadDoc = async () => {
    if (!verificationModalTurf || !user || !docUrl.trim()) {
      Alert.alert('Required', 'Please enter a document reference / file URL.');
      return;
    }
    setUploadingDoc(true);
    try {
      await uploadVerificationDocument(verificationModalTurf.id, user.uid, {
        documentType: docType,
        documentName: docName.trim() || `${docType.replace('_', ' ')} Document`,
        fileUrl: docUrl.trim(),
      });
      setDocUrl('');
      setDocName('');
      await loadTurfs();
      Alert.alert('Document Uploaded', 'Document sent to TruFit operations team for review.');
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Error uploading document.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleResubmitReview = async (turf: Turf) => {
    if (!user) return;
    try {
      await submitTurfForReview(turf.id, user.uid, profile?.displayName || 'Owner');
      await loadTurfs();
      Alert.alert('Submitted', 'Your venue has been submitted for admin verification.');
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Failed to submit.');
    }
  };

  const toggleSport = (sport: string) => {
    if (selectedSports.includes(sport)) {
      setSelectedSports(selectedSports.filter((s) => s !== sport));
    } else {
      setSelectedSports([...selectedSports, sport]);
    }
  };

  const handleCreateTurf = async () => {
    if (!name.trim() || !user) return;
    setCreating(true);
    try {
      await createTurfWithArenas(
        {
          ownerId: user.uid,
          name: name.trim(),
          address: address.trim() || 'Sports Complex Road',
          area: area.trim() || 'Bandra West',
          city: city.trim() || 'Mumbai',
          phoneNumber: phone.trim(),
          sports: selectedSports,
          basePrice: parseInt(basePrice, 10) || 1500,
          openingTime: '06:00',
          closingTime: '23:00',
          openTime: '06:00',
          closeTime: '23:00',
          facilities: ['Floodlights', 'Changing Rooms', 'Drinking Water', 'Parking'],
        },
        [
          {
            name: 'Pitch A (Main Arena)',
            sport: selectedSports[0] || 'Football',
            pricePerSlot: parseInt(basePrice, 10) || 1500,
            capacity: 14,
          },
        ]
      );
      setShowModal(false);
      setName('');
      await loadTurfs();
      Alert.alert('Venue Added', 'New arena and pitches have been registered.');
    } catch (err) {
      console.warn('Error creating turf:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleTurfClosure = async (turf: Turf) => {
    const nextClosedState = !turf.isClosed;
    if (nextClosedState) {
      setClosureModalTurf(turf);
      setClosureReason(turf.closureReason || 'Annual pitch maintenance and grass replacement');
      setClosureNotice(turf.closureNotice || 'Venue temporarily unavailable. Reopening soon!');
    } else {
      // Reopening directly
      try {
        await toggleTurfClosure(turf.id, false, '', '');
        await loadTurfs();
        Alert.alert('Venue Reopened', `"${turf.name}" is now active and taking player bookings.`);
      } catch (err) {
        console.warn('Error reopening turf:', err);
      }
    }
  };

  const handleConfirmClosure = async () => {
    if (!closureModalTurf) return;
    setSavingClosure(true);
    try {
      await toggleTurfClosure(closureModalTurf.id, true, closureReason, closureNotice);
      setClosureModalTurf(null);
      await loadTurfs();
      Alert.alert('Venue Marked Closed', `"${closureModalTurf.name}" is marked temporarily closed with public notice.`);
    } catch (err) {
      console.warn('Error closing turf:', err);
    } finally {
      setSavingClosure(false);
    }
  };

  const handleToggleArenaMaintenance = async (arena: Arena) => {
    const nextState = !arena.isUnderMaintenance;
    try {
      await toggleArenaMaintenance(
        arena.id,
        nextState,
        nextState ? 'Pitch maintenance & turf grooming in progress' : ''
      );
      await loadTurfs();
      Alert.alert(
        nextState ? 'Pitch Under Maintenance' : 'Pitch Restored',
        `"${arena.name}" is now ${nextState ? 'marked under maintenance' : 'available for bookings'}.`
      );
    } catch (err) {
      console.warn('Error toggling maintenance:', err);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={turfs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
        ListHeaderComponent={
          <View style={styles.headerBox}>
            <Text style={styles.headerTitle}>Venue & Ground Management</Text>
            <Text style={styles.headerSubtitle}>
              Configure arenas, submit verification documents, and manage live availability.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isExpanded = expandedTurfId === item.id;
          const arenas = turfArenas[item.id] || [];
          const docs = turfDocs[item.id] || [];
          const isClosed = item.isClosed;
          const vStatus = item.verificationStatus || 'pending_verification';
          const vLevel = item.verificationLevel || 'unverified';

          return (
            <View style={[styles.turfCard, isClosed && styles.turfCardClosed]}>
              <View style={styles.cardHeader}>
                <View style={[styles.turfIcon, isClosed && styles.turfIconClosed]}>
                  <Building size={20} color={isClosed ? '#ef4444' : '#10b981'} />
                </View>
                <View style={styles.turfInfo}>
                  <Text style={styles.turfName}>{item.name}</Text>
                  <Text style={styles.turfLocation}>{item.area}, {item.city}</Text>
                  {item.upiId && (
                    <Text style={styles.turfUpiText}>UPI: {item.upiId}</Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.turfPrice}>₹{item.basePrice}/hr</Text>
                  <View style={[styles.statusBadge, isClosed ? styles.statusBadgeClosed : styles.statusBadgeActive]}>
                    <Text style={[styles.statusBadgeText, isClosed ? styles.statusTextClosed : styles.statusTextActive]}>
                      {isClosed ? 'CLOSED' : 'ACTIVE'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Verification Status Card */}
              <View
                style={{
                  backgroundColor:
                    vStatus === 'verified'
                      ? '#064e3b25'
                      : vStatus === 'rejected' || vStatus === 'suspended'
                      ? '#7f1d1d25'
                      : '#1e1b4b25',
                  borderColor:
                    vStatus === 'verified'
                      ? '#05966960'
                      : vStatus === 'rejected' || vStatus === 'suspended'
                      ? '#dc262660'
                      : '#6366f160',
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 10,
                  marginVertical: 6,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {vStatus === 'verified' ? (
                      <ShieldCheck size={16} color="#34d399" />
                    ) : vStatus === 'under_review' ? (
                      <Clock size={16} color="#818cf8" />
                    ) : vStatus === 'rejected' || vStatus === 'suspended' ? (
                      <XCircle size={16} color="#f87171" />
                    ) : (
                      <AlertTriangle size={16} color="#fbbf24" />
                    )}
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '800',
                        color:
                          vStatus === 'verified'
                            ? '#34d399'
                            : vStatus === 'rejected' || vStatus === 'suspended'
                            ? '#f87171'
                            : '#a5b4fc',
                        textTransform: 'uppercase',
                      }}
                    >
                      {vStatus.replace('_', ' ')} • {vLevel.replace('_', ' ')}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={{
                      backgroundColor: '#4f46e5',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                    }}
                    onPress={() => setVerificationModalTurf(item)}
                  >
                    <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '700' }}>
                      + Docs ({docs.length})
                    </Text>
                  </TouchableOpacity>
                </View>

                {item.verification?.rejectionReason && (
                  <Text style={{ color: '#fca5a5', fontSize: 11, marginTop: 4 }}>
                    Notice: {item.verification.rejectionReason}
                  </Text>
                )}

                {vStatus !== 'verified' && vStatus !== 'under_review' && (
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#3b82f6',
                      marginTop: 6,
                      paddingVertical: 5,
                      borderRadius: 6,
                      alignItems: 'center',
                    }}
                    onPress={() => handleResubmitReview(item)}
                  >
                    <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>
                      Submit / Request Verification Review
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {isClosed && item.closureNotice ? (
                <View style={styles.closureNoticeBox}>
                  <AlertTriangle size={14} color="#f87171" />
                  <Text style={styles.closureNoticeText}>{item.closureNotice}</Text>
                </View>
              ) : null}

              <View style={styles.sportsRow}>
                {item.sports?.map((s, i) => (
                  <View key={i} style={styles.sportBadge}>
                    <Text style={styles.sportText}>{s}</Text>
                  </View>
                ))}
              </View>

              {/* Maintenance & Closure Action Controls */}
              <View style={styles.actionControlsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, isClosed ? styles.reopenBtn : styles.closeBtn]}
                  onPress={() => handleToggleTurfClosure(item)}
                >
                  <Power size={13} color={isClosed ? '#10b981' : '#ef4444'} />
                  <Text style={[styles.actionBtnText, isClosed ? styles.reopenBtnText : styles.closeBtnText]}>
                    {isClosed ? 'Reopen Venue' : 'Temporary Closure'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.expandPitchesBtn}
                  onPress={() => setExpandedTurfId(isExpanded ? null : item.id)}
                >
                  <Text style={styles.expandPitchesText}>
                    {arenas.length} Pitches ({isExpanded ? 'Hide' : 'Manage'})
                  </Text>
                  {isExpanded ? <ChevronUp size={14} color="#94a3b8" /> : <ChevronDown size={14} color="#94a3b8" />}
                </TouchableOpacity>
              </View>

              {/* Expanded Arenas / Pitches List with Maintenance Toggles */}
              {isExpanded && (
                <View style={styles.pitchesContainer}>
                  <Text style={styles.pitchesTitle}>Ground Pitches & Court Maintenance</Text>
                  {arenas.map((arena) => (
                    <View key={arena.id} style={styles.pitchRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pitchName}>{arena.name}</Text>
                        <Text style={styles.pitchSport}>{arena.sport} • ₹{arena.pricePerSlot || item.basePrice}/slot</Text>
                        {arena.isUnderMaintenance && (
                          <Text style={styles.pitchMaintReason}>
                            ⚠️ {arena.maintenanceReason || 'Under maintenance'}
                          </Text>
                        )}
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.maintToggleBtn,
                          arena.isUnderMaintenance ? styles.maintActiveBtn : styles.maintOffBtn,
                        ]}
                        onPress={() => handleToggleArenaMaintenance(arena)}
                      >
                        <Wrench size={12} color={arena.isUnderMaintenance ? '#ef4444' : '#10b981'} />
                        <Text
                          style={[
                            styles.maintBtnText,
                            arena.isUnderMaintenance ? styles.maintActiveText : styles.maintOffText,
                          ]}
                        >
                          {arena.isUnderMaintenance ? 'Under Maint' : 'Operational'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Building size={40} color="#64748b" />
            <Text style={styles.emptyTitle}>No Turfs Added</Text>
            <Text style={styles.emptyDesc}>Register your first sports venue to start accepting bookings.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)} activeOpacity={0.85}>
        <Plus size={20} color="#064e3b" />
        <Text style={styles.fabText}>Add Arena</Text>
      </TouchableOpacity>

      {/* Closure Notice Modal */}
      <Modal visible={!!closureModalTurf} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Temporary Turf Closure</Text>
              <TouchableOpacity onPress={() => setClosureModalTurf(null)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Closure Reason (Internal / Ledger)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Annual Monsoon turf turfing & LED light upgrade"
              placeholderTextColor="#64748b"
              value={closureReason}
              onChangeText={setClosureReason}
            />

            <Text style={styles.label}>Public Notice for Players</Text>
            <TextInput
              style={[styles.input, { height: 70, paddingTop: 10, textAlignVertical: 'top' }]}
              multiline
              numberOfLines={3}
              placeholder="e.g. Ground closed until Friday for scheduled turf resurfacing. Bookings resume this weekend!"
              placeholderTextColor="#64748b"
              value={closureNotice}
              onChangeText={setClosureNotice}
            />

            <TouchableOpacity
              style={[styles.closeConfirmBtn, savingClosure && styles.disabledBtn]}
              onPress={handleConfirmClosure}
              disabled={savingClosure}
            >
              {savingClosure ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.closeConfirmBtnText}>Confirm Venue Closure</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Verification Documents Upload Modal */}
      <Modal visible={!!verificationModalTurf} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Turf Verification Documents</Text>
                <Text style={{ color: '#94a3b8', fontSize: 11 }}>
                  {verificationModalTurf?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setVerificationModalTurf(null)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <Text style={styles.label}>Document Category</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {[
                  { id: 'BUSINESS_REGISTRATION', label: 'Business Registration / MSME' },
                  { id: 'GST_CERTIFICATE', label: 'GST Certificate' },
                  { id: 'LEASE_AGREEMENT', label: 'Lease Agreement / Land Proof' },
                  { id: 'ELECTRICITY_BILL', label: 'Electricity / Utility Bill' },
                  { id: 'OWNER_ID_PROOF', label: 'Owner ID (Aadhaar/PAN)' },
                  { id: 'TURF_SIGNBOARD_PHOTO', label: 'Entrance / Signboard Photo' },
                  { id: 'GEO_TAGGED_PHOTO', label: 'Geotagged Ground Photo' },
                ].map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setDocType(cat.id as DocumentType)}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: docType === cat.id ? '#4f46e5' : '#1e293b',
                      borderWidth: 1,
                      borderColor: docType === cat.id ? '#818cf8' : '#334155',
                    }}
                  >
                    <Text style={{ color: docType === cat.id ? '#ffffff' : '#94a3b8', fontSize: 10, fontWeight: '700' }}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Document Title / File Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. MSME Registration 2026.pdf"
                placeholderTextColor="#64748b"
                value={docName}
                onChangeText={setDocName}
              />

              <Text style={styles.label}>File Link / Cloud Storage Reference</Text>
              <TextInput
                style={styles.input}
                placeholder="https://trufit-storage.appspot.com/docs/... or drive url"
                placeholderTextColor="#64748b"
                value={docUrl}
                onChangeText={setDocUrl}
              />

              {/* Already uploaded docs list */}
              {verificationModalTurf && (turfDocs[verificationModalTurf.id] || []).length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: '#cbd5e1', fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
                    Uploaded Documents ({(turfDocs[verificationModalTurf.id] || []).length})
                  </Text>
                  {(turfDocs[verificationModalTurf.id] || []).map((doc) => (
                    <View
                      key={doc.id}
                      style={{
                        backgroundColor: '#090d16',
                        padding: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#1e293b',
                        marginBottom: 6,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>
                          {doc.documentName}
                        </Text>
                        <Text style={{ color: '#64748b', fontSize: 10 }}>
                          {doc.documentType.replace(/_/g, ' ')} • {doc.verificationStatus}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor:
                            doc.verificationStatus === 'APPROVED'
                              ? '#064e3b'
                              : doc.verificationStatus === 'REJECTED'
                              ? '#7f1d1d'
                              : '#312e81',
                          paddingHorizontal: 6,
                          paddingVertical: 3,
                          borderRadius: 4,
                        }}
                      >
                        <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: '800' }}>
                          {doc.verificationStatus}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.closeConfirmBtn,
                  { backgroundColor: '#4f46e5', marginTop: 12 },
                  uploadingDoc && styles.disabledBtn,
                ]}
                onPress={handleUploadDoc}
                disabled={uploadingDoc}
              >
                {uploadingDoc ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.closeConfirmBtnText}>Upload & Attach Document</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Turf Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register New Arena Ground</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
              <Text style={styles.label}>Venue Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. KickOff AstroTurf Arena"
                placeholderTextColor="#64748b"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>Full Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Link Road, Next to Sports Complex"
                placeholderTextColor="#64748b"
                value={address}
                onChangeText={setAddress}
              />

              <View style={styles.rowTwo}>
                <View style={styles.col}>
                  <Text style={styles.label}>Area / Neighborhood</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Bandra West"
                    placeholderTextColor="#64748b"
                    value={area}
                    onChangeText={setArea}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>City</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Mumbai"
                    placeholderTextColor="#64748b"
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
              </View>

              <View style={styles.rowTwo}>
                <View style={styles.col}>
                  <Text style={styles.label}>Base Price / Slot (₹)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={basePrice}
                    onChangeText={setBasePrice}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Desk Contact Phone</Text>
                  <TextInput style={styles.input} value={phone} onChangeText={setPhone} />
                </View>
              </View>

              <Text style={styles.label}>Supported Sports</Text>
              <View style={styles.sportsGrid}>
                {sportsOptions.map((sport) => {
                  const isSelected = selectedSports.includes(sport);
                  return (
                    <TouchableOpacity
                      key={sport}
                      style={[styles.sportSelectChip, isSelected && styles.sportSelectChipActive]}
                      onPress={() => toggleSport(sport)}
                    >
                      <Text style={[styles.sportSelectText, isSelected && styles.sportSelectTextActive]}>
                        {sport}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.createBtn, creating && styles.disabledBtn]}
                onPress={handleCreateTurf}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#064e3b" />
                ) : (
                  <Text style={styles.createBtnText}>Save & Create Venue</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
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
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  headerBox: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    lineHeight: 18,
  },
  turfCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  turfCardClosed: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.03)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  turfIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  turfIconClosed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  turfInfo: {
    flex: 1,
  },
  turfName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  turfLocation: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  turfUpiText: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '700',
    marginTop: 2,
  },
  turfPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10b981',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusBadgeClosed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusTextActive: {
    color: '#10b981',
  },
  statusTextClosed: {
    color: '#ef4444',
  },
  closureNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  closureNoticeText: {
    flex: 1,
    color: '#f87171',
    fontSize: 11,
    fontWeight: '600',
  },
  sportsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  sportBadge: {
    backgroundColor: '#0b1120',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  sportText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '700',
  },
  actionControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  closeBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  reopenBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtnText: {
    color: '#ef4444',
  },
  reopenBtnText: {
    color: '#10b981',
  },
  expandPitchesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  expandPitchesText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  pitchesContainer: {
    marginTop: 12,
    backgroundColor: '#0b1120',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  pitchesTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  pitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  pitchName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  pitchSport: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  pitchMaintReason: {
    fontSize: 10,
    color: '#f87171',
    marginTop: 2,
  },
  maintToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  maintActiveBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  maintOffBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  maintBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  maintActiveText: {
    color: '#ef4444',
  },
  maintOffText: {
    color: '#10b981',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748b',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 25,
  },
  fabText: {
    color: '#064e3b',
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  label: {
    fontSize: 11,
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
  rowTwo: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  sportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  sportSelectChip: {
    backgroundColor: '#0b1120',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sportSelectChipActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  sportSelectText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  sportSelectTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  createBtn: {
    backgroundColor: '#10b981',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  closeConfirmBtn: {
    backgroundColor: '#ef4444',
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  closeConfirmBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  disabledBtn: {
    opacity: 0.6,
  },
});

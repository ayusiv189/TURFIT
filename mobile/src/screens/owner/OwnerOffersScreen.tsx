import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useOwnerSubscription } from '../../contexts/OwnerSubscriptionContext';
import { SubscriptionFeatureGate } from '../../components/SubscriptionFeatureGate';
import { getOffers, createOffer } from '../../services/communityService';
import { getOwnerTurfs } from '../../services/dbService';
import { Offer, Turf } from '../../types';
import { Tag, Plus, X, Percent, Calendar } from 'lucide-react-native';

export const OwnerOffersScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { canAccess, plan } = useOwnerSubscription();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState('20');
  const [usageLimit, setUsageLimit] = useState('50');
  const [selectedTurf, setSelectedTurf] = useState<Turf | null>(null);
  const [creating, setCreating] = useState(false);

  const hasAccess = canAccess('offers');

  const loadData = async () => {
    if (!user || !hasAccess) return;
    try {
      const [oData, tData] = await Promise.all([
        getOffers(),
        getOwnerTurfs(user.uid),
      ]);
      setOffers(oData);
      setTurfs(tData);
      if (tData.length > 0 && !selectedTurf) setSelectedTurf(tData[0]);
    } catch (err) {
      console.warn('Error loading offers:', err);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      loadData();
    }
  }, [user, hasAccess]);

  if (!hasAccess) {
    return (
      <SubscriptionFeatureGate
        featureKey="offers"
        featureTitle="Custom Promo Codes & Discount Engine"
        featureDescription="Create custom coupon codes, seasonal flash discounts, and weekday promotional campaign tags for players."
        requiredPlanName={plan?.name || 'Pro Annual'}
        benefits={[
          'Create unlimited promotional coupons with percentage off',
          'Target specific pitches, weekdays, or off-peak afternoon slots',
          'Automated validation during checkout in the player mobile app',
          'Real-time redemption counting and ROI analytics',
        ]}
        navigation={navigation}
      />
    );
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreateOffer = async () => {
    if (!title.trim() || !code.trim() || !user || !selectedTurf) return;
    setCreating(true);
    try {
      await createOffer({
        title: title.trim(),
        description: `${discountPercent}% off on turf bookings`,
        code: code.trim().toUpperCase(),
        discountPercent: parseInt(discountPercent) || 20,
        usageLimit: parseInt(usageLimit) || 50,
        turfId: selectedTurf.id,
        turfName: selectedTurf.name,
        validUntil: '2026-12-31',
        active: true,
      });
      setShowModal(false);
      setTitle('');
      setCode('');
      setDiscountPercent('20');
      setUsageLimit('50');
      loadData();
    } catch (err) {
      console.warn('Error creating offer:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={offers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
        ListHeaderComponent={
          <View style={styles.headerBox}>
            <Text style={styles.headerTitle}>Promotional Deals & Flash Offers</Text>
            <Text style={styles.headerSubtitle}>
              Boost off-peak bookings with coupon codes and discount banners.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconBox}>
                <Tag size={18} color="#10b981" />
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.offerTitle}>{item.title}</Text>
                <Text style={styles.turfName}>{item.turfName || 'All Turfs'}</Text>
              </View>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{item.discountPercent}% OFF</Text>
              </View>
            </View>

            <View style={styles.codeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.codeLabel}>PROMO CODE:</Text>
                <Text style={styles.codeText}>{item.code}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.codeLabel}>USAGE LIMIT:</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#10b981' }}>
                  {item.usedCount || 0} / {item.usageLimit || 50} redeemed
                </Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Tag size={40} color="#64748b" />
            <Text style={styles.emptyTitle}>No Offers Created</Text>
            <Text style={styles.emptyDesc}>Create promo codes to attract weekend and evening athletes!</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowModal(true)}
        activeOpacity={0.85}
      >
        <Plus size={20} color="#064e3b" />
        <Text style={styles.fabText}>Create Offer</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Launch Promo Code</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Offer Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Festival Special Discount"
              placeholderTextColor="#64748b"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>Coupon Code</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. TURFPROMO"
              placeholderTextColor="#64748b"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>Discount Percentage (%)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={discountPercent}
              onChangeText={setDiscountPercent}
            />

            <Text style={styles.label}>Usage Limit (Max Redemptions)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="e.g. 50"
              placeholderTextColor="#64748b"
              value={usageLimit}
              onChangeText={setUsageLimit}
            />

            <TouchableOpacity
              style={[styles.createBtn, creating && styles.disabledBtn]}
              onPress={handleCreateOffer}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#064e3b" />
              ) : (
                <Text style={styles.createBtnText}>Publish Offer</Text>
              )}
            </TouchableOpacity>
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
  },
  card: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  infoCol: {
    flex: 1,
  },
  offerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  turfName: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  discountBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    color: '#064e3b',
    fontSize: 11,
    fontWeight: '800',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0b1120',
    padding: 10,
    borderRadius: 8,
  },
  codeLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '800',
  },
  codeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#38bdf8',
    letterSpacing: 1,
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
  createBtn: {
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
  createBtnText: {
    color: '#064e3b',
    fontSize: 14,
    fontWeight: '800',
  },
});

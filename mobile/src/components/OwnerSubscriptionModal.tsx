import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import {
  Crown,
  X,
  CheckCircle2,
  Lock,
  Calendar,
  Sparkles,
  ExternalLink,
  Layers,
  DollarSign,
  TrendingUp,
  BarChart3,
  Flame,
  MessageSquare,
  Mail,
  Repeat,
  Zap,
  Tag,
  Banknote,
  ShieldCheck,
  CreditCard,
} from 'lucide-react-native';
import { useOwnerSubscription } from '../contexts/OwnerSubscriptionContext';
import { PlanFeatureConfig } from '../types';

interface OwnerSubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
  navigation?: any;
}

export const OwnerSubscriptionModal: React.FC<OwnerSubscriptionModalProps> = ({
  visible,
  onClose,
  navigation,
}) => {
  const { status, plan, features, maxArenas, isExpired, isTrial, daysRemaining, isSystemEnforced } =
    useOwnerSubscription();

  const featureItems: Array<{
    key: keyof PlanFeatureConfig;
    label: string;
    description: string;
    icon: any;
  }> = [
    {
      key: 'analytics',
      label: 'Today & Live Analytics',
      description: "Real-time today's revenue, counter cash vs UPI & occupancy",
      icon: BarChart3,
    },
    {
      key: 'historicalAnalytics',
      label: 'Weekly, Monthly & All-Time Analytics',
      description: 'Historical revenue charts, occupancy heatmaps & retention graphs',
      icon: TrendingUp,
    },
    {
      key: 'multiCourtSetup',
      label: 'Multi-Court & Arena Setup',
      description: `Manage multiple outdoor pitches & gaming zones (Limit: ${maxArenas})`,
      icon: Layers,
    },
    {
      key: 'slotPriceEditing',
      label: 'Individual Slot Price Override',
      description: 'Edit any individual slot price on the calendar anytime',
      icon: DollarSign,
    },
    {
      key: 'featuredTurf',
      label: 'Featured Turf Spotlight',
      description: 'Shining ⭐ FEATURED badge and priority rank on player search',
      icon: Flame,
    },
    {
      key: 'whatsappAlerts',
      label: 'Instant WhatsApp Booking Alerts',
      description: '1-tap WhatsApp booking alerts to venue operator & athlete',
      icon: MessageSquare,
    },
    {
      key: 'monthlyEmailReport',
      label: 'Monthly Financial Email Report',
      description: 'Comprehensive monthly audit & collection statement to your email',
      icon: Mail,
    },
    {
      key: 'autoSlotGenerator',
      label: '7-Day Auto Slot Generator',
      description: 'Generate repeating time schedules for 7-14 days in 1 tap',
      icon: Repeat,
    },
    {
      key: 'customPricing',
      label: 'Peak Hour & Weekend Surge',
      description: 'Night floodlight and weekend rate multipliers',
      icon: Zap,
    },
    {
      key: 'offers',
      label: 'Custom Promo Codes & Offers',
      description: 'Create discount coupons and flash campaigns for players',
      icon: Tag,
    },
    {
      key: 'duesTracker',
      label: 'Player Dues Ledger (Khata)',
      description: 'Counter cash settlement & player debt collection logs',
      icon: Banknote,
    },
    {
      key: 'allowPayAtVenue',
      label: 'Pay at Counter Mode',
      description: 'Permit offline players to reserve with partial advance or cash',
      icon: CreditCard,
    },
  ];

  const handleShareUpgrade = async () => {
    try {
      await Share.share({
        message:
          'To upgrade your TruFit Owner Plan or manage billing with 0% gateway fees, log in to your TruFit Web Portal dashboard: https://ais-pre-7ijs5lmd2ktz6ifxm2ortd-98678528604.asia-southeast1.run.app',
      });
    } catch (e) {
      // ignore
    }
  };

  const planName = plan?.name || (isTrial ? '14-Day Free Trial' : isExpired ? 'Plan Expired' : 'Standard Owner Plan');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.crownCircle}>
                <Crown size={20} color="#f59e0b" />
              </View>
              <View>
                <Text style={styles.title}>Subscription & Plan Details</Text>
                <Text style={styles.subtitle}>Owner Membership Status</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Current Plan Hero Card */}
            <View style={[styles.planCard, isExpired && styles.planCardExpired]}>
              <View style={styles.planCardHeader}>
                <View>
                  <Text style={styles.planBadgeText}>CURRENT ACTIVE PLAN</Text>
                  <Text style={styles.planTitle}>{planName}</Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    isExpired
                      ? styles.statusPillExpired
                      : isTrial
                      ? styles.statusPillTrial
                      : styles.statusPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      isExpired
                        ? styles.statusTextExpired
                        : isTrial
                        ? styles.statusTextTrial
                        : styles.statusTextActive,
                    ]}
                  >
                    {isExpired ? 'EXPIRED' : isTrial ? 'FREE TRIAL' : 'ACTIVE PRO'}
                  </Text>
                </View>
              </View>

              <View style={styles.planMetaRow}>
                <View style={styles.metaItem}>
                  <Calendar size={14} color="#10b981" />
                  <Text style={styles.metaText}>
                    {isExpired
                      ? 'Expired - Renew on Web'
                      : daysRemaining > 0
                      ? `${daysRemaining} days remaining`
                      : 'Active'}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Layers size={14} color="#60a5fa" />
                  <Text style={styles.metaText}>Up to {maxArenas} Courts/Arenas</Text>
                </View>
              </View>

              {plan?.price && plan.price > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceAmount}>₹{plan.price.toLocaleString()}</Text>
                  <Text style={styles.priceDuration}> / {plan.durationDays || 365} days</Text>
                </View>
              )}
            </View>

            {/* System Override Note if admin disabled global gating */}
            {!isSystemEnforced && (
              <View style={styles.noticeBanner}>
                <ShieldCheck size={16} color="#10b981" />
                <Text style={styles.noticeText}>
                  System Notice: Subscription gating is currently relaxed globally by TruFit Admin. All platform features are unlocked!
                </Text>
              </View>
            )}

            {/* Features Breakdown */}
            <View style={styles.sectionHeader}>
              <Sparkles size={16} color="#f59e0b" />
              <Text style={styles.sectionTitle}>Feature Entitlements</Text>
            </View>

            <View style={styles.featuresList}>
              {featureItems.map((item) => {
                const isUnlocked = !isSystemEnforced || (!isExpired && features[item.key]);
                const IconComponent = item.icon;
                return (
                  <View
                    key={item.key}
                    style={[styles.featureItem, !isUnlocked && styles.featureItemLocked]}
                  >
                    <View
                      style={[
                        styles.featureIconBox,
                        isUnlocked ? styles.featureIconActive : styles.featureIconLockedBox,
                      ]}
                    >
                      <IconComponent size={16} color={isUnlocked ? '#10b981' : '#64748b'} />
                    </View>
                    <View style={styles.featureInfo}>
                      <View style={styles.featureTitleRow}>
                        <Text style={[styles.featureLabel, !isUnlocked && styles.featureLabelLocked]}>
                          {item.label}
                        </Text>
                        <View
                          style={[
                            styles.badge,
                            isUnlocked ? styles.badgeActive : styles.badgeLocked,
                          ]}
                        >
                          {isUnlocked ? (
                            <CheckCircle2 size={12} color="#10b981" />
                          ) : (
                            <Lock size={12} color="#f43f5e" />
                          )}
                          <Text
                            style={[
                              styles.badgeText,
                              isUnlocked ? styles.badgeTextActive : styles.badgeTextLocked,
                            ]}
                          >
                            {isUnlocked ? 'ACTIVE' : 'LOCKED'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.featureDesc}>{item.description}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Upgrade CTA / Web Portal Instructions */}
            <View style={styles.upgradeBox}>
              <Crown size={22} color="#f59e0b" />
              <Text style={styles.upgradeTitle}>Zero-Fee Web Subscription</Text>
              <Text style={styles.upgradeDesc}>
                To avoid high app store platform fees, all plan upgrades, invoices, and direct UPI settlements are managed securely on the TruFit Web Portal.
              </Text>

              <TouchableOpacity
                style={styles.webBtn}
                activeOpacity={0.8}
                onPress={handleShareUpgrade}
              >
                <ExternalLink size={16} color="#ffffff" />
                <Text style={styles.webBtnText}>Open / Share Web Portal Link</Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  crownCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 1,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#1e293b',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  planCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  planCardExpired: {
    borderColor: 'rgba(244, 63, 94, 0.4)',
    backgroundColor: 'rgba(244, 63, 94, 0.05)',
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusPillTrial: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statusPillExpired: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusTextActive: {
    color: '#10b981',
  },
  statusTextTrial: {
    color: '#f59e0b',
  },
  statusTextExpired: {
    color: '#f43f5e',
  },
  planMetaRow: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  priceAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#10b981',
  },
  priceDuration: {
    fontSize: 12,
    color: '#94a3b8',
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    color: '#a7f3d0',
    lineHeight: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  featuresList: {
    gap: 8,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  featureItemLocked: {
    opacity: 0.65,
    borderColor: '#1e293b',
  },
  featureIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureIconActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  featureIconLockedBox: {
    backgroundColor: '#0f172a',
  },
  featureInfo: {
    flex: 1,
  },
  featureTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  featureLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  featureLabelLocked: {
    color: '#94a3b8',
  },
  featureDesc: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 15,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeLocked: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  badgeTextActive: {
    color: '#10b981',
  },
  badgeTextLocked: {
    color: '#f43f5e',
  },
  upgradeBox: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginTop: 8,
  },
  upgradeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 8,
    marginBottom: 4,
  },
  upgradeDesc: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
  },
  webBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    width: '100%',
    justifyContent: 'center',
  },
  webBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});

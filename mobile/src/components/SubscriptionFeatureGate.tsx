import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Lock, ShieldAlert, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import { useOwnerSubscription } from '../contexts/OwnerSubscriptionContext';

interface SubscriptionFeatureGateProps {
  featureKey: string;
  featureTitle: string;
  featureDescription: string;
  requiredPlanName?: string;
  benefits?: string[];
  navigation?: any;
}

export const SubscriptionFeatureGate: React.FC<SubscriptionFeatureGateProps> = ({
  featureTitle,
  featureDescription,
  requiredPlanName = 'Pro Annual',
  benefits = [
    'Automated slot scheduling & revenue projections',
    'Real-time customer analytics & conversion metrics',
    'Instant cloud synchronization with online player apps',
  ],
  navigation,
}) => {
  const { status, isExpired, isTrial } = useOwnerSubscription();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          {isExpired ? (
            <ShieldAlert size={36} color="#f43f5e" />
          ) : (
            <Lock size={36} color="#fbbf24" />
          )}
        </View>

        <View style={styles.badgeRow}>
          <Text style={[styles.badge, isExpired ? styles.badgeExpired : styles.badgeLocked]}>
            {isExpired ? 'SUBSCRIPTION EXPIRED' : `REQUIRES ${requiredPlanName.toUpperCase()}`}
          </Text>
        </View>

        <Text style={styles.title}>{featureTitle}</Text>
        <Text style={styles.description}>{featureDescription}</Text>

        {/* Benefits checklist */}
        <View style={styles.benefitsBox}>
          <Text style={styles.benefitsTitle}>Included with Plan Upgrade:</Text>
          {benefits.map((b, idx) => (
            <View key={idx} style={styles.benefitRow}>
              <CheckCircle2 size={16} color="#10b981" style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={styles.benefitText}>{b}</Text>
            </View>
          ))}
        </View>

        {/* Compliance info notice */}
        <View style={styles.noticeBox}>
          <Sparkles size={16} color="#94a3b8" style={{ marginRight: 8, marginTop: 1 }} />
          <Text style={styles.noticeText}>
            To manage your arena organization's subscription plan and enable features, sign in to the{' '}
            <Text style={{ fontWeight: '700', color: '#38bdf8' }}>TruFit Partner Web Portal</Text> from any desktop or mobile browser.
          </Text>
        </View>

        {navigation && (
          <TouchableOpacity
            style={styles.viewPlanBtn}
            onPress={() => navigation.navigate('OwnerProfileTab')}
            activeOpacity={0.85}
          >
            <Text style={styles.viewPlanBtnText}>View My Plan & Permissions</Text>
            <ArrowRight size={16} color="#064e3b" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 24,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  badgeRow: {
    marginBottom: 10,
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  badgeLocked: {
    backgroundColor: '#f59e0b1f',
    color: '#fbbf24',
    borderColor: '#f59e0b40',
    borderWidth: 1,
  },
  badgeExpired: {
    backgroundColor: '#f43f5e1f',
    color: '#fb7185',
    borderColor: '#f43f5e40',
    borderWidth: 1,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
  },
  benefitsBox: {
    width: '100%',
    backgroundColor: '#02061780',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 18,
  },
  benefitsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  benefitText: {
    flex: 1,
    fontSize: 12,
    color: '#e2e8f0',
    lineHeight: 18,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1e293b60',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: '#94a3b8',
  },
  viewPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: '100%',
  },
  viewPlanBtnText: {
    color: '#064e3b',
    fontSize: 13,
    fontWeight: '800',
  },
});

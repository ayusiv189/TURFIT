import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  OwnerSubscriptionStatus,
  OwnerSubscriptionPlan,
  PlanFeatureConfig,
  DEFAULT_PLAN_FEATURES,
  SubscriptionSystemConfig,
} from '../types';
import {
  getOwnerSubscriptionPlans,
  listenOwnerSubscription,
  listenSubscriptionSystemConfig,
  getEffectiveOwnerPlanFeatures,
} from '../services/dbService';

interface OwnerSubscriptionContextValue {
  status: OwnerSubscriptionStatus | null;
  features: PlanFeatureConfig;
  plan: OwnerSubscriptionPlan | null;
  maxArenas: number;
  loading: boolean;
  isSystemEnforced: boolean;
  isExpired: boolean;
  isTrial: boolean;
  daysRemaining: number;
  canAccess: (feature: keyof PlanFeatureConfig) => boolean;
  refresh: () => Promise<void>;
}

const OwnerSubscriptionContext = createContext<OwnerSubscriptionContextValue | undefined>(undefined);

export const OwnerSubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [status, setStatus] = useState<OwnerSubscriptionStatus | null>(null);
  const [plans, setPlans] = useState<OwnerSubscriptionPlan[]>([]);
  const [features, setFeatures] = useState<PlanFeatureConfig>(DEFAULT_PLAN_FEATURES);
  const [systemConfig, setSystemConfig] = useState<SubscriptionSystemConfig>({
    enabled: true,
    updatedAt: '',
    updatedBy: '',
  });
  const [loading, setLoading] = useState(true);

  const isOwner = profile?.role === 'OWNER';

  const updateDerivedFeatures = useCallback(
    (currentStatus: OwnerSubscriptionStatus | null, allPlans: OwnerSubscriptionPlan[], sysCfg: SubscriptionSystemConfig) => {
      if (!currentStatus) return;

      // If subscription system disabled globally by Super Admin from web portal
      if (!sysCfg.enabled) {
        setFeatures({ ...DEFAULT_PLAN_FEATURES });
        return;
      }

      // Check if plan expired
      const isExpired = currentStatus.status === 'EXPIRED' || (currentStatus.expiryDate && new Date(currentStatus.expiryDate) < new Date());
      if (isExpired) {
        setFeatures({
          analytics: false,
          offers: false,
          duesTracker: false,
          reviewsManager: false,
          allowPayAtVenue: false,
          autoSlotGenerator: false,
          customPricing: false,
        });
        return;
      }

      const activePlan = allPlans.find((p) => p.id === currentStatus.planId);
      const baseFeatures = activePlan && activePlan.featuresConfig ? {
        ...DEFAULT_PLAN_FEATURES,
        ...activePlan.featuresConfig,
      } : { ...DEFAULT_PLAN_FEATURES };

      // Apply custom overrides set by admin from web
      const effective: PlanFeatureConfig = currentStatus.customFeatures
        ? { ...baseFeatures, ...currentStatus.customFeatures }
        : baseFeatures;

      setFeatures(effective);
    },
    []
  );

  const refresh = useCallback(async () => {
    if (!user || !isOwner) {
      setLoading(false);
      return;
    }
    try {
      const eff = await getEffectiveOwnerPlanFeatures(user.uid);
      setStatus(eff.status);
      setFeatures(eff.features);
    } catch (err) {
      console.warn('Error refreshing owner subscription context:', err);
    } finally {
      setLoading(false);
    }
  }, [user, isOwner]);

  useEffect(() => {
    if (!user || !isOwner) {
      setLoading(false);
      return;
    }

    let unsubSub: (() => void) | null = null;
    let unsubConfig: (() => void) | null = null;

    // Load available plans once
    getOwnerSubscriptionPlans(true).then((pList) => {
      setPlans(pList);
    });

    // Real-time listener for Owner's subscription document in Firestore
    unsubSub = listenOwnerSubscription(user.uid, (newStatus) => {
      setStatus(newStatus);
      updateDerivedFeatures(newStatus, plans, systemConfig);
      setLoading(false);
    });

    // Real-time listener for Admin global subscription toggle in Firestore
    unsubConfig = listenSubscriptionSystemConfig((newConfig) => {
      setSystemConfig(newConfig);
      if (status) {
        updateDerivedFeatures(status, plans, newConfig);
      }
    });

    return () => {
      if (unsubSub) unsubSub();
      if (unsubConfig) unsubConfig();
    };
  }, [user?.uid, isOwner]);

  // Re-run feature derivation if plans change
  useEffect(() => {
    if (status) {
      updateDerivedFeatures(status, plans, systemConfig);
    }
  }, [plans, status, systemConfig, updateDerivedFeatures]);

  const currentPlan = plans.find((p) => p.id === status?.planId) || null;
  const isExpired = !systemConfig.enabled ? false : (status?.status === 'EXPIRED' || (status?.expiryDate ? new Date(status.expiryDate) < new Date() : false));
  const isTrial = status?.status === 'TRIAL' && !isExpired;

  let daysRemaining = 0;
  if (status?.expiryDate) {
    const diff = new Date(status.expiryDate).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  const maxArenas = status?.maxArenasOverride || currentPlan?.maxArenas || (isExpired ? 1 : 5);

  const canAccess = useCallback(
    (feature: keyof PlanFeatureConfig): boolean => {
      if (!systemConfig.enabled) return true;
      if (isExpired) return false;
      return features[feature] ?? true;
    },
    [systemConfig.enabled, isExpired, features]
  );

  return (
    <OwnerSubscriptionContext.Provider
      value={{
        status,
        features,
        plan: currentPlan,
        maxArenas,
        loading,
        isSystemEnforced: systemConfig.enabled,
        isExpired,
        isTrial,
        daysRemaining,
        canAccess,
        refresh,
      }}
    >
      {children}
    </OwnerSubscriptionContext.Provider>
  );
};

export const useOwnerSubscription = () => {
  const context = useContext(OwnerSubscriptionContext);
  if (!context) {
    // Return safe fallback if outside provider
    return {
      status: null,
      features: DEFAULT_PLAN_FEATURES,
      plan: null,
      maxArenas: 5,
      loading: false,
      isSystemEnforced: false,
      isExpired: false,
      isTrial: false,
      daysRemaining: 14,
      canAccess: () => true,
      refresh: async () => {},
    };
  }
  return context;
};

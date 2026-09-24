import React, { useState, useEffect } from 'react';
import {
  OwnerSubscriptionPlan,
  SubscriptionSystemConfig,
  PlanFeatureConfig,
  DEFAULT_PLAN_FEATURES,
  OwnerSubscriptionStatus,
  OwnerSubscriptionTransaction,
  SubscriptionAuditLog,
} from '../../types';
import {
  getSubscriptionSystemConfig,
  updateSubscriptionSystemConfig,
  getOwnerSubscriptionPlans,
  saveOwnerSubscriptionPlan,
  archiveOwnerSubscriptionPlan,
  getAllOwnerProfilesWithSubscriptions,
  getAllSubscriptionTransactions,
  activateOwnerSubscription,
  getSubscriptionAuditLogs,
  DEFAULT_SUBSCRIPTION_PLANS,
} from '../../lib/db';
import {
  CreditCard,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  Sparkles,
  Shield,
  RefreshCw,
  AlertCircle,
  Check,
  Building,
  Users,
  IndianRupee,
  Search,
  Filter,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  History,
  FileText,
  BadgeCheck,
} from 'lucide-react';

interface AdminSubscriptionManagerProps {
  showToast: (message: string, type?: 'success' | 'error') => void;
}

interface OwnerSubscriberItem {
  ownerId: string;
  displayName: string;
  businessName: string;
  email: string;
  phone: string;
  subscription: OwnerSubscriptionStatus;
}

export const AdminSubscriptionManager: React.FC<AdminSubscriptionManagerProps> = ({ showToast }) => {
  const [activeTab, setActiveTab] = useState<'PLANS' | 'SUBSCRIBERS' | 'TRANSACTIONS' | 'AUDIT'>('PLANS');

  const [config, setConfig] = useState<SubscriptionSystemConfig>({
    enabled: true,
    updatedAt: new Date().toISOString(),
    updatedBy: 'Super Admin',
  });
  const [plans, setPlans] = useState<OwnerSubscriptionPlan[]>([]);
  const [subscribers, setSubscribers] = useState<OwnerSubscriberItem[]>([]);
  const [transactions, setTransactions] = useState<OwnerSubscriptionTransaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<SubscriptionAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [subscriberStatusFilter, setSubscriberStatusFilter] = useState<'ALL' | 'ACTIVE' | 'TRIAL' | 'EXPIRED'>('ALL');
  const [txnSearchQuery, setTxnSearchQuery] = useState('');
  const [txnPlanFilter, setTxnPlanFilter] = useState<string>('ALL');

  // Edit / Create Plan Modal
  const [editingPlan, setEditingPlan] = useState<OwnerSubscriptionPlan | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  // Manual Grant / Extend Plan Modal
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [grantData, setGrantData] = useState({
    ownerId: '',
    ownerName: '',
    ownerEmail: '',
    planId: 'pro_arena',
    planName: 'Pro Arena SaaS',
    durationDays: 365,
    amountPaid: 0,
  });
  const [granting, setGranting] = useState(false);

  // Form state for Owner plan
  const [formData, setFormData] = useState({
    name: '',
    price: 1999,
    originalPrice: 2999,
    durationDays: 30,
    featuresStr: '',
    maxArenas: 5,
    maxBookingsPerMonth: 1000,
    trialDays: 30,
    popular: false,
    isActive: true,
  });

  const [featuresConfigState, setFeaturesConfigState] = useState<PlanFeatureConfig>(DEFAULT_PLAN_FEATURES);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cfg, allPlans, allSubs, allTxns, allAudits] = await Promise.all([
        getSubscriptionSystemConfig(),
        getOwnerSubscriptionPlans(true), // include archived for admin
        getAllOwnerProfilesWithSubscriptions().catch(() => []),
        getAllSubscriptionTransactions().catch(() => []),
        getSubscriptionAuditLogs(100).catch(() => []),
      ]);
      setConfig(cfg);
      setPlans(allPlans && allPlans.length > 0 ? allPlans : DEFAULT_SUBSCRIPTION_PLANS);
      setSubscribers(allSubs as OwnerSubscriberItem[]);
      setTransactions(allTxns);
      setAuditLogs(allAudits.filter((a) => a.type === 'OWNER_SUBSCRIPTION'));
    } catch (err) {
      console.error('Error loading owner subscription data:', err);
      showToast('Failed to load subscription settings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleSystem = async () => {
    const nextState = !config.enabled;
    setSavingConfig(true);
    try {
      await updateSubscriptionSystemConfig(nextState, 'Super Admin');
      setConfig({ ...config, enabled: nextState, updatedAt: new Date().toISOString() });
      showToast(
        nextState
          ? 'Owner subscription system enabled globally.'
          : 'Owner subscription system disabled globally. Owners now bypass subscription checks.'
      );
    } catch (err) {
      console.error('Error updating subscription system toggle:', err);
      showToast('Failed to update system toggle.', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      price: 1999,
      originalPrice: 2999,
      durationDays: 30,
      featuresStr: 'Up to 5 Arenas & Pitches\nReal-time Booking Calendar\nWhatsApp Digital Pass Generator\nAutomated UPI Settlement\nPriority City Placement',
      maxArenas: 5,
      maxBookingsPerMonth: 1000,
      trialDays: 30,
      popular: false,
      isActive: true,
    });
    setFeaturesConfigState({ ...DEFAULT_PLAN_FEATURES });
    setIsCreating(true);
    setEditingPlan(null);
  };

  const handleOpenEdit = (plan: OwnerSubscriptionPlan) => {
    setFormData({
      name: plan.name,
      price: plan.price,
      originalPrice: plan.originalPrice || Math.round(plan.price * 1.5),
      durationDays: plan.durationDays,
      featuresStr: (plan.features || []).join('\n'),
      maxArenas: plan.maxArenas || 3,
      maxBookingsPerMonth: plan.maxBookingsPerMonth || 1000,
      trialDays: plan.trialDays || 30,
      popular: !!plan.popular,
      isActive: plan.isActive,
    });
    setFeaturesConfigState(
      plan.featuresConfig ? { ...DEFAULT_PLAN_FEATURES, ...plan.featuresConfig } : { ...DEFAULT_PLAN_FEATURES }
    );
    setEditingPlan(plan);
    setIsCreating(false);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Please enter a plan name.', 'error');
      return;
    }

    setSavingPlan(true);
    try {
      const features = formData.featuresStr
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      const planId = isCreating ? `plan_${Date.now()}` : editingPlan!.id;

      const planPayload: OwnerSubscriptionPlan = {
        id: planId,
        name: formData.name.trim(),
        price: Number(formData.price) || 0,
        originalPrice: Number(formData.originalPrice) || Number(formData.price) || 0,
        durationDays: Number(formData.durationDays) || 30,
        features,
        featuresConfig: featuresConfigState,
        maxArenas: Number(formData.maxArenas) || 3,
        maxBookingsPerMonth: Number(formData.maxBookingsPerMonth) || 500,
        trialDays: Number(formData.trialDays) || 30,
        popular: formData.popular,
        isActive: formData.isActive,
        isArchived: false,
        createdAt: isCreating ? new Date().toISOString() : editingPlan!.createdAt,
        updatedAt: new Date().toISOString(),
      };

      await saveOwnerSubscriptionPlan(planPayload);
      showToast(isCreating ? 'Owner SaaS plan created successfully!' : 'Owner SaaS plan updated successfully!');
      setIsCreating(false);
      setEditingPlan(null);
      await loadData();
    } catch (err) {
      console.error('Error saving subscription plan:', err);
      showToast('Failed to save plan.', 'error');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleArchive = async (planId: string, planName: string) => {
    if (!window.confirm(`Are you sure you want to archive "${planName}"? It will no longer be available for new owner signups.`)) {
      return;
    }
    try {
      await archiveOwnerSubscriptionPlan(planId);
      showToast(`Plan "${planName}" archived.`);
      await loadData();
    } catch (err) {
      console.error('Error archiving plan:', err);
      showToast('Failed to archive plan.', 'error');
    }
  };

  const handleOpenGrantModal = (sub?: OwnerSubscriberItem) => {
    if (sub) {
      setGrantData({
        ownerId: sub.ownerId,
        ownerName: sub.displayName || sub.businessName || 'Turf Owner',
        ownerEmail: sub.email || '',
        planId: sub.subscription?.planId || 'pro_arena',
        planName: sub.subscription?.planName || 'Pro Arena SaaS',
        durationDays: 365,
        amountPaid: 0,
      });
    } else {
      setGrantData({
        ownerId: subscribers[0]?.ownerId || '',
        ownerName: subscribers[0]?.displayName || 'Turf Owner',
        ownerEmail: subscribers[0]?.email || '',
        planId: 'pro_arena',
        planName: 'Pro Arena SaaS',
        durationDays: 365,
        amountPaid: 0,
      });
    }
    setGrantModalOpen(true);
  };

  const handleExecuteGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantData.ownerId.trim()) {
      showToast('Please select a Turf Owner', 'error');
      return;
    }

    const matchedPlan = plans.find((p) => p.id === grantData.planId) || plans[0];
    setGranting(true);
    try {
      await activateOwnerSubscription({
        ownerId: grantData.ownerId.trim(),
        ownerName: grantData.ownerName.trim(),
        ownerEmail: grantData.ownerEmail.trim(),
        planId: matchedPlan?.id || 'pro_arena',
        planName: matchedPlan?.name || 'Pro Arena SaaS',
        durationDays: Number(grantData.durationDays) || 365,
        amountPaid: Number(grantData.amountPaid) || 0,
        paymentTxnId: `ADMIN_MANUAL_GRANT_${Date.now()}`,
      });

      showToast(`Granted ${matchedPlan?.name || 'Pro'} pass to ${grantData.ownerName}!`);
      setGrantModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('Error granting owner pass:', err);
      showToast(err.message || 'Failed to grant owner pass', 'error');
    } finally {
      setGranting(false);
    }
  };

  // Metrics
  const activePlansCount = plans.filter((p) => p.isActive && !p.isArchived).length;
  const activeSubscribersCount = subscribers.filter((s) => {
    const status = s.subscription?.status;
    const isTrial = status === 'TRIAL_ACTIVE' || status === 'TRIAL';
    const isActive = status === 'ACTIVE';
    const notExpired = s.subscription?.expiryDate ? new Date(s.subscription.expiryDate) > new Date() : true;
    return (isActive || isTrial) && notExpired;
  }).length;

  const paidSubscribersCount = subscribers.filter((s) => {
    const status = s.subscription?.status;
    const isActive = status === 'ACTIVE';
    const notExpired = s.subscription?.expiryDate ? new Date(s.subscription.expiryDate) > new Date() : true;
    return isActive && notExpired;
  }).length;

  const totalRevenueFromTxns = transactions.reduce((acc, t) => acc + (Number(t.amountPaid) || 0), 0);
  const totalRevenueFromSubs = subscribers.reduce((acc, s) => {
    const status = s.subscription?.status;
    const isActive = status === 'ACTIVE';
    if (isActive) {
      const plan = plans.find((p) => p.id === s.subscription?.planId);
      const amt = Number((s.subscription as any)?.amountPaid || plan?.price || 1999);
      return acc + (amt > 0 ? amt : 1999);
    }
    return acc;
  }, 0);
  const totalRevenue = Math.max(totalRevenueFromTxns, totalRevenueFromSubs);

  // Filtered Subscribers
  const filteredSubscribers = subscribers.filter((s) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      (s.displayName && s.displayName.toLowerCase().includes(query)) ||
      (s.businessName && s.businessName.toLowerCase().includes(query)) ||
      (s.email && s.email.toLowerCase().includes(query)) ||
      (s.phone && s.phone.includes(query)) ||
      (s.subscription?.planName && s.subscription.planName.toLowerCase().includes(query));

    const status = s.subscription?.status;
    const isTrial = status === 'TRIAL_ACTIVE' || status === 'TRIAL';
    const isActive = status === 'ACTIVE';
    const isExpired = status === 'EXPIRED' || status === 'TRIAL_EXPIRED' || (s.subscription?.expiryDate && new Date(s.subscription.expiryDate) < new Date());

    const matchesStatus =
      subscriberStatusFilter === 'ALL' ||
      (subscriberStatusFilter === 'ACTIVE' && isActive && !isExpired) ||
      (subscriberStatusFilter === 'TRIAL' && isTrial && !isExpired) ||
      (subscriberStatusFilter === 'EXPIRED' && isExpired);

    return matchesSearch && matchesStatus;
  });

  // Filtered Transactions
  const filteredTransactions = transactions.filter((t) => {
    const query = txnSearchQuery.toLowerCase();
    const matchesQuery =
      (t.id && t.id.toLowerCase().includes(query)) ||
      (t.paymentTxnId && t.paymentTxnId.toLowerCase().includes(query)) ||
      (t.ownerName && t.ownerName.toLowerCase().includes(query)) ||
      (t.ownerEmail && t.ownerEmail.toLowerCase().includes(query)) ||
      (t.planName && t.planName.toLowerCase().includes(query));

    const matchesPlan = txnPlanFilter === 'ALL' || t.planId === txnPlanFilter;
    return matchesQuery && matchesPlan;
  });

  const exportTransactionsCSV = () => {
    if (transactions.length === 0) {
      showToast('No transactions to export', 'error');
      return;
    }
    const headers = ['Transaction ID', 'Date', 'Owner Name', 'Owner Email', 'Plan ID', 'Plan Name', 'Amount (INR)'];
    const rows = transactions.map((t) => [
      t.paymentTxnId || t.id,
      t.createdAt ? new Date(t.createdAt).toLocaleString() : '',
      `"${t.ownerName || ''}"`,
      t.ownerEmail || '',
      t.planId || '',
      `"${t.planName || ''}"`,
      t.amountPaid || 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `owner_subscription_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Transactions exported to CSV!');
  };

  return (
    <div className="space-y-6 animate-fade-in" id="admin-owner-subscription-manager">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{activePlansCount}</div>
            <div className="text-xs text-slate-400">Active Owner SaaS Tiers</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{activeSubscribersCount}</div>
            <div className="text-xs text-slate-400">
              Active Subscribers ({paidSubscribersCount} Paid • {trialSubscribersCount} Trial)
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-400">₹{totalRevenue.toLocaleString()}</div>
            <div className="text-xs text-slate-400">
              Total Owner SaaS Revenue ({transactions.length} Invoices)
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs font-bold text-white block">SaaS Paywall Engine</span>
            <span className={`text-[10px] font-semibold ${config.enabled ? 'text-emerald-400' : 'text-amber-400'}`}>
              {config.enabled ? '🟢 Subscriptions Enforced' : '🟡 Paywall Bypassed'}
            </span>
          </div>
          <button
            onClick={handleToggleSystem}
            disabled={savingConfig}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              config.enabled
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            {config.enabled ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{savingConfig ? '...' : config.enabled ? 'Enabled' : 'Bypassed'}</span>
          </button>
        </div>
      </div>

      {/* Main Header & Sub-Tabs */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">Turf Venue Owner SaaS Management</h2>
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
                Venue Operator Plans
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Manage subscription plans, active venue subscribers, payment transactions, and remote paywall configurations for turf operators.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Refresh</span>
            </button>
            {activeTab === 'PLANS' && (
              <button
                onClick={handleOpenCreate}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-950/50 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Owner Plan</span>
              </button>
            )}
            {activeTab === 'SUBSCRIBERS' && (
              <button
                onClick={() => handleOpenGrantModal()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Grant / Extend Pass</span>
              </button>
            )}
            {activeTab === 'TRANSACTIONS' && (
              <button
                onClick={exportTransactionsCSV}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('PLANS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'PLANS'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>SaaS Plans & Quotas ({plans.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('SUBSCRIBERS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'SUBSCRIBERS'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Active Subscribers ({subscribers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('TRANSACTIONS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'TRANSACTIONS'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Transactions & Invoices ({transactions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'AUDIT'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit Logs ({auditLogs.length})</span>
          </button>
        </div>

        {/* ======================= TAB 1: PLANS ======================= */}
        {activeTab === 'PLANS' && (
          <div className="space-y-6">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500">Loading subscription plans...</div>
            ) : plans.length === 0 ? (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                <p className="text-sm font-bold text-white mb-1">No owner subscription plans found</p>
                <p className="text-xs text-slate-500 mb-4">Click "Create Owner Plan" to create your first venue SaaS tier.</p>
                <button
                  onClick={handleOpenCreate}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Plan</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`bg-slate-950 border rounded-2xl p-6 flex flex-col justify-between relative transition-all ${
                      plan.isArchived
                        ? 'border-slate-800/60 opacity-60 bg-slate-950/40'
                        : plan.isActive
                        ? 'border-indigo-500/40 shadow-xl shadow-indigo-950/20'
                        : 'border-slate-800'
                    }`}
                  >
                    {plan.isArchived && (
                      <span className="absolute top-4 right-4 bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Archived
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-base font-bold text-white">{plan.name}</h4>
                        {!plan.isArchived && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              plan.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {plan.isActive ? 'Active' : 'Inactive'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline gap-1.5 mb-4">
                        <span className="text-2xl font-black text-indigo-400">₹{plan.price.toLocaleString()}</span>
                        <span className="text-xs text-slate-400">/ {plan.durationDays} days</span>
                        {plan.originalPrice && plan.originalPrice > plan.price && (
                          <span className="text-xs text-slate-500 line-through">₹{plan.originalPrice.toLocaleString()}</span>
                        )}
                      </div>

                      <div className="space-y-2 mb-6 text-xs text-slate-300 border-t border-slate-800/80 pt-4">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Max Arenas:</span>
                          <strong className="text-white">{plan.maxArenas} Grounds</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Monthly Bookings:</span>
                          <strong className="text-white">{plan.maxBookingsPerMonth} slots</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Free Trial:</span>
                          <strong className="text-emerald-400">{plan.trialDays || 30} Days</strong>
                        </div>
                      </div>

                      <div className="space-y-1.5 mb-4">
                        <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Features Included:</span>
                        {plan.features.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                            <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>

                      {/* Dashboard Feature Toggles Matrix */}
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800/80 space-y-1.5 mb-6">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Dashboard Features (Toggles):</span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { key: 'whatsappNotifications', label: 'WhatsApp Pass' },
                            { key: 'analytics', label: 'Analytics' },
                            { key: 'downloadReports', label: 'Reports' },
                            { key: 'offers', label: 'Offers' },
                            { key: 'duesTracker', label: 'Dues' },
                            { key: 'reviewsManager', label: 'Reviews' },
                            { key: 'allowPayAtVenue', label: 'Pay at Venue' },
                            { key: 'autoSlotGenerator', label: 'Auto Slots' },
                            { key: 'customPricing', label: 'Peak Pricing' },
                          ].map((item) => {
                            const enabled = plan.featuresConfig ? (plan.featuresConfig as any)[item.key] !== false : true;
                            return (
                              <span
                                key={item.key}
                                className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                                  enabled
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20 line-through opacity-70'
                                }`}
                              >
                                {item.label}: {enabled ? 'ON' : 'OFF'}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t border-slate-800">
                      <button
                        onClick={() => handleOpenEdit(plan)}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Edit Plan</span>
                      </button>
                      {!plan.isArchived && (
                        <button
                          onClick={() => handleArchive(plan.id, plan.name)}
                          className="p-2 bg-slate-800 hover:bg-rose-950/50 hover:text-rose-400 text-slate-400 rounded-xl transition-colors cursor-pointer"
                          title="Archive Plan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================= TAB 2: SUBSCRIBERS ======================= */}
        {activeTab === 'SUBSCRIBERS' && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by owner, business, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
                {(['ALL', 'ACTIVE', 'TRIAL', 'EXPIRED'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setSubscriberStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                      subscriberStatusFilter === status
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {status === 'ALL' ? 'All' : status === 'ACTIVE' ? 'Active Paid' : status === 'TRIAL' ? '30-Day Trial' : 'Expired'}
                  </button>
                ))}
              </div>
            </div>

            {/* Subscribers Table */}
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500">Loading turf owner subscribers...</div>
            ) : filteredSubscribers.length === 0 ? (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                <p className="text-sm font-bold text-white mb-1">No subscribers found</p>
                <p className="text-xs text-slate-500">Registered turf operators will automatically appear here.</p>
              </div>
            ) : (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-semibold">
                        <th className="p-4">Owner & Business</th>
                        <th className="p-4">Contact</th>
                        <th className="p-4">SaaS Plan</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Expiry Date</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {filteredSubscribers.map((sub) => {
                        const isTrial = sub.subscription?.status === 'TRIAL_ACTIVE' || sub.subscription?.status === 'TRIAL';
                        const isActive = sub.subscription?.status === 'ACTIVE';
                        const isExpired = sub.subscription?.status === 'EXPIRED' || sub.subscription?.status === 'TRIAL_EXPIRED';
                        const expiry = sub.subscription?.expiryDate || sub.subscription?.trialEndsAt;

                        return (
                          <tr key={sub.ownerId} className="hover:bg-slate-900/40 transition-colors">
                            <td className="p-4">
                              <div className="font-bold text-white">{sub.businessName || sub.displayName}</div>
                              <div className="text-[11px] text-slate-500">
                                {sub.displayName} • ID: {sub.ownerId.slice(0, 8)}...
                              </div>
                            </td>
                            <td className="p-4">
                              <div>{sub.email || 'N/A'}</div>
                              <div className="text-[11px] text-slate-500">{sub.phone || 'N/A'}</div>
                            </td>
                            <td className="p-4">
                              <span className="font-bold text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20 inline-block">
                                {sub.subscription?.planName || 'Starter Arena'}
                              </span>
                            </td>
                            <td className="p-4">
                              {isActive ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/20 text-[10px]">
                                  <BadgeCheck className="w-3 h-3" /> Active Paid
                                </span>
                              ) : isTrial ? (
                                <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-400 px-2.5 py-0.5 rounded-full font-bold border border-blue-500/20 text-[10px]">
                                  <Clock className="w-3 h-3" /> 30d Free Trial
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-400 px-2.5 py-0.5 rounded-full font-bold border border-rose-500/20 text-[10px]">
                                  <AlertCircle className="w-3 h-3" /> Expired
                                </span>
                              )}
                            </td>
                            <td className="p-4">
                              {expiry ? (
                                <div className="font-mono text-[11px]">
                                  {new Date(expiry).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </div>
                              ) : (
                                <span className="text-slate-500">N/A</span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleOpenGrantModal(sub)}
                                className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg text-xs font-bold border border-indigo-500/30 transition-all cursor-pointer inline-flex items-center gap-1"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Extend / Grant</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================= TAB 3: TRANSACTIONS ======================= */}
        {activeTab === 'TRANSACTIONS' && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by txn ID, owner, email..."
                  value={txnSearchQuery}
                  onChange={(e) => setTxnSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <select
                  value={txnPlanFilter}
                  onChange={(e) => setTxnPlanFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Plans</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <div className="text-xs text-slate-400 font-bold bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
                  Total Collected: <span className="text-amber-400">₹{totalRevenue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500">Loading transactions...</div>
            ) : filteredTransactions.length === 0 ? (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                <p className="text-sm font-bold text-white mb-1">No transactions found</p>
                <p className="text-xs text-slate-500">Subscription invoices and online payments will be logged here.</p>
              </div>
            ) : (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-semibold">
                        <th className="p-4">Transaction ID</th>
                        <th className="p-4">Date & Time</th>
                        <th className="p-4">Turf Owner</th>
                        <th className="p-4">Plan</th>
                        <th className="p-4">Payment Method</th>
                        <th className="p-4 text-right">Amount (₹)</th>
                        <th className="p-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {filteredTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="p-4 font-mono font-bold text-white">{tx.paymentTxnId || tx.id}</td>
                          <td className="p-4 text-slate-400">
                            {tx.createdAt ? new Date(tx.createdAt).toLocaleString('en-IN') : 'N/A'}
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-white">{tx.ownerName || 'Turf Owner'}</div>
                            <div className="text-[11px] text-slate-500">{tx.ownerEmail || 'N/A'}</div>
                          </td>
                          <td className="p-4">
                            <span className="font-semibold text-indigo-300">{tx.planName || 'Turf Owner SaaS'}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800 font-mono">
                              ONLINE_UPI
                            </span>
                          </td>
                          <td className="p-4 text-right font-black text-amber-400 text-sm">
                            ₹{(tx.amountPaid || 0).toLocaleString()}
                          </td>
                          <td className="p-4 text-center">
                            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                              PAID
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================= TAB 4: AUDIT ======================= */}
        {activeTab === 'AUDIT' && (
          <div className="space-y-6">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500">Loading audit logs...</div>
            ) : auditLogs.length === 0 ? (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                <p className="text-sm font-bold text-white mb-1">No audit records found</p>
                <p className="text-xs text-slate-500">Plan changes, manual grants, and subscription overrides are logged here.</p>
              </div>
            ) : (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-900/40">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{log.targetName}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md border border-indigo-500/20">
                          {log.action}
                        </span>
                        {log.planName && <span className="text-xs text-slate-400">• {log.planName}</span>}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        By {log.performedBy || 'Super Admin'} • Target ID: {log.targetId}
                      </p>
                    </div>
                    <div className="text-right">
                      {log.amount ? <div className="text-xs font-bold text-amber-400">₹{log.amount}</div> : null}
                      <div className="text-[10px] text-slate-500 font-mono">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN') : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===================== MODAL: CREATE / EDIT PLAN ===================== */}
      {(isCreating || editingPlan) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full my-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  {isCreating ? 'Create Owner SaaS Plan' : `Edit Plan: ${editingPlan?.name}`}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingPlan(null);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Plan Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Pro Arena SaaS"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Subscription Price (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Original Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData({ ...formData, originalPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.durationDays}
                    onChange={(e) => setFormData({ ...formData, durationDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Max Arenas / Pitches</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxArenas}
                    onChange={(e) => setFormData({ ...formData, maxArenas: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Monthly Bookings Quota</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxBookingsPerMonth}
                    onChange={(e) => setFormData({ ...formData, maxBookingsPerMonth: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Free Trial Duration (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.trialDays}
                    onChange={(e) => setFormData({ ...formData, trialDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 font-bold">
                    <input
                      type="checkbox"
                      checked={formData.popular}
                      onChange={(e) => setFormData({ ...formData, popular: e.target.checked })}
                      className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                    />
                    <span>Highlight as Popular</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 font-bold">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                    />
                    <span>Active for Signups</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Plan Features (1 per line)</label>
                <textarea
                  rows={4}
                  value={formData.featuresStr}
                  onChange={(e) => setFormData({ ...formData, featuresStr: e.target.value })}
                  placeholder="Unlimited Pitches&#10;WhatsApp Guest Passes&#10;Dynamic Surge Pricing"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {/* Feature Matrix Toggles */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-white block">Dashboard Permissions & Feature Flags</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { key: 'whatsappNotifications', label: 'WhatsApp Passes' },
                    { key: 'analytics', label: 'Analytics' },
                    { key: 'analytics30Days', label: '30D Analytics' },
                    { key: 'downloadReports', label: 'Reports Download' },
                    { key: 'offers', label: 'Discounts & Offers' },
                    { key: 'duesTracker', label: 'Dues Tracker' },
                    { key: 'reviewsManager', label: 'Reviews Manager' },
                    { key: 'allowPayAtVenue', label: 'Pay at Venue' },
                    { key: 'autoSlotGenerator', label: 'Slot Generator' },
                    { key: 'customPricing', label: 'Surge Pricing' },
                  ].map((feat) => {
                    const isChecked = (featuresConfigState as any)[feat.key] !== false;
                    return (
                      <label key={feat.key} className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            setFeaturesConfigState({
                              ...featuresConfigState,
                              [feat.key]: e.target.checked,
                            })
                          }
                          className="rounded bg-slate-900 border-slate-800 text-indigo-600 focus:ring-0"
                        />
                        <span>{feat.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingPlan(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-950/50 cursor-pointer flex items-center gap-2"
                >
                  {savingPlan ? 'Saving Plan...' : isCreating ? 'Create Plan' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: GRANT / EXTEND PASS ===================== */}
      {grantModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Grant / Override Owner SaaS Pass</h3>
              </div>
              <button
                onClick={() => setGrantModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteGrant} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Select Turf Owner</label>
                <select
                  required
                  value={grantData.ownerId}
                  onChange={(e) => {
                    const chosen = subscribers.find((s) => s.ownerId === e.target.value);
                    setGrantData({
                      ...grantData,
                      ownerId: e.target.value,
                      ownerName: chosen?.displayName || chosen?.businessName || 'Turf Owner',
                      ownerEmail: chosen?.email || '',
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {subscribers.map((s) => (
                    <option key={s.ownerId} value={s.ownerId}>
                      {s.businessName ? `${s.businessName} (${s.displayName})` : s.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Choose SaaS Plan</label>
                <select
                  required
                  value={grantData.planId}
                  onChange={(e) => {
                    const p = plans.find((pl) => pl.id === e.target.value);
                    setGrantData({
                      ...grantData,
                      planId: e.target.value,
                      planName: p?.name || 'Pro Arena SaaS',
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (₹{p.price})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Duration (Days)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[30, 90, 365].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setGrantData({ ...grantData, durationDays: d })}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        grantData.durationDays === d
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {d === 365 ? '1 Year' : `${d} Days`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setGrantModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={granting}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/50 cursor-pointer flex items-center gap-2"
                >
                  {granting ? 'Granting Pass...' : 'Grant / Extend Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

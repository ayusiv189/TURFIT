import React, { useState, useEffect } from 'react';
import {
  PlayerSubscriptionPlan,
  PlayerSubscriptionStatus,
  PlayerSubscriptionTransaction,
  PlayerPlanEntitlements,
  DEFAULT_PLAYER_ENTITLEMENTS,
  DEFAULT_PLAYER_SUBSCRIPTION_PLANS,
} from '../../types';
import {
  getPlayerSubscriptionPlans,
  savePlayerSubscriptionPlan,
  archivePlayerSubscriptionPlan,
  deletePlayerSubscriptionPlan,
  getAllPlayerSubscriptions,
  getAllPlayerSubscriptionTransactions,
  activatePlayerSubscription,
} from '../../lib/db';
import {
  Users,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Star,
  Sparkles,
  RefreshCw,
  Search,
  IndianRupee,
  Layers,
  Award,
  Zap,
  Tag,
  ArrowRight,
  UserCheck,
  Lock,
} from 'lucide-react';

interface AdminPlayerSubscriptionManagerProps {
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const AdminPlayerSubscriptionManager: React.FC<AdminPlayerSubscriptionManagerProps> = ({ showToast }) => {
  const [activeTab, setActiveTab] = useState<'PLANS' | 'SUBSCRIBERS' | 'TRANSACTIONS'>('PLANS');
  const [plans, setPlans] = useState<PlayerSubscriptionPlan[]>([]);
  const [subscribers, setSubscribers] = useState<PlayerSubscriptionStatus[]>([]);
  const [transactions, setTransactions] = useState<PlayerSubscriptionTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Edit / Create Plan Modal
  const [editingPlan, setEditingPlan] = useState<PlayerSubscriptionPlan | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  // Manual Grant Modal
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [grantData, setGrantData] = useState({
    userId: '',
    userName: '',
    userEmail: '',
    planId: '',
    durationDays: 365,
  });
  const [granting, setGranting] = useState(false);

  // Plan Form State
  const [formData, setFormData] = useState({
    name: '',
    price: 199,
    originalPrice: 399,
    billingPeriod: 'MONTHLY' as 'MONTHLY' | 'QUARTERLY' | 'ANNUAL',
    durationDays: 30,
    featuresStr: '',
    badgeIncluded: false,
    popular: false,
    isActive: true,
  });

  const [entitlementsState, setEntitlementsState] = useState<PlayerPlanEntitlements>(DEFAULT_PLAYER_ENTITLEMENTS);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allPlans, allSubs, allTxns] = await Promise.all([
        getPlayerSubscriptionPlans(true),
        getAllPlayerSubscriptions(),
        getAllPlayerSubscriptionTransactions(),
      ]);
      setPlans(allPlans && allPlans.length > 0 ? allPlans : DEFAULT_PLAYER_SUBSCRIPTION_PLANS);
      setSubscribers(allSubs);
      setTransactions(allTxns);
    } catch (err) {
      console.error('Error loading player subscriptions:', err);
      showToast('Failed to load player subscription data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setFormData({
      name: '',
      price: 299,
      originalPrice: 499,
      billingPeriod: 'MONTHLY',
      durationDays: 30,
      featuresStr: '10% Discount on Turf Bookings\nPriority Squad Join\nAdvanced Radar Stats\nZero Cancellation Fee',
      badgeIncluded: false,
      popular: false,
      isActive: true,
    });
    setEntitlementsState({ ...DEFAULT_PLAYER_ENTITLEMENTS });
    setIsCreating(true);
    setEditingPlan(null);
  };

  const openEditModal = (plan: PlayerSubscriptionPlan) => {
    setFormData({
      name: plan.name,
      price: plan.price,
      originalPrice: plan.originalPrice || plan.price * 2,
      billingPeriod: plan.billingPeriod,
      durationDays: plan.durationDays,
      featuresStr: plan.features.join('\n'),
      badgeIncluded: plan.badgeIncluded || false,
      popular: plan.popular || false,
      isActive: plan.isActive,
    });
    setEntitlementsState(plan.entitlements || { ...DEFAULT_PLAYER_ENTITLEMENTS });
    setEditingPlan(plan);
    setIsCreating(false);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Plan name is required', 'error');
      return;
    }

    setSavingPlan(true);
    try {
      const featuresArray = formData.featuresStr
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f.length > 0);

      const planId = isCreating
        ? `player_plan_${Date.now()}`
        : editingPlan!.id;

      const newPlan: PlayerSubscriptionPlan = {
        id: planId,
        name: formData.name.trim(),
        price: Number(formData.price),
        originalPrice: Number(formData.originalPrice) || undefined,
        billingPeriod: formData.billingPeriod,
        durationDays: Number(formData.durationDays),
        features: featuresArray,
        entitlements: entitlementsState,
        badgeIncluded: formData.badgeIncluded,
        popular: formData.popular,
        isActive: formData.isActive,
        isArchived: false,
        createdAt: editingPlan?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await savePlayerSubscriptionPlan(newPlan);
      showToast(isCreating ? 'Player plan created successfully!' : 'Player plan updated!', 'success');
      setIsCreating(false);
      setEditingPlan(null);
      loadData();
    } catch (err: any) {
      console.error('Error saving player plan:', err);
      showToast(err?.message || 'Failed to save plan', 'error');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleArchivePlan = async (plan: PlayerSubscriptionPlan) => {
    if (!confirm(`Are you sure you want to toggle archive for "${plan.name}"?`)) return;
    try {
      if (plan.isArchived) {
        await savePlayerSubscriptionPlan({ ...plan, isArchived: false, isActive: true });
        showToast('Plan unarchived successfully', 'success');
      } else {
        await archivePlayerSubscriptionPlan(plan.id);
        showToast('Plan archived successfully', 'success');
      }
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Action failed', 'error');
    }
  };

  const handleDeletePlan = async (plan: PlayerSubscriptionPlan) => {
    if (!confirm(`Permanently delete "${plan.name}"? This action cannot be undone.`)) return;
    try {
      await deletePlayerSubscriptionPlan(plan.id);
      showToast('Plan deleted permanently', 'success');
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete plan', 'error');
    }
  };

  const handleManualGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantData.userId.trim() || !grantData.planId) {
      showToast('User ID and Plan are required', 'error');
      return;
    }
    const plan = plans.find((p) => p.id === grantData.planId);
    if (!plan) return;

    setGranting(true);
    try {
      await activatePlayerSubscription({
        userId: grantData.userId.trim(),
        userName: grantData.userName.trim() || 'TruFit Athlete',
        userEmail: grantData.userEmail.trim() || '',
        planId: plan.id,
        planName: plan.name,
        durationDays: Number(grantData.durationDays) || plan.durationDays,
        amountPaid: 0,
        entitlements: plan.entitlements,
        badgeIncluded: plan.badgeIncluded,
        paymentTxnId: `ADMIN_GRANT_${Date.now()}`,
        activatedBy: 'Super Admin',
      });
      showToast(`Granted ${plan.name} to ${grantData.userId}`, 'success');
      setGrantModalOpen(false);
      setGrantData({ userId: '', userName: '', userEmail: '', planId: '', durationDays: 365 });
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Grant failed', 'error');
    } finally {
      setGranting(false);
    }
  };

  const filteredSubscribers = subscribers.filter(
    (s) =>
      s.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.userName && s.userName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.userEmail && s.userEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.planName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-3xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Star className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-white tracking-tight">Player SaaS Subscription Plans</h2>
          </div>
          <p className="text-xs text-slate-400">
            Configure consumer SaaS plans for players with booking discounts, lobby priority, badges, and automated perks.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <button
            type="button"
            onClick={loadData}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setGrantModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-indigo-950/40"
          >
            <UserCheck className="w-4 h-4" />
            <span>Admin Grant</span>
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-amber-950/40"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Player Plan</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('PLANS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'PLANS'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>SaaS Plans ({plans.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SUBSCRIBERS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'SUBSCRIBERS'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Active Subscribers ({subscribers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('TRANSACTIONS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'TRANSACTIONS'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <IndianRupee className="w-3.5 h-3.5" />
          <span>Transactions ({transactions.length})</span>
        </button>
      </div>

      {/* TAB 1: PLANS */}
      {activeTab === 'PLANS' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isArchived = plan.isArchived;
            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-6 border flex flex-col justify-between transition-all ${
                  isArchived
                    ? 'bg-slate-950/40 border-slate-800/50 opacity-60'
                    : plan.popular
                    ? 'bg-gradient-to-b from-amber-950/30 via-slate-900 to-slate-900 border-amber-500/40 shadow-xl shadow-amber-950/20'
                    : 'bg-slate-900/90 border-slate-800'
                }`}
              >
                {/* Badges / Header */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {plan.billingPeriod} • {plan.durationDays} Days
                    </span>
                    <div className="flex items-center gap-1.5">
                      {plan.popular && (
                        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Most Popular
                        </span>
                      )}
                      {plan.badgeIncluded && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1" title="Includes Verified Athlete Gold Badge">
                          <Award className="w-3 h-3" /> Badge Included
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-white">{plan.name}</h3>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-black text-amber-400">₹{plan.price}</span>
                      {plan.originalPrice && plan.originalPrice > plan.price && (
                        <span className="text-xs text-slate-500 line-through font-bold">₹{plan.originalPrice}</span>
                      )}
                      <span className="text-xs text-slate-400 font-medium">/{plan.billingPeriod.toLowerCase()}</span>
                    </div>
                  </div>

                  {/* Entitlements preview */}
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 space-y-1.5 text-xs">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Key Entitlements:</div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Turf Booking Discount:</span>
                      <span className="font-black text-emerald-400">{plan.entitlements?.bookingDiscountPercent || 0}% OFF</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Priority Matchmaking:</span>
                      <span className={plan.entitlements?.priorityLobbyAccess ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                        {plan.entitlements?.priorityLobbyAccess ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Free Tournaments:</span>
                      <span className="font-bold text-amber-400">{plan.entitlements?.freeTournamentEntryMonthly || 0} / mo</span>
                    </div>
                  </div>

                  {/* Feature list */}
                  <div className="space-y-1.5 pt-2">
                    {plan.features.map((f, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plan Actions */}
                <div className="flex items-center gap-2 pt-6 border-t border-slate-800/80 mt-6">
                  <button
                    type="button"
                    onClick={() => openEditModal(plan)}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Edit Plan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleArchivePlan(plan)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-700 transition-colors"
                    title={plan.isArchived ? 'Unarchive' : 'Archive'}
                  >
                    <Tag className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeletePlan(plan)}
                    className="p-2 bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-700 transition-colors"
                    title="Delete permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: SUBSCRIBERS */}
      {activeTab === 'SUBSCRIBERS' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Player Name, Email, or User ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="py-3.5 px-4">Player</th>
                    <th className="py-3.5 px-4">Plan</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Discount</th>
                    <th className="py-3.5 px-4">Start Date</th>
                    <th className="py-3.5 px-4">Expiry Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredSubscribers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No active player subscribers found.
                      </td>
                    </tr>
                  ) : (
                    filteredSubscribers.map((sub) => (
                      <tr key={sub.userId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{sub.userName || 'Athlete'}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{sub.userEmail || sub.userId}</div>
                        </td>
                        <td className="py-3 px-4 font-bold text-amber-400">{sub.planName}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              sub.status === 'ACTIVE'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-400">
                          {sub.entitlements?.bookingDiscountPercent || 0}% OFF
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(sub.startDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">
                          {new Date(sub.expiryDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TRANSACTIONS */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-4">Txn ID</th>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Plan Name</th>
                  <th className="py-3.5 px-4">Amount Paid</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No player subscription transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400">{tx.paymentTxnId || tx.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{tx.userName || 'Athlete'}</div>
                        <div className="text-[11px] text-slate-500">{tx.userEmail || tx.userId}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-amber-400">{tx.planName}</td>
                      <td className="py-3 px-4 font-black text-emerald-400">₹{tx.amountPaid}</td>
                      <td className="py-3 px-4 text-slate-400">{new Date(tx.createdAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT PLAN MODAL */}
      {(isCreating || editingPlan) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-black text-white">
                {isCreating ? 'Create Player Subscription Plan' : `Edit: ${editingPlan?.name}`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingPlan(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-300">Plan Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    placeholder="e.g. TruFit Athlete Pro"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Original / Strikethrough Price (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.originalPrice}
                    onChange={(e) => setFormData({ ...formData, originalPrice: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Billing Period</label>
                  <select
                    value={formData.billingPeriod}
                    onChange={(e) => {
                      const period = e.target.value as 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
                      const days = period === 'ANNUAL' ? 365 : period === 'QUARTERLY' ? 90 : 30;
                      setFormData({ ...formData, billingPeriod: period, durationDays: days });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="MONTHLY">Monthly (30 Days)</option>
                    <option value="QUARTERLY">Quarterly (90 Days)</option>
                    <option value="ANNUAL">Annual (365 Days)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Exact Duration (Days)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.durationDays}
                    onChange={(e) => setFormData({ ...formData, durationDays: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Entitlements toggles */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="text-xs font-black text-amber-400 uppercase tracking-wider">Plan Entitlements & Features</div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Turf Booking Discount (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={entitlementsState.bookingDiscountPercent}
                      onChange={(e) =>
                        setEntitlementsState({ ...entitlementsState, bookingDiscountPercent: Number(e.target.value) })
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Free Tournament Entries / Mo</label>
                    <input
                      type="number"
                      min={0}
                      value={entitlementsState.freeTournamentEntryMonthly}
                      onChange={(e) =>
                        setEntitlementsState({ ...entitlementsState, freeTournamentEntryMonthly: Number(e.target.value) })
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={entitlementsState.priorityLobbyAccess}
                      onChange={(e) =>
                        setEntitlementsState({ ...entitlementsState, priorityLobbyAccess: e.target.checked })
                      }
                      className="rounded accent-amber-500"
                    />
                    <span>Priority Lobby Access</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.badgeIncluded}
                      onChange={(e) => {
                        setFormData({ ...formData, badgeIncluded: e.target.checked });
                        setEntitlementsState({ ...entitlementsState, verifiedBadgeIncluded: e.target.checked });
                      }}
                      className="rounded accent-amber-500"
                    />
                    <span>Verified Gold Badge Included</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={entitlementsState.advancedMatchStats}
                      onChange={(e) =>
                        setEntitlementsState({ ...entitlementsState, advancedMatchStats: e.target.checked })
                      }
                      className="rounded accent-amber-500"
                    />
                    <span>Advanced Radar Stats</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={entitlementsState.zeroCancellationFee}
                      onChange={(e) =>
                        setEntitlementsState({ ...entitlementsState, zeroCancellationFee: e.target.checked })
                      }
                      className="rounded accent-amber-500"
                    />
                    <span>Zero Cancellation Fee</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.popular}
                      onChange={(e) => setFormData({ ...formData, popular: e.target.checked })}
                      className="rounded accent-amber-500"
                    />
                    <span>Highlight as "Most Popular"</span>
                  </label>
                </div>
              </div>

              {/* Bullet points for marketing cards */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Features Bullet Points (one per line)</label>
                <textarea
                  rows={4}
                  value={formData.featuresStr}
                  onChange={(e) => setFormData({ ...formData, featuresStr: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingPlan(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-amber-950/40"
                >
                  {savingPlan ? 'Saving...' : 'Save Player Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANUAL GRANT MODAL */}
      {grantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">Manual Admin Player Plan Grant</h3>
              <button
                type="button"
                onClick={() => setGrantModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualGrant} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300">Player User ID (UID) *</label>
                <input
                  type="text"
                  required
                  value={grantData.userId}
                  onChange={(e) => setGrantData({ ...grantData, userId: e.target.value })}
                  placeholder="e.g. firebase_auth_uid"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Player Name (Optional)</label>
                <input
                  type="text"
                  value={grantData.userName}
                  onChange={(e) => setGrantData({ ...grantData, userName: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Player Email (Optional)</label>
                <input
                  type="email"
                  value={grantData.userEmail}
                  onChange={(e) => setGrantData({ ...grantData, userEmail: e.target.value })}
                  placeholder="e.g. player@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Select Plan *</label>
                <select
                  required
                  value={grantData.planId}
                  onChange={(e) => {
                    const p = plans.find((item) => item.id === e.target.value);
                    setGrantData({ ...grantData, planId: e.target.value, durationDays: p?.durationDays || 365 });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="">-- Choose a Plan --</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (₹{p.price} / {p.durationDays}d)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Duration (Days)</label>
                <input
                  type="number"
                  min={1}
                  value={grantData.durationDays}
                  onChange={(e) => setGrantData({ ...grantData, durationDays: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setGrantModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={granting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-950/40"
                >
                  {granting ? 'Granting...' : 'Grant Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

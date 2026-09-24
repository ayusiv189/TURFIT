import React, { useState, useEffect } from 'react';
import {
  CoachSubscriptionPlan,
  CoachSubscription,
  CoachSubscriptionTransaction,
  DEFAULT_COACH_SUBSCRIPTION_PLANS,
} from '../../types';
import {
  getCoachSubscriptionPlans,
  saveCoachSubscriptionPlan,
  archiveCoachSubscriptionPlan,
  deleteCoachSubscriptionPlan,
  getAllCoachSubscriptions,
  getAllCoachSubscriptionTransactions,
  activateCoachSubscription,
} from '../../lib/db';
import {
  GraduationCap,
  Building,
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
  Calendar,
  Clock,
  Filter,
} from 'lucide-react';

interface AdminCoachSubscriptionManagerProps {
  showToast: (message: string, type?: 'success' | 'error') => void;
}

interface CoachSubscriberRow {
  coachId: string;
  name: string;
  academyName?: string;
  email: string;
  phone: string;
  sports: string[];
  city?: string;
  isVerified: boolean;
  subscription?: CoachSubscription;
  status: string;
  createdAt: string;
  totalBatches?: number;
  totalEnrolledStudents?: number;
}

export const AdminCoachSubscriptionManager: React.FC<AdminCoachSubscriptionManagerProps> = ({ showToast }) => {
  const [activeTab, setActiveTab] = useState<'PLANS' | 'SUBSCRIBERS' | 'TRANSACTIONS'>('PLANS');
  const [plans, setPlans] = useState<CoachSubscriptionPlan[]>([]);
  const [subscribers, setSubscribers] = useState<CoachSubscriberRow[]>([]);
  const [transactions, setTransactions] = useState<CoachSubscriptionTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'COACH' | 'ACADEMY'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'NONE'>('ALL');

  // Edit / Create Plan Modal
  const [editingPlan, setEditingPlan] = useState<CoachSubscriptionPlan | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  // Manual Grant Modal
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [grantData, setGrantData] = useState({
    coachId: '',
    coachName: '',
    coachEmail: '',
    coachPhone: '',
    academyName: '',
    planId: 'YEARLY_COACH_PRO',
    durationDays: 365,
  });
  const [granting, setGranting] = useState(false);

  // Plan Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    price: 2999,
    originalPrice: 4999,
    duration: '1 Year (365 Days)',
    durationDays: 365,
    role: 'COACH' as 'COACH' | 'ACADEMY' | 'ALL',
    maxBatches: 5,
    featuresStr: '',
    popular: false,
    isActive: true,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [allPlans, allSubs, allTxns] = await Promise.all([
        getCoachSubscriptionPlans(true),
        getAllCoachSubscriptions(),
        getAllCoachSubscriptionTransactions(),
      ]);
      setPlans(allPlans && allPlans.length > 0 ? allPlans : DEFAULT_COACH_SUBSCRIPTION_PLANS);
      setSubscribers(allSubs);
      setTransactions(allTxns);
    } catch (err) {
      console.error('Error loading coach subscriptions:', err);
      showToast('Failed to load coach & academy subscription data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingPlan(null);
    setIsCreating(true);
    setFormData({
      id: `plan_coach_${Date.now()}`,
      name: '',
      price: 2999,
      originalPrice: 4999,
      duration: '1 Year (365 Days)',
      durationDays: 365,
      role: 'COACH',
      maxBatches: 5,
      featuresStr: 'Official Gold Coach Verified Tick\nHost up to 5 concurrent training batches\nDirect athlete & student discovery across city\n0% commission on student fees',
      popular: false,
      isActive: true,
    });
  };

  const handleOpenEditModal = (plan: CoachSubscriptionPlan) => {
    setIsCreating(false);
    setEditingPlan(plan);
    setFormData({
      id: plan.id,
      name: plan.name,
      price: plan.price,
      originalPrice: plan.originalPrice || plan.price * 1.5,
      duration: plan.duration || `${plan.durationDays} Days`,
      durationDays: plan.durationDays,
      role: plan.role || 'COACH',
      maxBatches: plan.maxBatches || 10,
      featuresStr: (plan.features || []).join('\n'),
      popular: !!plan.popular,
      isActive: plan.isActive !== false,
    });
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Please enter a valid plan name', 'error');
      return;
    }

    setSavingPlan(true);
    try {
      const features = formData.featuresStr
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f.length > 0);

      const planPayload: CoachSubscriptionPlan = {
        id: editingPlan ? editingPlan.id : formData.id || `plan_coach_${Date.now()}`,
        name: formData.name.trim(),
        price: Number(formData.price) || 0,
        originalPrice: Number(formData.originalPrice) || Number(formData.price) || 0,
        duration: formData.duration || `${formData.durationDays} Days`,
        durationDays: Number(formData.durationDays) || 365,
        role: formData.role,
        maxBatches: Number(formData.maxBatches) || 5,
        features,
        popular: formData.popular,
        isActive: formData.isActive,
        isArchived: false,
        createdAt: editingPlan?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveCoachSubscriptionPlan(planPayload);
      showToast(isCreating ? 'Coach SaaS plan created successfully!' : 'Coach SaaS plan updated!');
      setIsCreating(false);
      setEditingPlan(null);
      await loadData();
    } catch (err: any) {
      console.error('Error saving coach subscription plan:', err);
      showToast(err.message || 'Failed to save coach SaaS plan', 'error');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleArchivePlan = async (planId: string) => {
    if (!window.confirm('Are you sure you want to archive this Coach SaaS plan?')) return;
    try {
      await archiveCoachSubscriptionPlan(planId);
      showToast('Plan archived successfully');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to archive plan', 'error');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!window.confirm('Permanently delete this plan? This action cannot be undone.')) return;
    try {
      await deleteCoachSubscriptionPlan(planId);
      showToast('Plan permanently deleted');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete plan', 'error');
    }
  };

  const handleManualGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantData.coachId.trim()) {
      showToast('Please select or specify a Coach / Academy ID', 'error');
      return;
    }

    const selectedPlan = plans.find((p) => p.id === grantData.planId) || plans[0];
    if (!selectedPlan) {
      showToast('Please select a valid SaaS plan', 'error');
      return;
    }

    setGranting(true);
    try {
      await activateCoachSubscription({
        coachId: grantData.coachId.trim(),
        coachName: grantData.coachName.trim() || 'Coach / Academy',
        coachEmail: grantData.coachEmail.trim() || '',
        coachPhone: grantData.coachPhone.trim() || '',
        academyName: grantData.academyName.trim() || '',
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        durationDays: Number(grantData.durationDays) || 365,
        amountPaid: 0,
        paymentTxnId: `ADMIN_MANUAL_GRANT_${Date.now()}`,
        paymentMethod: 'SUPER_ADMIN_OVERRIDE',
      });

      showToast(`Granted ${selectedPlan.name} to ${grantData.coachName || grantData.coachId}!`);
      setGrantModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('Error granting coach pass:', err);
      showToast(err.message || 'Failed to grant coach pass', 'error');
    } finally {
      setGranting(false);
    }
  };

  const activePlansCount = plans.filter((p) => p.isActive && !p.isArchived).length;
  const activeSubscribersCount = subscribers.filter(
    (s) =>
      (s.subscription?.isActive && s.subscription?.expiresAt && new Date(s.subscription.expiresAt) > new Date()) ||
      s.subscription?.paymentStatus === 'PAID' ||
      ((s as any).platformFeePaid && (s as any).platformFeePaid > 0) ||
      s.isVerified
  ).length;

  const totalRevenueFromTxns = transactions.reduce((acc, t) => acc + (Number(t.amountPaid) || 0), 0);
  const totalRevenueFromSubs = subscribers.reduce((acc, s) => {
    const isPaid =
      s.subscription?.isActive ||
      s.subscription?.paymentStatus === 'PAID' ||
      ((s as any).platformFeePaid && (s as any).platformFeePaid > 0) ||
      s.isVerified;
    if (isPaid) {
      const amt = Number(s.subscription?.amountPaid ?? (s as any).platformFeePaid ?? (s.academyName ? 4999 : 2999));
      return acc + (amt > 0 ? amt : (s.academyName ? 4999 : 2999));
    }
    return acc;
  }, 0);
  const totalRevenue = Math.max(totalRevenueFromTxns, totalRevenueFromSubs);

  // Filtered Subscribers
  const filteredSubscribers = subscribers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.academyName && s.academyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery);

    const isSubActive =
      (s.subscription?.isActive && s.subscription?.expiresAt && new Date(s.subscription.expiresAt) > new Date()) ||
      s.subscription?.paymentStatus === 'PAID' ||
      ((s as any).platformFeePaid && (s as any).platformFeePaid > 0) ||
      s.isVerified;

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && isSubActive) ||
      (statusFilter === 'EXPIRED' && s.subscription && !isSubActive) ||
      (statusFilter === 'NONE' && !s.subscription && !s.isVerified);

    const matchesRole =
      roleFilter === 'ALL' ||
      (roleFilter === 'ACADEMY' && !!s.academyName) ||
      (roleFilter === 'COACH' && !s.academyName);

    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <div className="space-y-6 animate-fade-in" id="admin-coach-subscription-manager">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{activePlansCount}</div>
            <div className="text-xs text-slate-400">Active Coach & Academy Tiers</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{activeSubscribersCount}</div>
            <div className="text-xs text-slate-400">Subscribed Coaches & Academies</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-400">₹{totalRevenue.toLocaleString()}</div>
            <div className="text-xs text-slate-400">Total Coach SaaS Revenue</div>
          </div>
        </div>
      </div>

      {/* Main Header & Sub-Tabs */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Coach & Sports Academy SaaS System</h2>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                Annual Pro Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Configure tiered coach plans, academy franchises, batch quotas, verified badges, and inspect active subscriber contracts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              id="admin-grant-coach-pass-btn"
              onClick={() => {
                setGrantData({
                  coachId: '',
                  coachName: '',
                  coachEmail: '',
                  coachPhone: '',
                  academyName: '',
                  planId: plans[0]?.id || 'YEARLY_COACH_PRO',
                  durationDays: 365,
                });
                setGrantModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-2 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Grant Coach Pass</span>
            </button>

            <button
              type="button"
              id="admin-create-coach-plan-btn"
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-xl text-xs font-black transition-all shadow-lg shadow-amber-950/40 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Coach Tier</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs Bar */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab('PLANS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'PLANS'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>SaaS Plans & Entitlements ({plans.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SUBSCRIBERS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'SUBSCRIBERS'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-emerald-400" />
            <span>Subscribers ({subscribers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TRANSACTIONS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'TRANSACTIONS'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <IndianRupee className="w-4 h-4 text-amber-400" />
            <span>Payment Logs ({transactions.length})</span>
          </button>
        </div>

        {/* TAB 1: COACH SAAS PLANS */}
        {activeTab === 'PLANS' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-2xl p-6 border flex flex-col justify-between transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500 shadow-xl shadow-emerald-950/30'
                      : 'bg-slate-900/90 border-slate-800'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
                        {plan.role} • {plan.durationDays} Days
                      </span>
                      <div className="flex items-center gap-2">
                        {plan.popular && (
                          <span className="text-[10px] font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
                            Popular
                          </span>
                        )}
                        {plan.isActive ? (
                          <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/30">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-white tracking-tight">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-3xl font-black text-amber-400">₹{plan.price}</span>
                        {plan.originalPrice && plan.originalPrice > plan.price && (
                          <span className="text-xs text-slate-500 line-through ml-2">₹{plan.originalPrice}</span>
                        )}
                        <span className="text-xs text-slate-400">/{plan.duration || 'yr'}</span>
                      </div>
                    </div>

                    {/* Batch Limit Badge */}
                    <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Batch Capacity:</span>
                      <span className="text-white font-bold">
                        {plan.maxBatches && plan.maxBatches < 900 ? `${plan.maxBatches} Concurrent Batches` : 'Unlimited Batches'}
                      </span>
                    </div>

                    {/* Features list */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      {(plan.features || []).map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-6 mt-6 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(plan)}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleArchivePlan(plan.id)}
                      className="p-2 bg-slate-800 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      title="Archive Plan"
                    >
                      <Tag className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeletePlan(plan.id)}
                      className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      title="Delete Plan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: SUBSCRIBERS */}
        {activeTab === 'SUBSCRIBERS' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search coach, academy name, email or phone..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Roles</option>
                  <option value="COACH">Independent Coach</option>
                  <option value="ACADEMY">Sports Academy</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active Subscription</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="NONE">No Subscription</option>
                </select>
              </div>
            </div>

            {/* Subscribers Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Coach / Academy</th>
                    <th className="p-4">Role & Sports</th>
                    <th className="p-4">SaaS Tier</th>
                    <th className="p-4">Validity / Expiry</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredSubscribers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No coaches or academies found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredSubscribers.map((coach) => {
                      const isSubActive =
                        coach.subscription?.isActive &&
                        coach.subscription?.expiresAt &&
                        new Date(coach.subscription.expiresAt) > new Date();

                      return (
                        <tr key={coach.coachId} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{coach.name}</span>
                              {coach.isVerified && (
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              )}
                            </div>
                            {coach.academyName && (
                              <div className="text-[11px] text-amber-400 font-semibold">{coach.academyName}</div>
                            )}
                            <div className="text-[10px] text-slate-500">{coach.email} • {coach.phone}</div>
                          </td>

                          <td className="p-4">
                            <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] font-bold text-slate-300">
                              {coach.academyName ? 'Academy' : 'Coach'}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-1">
                              {(coach.sports || []).slice(0, 2).join(', ') || 'Multi-Sport'}
                            </div>
                          </td>

                          <td className="p-4">
                            {coach.subscription ? (
                              <div>
                                <span className="font-bold text-emerald-400">{coach.subscription.planName}</span>
                                <div className="text-[10px] text-slate-500">₹{coach.subscription.amountPaid || 0} Paid</div>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">No Active Plan</span>
                            )}
                          </td>

                          <td className="p-4">
                            {coach.subscription?.expiresAt ? (
                              <div>
                                <div className="font-medium text-slate-300">
                                  {new Date(coach.subscription.expiresAt).toLocaleDateString()}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {isSubActive ? 'Active' : 'Expired'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>

                          <td className="p-4">
                            {isSubActive ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Active SaaS
                              </span>
                            ) : coach.subscription ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                Expired
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                                Unsubscribed
                              </span>
                            )}
                          </td>

                          <td className="p-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setGrantData({
                                  coachId: coach.coachId,
                                  coachName: coach.name,
                                  coachEmail: coach.email,
                                  coachPhone: coach.phone,
                                  academyName: coach.academyName || '',
                                  planId: coach.subscription?.planId || plans[0]?.id || 'YEARLY_COACH_PRO',
                                  durationDays: 365,
                                });
                                setGrantModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                            >
                              {coach.subscription ? 'Extend Pass' : 'Grant Pass'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PAYMENT & TRANSACTION LOGS */}
        {activeTab === 'TRANSACTIONS' && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Coach / Academy</th>
                    <th className="p-4">Plan Subscribed</th>
                    <th className="p-4">Amount Paid</th>
                    <th className="p-4">Payment Method</th>
                    <th className="p-4">Txn Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No coach SaaS subscription payments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4">
                          <div className="font-medium text-white">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(tx.createdAt).toLocaleTimeString()}
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="font-bold text-white">{tx.coachName || 'Coach'}</div>
                          {tx.academyName && (
                            <div className="text-[11px] text-amber-400">{tx.academyName}</div>
                          )}
                          <div className="text-[10px] text-slate-500">{tx.coachEmail || tx.coachId}</div>
                        </td>

                        <td className="p-4">
                          <span className="font-semibold text-emerald-400">{tx.planName}</span>
                          <div className="text-[10px] text-slate-500">{tx.durationDays} Days Pass</div>
                        </td>

                        <td className="p-4 font-bold text-white">
                          ₹{tx.amountPaid.toLocaleString()}
                        </td>

                        <td className="p-4">
                          <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] font-bold text-slate-300">
                            {tx.paymentMethod || 'UPI / Gateway'}
                          </span>
                        </td>

                        <td className="p-4 text-[11px] font-mono text-slate-400">
                          {tx.paymentTxnId}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT PLAN MODAL */}
      {(isCreating || editingPlan) && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">
                  {isCreating ? 'Create Coach & Academy SaaS Tier' : `Edit Tier: ${editingPlan?.name}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingPlan(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Plan Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Pro Coach Annual Pass"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Target Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="COACH">Independent Coach</option>
                    <option value="ACADEMY">Sports Academy</option>
                    <option value="ALL">All (Coach & Academy)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Original Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData({ ...formData, originalPrice: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.durationDays}
                    onChange={(e) => setFormData({ ...formData, durationDays: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Max Concurrent Batches Quota</label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxBatches}
                  onChange={(e) => setFormData({ ...formData, maxBatches: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Plan Features (1 per line)</label>
                <textarea
                  rows={4}
                  value={formData.featuresStr}
                  onChange={(e) => setFormData({ ...formData, featuresStr: e.target.value })}
                  placeholder="Official Gold Coach Verified Tick&#10;Host up to 5 concurrent training batches&#10;0% commission on student fees"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.popular}
                    onChange={(e) => setFormData({ ...formData, popular: e.target.checked })}
                    className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-950"
                  />
                  <span className="text-slate-300 font-bold">Mark as Most Popular</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-950"
                  />
                  <span className="text-slate-300 font-bold">Tier is Active & Discoverable</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingPlan(null);
                  }}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black rounded-xl shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
                >
                  {savingPlan ? 'Saving Plan...' : isCreating ? 'Create Plan' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANUAL GRANT PASS MODAL */}
      {grantModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Grant Coach / Academy SaaS Pass</h3>
              </div>
              <button
                type="button"
                onClick={() => setGrantModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualGrant} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Select Coach / Academy or Enter ID *</label>
                <input
                  type="text"
                  required
                  value={grantData.coachId}
                  onChange={(e) => {
                    const matched = subscribers.find((s) => s.coachId === e.target.value);
                    setGrantData({
                      ...grantData,
                      coachId: e.target.value,
                      coachName: matched ? matched.name : grantData.coachName,
                      coachEmail: matched ? matched.email : grantData.coachEmail,
                      coachPhone: matched ? matched.phone : grantData.coachPhone,
                      academyName: matched ? matched.academyName || '' : grantData.academyName,
                    });
                  }}
                  placeholder="Enter Coach ID or select below"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 font-mono"
                />

                {/* Quick select list from existing coaches */}
                <div className="mt-2 max-h-32 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800/60 bg-slate-950/60">
                  {subscribers.map((c) => (
                    <button
                      type="button"
                      key={c.coachId}
                      onClick={() =>
                        setGrantData({
                          ...grantData,
                          coachId: c.coachId,
                          coachName: c.name,
                          coachEmail: c.email,
                          coachPhone: c.phone,
                          academyName: c.academyName || '',
                        })
                      }
                      className="w-full text-left p-2 hover:bg-slate-800 text-[11px] flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div>
                        <span className="font-bold text-white">{c.name}</span>
                        {c.academyName && <span className="text-amber-400 ml-1.5">({c.academyName})</span>}
                      </div>
                      <span className="text-slate-500 font-mono text-[10px]">{c.email || c.coachId.slice(0, 8)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Select SaaS Plan *</label>
                <select
                  value={grantData.planId}
                  onChange={(e) => setGrantData({ ...grantData, planId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (₹{p.price} / {p.duration || 'yr'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Validity Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  value={grantData.durationDays}
                  onChange={(e) => setGrantData({ ...grantData, durationDays: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-[11px] leading-relaxed">
                Granting this pass will immediately activate the Coach / Academy subscription, unlock verified badge entitlements, enable unlimited batch creation, and log an official audit record.
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setGrantModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={granting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
                >
                  {granting ? 'Activating Pass...' : 'Grant & Activate Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

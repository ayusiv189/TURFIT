import React, { useState, useEffect } from 'react';
import {
  VerificationBadgeConfig,
  PlayerVerificationBadge,
  DEFAULT_VERIFICATION_BADGE_CONFIG,
  OwnerSubscriptionPlan,
} from '../../types';
import {
  getVerificationBadgeConfig,
  saveVerificationBadgeConfig,
  getAllPlayerVerificationBadges,
  activatePlayerVerificationBadge,
  revokePlayerVerificationBadge,
  getOwnerSubscriptionPlans,
} from '../../lib/db';
import {
  Award,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Star,
  Sparkles,
  RefreshCw,
  Search,
  IndianRupee,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Plus,
  Trash2,
  Users,
  Building2,
  Edit3,
  Shield,
  Clock,
  Zap,
  Info,
} from 'lucide-react';

interface AdminVerificationBadgeManagerProps {
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const AdminVerificationBadgeManager: React.FC<AdminVerificationBadgeManagerProps> = ({ showToast }) => {
  const [activeTab, setActiveTab] = useState<'CONFIG' | 'PLAYER_BADGES'>('CONFIG');
  const [config, setConfig] = useState<VerificationBadgeConfig>(DEFAULT_VERIFICATION_BADGE_CONFIG);
  const [playerBadges, setPlayerBadges] = useState<PlayerVerificationBadge[]>([]);
  const [ownerPlans, setOwnerPlans] = useState<OwnerSubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Manual Grant Modal
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [grantData, setGrantData] = useState({
    userId: '',
    userName: '',
    userEmail: '',
    badgeType: 'GOLD' as 'GOLD' | 'BLUE' | 'PRO',
    durationDays: 365,
  });
  const [granting, setGranting] = useState(false);

  // Revoke modal
  const [revokingBadge, setRevokingBadge] = useState<PlayerVerificationBadge | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [processingRevoke, setProcessingRevoke] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cfg, badges, oPlans] = await Promise.all([
        getVerificationBadgeConfig(),
        getAllPlayerVerificationBadges(),
        getOwnerSubscriptionPlans(true),
      ]);
      setConfig(cfg);
      setPlayerBadges(badges);
      setOwnerPlans(oPlans);
    } catch (err) {
      console.error('Error loading verification data:', err);
      showToast('Failed to load verification badge configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await saveVerificationBadgeConfig(config);
      showToast('Verification badge settings saved!', 'success');
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to save settings', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleManualGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantData.userId.trim()) {
      showToast('User ID is required', 'error');
      return;
    }

    setGranting(true);
    try {
      await activatePlayerVerificationBadge({
        userId: grantData.userId.trim(),
        userName: grantData.userName.trim() || 'TruFit Athlete',
        userEmail: grantData.userEmail.trim() || '',
        badgeType: grantData.badgeType,
        durationDays: Number(grantData.durationDays) || 365,
        amountPaid: 0,
        source: 'ADMIN_GRANT',
        grantedBy: 'Super Admin',
      });
      showToast(`Granted ${grantData.badgeType} badge to ${grantData.userId}`, 'success');
      setGrantModalOpen(false);
      setGrantData({ userId: '', userName: '', userEmail: '', badgeType: 'GOLD', durationDays: 365 });
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Grant failed', 'error');
    } finally {
      setGranting(false);
    }
  };

  const handleRevokeBadge = async () => {
    if (!revokingBadge) return;
    setProcessingRevoke(true);
    try {
      await revokePlayerVerificationBadge(revokingBadge.userId, 'Super Admin', revokeReason);
      showToast(`Revoked verification badge for ${revokingBadge.userName}`, 'success');
      setRevokingBadge(null);
      setRevokeReason('');
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to revoke badge', 'error');
    } finally {
      setProcessingRevoke(false);
    }
  };

  const filteredBadges = playerBadges.filter(
    (b) =>
      b.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.userEmail && b.userEmail.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-3xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Award className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-white tracking-tight">Verification Badges Console</h2>
          </div>
          <p className="text-xs text-slate-400">
            Remotely manage Gold & Pro verification badges, automated plan inclusions, and athlete / venue status.
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
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Grant Badge</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('CONFIG')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'CONFIG'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Badge Pricing & Global Settings</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PLAYER_BADGES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'PLAYER_BADGES'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Active Player Badges ({playerBadges.length})</span>
        </button>
      </div>

      {/* TAB 1: CONFIG */}
      {activeTab === 'CONFIG' && (
        <form onSubmit={handleSaveConfig} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Global Toggles */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                Global Verification Availability
              </h3>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-white">System Verification Ticks</div>
                    <div className="text-[11px] text-slate-400">Master switch for all verification badges</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                    className="text-2xl"
                  >
                    {config.enabled ? (
                      <ToggleRight className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-600" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-white">Player Verification Badge</div>
                    <div className="text-[11px] text-slate-400">Allow players to purchase or earn gold ticks</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, playerBadgeEnabled: !config.playerBadgeEnabled })}
                    className="text-2xl"
                  >
                    {config.playerBadgeEnabled ? (
                      <ToggleRight className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-600" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-white">Owner Venue Verification Badge</div>
                    <div className="text-[11px] text-slate-400">Allow turf owners to purchase or receive badge</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, ownerBadgeEnabled: !config.ownerBadgeEnabled })}
                    className="text-2xl"
                  >
                    {config.ownerBadgeEnabled ? (
                      <ToggleRight className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Direct Purchase Pricing */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-amber-400" />
                Standalone Badge Pricing
              </h3>

              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Player Gold Badge Price (₹ / Year)</label>
                  <input
                    type="number"
                    min={0}
                    value={config.playerBadgePrice}
                    onChange={(e) => setConfig({ ...config, playerBadgePrice: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none font-black"
                  />
                  <span className="text-[10px] text-slate-500 block">Duration: {config.playerBadgeDurationDays || 365} Days</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Turf Venue Verified Seal Price (₹ / Year)</label>
                  <input
                    type="number"
                    min={0}
                    value={config.ownerBadgePrice}
                    onChange={(e) => setConfig({ ...config, ownerBadgePrice: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none font-black"
                  />
                  <span className="text-[10px] text-slate-500 block">Duration: {config.ownerBadgeDurationDays || 365} Days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Owner SaaS Plan Inclusions */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              Automatic Verification Badge Inclusions in Owner SaaS Plans
            </h3>
            <p className="text-xs text-slate-400">
              When an owner subscribes to any of the checked SaaS plans below, their venue verification badge will activate automatically without extra charge.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {ownerPlans.map((p) => {
                const isIncluded = !!config.ownerSaaSInclusion?.[p.id];
                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isIncluded
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isIncluded}
                      onChange={(e) => {
                        setConfig({
                          ...config,
                          ownerSaaSInclusion: {
                            ...config.ownerSaaSInclusion,
                            [p.id]: e.target.checked,
                          },
                        });
                      }}
                      className="rounded accent-emerald-500"
                    />
                    <div>
                      <div className="text-xs font-bold">{p.name}</div>
                      <div className="text-[10px] opacity-75">₹{p.price} / {p.durationDays}d</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingConfig}
              className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-2xl shadow-xl shadow-emerald-950/40"
            >
              {savingConfig ? 'Saving Settings...' : 'Save Verification Settings'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: PLAYER BADGES */}
      {activeTab === 'PLAYER_BADGES' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search verified athletes by Name, Email, or User UID..."
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
                    <th className="py-3.5 px-4">Athlete</th>
                    <th className="py-3.5 px-4">Badge Type</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Source</th>
                    <th className="py-3.5 px-4">Expires On</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredBadges.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No verified athlete records found.
                      </td>
                    </tr>
                  ) : (
                    filteredBadges.map((badge) => (
                      <tr key={badge.userId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{badge.userName}</span>
                            {badge.isVerified && (
                              <span className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">{badge.userEmail || badge.userId}</div>
                        </td>
                        <td className="py-3 px-4 font-black text-amber-400 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5" />
                          <span>{badge.badgeType || 'GOLD'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              badge.status === 'ACTIVE'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {badge.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          <span className="text-[11px] bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                            {badge.source || 'DIRECT_PURCHASE'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-white">
                          {new Date(badge.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {badge.status === 'ACTIVE' && (
                            <button
                              type="button"
                              onClick={() => setRevokingBadge(badge)}
                              className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30 rounded-lg text-[11px] font-bold"
                            >
                              Revoke
                            </button>
                          )}
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

      {/* MANUAL GRANT MODAL */}
      {grantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">Grant Verification Badge</h3>
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
                <label className="text-xs font-bold text-slate-300">User ID (UID) *</label>
                <input
                  type="text"
                  required
                  value={grantData.userId}
                  onChange={(e) => setGrantData({ ...grantData, userId: e.target.value })}
                  placeholder="e.g. firebase_user_uid"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Athlete Name (Optional)</label>
                <input
                  type="text"
                  value={grantData.userName}
                  onChange={(e) => setGrantData({ ...grantData, userName: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Badge Tier</label>
                <select
                  value={grantData.badgeType}
                  onChange={(e) => setGrantData({ ...grantData, badgeType: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="GOLD">Gold Tick (Verified Athlete)</option>
                  <option value="PRO">Pro Athlete Badge</option>
                  <option value="BLUE">Blue Tick</option>
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
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-emerald-950/40"
                >
                  {granting ? 'Granting...' : 'Grant Badge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVOKE BADGE MODAL */}
      {revokingBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-base font-black text-rose-400 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              Revoke Verification Badge
            </h3>
            <p className="text-xs text-slate-300">
              Are you sure you want to revoke the verified status for <strong>{revokingBadge.userName}</strong>?
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400">Reason for Revocation (Logged to Audit)</label>
              <textarea
                rows={3}
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="e.g. Terms violation, reported suspicious activity, or identity mismatch..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRevokingBadge(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeBadge}
                disabled={processingRevoke}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl shadow-lg shadow-rose-950/40"
              >
                {processingRevoke ? 'Revoking...' : 'Confirm Revocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

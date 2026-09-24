import React, { useState, useEffect } from 'react';
import { UserProfile, UserControl, GlobalFeatureControls } from '../../types';
import {
  getAllUsers,
  getAllUserControls,
  saveUserControl,
  getGlobalFeatureControls,
  saveGlobalFeatureControls,
  getAllOwnerSubscriptions,
} from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  SlidersHorizontal,
  User,
  Building2,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Globe,
  MessageSquare,
  Share2,
  Calendar,
  Trophy,
  Save,
  RefreshCw,
  Info,
} from 'lucide-react';

interface AdminUserControlManagerProps {
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const AdminUserControlManager: React.FC<AdminUserControlManagerProps> = ({ showToast }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userControlsMap, setUserControlsMap] = useState<Record<string, UserControl>>({});
  const [subscriptionsMap, setSubscriptionsMap] = useState<Record<string, any>>({});
  const [globalControls, setGlobalControls] = useState<GlobalFeatureControls>({
    id: 'global',
    playerProfilesEnabled: true,
    ownerProfilesEnabled: true,
    socialPostsEnabled: true,
    messagingEnabled: true,
    tournamentsEnabled: true,
    bookingsEnabled: true,
    updatedAt: '',
    updatedBy: '',
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'PLAYER' | 'OWNER'>('ALL');
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfile | null>(null);
  const [editControlForm, setEditControlForm] = useState<UserControl | null>(null);
  const [disableReasonInput, setDisableReasonInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allUsrs, allCtrls, allSubs, globalC] = await Promise.all([
        getAllUsers(),
        getAllUserControls(),
        getAllOwnerSubscriptions(),
        getGlobalFeatureControls(),
      ]);

      setUsers(allUsrs);

      const ctrlMap: Record<string, UserControl> = {};
      allCtrls.forEach((c) => {
        ctrlMap[c.uid] = c;
      });
      setUserControlsMap(ctrlMap);

      const subMap: Record<string, any> = {};
      allSubs.forEach((s) => {
        subMap[s.ownerId] = s;
      });
      setSubscriptionsMap(subMap);

      setGlobalControls(globalC);
    } catch (err) {
      console.error('Error loading user controls data:', err);
      showToast('Failed to load user controls and visibility settings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveGlobalControls = async () => {
    try {
      const payload: GlobalFeatureControls = {
        ...globalControls,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || 'Super Admin',
      };
      await saveGlobalFeatureControls(payload);
      setGlobalControls(payload);
      showToast('Global platform feature controls updated successfully!', 'success');
    } catch (err) {
      console.error('Error saving global controls:', err);
      showToast('Failed to save global feature controls.', 'error');
    }
  };

  const handleOpenEdit = (u: UserProfile) => {
    setSelectedUserForEdit(u);
    const existing = userControlsMap[u.uid] || {
      uid: u.uid,
      userEmail: u.email || '',
      userName: u.displayName || 'User',
      role: u.role || 'PLAYER',
      playerProfileEnabled: true,
      ownerProfileEnabled: true,
      publicProfileVisible: true,
      venueProfileVisible: true,
      socialPostsEnabled: true,
      commentsEnabled: true,
      messagingEnabled: true,
      followersFollowingEnabled: true,
      communityParticipationEnabled: true,
      tournamentParticipationEnabled: true,
      bookingAllowed: true,
      tournamentOrganizerAccess: true,
      membershipAccess: true,
      offersAccess: true,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.email || 'Super Admin',
      disableReason: '',
    };
    setEditControlForm({ ...existing });
    setDisableReasonInput(existing.disableReason || '');
  };

  const handleSaveUserControl = async () => {
    if (!editControlForm || !selectedUserForEdit) return;
    setIsSaving(true);
    try {
      const payload: UserControl = {
        ...editControlForm,
        disableReason: disableReasonInput,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || 'Super Admin',
      };
      console.log('Attempting to save user control:', payload);
      await saveUserControl(payload);
      setUserControlsMap((prev) => ({ ...prev, [payload.uid]: payload }));
      showToast(`Feature controls updated for ${payload.userName}`, 'success');
      setSelectedUserForEdit(null);
    } catch (err) {
      console.error('Detailed Error saving user control:', err);
      showToast(`Failed to save user control settings: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole =
      roleFilter === 'ALL' || (roleFilter === 'OWNER' ? u.role === 'OWNER' || u.businessName : u.role === 'PLAYER');
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header & Global Platform Switches */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
              <span>Admin Profile Visibility & Feature Control Center</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Globally toggle platform capabilities or enforce individual per-user / per-owner profile and feature restrictions without deleting underlying data.
            </p>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Records
          </button>
        </div>

        {/* Global Controls Panel */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>Global Platform Feature Switches (Master Kill-Switches)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              {
                key: 'playerProfilesEnabled',
                label: 'Player Profiles Platform-Wide',
                desc: 'Allow player profiles to be active and viewed.',
                val: globalControls.playerProfilesEnabled,
              },
              {
                key: 'ownerProfilesEnabled',
                label: 'Owner Profiles Platform-Wide',
                desc: 'Allow owner venue and business profiles to be active.',
                val: globalControls.ownerProfilesEnabled,
              },
              {
                key: 'socialPostsEnabled',
                label: 'Social Community Feed Posts',
                desc: 'Enable global posting and community updates.',
                val: globalControls.socialPostsEnabled,
              },
              {
                key: 'messagingEnabled',
                label: 'Squad & User Messaging',
                desc: 'Enable chat rooms and direct messaging features.',
                val: globalControls.messagingEnabled,
              },
              {
                key: 'tournamentsEnabled',
                label: 'Tournaments & Competition',
                desc: 'Enable tournament brackets and registration.',
                val: globalControls.tournamentsEnabled,
              },
              {
                key: 'bookingsEnabled',
                label: 'Turf Bookings & Slot Payments',
                desc: 'Enable online turf booking execution.',
                val: globalControls.bookingsEnabled,
              },
            ].map((item) => (
              <div
                key={item.key}
                className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl flex items-start justify-between gap-3"
              >
                <div>
                  <span className="text-xs font-bold text-white block">{item.label}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{item.desc}</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setGlobalControls((prev) => ({
                      ...prev,
                      [item.key]: !(prev as any)[item.key],
                    }))
                  }
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
                    (globalControls as any)[item.key] ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      (globalControls as any)[item.key] ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveGlobalControls}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Global Settings
            </button>
          </div>
        </div>
      </div>

      {/* User & Owner Management List */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-white">Individual User & Owner Control Directory</h3>
            <p className="text-xs text-slate-400">Search any user or owner to individually configure feature access and profile visibility.</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-indigo-500 w-64"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 font-bold"
            >
              <option value="ALL">All Roles</option>
              <option value="PLAYER">Players</option>
              <option value="OWNER">Owners</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-medium">Loading user controls directory...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
            <User className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-white">No users found matching your search</p>
            <p className="text-xs text-slate-400">Try adjusting your search query or role filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-950/60">
                  <th className="py-3 px-4">User / Owner</th>
                  <th className="py-3 px-4">Role & Status</th>
                  <th className="py-3 px-4">SaaS Subscription</th>
                  <th className="py-3 px-4">Profile Status</th>
                  <th className="py-3 px-4">Feature Controls</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs">
                {filteredUsers.map((u) => {
                  const ctrl = userControlsMap[u.uid] || {
                    playerProfileEnabled: true,
                    ownerProfileEnabled: true,
                    publicProfileVisible: true,
                    socialPostsEnabled: true,
                    messagingEnabled: true,
                  };
                  const sub = subscriptionsMap[u.uid];
                  const isOwner = u.role === 'OWNER' || u.businessName || sub;

                  return (
                    <tr key={u.uid} className="hover:bg-slate-950/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-bold flex items-center justify-center flex-shrink-0">
                            {u.displayName?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <span className="font-bold text-white block">{u.displayName || 'Unnamed User'}</span>
                            <span className="text-[11px] text-slate-400">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black ${
                            isOwner
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                          }`}
                        >
                          {isOwner ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                          {isOwner ? 'TURF OWNER' : 'PLAYER'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isOwner ? (
                          sub ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                sub.status === 'ACTIVE' || sub.status === 'TRIAL'
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {sub.planName || 'SaaS Plan'} ({sub.status})
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">No Active Sub</span>
                          )
                        ) : (
                          <span className="text-slate-500 text-[11px]">N/A (Player)</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {ctrl.playerProfileEnabled && ctrl.publicProfileVisible ? (
                            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Visible & Active
                            </span>
                          ) : (
                            <span className="bg-rose-500/10 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-rose-500/20 flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Restricted / Hidden
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-300 text-[11px]">
                          {ctrl.socialPostsEnabled ? 'Posts: On' : 'Posts: Off'} |{' '}
                          {ctrl.messagingEnabled ? 'Chat: On' : 'Chat: Off'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-md"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          Configure Controls
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit User Control Modal */}
      {selectedUserForEdit && editControlForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
                  <span>Configure Controls: {selectedUserForEdit.displayName || selectedUserForEdit.email}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  UID: {selectedUserForEdit.uid} | Role: {selectedUserForEdit.role}
                </p>
              </div>
              <button
                onClick={() => setSelectedUserForEdit(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Profile & Visibility Toggles */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Profile & Visibility Controls</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'playerProfileEnabled', label: 'Player Profile Active' },
                    { key: 'ownerProfileEnabled', label: 'Owner Profile Active' },
                    { key: 'publicProfileVisible', label: 'Public Profile Visible' },
                    { key: 'venueProfileVisible', label: 'Venue Profile Visible' },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between"
                    >
                      <span className="text-xs font-bold text-slate-200">{item.label}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditControlForm((prev) =>
                            prev ? { ...prev, [item.key]: !(prev as any)[item.key] } : null
                          )
                        }
                        className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                          (editControlForm as any)[item.key] ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                            (editControlForm as any)[item.key] ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Social & Community Feature Toggles */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Social & Community Features</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'socialPostsEnabled', label: 'Social Feed Posting' },
                    { key: 'commentsEnabled', label: 'Comments & Replies' },
                    { key: 'messagingEnabled', label: 'Chat & Messaging' },
                    { key: 'followersFollowingEnabled', label: 'Followers / Following' },
                    { key: 'communityParticipationEnabled', label: 'Community Participation' },
                    { key: 'tournamentParticipationEnabled', label: 'Tournament Participation' },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between"
                    >
                      <span className="text-xs font-bold text-slate-200">{item.label}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditControlForm((prev) =>
                            prev ? { ...prev, [item.key]: !(prev as any)[item.key] } : null
                          )
                        }
                        className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                          (editControlForm as any)[item.key] ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                            (editControlForm as any)[item.key] ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Owner Specific Capability Toggles */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Owner Management Capabilities</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'bookingAllowed', label: 'Booking Acceptance Allowed' },
                    { key: 'tournamentOrganizerAccess', label: 'Tournament Organizer Access' },
                    { key: 'membershipAccess', label: 'Membership Plans Access' },
                    { key: 'offersAccess', label: 'Promo Offers & Coupons Access' },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between"
                    >
                      <span className="text-xs font-bold text-slate-200">{item.label}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditControlForm((prev) =>
                            prev ? { ...prev, [item.key]: !(prev as any)[item.key] } : null
                          )
                        }
                        className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                          (editControlForm as any)[item.key] ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                            (editControlForm as any)[item.key] ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reason / Audit input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  Restriction / Action Reason (Optional Audit Note)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Community guidelines violation, temporary moderation restriction..."
                  value={disableReasonInput}
                  onChange={(e) => setDisableReasonInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setSelectedUserForEdit(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUserControl}
                disabled={isSaving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer inline-flex items-center gap-2"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Restrictions & Controls
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

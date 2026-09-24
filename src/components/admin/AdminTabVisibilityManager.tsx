import React, { useState, useEffect } from 'react';
import { TabVisibilityConfig, PlayerTabVisibility, OwnerTabVisibility } from '../../types';
import { getTabVisibilityConfig, updateTabVisibilityConfig, DEFAULT_TAB_VISIBILITY_CONFIG } from '../../lib/db';
import {
  SlidersHorizontal,
  Eye,
  EyeOff,
  CheckCircle2,
  Save,
  RotateCcw,
  Sparkles,
  Users,
  Compass,
  Gamepad2,
  Trophy,
  Shield,
  Gift,
  BarChart2,
  Calendar,
  CreditCard,
  LayoutDashboard,
  BarChart3,
  Building,
  Clock,
  QrCode,
  Tag,
  Star,
  User,
  Home,
  ShieldCheck,
} from 'lucide-react';

interface AdminTabVisibilityManagerProps {
  showToast?: (text: string, type?: 'success' | 'error') => void;
  onConfigUpdated?: (newConfig: TabVisibilityConfig) => void;
}

export const AdminTabVisibilityManager: React.FC<AdminTabVisibilityManagerProps> = ({
  showToast,
  onConfigUpdated,
}) => {
  const [config, setConfig] = useState<TabVisibilityConfig>(DEFAULT_TAB_VISIBILITY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTabSection, setActiveTabSection] = useState<'PLAYER' | 'OWNER'>('PLAYER');

  useEffect(() => {
    let isMounted = true;
    getTabVisibilityConfig().then((loaded) => {
      if (isMounted) {
        setConfig(loaded);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleTogglePlayerTab = (tabKey: keyof PlayerTabVisibility) => {
    setConfig((prev) => ({
      ...prev,
      playerTabs: {
        ...prev.playerTabs,
        [tabKey]: !prev.playerTabs[tabKey],
      },
    }));
  };

  const handleToggleOwnerTab = (tabKey: keyof OwnerTabVisibility) => {
    setConfig((prev) => ({
      ...prev,
      ownerTabs: {
        ...prev.ownerTabs,
        [tabKey]: !prev.ownerTabs[tabKey],
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTabVisibilityConfig(config, 'Super Admin');
      if (showToast) showToast('Tab visibility rules updated and deployed live!', 'success');
      if (onConfigUpdated) onConfigUpdated(config);
    } catch (err) {
      console.error('Failed to update tab visibility:', err);
      if (showToast) showToast('Failed to save tab visibility settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setConfig(DEFAULT_TAB_VISIBILITY_CONFIG);
    if (showToast) showToast('Reset to default visibility (all visible)', 'success');
  };

  const playerTabDefs: { key: keyof PlayerTabVisibility; label: string; desc: string; icon: any }[] = [
    { key: 'home', label: 'Home Dashboard', desc: 'Main player welcome screen & quick actions', icon: Home },
    { key: 'explore', label: 'Turfs Discovery', desc: 'Turf search, filter, and slot booking', icon: Compass },
    { key: 'gaming', label: 'Gaming Zone', desc: 'PS5, Snooker, Table Tennis & VR Lounge booking', icon: Gamepad2 },
    { key: 'lobbies', label: 'Community Lobbies', desc: 'Public pick-up games & open lobby matching', icon: Users },
    { key: 'teams', label: 'Squads & Teams', desc: 'Team rosters, captains, and squad challenges', icon: Shield },
    { key: 'matches', label: 'Match Schedule', desc: 'Public and upcoming competitive fixtures', icon: Trophy },
    { key: 'rewards', label: 'TurFit Rewards', desc: 'Vouchers, streaks, and loyalty points', icon: Gift },
    { key: 'stats', label: 'Player Stats', desc: 'Personal performance analytics & play time', icon: BarChart2 },
    { key: 'bookings', label: 'My Bookings', desc: 'Upcoming, past, and cancelled slot tickets', icon: Calendar },
    { key: 'payments', label: 'Player Dues & Pay', desc: 'Split payments & outstanding dues log', icon: CreditCard },
  ];

  const ownerTabDefs: { key: keyof OwnerTabVisibility; label: string; desc: string; icon: any }[] = [
    { key: 'dashboard', label: 'Owner Overview', desc: 'Venue summary, daily revenue & quick status', icon: LayoutDashboard },
    { key: 'analytics', label: 'Analytics Console', desc: 'Occupancy rates, peak hours & revenue charts', icon: BarChart3 },
    { key: 'my-turf', label: 'My Turf & Arenas', desc: 'Turf details, sports arena setup & photos', icon: Building },
    { key: 'slots', label: 'Slot Management', desc: 'Create 7-day slots & recurring schedules', icon: Clock },
    { key: 'bookings', label: 'Turf Bookings', desc: 'Live venue slot bookings & check-ins', icon: Calendar },
    { key: 'dues', label: 'Player Dues Log', desc: 'Track counter payments & pending balances', icon: CreditCard },
    { key: 'payments', label: 'Payment VPA Settings', desc: 'Venue UPI ID, Razorpay & QR setup', icon: QrCode },
    { key: 'offers', label: 'Offers & Promos', desc: 'Voucher codes & seasonal discounts', icon: Tag },
    { key: 'reviews', label: 'Player Reviews', desc: 'Ratings & venue feedback control', icon: Star },
    { key: 'profile', label: 'Venue Profile', desc: 'Owner contact details & operational hours', icon: User },
  ];

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading tab visibility configuration...
      </div>
    );
  }

  const hiddenPlayerCount = Object.values(config.playerTabs).filter((v) => !v).length;
  const hiddenOwnerCount = Object.values(config.ownerTabs).filter((v) => !v).length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <SlidersHorizontal className="w-5 h-5 text-indigo-400 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold text-white">App Navigation & Tab Visibility</h2>
            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">
              Live Control
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Toggle which features and navigation tabs are visible to Players and Venue Owners across the app.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex-1 sm:flex-initial px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Enable All</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 sm:flex-initial px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {saving ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? 'Saving...' : 'Save & Deploy'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Switcher Tabs */}
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTabSection('PLAYER')}
          className={`w-full sm:flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTabSection === 'PLAYER'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <span>⚽ Player Section Tabs</span>
          {hiddenPlayerCount > 0 ? (
            <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-black">
              {hiddenPlayerCount} Hidden
            </span>
          ) : (
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-black">
              All Active
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTabSection('OWNER')}
          className={`w-full sm:flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTabSection === 'OWNER'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <span>🏟️ Venue Owner Section Tabs</span>
          {hiddenOwnerCount > 0 ? (
            <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-black">
              {hiddenOwnerCount} Hidden
            </span>
          ) : (
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-black">
              All Active
            </span>
          )}
        </button>
      </div>

      {/* PLAYER TABS GRID */}
      {activeTabSection === 'PLAYER' && (
        <div className="space-y-4 animate-in fade-in-50">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold text-slate-300">
              Player Navigation Controls ({playerTabDefs.length} Tabs Available)
            </span>
            <span className="text-slate-500 text-[11px]">
              Toggling OFF hides the tab from the player's bottom navigation bar.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {playerTabDefs.map((def) => {
              const IconComp = def.icon;
              const isVisible = config.playerTabs[def.key];

              return (
                <div
                  key={def.key}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isVisible
                      ? 'bg-slate-950/80 border-slate-800 hover:border-indigo-500/40'
                      : 'bg-rose-950/10 border-rose-900/30 opacity-75'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2.5 rounded-xl border shrink-0 ${
                        isVisible
                          ? 'bg-indigo-950/60 border-indigo-500/30 text-indigo-400'
                          : 'bg-rose-950/40 border-rose-500/20 text-rose-400'
                      }`}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{def.label}</h4>
                        {def.key === 'home' && (
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">
                            Core
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{def.desc}</p>
                    </div>
                  </div>

                  {/* Interactive Switch */}
                  <button
                    type="button"
                    onClick={() => handleTogglePlayerTab(def.key)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isVisible ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isVisible ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* OWNER TABS GRID */}
      {activeTabSection === 'OWNER' && (
        <div className="space-y-4 animate-in fade-in-50">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold text-slate-300">
              Venue Owner Navigation Controls ({ownerTabDefs.length} Tabs Available)
            </span>
            <span className="text-slate-500 text-[11px]">
              Toggling OFF hides the tab from the venue owner dashboard navigation bar.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ownerTabDefs.map((def) => {
              const IconComp = def.icon;
              const isVisible = config.ownerTabs[def.key];

              return (
                <div
                  key={def.key}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isVisible
                      ? 'bg-slate-950/80 border-slate-800 hover:border-purple-500/40'
                      : 'bg-rose-950/10 border-rose-900/30 opacity-75'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2.5 rounded-xl border shrink-0 ${
                        isVisible
                          ? 'bg-purple-950/60 border-purple-500/30 text-purple-400'
                          : 'bg-rose-950/40 border-rose-500/20 text-rose-400'
                      }`}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{def.label}</h4>
                        {def.key === 'dashboard' && (
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">
                            Core
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{def.desc}</p>
                    </div>
                  </div>

                  {/* Interactive Switch */}
                  <button
                    type="button"
                    onClick={() => handleToggleOwnerTab(def.key)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isVisible ? 'bg-purple-500' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isVisible ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Audit Info Footer */}
      {config.updatedAt && (
        <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <span>
            Last updated by: <strong className="text-slate-300">{config.updatedBy || 'Super Admin'}</strong>
          </span>
          <span>Timestamp: {new Date(config.updatedAt).toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};

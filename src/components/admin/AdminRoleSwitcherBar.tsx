import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Building2, User, Sparkles, LogOut, CheckCircle2 } from 'lucide-react';

export const AdminRoleSwitcherBar: React.FC = () => {
  const { user, profile, isAdmin, activeRole, setActiveRole, logout } = useAuth();

  // If the user is NOT an admin, render absolutely nothing (hidden from normal users)
  if (!isAdmin) {
    return null;
  }

  return (
    <aside
      id="admin-role-switcher-bar"
      aria-label="Admin Operations Bar"
      className="sticky top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-amber-500/30 px-3 py-1.5 shadow-xl shadow-slate-950/50"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        {/* Admin Identity Badge */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black tracking-wider uppercase text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/30">
              Super Admin
            </span>
            <span className="text-xs text-slate-300 hidden sm:inline truncate max-w-[200px] font-mono">
              {user?.email || profile?.email}
            </span>
          </div>
        </div>

        {/* 3-Way Role Persona Switcher */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 gap-1 shadow-inner">
          <span className="text-[10px] uppercase font-bold text-slate-400 px-2 hidden md:inline">
            Active Mode:
          </span>

          {/* Admin Verification & Ops Console */}
          <button
            id="admin-switch-to-admin-btn"
            onClick={() => setActiveRole('ADMIN')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeRole === 'ADMIN'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50 border border-amber-400/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
            <span>Admin Console</span>
            {activeRole === 'ADMIN' && <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5"></span>}
          </button>

          {/* Venue Owner Dashboard */}
          <button
            id="admin-switch-to-owner-btn"
            onClick={() => setActiveRole('OWNER')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeRole === 'OWNER'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50 border border-indigo-400/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-300" />
            <span>Owner View</span>
            {activeRole === 'OWNER' && <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5"></span>}
          </button>

          {/* Player Hub / Experience */}
          <button
            id="admin-switch-to-player-btn"
            onClick={() => setActiveRole('PLAYER')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeRole === 'PLAYER'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50 border border-emerald-400/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <User className="w-3.5 h-3.5 text-emerald-300" />
            <span>Player View</span>
            {activeRole === 'PLAYER' && <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5"></span>}
          </button>
        </div>

        {/* Quick Mode Indicator + Logout */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 hidden lg:inline-flex items-center gap-1 bg-slate-900/60 px-2 py-1 rounded border border-slate-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Simulating {activeRole} view</span>
          </span>

          <button
            onClick={logout}
            title="Log out admin session"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg border border-transparent hover:border-rose-900/40 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};

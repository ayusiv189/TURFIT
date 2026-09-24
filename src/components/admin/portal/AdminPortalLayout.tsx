import React from 'react';
import { AdminVerificationDashboard } from '../AdminVerificationDashboard';
import { Shield, LogOut, ArrowLeft } from 'lucide-react';

interface AdminPortalLayoutProps {
  onBackToWebsite: () => void;
}

export const AdminPortalLayout: React.FC<AdminPortalLayoutProps> = ({ onBackToWebsite }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-lg shadow-indigo-950/50">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-white flex items-center gap-2">
              TruFit Super Admin Portal
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
                Secure P1
              </span>
            </h1>
            <p className="text-xs text-slate-400">Manage infrastructure, venues, SaaS subscriptions, and Firebase telemetry.</p>
          </div>
        </div>

        <button
          onClick={onBackToWebsite}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-slate-700 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit to App</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        <AdminVerificationDashboard />
      </main>
    </div>
  );
};

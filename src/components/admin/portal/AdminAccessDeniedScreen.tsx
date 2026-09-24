import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface AdminAccessDeniedScreenProps {
  onBack: () => void;
}

export const AdminAccessDeniedScreen: React.FC<AdminAccessDeniedScreenProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl text-center">
        <div className="w-16 h-16 bg-rose-500/20 rounded-2xl border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">Access Denied</h2>
          <p className="text-xs text-slate-400 mt-1">You do not have administrative privileges required to access the TruFit Infrastructure and Billing portal.</p>
        </div>
        <button
          onClick={onBack}
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to App</span>
        </button>
      </div>
    </div>
  );
};

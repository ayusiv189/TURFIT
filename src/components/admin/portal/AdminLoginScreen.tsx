import React from 'react';
import { Shield, Lock } from 'lucide-react';

interface AdminLoginScreenProps {
  onLoginSuccess: () => void;
  onBack: () => void;
}

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({ onLoginSuccess, onBack }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl text-center">
        <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">Admin Authentication Required</h2>
          <p className="text-xs text-slate-400 mt-1">Please authenticate with your administrator credentials to access the TruFit P1 Admin Portal.</p>
        </div>
        <div className="space-y-3">
          <button
            onClick={onLoginSuccess}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-indigo-950/50 cursor-pointer"
          >
            Authenticate as Admin
          </button>
          <button
            onClick={onBack}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-sm transition-all cursor-pointer"
          >
            Back to Website
          </button>
        </div>
      </div>
    </div>
  );
};

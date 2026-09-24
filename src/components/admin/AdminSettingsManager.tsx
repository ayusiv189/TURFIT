import React, { useState, useEffect } from 'react';
import { AppConfig } from '../../types';
import { getAppConfig, updateAppConfig } from '../../lib/db';
import {
  Settings,
  User,
  Shield,
  Smartphone,
  Save,
  Loader2,
  AlertTriangle,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';

interface AdminSettingsManagerProps {
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const AdminSettingsManager: React.FC<AdminSettingsManagerProps> = ({ showToast }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await getAppConfig();
      setConfig(data);
    } catch (err) {
      showToast('Failed to load application settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePlayerLogin = async () => {
    if (!config) return;
    const updated = !config.allowPlayerLoginOnWebsite;
    setConfig({ ...config, allowPlayerLoginOnWebsite: updated });
    try {
      await updateAppConfig({ allowPlayerLoginOnWebsite: updated });
      showToast(
        updated
          ? 'Player login on website is now VISIBLE'
          : 'Player login on website is now HIDDEN (Mobile App only)',
        'success'
      );
    } catch (err) {
      showToast('Failed to update player login setting', 'error');
      // revert
      setConfig({ ...config, allowPlayerLoginOnWebsite: !updated });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    try {
      await updateAppConfig(config);
      showToast('Settings saved successfully!', 'success');
    } catch (err) {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
        <span>Loading Admin Settings...</span>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-rose-400">
        Error loading settings. Please check your connection.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Player Login on Website Control Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-2 border-indigo-500/30 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
              config.allowPlayerLoginOnWebsite
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            }`}>
              {config.allowPlayerLoginOnWebsite ? (
                <Eye className="w-6 h-6" />
              ) : (
                <EyeOff className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Player Website Login Visibility</h3>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  config.allowPlayerLoginOnWebsite
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-950 text-amber-300 border-amber-500/40'
                }`}>
                  {config.allowPlayerLoginOnWebsite ? 'Currently Visible' : 'Currently Hidden'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                {config.allowPlayerLoginOnWebsite
                  ? 'Players can currently log in through the website portal. Turn OFF to restrict website access strictly to Turf Owners and Admins, directing players to the Mobile APK.'
                  : 'Player login is currently hidden on the website portal. Visitors are directed to the TruFit Mobile App, keeping the website exclusive to Turf Owners and Admins.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="admin-toggle-player-login-btn"
            onClick={handleTogglePlayerLogin}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg whitespace-nowrap ${
              config.allowPlayerLoginOnWebsite
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/40'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
            }`}
          >
            {config.allowPlayerLoginOnWebsite ? (
              <>
                <EyeOff className="w-4 h-4" />
                <span>Hide Player Login</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                <span>Show Player Login</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* General Settings Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
          <Settings className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-white">General Application Settings</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Support Email */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                <span>Customer Support Email</span>
              </label>
              <input
                type="email"
                value={config.customerSupportEmail}
                onChange={(e) => setConfig({ ...config, customerSupportEmail: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-indigo-500 outline-none"
                placeholder="support@trufit.app"
              />
            </div>

            {/* Customer Support Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-indigo-400" />
                <span>Customer Support Phone</span>
              </label>
              <input
                type="text"
                value={config.customerSupportPhone}
                onChange={(e) => setConfig({ ...config, customerSupportPhone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-indigo-500 outline-none"
                placeholder="+91 9999999999"
              />
            </div>

            {/* Cancellation Window */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Booking Cancellation Window (Minutes)</span>
              </label>
              <input
                type="number"
                value={config.bookingCancellationWindowMinutes}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    bookingCancellationWindowMinutes: Math.max(0, Number(e.target.value)),
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-indigo-500 outline-none"
                placeholder="60"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Players can cancel bookings up to this many minutes before slot start time.
              </p>
            </div>

            {/* Maintenance Mode */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Maintenance Mode</span>
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Disable app operations temporarily for maintenance.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, maintenanceMode: !config.maintenanceMode })}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    config.maintenanceMode ? 'bg-amber-600' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      config.maintenanceMode ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {config.maintenanceMode && (
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <label className="block text-[11px] font-bold text-amber-300 mb-1">
                    Maintenance Banner Message:
                  </label>
                  <input
                    type="text"
                    value={config.maintenanceMessage}
                    onChange={(e) => setConfig({ ...config, maintenanceMessage: e.target.value })}
                    className="w-full bg-slate-900 border border-amber-500/40 rounded-lg p-2 text-white text-xs"
                    placeholder="We are currently performing maintenance..."
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-950/50 text-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

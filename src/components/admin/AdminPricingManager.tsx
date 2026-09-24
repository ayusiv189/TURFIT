import React, { useState, useEffect } from 'react';
import { PricingConfig } from '../../types';
import { getPricingConfig, updatePricingConfig } from '../../lib/db';
import { CreditCard, Save, Loader2, Info } from 'lucide-react';

interface AdminPricingManagerProps {
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const AdminPricingManager: React.FC<AdminPricingManagerProps> = ({ showToast }) => {
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPricing();
  }, []);

  const loadPricing = async () => {
    setLoading(true);
    try {
      const data = await getPricingConfig();
      setPricing(data);
    } catch (err) {
      showToast('Failed to load pricing config', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pricing) return;
    setSaving(true);
    try {
      await updatePricingConfig(pricing);
      showToast('Pricing configuration updated successfully!');
    } catch (err) {
      showToast('Failed to update pricing', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-white">Loading pricing...</div>;
  if (!pricing) return <div className="text-white">Error loading pricing.</div>;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="w-6 h-6 text-emerald-400" />
        <h2 className="text-lg font-bold text-white">Centralized Pricing Management</h2>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-400">Cancellation Fee (Fixed)</label>
              <input
                type="checkbox"
                checked={pricing.cancellationFeeEnabled}
                onChange={(e) => setPricing({ ...pricing, cancellationFeeEnabled: e.target.checked })}
                className="w-4 h-4 rounded border-slate-700 text-indigo-600 bg-slate-900"
              />
            </div>
            <input
              type="number"
              value={pricing.cancellationFeeFixed}
              onChange={(e) => setPricing({ ...pricing, cancellationFeeFixed: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-400">Convenience Fee</label>
              <input
                type="checkbox"
                checked={pricing.convenienceFeeEnabled}
                onChange={(e) => setPricing({ ...pricing, convenienceFeeEnabled: e.target.checked })}
                className="w-4 h-4 rounded border-slate-700 text-indigo-600 bg-slate-900"
              />
            </div>
            <input
              type="number"
              value={pricing.convenienceFee}
              onChange={(e) => setPricing({ ...pricing, convenienceFee: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white"
            />
          </div>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-xl flex items-start gap-3">
          <Info className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-300">
            Changes to these values will take effect immediately. Ensure backend calculation logic uses these updated values for all new bookings to prevent price manipulation.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </form>
    </div>
  );
};

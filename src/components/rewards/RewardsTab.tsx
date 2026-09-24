import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRewardWallet, RewardHistoryItem, RewardVoucher } from '../../types';
import {
  getUserRewardWallet,
  getUserRewardHistory,
  getUserRewardVouchers,
  redeemRewardVoucher,
} from '../../lib/phase3';
import { formatCurrency, formatDateString } from '../../lib/utils';
import {
  Award,
  Gift,
  History,
  Tag,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Copy,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface RewardsTabProps {
  showToast?: (text: string, type?: 'success' | 'error') => void;
}

const REDEEMABLE_TIERS = [
  { points: 200, discount: 50, title: '₹50 Off Next Booking', desc: 'Instant discount voucher for any sport arena' },
  { points: 500, discount: 150, title: '₹150 Off Next Booking', desc: 'Great for prime-time evening weekend slots' },
  { points: 1000, discount: 350, title: '₹350 Off Next Booking', desc: 'Maximum savings pass for regular athletes' },
];

export const RewardsTab: React.FC<RewardsTabProps> = ({ showToast }) => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<UserRewardWallet | null>(null);
  const [history, setHistory] = useState<RewardHistoryItem[]>([]);
  const [vouchers, setVouchers] = useState<RewardVoucher[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [redeeming, setRedeeming] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'vouchers' | 'catalog' | 'history'>('catalog');

  const loadRewardsData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [walletData, historyData, voucherList] = await Promise.all([
        getUserRewardWallet(user.uid),
        getUserRewardHistory(user.uid),
        getUserRewardVouchers(user.uid),
      ]);
      setWallet(walletData);
      setHistory(historyData);
      setVouchers(voucherList);
    } catch (err) {
      console.error('Error loading rewards', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRewardsData();
  }, [user]);

  const handleRedeem = async (tier: (typeof REDEEMABLE_TIERS)[0]) => {
    if (!user || !wallet) return;
    if (wallet.pointsBalance < tier.points) {
      showToast?.(`You need ${tier.points - wallet.pointsBalance} more points to unlock this reward.`, 'error');
      return;
    }

    setRedeeming(true);
    try {
      const voucher = await redeemRewardVoucher(user.uid, tier.points, tier.discount);
      showToast?.(`Voucher ${voucher.code} created! (₹${tier.discount} discount)`, 'success');
      await loadRewardsData();
      setActiveSubTab('vouchers');
    } catch (err: any) {
      showToast?.(err.message || 'Failed to redeem reward', 'error');
    } finally {
      setRedeeming(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast?.(`Coupon code ${code} copied to clipboard!`, 'success');
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-xs">
        <span className="inline-block w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-2" />
        Loading TurFit Rewards & Points...
      </div>
    );
  }

  const activeVouchers = vouchers.filter((v) => !v.isUsed);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header Banner & Points Wallet */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/20 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>TurFit Loyalty Program</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Play Turf Games. Earn Points.
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md">
              Earn 1 point for every ₹10 spent on confirmed bookings and match fees. Redeem points for booking discounts!
            </p>
          </div>

          <div className="bg-slate-950/80 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 text-center min-w-[200px] shadow-xl backdrop-blur-md">
            <span className="text-xs text-slate-400 font-semibold block uppercase tracking-wider">
              Available Balance
            </span>
            <div className="text-3xl sm:text-4xl font-black text-amber-400 flex items-center justify-center gap-1.5 my-1">
              <Award className="w-7 h-7 fill-amber-400" />
              <span>{wallet?.pointsBalance || 0}</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-[10px] text-slate-400 pt-1 border-t border-slate-800/80 mt-2">
              <span>Lifetime: {wallet?.lifetimeEarned || 0} pts</span>
              <span>•</span>
              <span>Redeemed: {wallet?.lifetimeRedeemed || 0} pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('catalog')}
          className={`text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'catalog'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Gift className="w-3.5 h-3.5" />
          <span>Rewards Catalog</span>
        </button>

        <button
          onClick={() => setActiveSubTab('vouchers')}
          className={`text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 relative ${
            activeSubTab === 'vouchers'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>My Vouchers</span>
          {activeVouchers.length > 0 && (
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {activeVouchers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'history'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Points History</span>
        </button>
      </div>

      {/* ================= REWARDS CATALOG ================= */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {REDEEMABLE_TIERS.map((tier, idx) => {
              const hasEnough = (wallet?.pointsBalance || 0) >= tier.points;
              return (
                <div
                  key={idx}
                  className={`bg-slate-900/90 border rounded-2xl p-5 flex flex-col justify-between transition-all relative overflow-hidden ${
                    hasEnough
                      ? 'border-indigo-500/40 hover:border-indigo-400 shadow-xl shadow-indigo-950/20'
                      : 'border-slate-800 opacity-80'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <Gift className="w-5 h-5" />
                      </div>
                      <span className="bg-slate-950 text-amber-400 border border-amber-500/30 text-xs font-black px-2.5 py-1 rounded-xl">
                        {tier.points} Points
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-white">{tier.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">{tier.desc}</p>
                    </div>
                  </div>

                  <div className="pt-5 border-t border-slate-800/80 mt-4">
                    <button
                      onClick={() => handleRedeem(tier)}
                      disabled={!hasEnough || redeeming}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        hasEnough
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-950/40'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {redeeming ? (
                        <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : hasEnough ? (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Redeem Voucher</span>
                        </>
                      ) : (
                        <span>Need {tier.points - (wallet?.pointsBalance || 0)} More Points</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= MY VOUCHERS ================= */}
      {activeSubTab === 'vouchers' && (
        <div className="space-y-4">
          {vouchers.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/60 border border-slate-800 rounded-2xl">
              <Tag className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-white">No Discount Vouchers Yet</h4>
              <p className="text-xs text-slate-400 mt-1">
                Redeem your points in the catalog to get instant discount codes for bookings.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vouchers.map((v) => (
                <div
                  key={v.id}
                  className={`bg-slate-900 border rounded-2xl p-5 space-y-4 relative ${
                    v.isUsed ? 'border-slate-800 opacity-60' : 'border-indigo-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        Booking Discount Voucher
                      </span>
                      <span className="text-xl font-black text-white">
                        {formatCurrency(v.discountAmount)} OFF
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        v.isUsed
                          ? 'bg-slate-800 text-slate-500'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {v.isUsed ? 'REDEEMED' : 'ACTIVE'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-slate-950 border border-dashed border-indigo-500/40 rounded-xl px-3.5 py-2.5">
                    <span className="font-mono text-sm font-black text-indigo-400 tracking-wider">
                      {v.code}
                    </span>
                    {!v.isUsed && (
                      <button
                        onClick={() => copyCode(v.code)}
                        className="text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Valid until: {formatDateString(v.expiresAt)}</span>
                    <span>Cost: {v.pointsCost} pts</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= POINTS HISTORY ================= */}
      {activeSubTab === 'history' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {history.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500">
              <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              You haven't earned any rewards yet. Book turf games to start accumulating points!
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {history.map((h) => (
                <div key={h.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-800/40">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        h.type === 'EARNED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {h.type === 'EARNED' ? <TrendingUp className="w-4 h-4" /> : <Gift className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-bold text-white">{h.reason}</p>
                      <span className="text-[10px] text-slate-500">{formatDateString(h.createdAt.split('T')[0])}</span>
                    </div>
                  </div>

                  <span
                    className={`font-black text-sm ${
                      h.type === 'EARNED' ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {h.type === 'EARNED' ? `+${h.points} pts` : `-${h.points} pts`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PlayerDueSummary, Booking } from '../../types';
import { getOwnerPlayerDues, recordPlayerSharePayment } from '../../lib/phase3';
import { formatCurrency, formatDateString } from '../../lib/utils';
import {
  Users,
  Search,
  IndianRupee,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Filter,
} from 'lucide-react';

interface OwnerPlayerDuesProps {
  showToast?: (text: string, type?: 'success' | 'error') => void;
}

export const OwnerPlayerDues: React.FC<OwnerPlayerDuesProps> = ({ showToast }) => {
  const { user } = useAuth();
  const [playerDues, setPlayerDues] = useState<PlayerDueSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterPendingOnly, setFilterPendingOnly] = useState<boolean>(false);

  // Settle Due Modal State
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerDueSummary | null>(null);
  const [settleBooking, setSettleBooking] = useState<Booking | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleMethod, setSettleMethod] = useState<'CASH_AT_TURF' | 'ONLINE_UPI' | 'ONLINE_CARD'>('CASH_AT_TURF');
  const [settling, setSettling] = useState<boolean>(false);

  const loadDues = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const dues = await getOwnerPlayerDues(user.uid);
      setPlayerDues(dues);
    } catch (err) {
      console.error('Failed to load owner player dues', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDues();
  }, [user]);

  const filteredList = playerDues.filter((p) => {
    const matchesSearch =
      p.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.playerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterPendingOnly ? p.totalPending > 0 : true;
    return matchesSearch && matchesFilter;
  });

  const totalOutstandingDues = playerDues.reduce((sum, p) => sum + p.totalPending, 0);
  const totalCollectedFromPlayers = playerDues.reduce((sum, p) => sum + p.totalPaid, 0);

  const handleSettleDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleBooking || !selectedPlayer || !user) return;
    if (settleAmount <= 0) {
      showToast?.('Please enter a valid amount.', 'error');
      return;
    }

    setSettling(true);
    try {
      await recordPlayerSharePayment({
        bookingId: settleBooking.id,
        playerId: selectedPlayer.playerId,
        amount: settleAmount,
        paymentMethod: settleMethod,
        notes: `Owner verified counter settlement of ₹${settleAmount}`,
      });
      showToast?.(`Settlement of ₹${settleAmount} recorded successfully!`, 'success');
      setSettleBooking(null);
      setSelectedPlayer(null);
      await loadDues();
    } catch (err: any) {
      showToast?.(err.message || 'Settlement failed', 'error');
    } finally {
      setSettling(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-xs">
        <span className="inline-block w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-2" />
        Loading athlete balances and pending payment accounts...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Users className="w-4 h-4" />
              <span>Players & Outstanding Dues</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">Player-by-Player Ledger</h2>
          </div>

          <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800 rounded-2xl p-3 px-4">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Unpaid Dues</span>
              <span className="text-xl font-black text-rose-400">{formatCurrency(totalOutstandingDues)}</span>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Collected</span>
              <span className="text-xl font-black text-emerald-400">{formatCurrency(totalCollectedFromPlayers)}</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search athlete by name or email..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={() => setFilterPendingOnly(!filterPendingOnly)}
            className={`text-xs font-bold px-4 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${
              filterPendingOnly
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{filterPendingOnly ? 'Showing Dues Only' : 'Show All Players'}</span>
          </button>
        </div>
      </div>

      {/* Players List */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800 text-xs text-slate-500">
            <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            No players matching your search filter.
          </div>
        ) : (
          filteredList.map((player) => (
            <div
              key={player.playerId}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-all shadow-lg"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-sm overflow-hidden">
                    {player.playerPhotoURL ? (
                      <img
                        src={player.playerPhotoURL}
                        alt={player.playerName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      player.playerName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{player.playerName}</h3>
                    <p className="text-xs text-slate-400">{player.playerEmail}</p>
                    {player.lastPaymentDate && (
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Last payment: {formatDateString(player.lastPaymentDate.split('T')[0])}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-black px-3 py-1 rounded-full ${
                      player.totalPending === 0
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {player.totalPending === 0 ? 'ALL SETTLED' : `₹${player.totalPending} PENDING`}
                  </span>
                </div>
              </div>

              {/* Aggregates */}
              <div className="grid grid-cols-3 gap-3 bg-slate-950/80 p-3 rounded-xl text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Total Bookings</span>
                  <span className="font-bold text-white">{player.totalBookings} Slots</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Total Paid</span>
                  <span className="font-bold text-emerald-400">{formatCurrency(player.totalPaid)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Total Due</span>
                  <span className="font-bold text-rose-400">{formatCurrency(player.totalPending)}</span>
                </div>
              </div>

              {/* Unsettled Bookings for this Player */}
              {player.bookings.filter((b) => (b.amountDue || 0) > 0).length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Unsettled Slot Bookings:
                  </span>
                  <div className="space-y-2">
                    {player.bookings
                      .filter((b) => (b.amountDue || 0) > 0)
                      .map((b) => (
                        <div
                          key={b.id}
                          className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-white block">{b.turfName} ({b.sport})</span>
                            <span className="text-[11px] text-slate-400">
                              {b.date} at {b.startTime} • Due: <span className="text-rose-400 font-bold">{formatCurrency(b.amountDue)}</span>
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedPlayer(player);
                              setSettleBooking(b);
                              setSettleAmount(b.amountDue);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-all shadow-md shadow-emerald-950/40"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Record Payment</span>
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Settle Payment Modal */}
      {settleBooking && selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative">
            <h3 className="text-base font-bold text-white mb-1">Record Player Payment</h3>
            <p className="text-xs text-slate-400 mb-4">
              Athlete: {selectedPlayer.playerName} • {settleBooking.turfName}
            </p>

            <form onSubmit={handleSettleDue} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Amount Received (₹)</label>
                <input
                  type="number"
                  min="1"
                  max={settleBooking.amountDue}
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-bold text-sm"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Remaining slot balance: {formatCurrency(settleBooking.amountDue)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Received Via</label>
                <select
                  value={settleMethod}
                  onChange={(e) => setSettleMethod(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white"
                >
                  <option value="CASH_AT_TURF">Cash at Counter</option>
                  <option value="ONLINE_UPI">Direct UPI QR at Turf</option>
                  <option value="ONLINE_CARD">POS Card Terminal</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSettleBooking(null);
                    setSelectedPlayer(null);
                  }}
                  className="flex-1 bg-slate-800 text-slate-300 font-bold py-2.5 rounded-xl text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settling}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-950/50 disabled:opacity-50"
                >
                  {settling ? 'Recording...' : `Confirm ₹${settleAmount}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

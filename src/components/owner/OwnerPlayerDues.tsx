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
  FileSpreadsheet,
  Layers,
  ChevronDown,
  ChevronUp,
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
  const [viewMode, setViewMode] = useState<'UNIFIED_LEDGER' | 'PLAYER_ACCOUNTS'>('UNIFIED_LEDGER');
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

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

  // Flatten all individual bookings for unified ledger
  const allLedgerEntries = playerDues.flatMap((p) =>
    p.bookings.map((b) => ({
      ...b,
      athleteName: p.playerName,
      athleteEmail: p.playerEmail,
      athletePhotoURL: p.playerPhotoURL,
      athletePlayerId: p.playerId,
      summaryRef: p,
    }))
  );

  const filteredLedgerEntries = allLedgerEntries.filter((entry) => {
    const matchesSearch =
      !searchTerm ||
      entry.athleteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.athleteEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.turfName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.bookingId && entry.bookingId.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter = filterPendingOnly ? (entry.amountDue || 0) > 0 : true;
    return matchesSearch && matchesFilter;
  });

  const totalOutstandingDues = playerDues.reduce((sum, p) => sum + p.totalPending, 0);
  const totalCollectedFromPlayers = playerDues.reduce((sum, p) => sum + p.totalPaid, 0);
  const pendingPlayersCount = playerDues.filter((p) => p.totalPending > 0).length;

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
        notes: `Owner verified counter settlement of ₹${settleAmount} via ${settleMethod}`,
        isOwnerVerified: true,
        upiTxnRef: settleBooking.upiTxnRef,
      });
      showToast?.(`Settlement of ₹${settleAmount} recorded and verified successfully!`, 'success');
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
        Loading athlete financial ledgers and accounts...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Financial Ledger & Accounts</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">Player Dues & Statement Ledger</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Consolidated financial ledger tracking each player's bookings, paid shares, and outstanding balance
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 rounded-2xl p-3 px-4 flex-wrap">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Unsettled Dues</span>
              <span className="text-xl font-black text-amber-400">{formatCurrency(totalOutstandingDues)}</span>
            </div>
            <div className="border-l border-slate-800 pl-3">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Paid</span>
              <span className="text-xl font-black text-emerald-400">{formatCurrency(totalCollectedFromPlayers)}</span>
            </div>
            <div className="border-l border-slate-800 pl-3">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Athletes with Due</span>
              <span className="text-xl font-black text-white">{pendingPlayersCount}</span>
            </div>
          </div>
        </div>

        {/* View Mode Toggle, Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setViewMode('UNIFIED_LEDGER')}
              className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                viewMode === 'UNIFIED_LEDGER'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Consolidated Ledger Table</span>
            </button>
            <button
              onClick={() => setViewMode('PLAYER_ACCOUNTS')}
              className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                viewMode === 'PLAYER_ACCOUNTS'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Athlete Accounts View</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search athlete, email, turf..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              onClick={() => setFilterPendingOnly(!filterPendingOnly)}
              className={`text-xs font-bold px-3 py-2 rounded-xl border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                filterPendingOnly
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{filterPendingOnly ? 'Showing Dues Only' : 'All Records'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: UNIFIED CONSOLIDATED LEDGER TABLE */}
      {viewMode === 'UNIFIED_LEDGER' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
              All Player Bookings & Outstanding Dues Ledger
            </h3>
            <span className="text-[11px] text-slate-400">
              Showing <strong className="text-white">{filteredLedgerEntries.length}</strong> ledger records
            </span>
          </div>

          {filteredLedgerEntries.length === 0 ? (
            <div className="text-center py-16 text-xs text-slate-500">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              No ledger records found matching your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                    <th className="py-3 px-4 font-semibold">Date & Time</th>
                    <th className="py-3 px-4 font-semibold">Athlete</th>
                    <th className="py-3 px-4 font-semibold">Turf & Arena</th>
                    <th className="py-3 px-4 font-semibold">Slot Price</th>
                    <th className="py-3 px-4 font-semibold">Amount Paid</th>
                    <th className="py-3 px-4 font-semibold">Pending Due</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Settlement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredLedgerEntries.map((entry) => {
                    const hasDue = (entry.amountDue || 0) > 0;
                    return (
                      <tr key={entry.id} className="hover:bg-slate-950/40 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-white flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-indigo-400" />
                            {formatDateString(entry.date)}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {entry.startTime} - {entry.endTime}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{entry.athleteName}</div>
                          <div className="text-[11px] text-slate-400">{entry.athleteEmail}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-200">{entry.turfName}</div>
                          <div className="text-[11px] text-slate-400">
                            {entry.arenaName} • <span className="text-indigo-400">{entry.sport}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono font-medium text-slate-200">
                          {formatCurrency(entry.totalAmount)}
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          {formatCurrency(entry.amountPaid)}
                        </td>

                        <td className="py-3 px-4 font-mono font-bold">
                          {hasDue ? (
                            <span className="text-amber-400">{formatCurrency(entry.amountDue)}</span>
                          ) : (
                            <span className="text-slate-500">₹0</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {hasDue ? (
                            <div>
                              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                DUE
                              </span>
                              {entry.upiTxnRef && (
                                <div className="text-[10px] text-indigo-400 font-mono mt-1" title="Athlete reported UPI reference">
                                  Ref: {entry.upiTxnRef}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              ✓ SETTLED
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          {hasDue ? (
                            <button
                              onClick={() => {
                                setSelectedPlayer(entry.summaryRef);
                                setSettleBooking(entry);
                                setSettleAmount(entry.amountDue);
                                if (entry.upiTxnRef) {
                                  setSettleMethod('ONLINE_UPI');
                                }
                              }}
                              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer shadow-md inline-flex items-center gap-1"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>Collect ₹{entry.amountDue}</span>
                            </button>
                          ) : (
                            <span className="text-slate-500 text-[11px]">No Due</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: ATHLETE ACCOUNTS LEDGER */}
      {viewMode === 'PLAYER_ACCOUNTS' && (
        <div className="space-y-4">
          {filteredList.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 text-xs text-slate-500">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              No player accounts matching your search filter.
            </div>
          ) : (
            filteredList.map((player) => {
              const isExpanded = expandedPlayerId === player.playerId;
              return (
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

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-black px-3 py-1 rounded-full ${
                          player.totalPending === 0
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {player.totalPending === 0 ? 'ALL SETTLED' : `₹${player.totalPending} PENDING DUE`}
                      </span>

                      <button
                        onClick={() => setExpandedPlayerId(isExpanded ? null : player.playerId)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>Statement Ledger ({player.bookings.length})</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Account Summary Aggregates */}
                  <div className="grid grid-cols-3 gap-3 bg-slate-950/80 p-3 rounded-xl text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Total Slots Played</span>
                      <span className="font-bold text-white">{player.totalBookings} Matches</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Total Paid</span>
                      <span className="font-bold text-emerald-400">{formatCurrency(player.totalPaid)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Account Balance Due</span>
                      <span className="font-bold text-amber-400">{formatCurrency(player.totalPending)}</span>
                    </div>
                  </div>

                  {/* Expanded Statement Ledger */}
                  {isExpanded && (
                    <div className="pt-2 space-y-2">
                      <h4 className="text-xs font-bold text-slate-300">Slot Ledger History:</h4>
                      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
                              <th className="py-2 px-3 font-semibold">Date & Time</th>
                              <th className="py-2 px-3 font-semibold">Turf / Arena</th>
                              <th className="py-2 px-3 font-semibold">Slot Price</th>
                              <th className="py-2 px-3 font-semibold">Paid</th>
                              <th className="py-2 px-3 font-semibold">Due</th>
                              <th className="py-2 px-3 font-semibold text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {player.bookings.map((b) => {
                              const bDue = b.amountDue || 0;
                              return (
                                <tr key={b.id} className="hover:bg-slate-900/30">
                                  <td className="py-2.5 px-3 whitespace-nowrap">
                                    <div className="font-medium text-white">{formatDateString(b.date)}</div>
                                    <div className="text-[10px] text-slate-500 font-mono">{b.startTime} - {b.endTime}</div>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="font-medium text-slate-200">{b.turfName}</div>
                                    <div className="text-[10px] text-slate-400">{b.arenaName} ({b.sport})</div>
                                  </td>
                                  <td className="py-2.5 px-3 font-mono">₹{b.totalAmount}</td>
                                  <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold">₹{b.amountPaid}</td>
                                  <td className="py-2.5 px-3 font-mono font-bold">
                                    {bDue > 0 ? <span className="text-amber-400">₹{bDue}</span> : <span className="text-slate-500">₹0</span>}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    {bDue > 0 ? (
                                      <button
                                        onClick={() => {
                                          setSelectedPlayer(player);
                                          setSettleBooking(b);
                                          setSettleAmount(bDue);
                                        }}
                                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer"
                                      >
                                        Collect ₹{bDue}
                                      </button>
                                    ) : (
                                      <span className="text-emerald-400 font-bold text-[11px]">✓ Settled</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Settle Payment Modal */}
      {settleBooking && selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Record Counter Settlement</h3>
            <p className="text-xs text-slate-400 mb-4">
              Athlete: <strong className="text-white">{selectedPlayer.playerName}</strong> • {settleBooking.turfName}
            </p>

            {settleBooking.upiTxnRef && (
              <div className="mb-4 bg-indigo-950/50 border border-indigo-500/40 rounded-2xl p-3 text-xs text-indigo-300 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Athlete Reported UPI Payment</span>
                  <span className="text-[11px] text-indigo-300">
                    Ref/UTR: <span className="font-mono font-bold text-amber-300">{settleBooking.upiTxnRef}</span>
                  </span>
                </div>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-bold">
                  Direct UPI
                </span>
              </div>
            )}

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
                <label className="block text-xs font-medium text-slate-400 mb-1">Payment Method</label>
                <select
                  value={settleMethod}
                  onChange={(e) => setSettleMethod(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white"
                >
                  <option value="CASH_AT_TURF">Cash at Turf Counter</option>
                  <option value="ONLINE_UPI">Direct UPI QR Payment</option>
                  <option value="ONLINE_CARD">POS Card Swipe</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSettleBooking(null);
                    setSelectedPlayer(null);
                  }}
                  className="flex-1 bg-slate-800 text-slate-300 font-bold py-2.5 rounded-xl text-xs hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settling}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs shadow-lg shadow-amber-950/50 disabled:opacity-50 cursor-pointer"
                >
                  {settling ? 'Recording...' : `Confirm Settlement ₹${settleAmount}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Booking, PaymentTransaction } from '../../types';
import { getPlayerBookings, getPaymentTransactionsForUser } from '../../lib/db';
import { recordPlayerSharePayment } from '../../lib/phase3';
import { formatCurrency, formatDateString } from '../../lib/utils';
import { PaymentSplitModal } from './PaymentSplitModal';
import {
  CreditCard,
  IndianRupee,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
  Building2,
  Receipt,
  Users,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';

interface PlayerPaymentsTabProps {
  showToast?: (text: string, type?: 'success' | 'error') => void;
}

export const PlayerPaymentsTab: React.FC<PlayerPaymentsTabProps> = ({ showToast }) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'dues' | 'history'>('dues');

  // Direct Pay Due Dialog State
  const [payingBooking, setPayingBooking] = useState<Booking | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'ONLINE_UPI' | 'ONLINE_CARD' | 'CASH_AT_TURF'>('ONLINE_UPI');
  const [payingLoading, setPayingLoading] = useState<boolean>(false);

  // Split Modal State
  const [splitBooking, setSplitBooking] = useState<Booking | null>(null);

  const loadPaymentData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [playerBookings, playerTxns] = await Promise.all([
        getPlayerBookings(user.uid),
        getPaymentTransactionsForUser(user.uid, false),
      ]);

      // Sort bookings descending by createdAt
      playerBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      playerTxns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setBookings(playerBookings);
      setTransactions(playerTxns);
    } catch (err) {
      console.error('Failed to load player payments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentData();
  }, [user]);

  // Aggregate statistics
  const totalSpent = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const totalPaid = bookings.reduce((sum, b) => sum + (b.amountPaid || 0), 0);
  const totalPending = bookings.reduce((sum, b) => sum + (b.amountDue || 0), 0);

  const handlePayDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingBooking || !user) return;
    if (payAmount <= 0) {
      showToast?.('Please enter a valid payment amount.', 'error');
      return;
    }

    setPayingLoading(true);
    try {
      await recordPlayerSharePayment({
        bookingId: payingBooking.id,
        playerId: user.uid,
        amount: payAmount,
        paymentMethod: payMethod,
        notes: `Online player settlement of ₹${payAmount} via ${payMethod}`,
      });
      showToast?.(`Payment of ₹${payAmount} recorded successfully!`, 'success');
      setPayingBooking(null);
      await loadPaymentData();
    } catch (err: any) {
      showToast?.(err.message || 'Payment failed', 'error');
    } finally {
      setPayingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-xs">
        <span className="inline-block w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-2" />
        Loading your payment ledger & transaction history...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Financial Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <CreditCard className="w-4 h-4" />
            <span>My Payment Dashboard</span>
          </div>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verified Transactions</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
            <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">
              Total Booking Value
            </span>
            <span className="text-2xl sm:text-3xl font-black text-white mt-1 block">
              {formatCurrency(totalSpent)}
            </span>
            <span className="text-[10px] text-slate-500 mt-1 block">Across {bookings.length} games</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
            <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">
              Total Paid
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1 block">
              {formatCurrency(totalPaid)}
            </span>
            <span className="text-[10px] text-emerald-500/80 mt-1 block">Settled & confirmed</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
            <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">
              Outstanding Due
            </span>
            <span className="text-2xl sm:text-3xl font-black text-rose-400 mt-1 block">
              {formatCurrency(totalPending)}
            </span>
            <span className="text-[10px] text-rose-400/80 mt-1 block">
              {totalPending > 0 ? 'Payable at turf or online' : 'All accounts settled'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('dues')}
          className={`text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'dues'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Bookings & Dues ({bookings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Transaction Ledger ({transactions.length})</span>
        </button>
      </div>

      {/* ================= BOOKINGS & DUES LIST ================= */}
      {activeTab === 'dues' && (
        <div className="space-y-4">
          {bookings.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800 text-xs text-slate-500">
              <Receipt className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              No bookings or payment records found.
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((b, idx) => (
                <div
                  key={b.id ? `pay_booking_${b.id}` : `pay_booking_idx_${idx}`}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-all shadow-lg"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{b.turfName}</span>
                        <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/20">
                          {b.sport}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {b.arenaName} • {b.date} at {b.startTime}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${
                          b.paymentStatus === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : b.paymentStatus === 'PARTIALLY_PAID'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {b.paymentStatus}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 bg-slate-950/80 p-3 rounded-xl text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Total</span>
                      <span className="font-bold text-white">{formatCurrency(b.totalAmount)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Paid</span>
                      <span className="font-bold text-emerald-400">{formatCurrency(b.amountPaid || 0)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Due</span>
                      <span className="font-bold text-rose-400">{formatCurrency(b.amountDue || 0)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setSplitBooking(b)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Split Bill with Players</span>
                    </button>

                    {b.amountDue > 0 && (
                      <button
                        onClick={() => {
                          setPayingBooking(b);
                          setPayAmount(b.amountDue);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay Due (₹{b.amountDue})</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TRANSACTION AUDIT LEDGER ================= */}
      {activeTab === 'history' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500">
              <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              No payment transactions recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {transactions.map((tx, idx) => (
                <div
                  key={tx.id ? `tx_entry_${tx.id}` : `tx_entry_idx_${tx.transactionId || idx}`}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-800/40"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-indigo-400">
                        {tx.transactionId}
                      </span>
                      <span className="bg-slate-950 text-slate-400 text-[10px] px-2 py-0.5 rounded-full border border-slate-800">
                        {tx.paymentMethod}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                          tx.status === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </div>
                    <p className="text-slate-300 text-xs">{tx.notes || 'Slot payment transaction'}</p>
                    <span className="text-[10px] text-slate-500 block">
                      {formatDateString(tx.createdAt.split('T')[0])} • {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-base font-black text-emerald-400">
                      +{formatCurrency(tx.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pay Due Modal */}
      {payingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative">
            <h3 className="text-base font-bold text-white mb-1">Pay Outstanding Balance</h3>
            <p className="text-xs text-slate-400 mb-4">{payingBooking.turfName} • {payingBooking.arenaName}</p>

            <form onSubmit={handlePayDue} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Amount to Pay (₹)</label>
                <input
                  type="number"
                  min="1"
                  max={payingBooking.amountDue}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-bold text-sm"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Remaining balance due: {formatCurrency(payingBooking.amountDue)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white"
                >
                  <option value="ONLINE_UPI">Online UPI (Instant)</option>
                  <option value="ONLINE_CARD">Debit / Credit Card</option>
                  <option value="CASH_AT_TURF">Cash / Counter Payment</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingBooking(null)}
                  className="flex-1 bg-slate-800 text-slate-300 font-bold py-2.5 rounded-xl text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payingLoading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-950/50 disabled:opacity-50"
                >
                  {payingLoading ? 'Processing...' : `Confirm ₹${payAmount}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Split Modal */}
      {splitBooking && (
        <PaymentSplitModal
          isOpen={true}
          booking={splitBooking}
          onClose={() => setSplitBooking(null)}
          onUpdated={loadPaymentData}
          showToast={showToast || (() => {})}
        />
      )}
    </div>
  );
};

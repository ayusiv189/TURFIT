import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Booking, BookingPlayerShare, UserProfile } from '../../types';
import {
  getBookingPlayerShares,
  initializePaymentSplit,
  recordPlayerSharePayment,
} from '../../lib/phase3';
import { formatCurrency, formatDateString } from '../../lib/utils';
import {
  Users,
  X,
  Plus,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  CreditCard,
  Building2,
  Trash2,
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface PaymentSplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  onUpdated: () => void;
  showToast: (text: string, type?: 'success' | 'error') => void;
}

export const PaymentSplitModal: React.FC<PaymentSplitModalProps> = ({
  isOpen,
  onClose,
  booking,
  onUpdated,
  showToast,
}) => {
  const { user, profile } = useAuth();
  const [shares, setShares] = useState<BookingPlayerShare[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [addingPlayer, setAddingPlayer] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [payingShareId, setPayingShareId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'ONLINE_UPI' | 'ONLINE_CARD' | 'CASH_AT_TURF'>('ONLINE_UPI');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const loadSharesAndUsers = async () => {
    try {
      setLoading(true);
      const existingShares = await getBookingPlayerShares(booking.id);
      setShares(existingShares);

      // Fetch active players in system to invite to split
      const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'PLAYER')));
      const allPlayers = usersSnap.docs.map((d) => d.data() as UserProfile);
      setAvailableUsers(allPlayers);
    } catch (err) {
      console.error('Failed to load shares', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSharesAndUsers();
    }
  }, [isOpen, booking.id]);

  if (!isOpen) return null;

  // Initialize or Add Player to Split
  const handleAddPlayer = async () => {
    if (!selectedUser) return;
    const targetUser = availableUsers.find((u) => u.uid === selectedUser);
    if (!targetUser) return;

    setActionLoading(true);
    try {
      // Collect current members or add new
      const currentList = shares.map((s) => ({
        uid: s.playerId,
        name: s.playerName,
        email: s.playerEmail,
        photoURL: s.playerPhotoURL,
      }));

      if (!currentList.some((p) => p.uid === targetUser.uid)) {
        currentList.push({
          uid: targetUser.uid,
          name: targetUser.displayName || 'Player',
          email: targetUser.email,
          photoURL: targetUser.photoURL || null,
        });
      }

      // Re-calculate split
      const updated = await initializePaymentSplit(booking, currentList);
      setShares(updated);
      setSelectedUser('');
      setAddingPlayer(false);
      showToast('Payment split updated & notification sent to players!', 'success');
      onUpdated();
    } catch (err: any) {
      showToast(err.message || 'Failed to update split', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Initialize self if no shares exist yet
  const handleInitialSplitSetup = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const initial = await initializePaymentSplit(booking, [
        {
          uid: booking.playerId,
          name: booking.playerName,
          email: booking.playerEmail,
          photoURL: booking.playerPhotoURL || null,
        },
      ]);
      setShares(initial);
      showToast('Split initialized! You can now add other players.', 'success');
    } catch (err) {
      showToast('Failed to initialize split', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordSharePayment = async (share: BookingPlayerShare) => {
    if (payAmount <= 0) {
      showToast('Please enter a valid payment amount.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await recordPlayerSharePayment({
        bookingId: booking.id,
        playerId: share.playerId,
        amount: payAmount,
        paymentMethod: payMethod,
        notes: `Share installment of ₹${payAmount} via ${payMethod}`,
      });
      showToast(`Payment of ₹${payAmount} recorded successfully!`, 'success');
      setPayingShareId(null);
      await loadSharesAndUsers();
      onUpdated();
    } catch (err: any) {
      showToast(err.message || 'Payment recording failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Split Booking Payment</h3>
            <p className="text-xs text-slate-400">{booking.turfName} • {booking.arenaName}</p>
          </div>
        </div>

        {/* Booking Summary Box */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-4 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Total Booking Amount</span>
            <span className="text-xl font-black text-white">{formatCurrency(booking.totalAmount)}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block font-medium">Date & Slot</span>
            <span className="text-xs font-bold text-indigo-400">
              {booking.date} • {booking.startTime}
            </span>
          </div>
        </div>

        {/* Share Members List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {shares.length === 0 ? (
            <div className="text-center py-8 bg-slate-950/60 rounded-2xl border border-slate-800/80 p-6 space-y-3">
              <Users className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No payment split created for this booking yet.</p>
              <button
                onClick={handleInitialSplitSetup}
                disabled={actionLoading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-lg shadow-indigo-950/50 cursor-pointer"
              >
                Set Up Payment Split
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Player Shares ({shares.length})
                </span>
                <button
                  onClick={() => setAddingPlayer(true)}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Player</span>
                </button>
              </div>

              {addingPlayer && (
                <div className="bg-slate-950 p-3 rounded-2xl border border-indigo-500/30 space-y-3">
                  <label className="block text-xs font-medium text-slate-300">Select Athlete from TruFit</label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="">-- Choose Athlete --</option>
                    {availableUsers
                      .filter((u) => !shares.some((s) => s.playerId === u.uid))
                      .map((u) => (
                        <option key={u.uid} value={u.uid}>
                          {u.displayName} ({u.email})
                        </option>
                      ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddPlayer}
                      disabled={!selectedUser || actionLoading}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 rounded-lg text-xs disabled:opacity-50"
                    >
                      Split with Player
                    </button>
                    <button
                      onClick={() => setAddingPlayer(false)}
                      className="px-3 py-1.5 bg-slate-800 text-slate-400 text-xs rounded-lg hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {shares.map((s) => (
                <div
                  key={s.id}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">{s.playerName}</span>
                      <span className="text-[10px] text-slate-500">{s.playerEmail}</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        s.status === 'PAID'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : s.status === 'PARTIALLY_PAID'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-900/80 p-2.5 rounded-xl text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Share</span>
                      <span className="font-bold text-white">{formatCurrency(s.shareAmount)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Paid</span>
                      <span className="font-bold text-emerald-400">{formatCurrency(s.amountPaid)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Due</span>
                      <span className="font-bold text-rose-400">{formatCurrency(s.amountDue)}</span>
                    </div>
                  </div>

                  {/* Payment Action */}
                  {s.amountDue > 0 && (
                    <div>
                      {payingShareId === s.id ? (
                        <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 space-y-2 mt-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 font-bold">Record Payment</span>
                            <span className="text-rose-400 font-bold">Due: {formatCurrency(s.amountDue)}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Amount (₹)</label>
                              <input
                                type="number"
                                min="1"
                                max={s.amountDue}
                                value={payAmount}
                                onChange={(e) => setPayAmount(Number(e.target.value))}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Method</label>
                              <select
                                value={payMethod}
                                onChange={(e) => setPayMethod(e.target.value as any)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                              >
                                <option value="ONLINE_UPI">Online UPI</option>
                                <option value="ONLINE_CARD">Online Card</option>
                                <option value="CASH_AT_TURF">Cash at Turf</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleRecordSharePayment(s)}
                              disabled={actionLoading}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 rounded-lg text-xs"
                            >
                              Confirm Payment
                            </button>
                            <button
                              onClick={() => setPayingShareId(null)}
                              className="px-3 py-1.5 bg-slate-800 text-slate-400 text-xs rounded-lg hover:text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setPayingShareId(s.id);
                            setPayAmount(s.amountDue);
                          }}
                          className="w-full bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pay / Record Share (₹{s.amountDue})</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 mt-3">
          <button
            onClick={onClose}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

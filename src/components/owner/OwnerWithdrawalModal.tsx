import React, { useState } from 'react';
import {
  Landmark,
  ArrowDownToLine,
  CheckCircle2,
  AlertCircle,
  Building,
  Clock,
  ShieldCheck,
  DollarSign,
  Receipt,
  Copy,
  Check,
  X,
  HelpCircle,
} from 'lucide-react';
import { Turf } from '../../types';
import { requestOwnerWithdrawal } from '../../lib/db';

interface OwnerWithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ownerId: string;
  ownerName: string;
  turfs: Turf[];
  availableOnlineBalance: number;
  onlineRevenue: number;
  cashRevenue: number;
  pendingPayouts: number;
  settledPayouts: number;
  savedUpi?: string;
  savedBankName?: string;
  savedAccountNumber?: string;
  savedIfscCode?: string;
  savedBeneficiary?: string;
}

export const OwnerWithdrawalModal: React.FC<OwnerWithdrawalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  ownerId,
  ownerName,
  turfs,
  availableOnlineBalance,
  onlineRevenue,
  cashRevenue,
  pendingPayouts,
  settledPayouts,
  savedUpi = '',
  savedBankName = '',
  savedAccountNumber = '',
  savedIfscCode = '',
  savedBeneficiary = '',
}) => {
  const [withdrawMode, setWithdrawMode] = useState<'UPI' | 'BANK'>(savedUpi ? 'UPI' : 'BANK');
  const [amountStr, setAmountStr] = useState<string>(
    availableOnlineBalance > 0 ? Math.min(availableOnlineBalance, 5000).toString() : '0'
  );
  const [useSavedDetails, setUseSavedDetails] = useState<boolean>(true);

  // Custom UPI
  const [customUpi, setCustomUpi] = useState<string>(savedUpi);
  // Custom Bank
  const [customBeneficiary, setCustomBeneficiary] = useState<string>(savedBeneficiary || ownerName);
  const [customBankName, setCustomBankName] = useState<string>(savedBankName);
  const [customAccountNumber, setCustomAccountNumber] = useState<string>(savedAccountNumber);
  const [customIfscCode, setCustomIfscCode] = useState<string>(savedIfscCode);

  const [notes, setNotes] = useState<string>('');
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  if (!isOpen) return null;

  const requestedAmount = Number(amountStr) || 0;
  const remainingBalance = Math.max(0, availableOnlineBalance - requestedAmount);
  const isAmountValid = requestedAmount >= 100 && requestedAmount <= availableOnlineBalance;

  const selectedDestination = withdrawMode === 'UPI'
    ? (useSavedDetails ? savedUpi : customUpi)
    : (useSavedDetails
        ? (savedAccountNumber ? `${savedBankName} A/C ${savedAccountNumber} (IFSC: ${savedIfscCode})` : '')
        : (customAccountNumber ? `${customBankName} A/C ${customAccountNumber} (IFSC: ${customIfscCode})` : ''));

  const isDestinationComplete = withdrawMode === 'UPI'
    ? Boolean((useSavedDetails ? savedUpi : customUpi)?.trim().includes('@'))
    : Boolean(
        (useSavedDetails ? savedAccountNumber : customAccountNumber)?.trim() &&
        (useSavedDetails ? savedIfscCode : customIfscCode)?.trim() &&
        (useSavedDetails ? savedBeneficiary : customBeneficiary)?.trim()
      );

  const handlePresetPercentage = (pct: number) => {
    const calculated = Math.floor((availableOnlineBalance * pct) / 100);
    setAmountStr(calculated.toString());
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (requestedAmount < 100) {
      setErrorMsg('Minimum withdrawal amount is ₹100.');
      return;
    }
    if (requestedAmount > availableOnlineBalance) {
      setErrorMsg(`Withdrawal amount cannot exceed your available online balance of ₹${availableOnlineBalance.toLocaleString('en-IN')}.`);
      return;
    }
    if (!isDestinationComplete) {
      setErrorMsg(
        withdrawMode === 'UPI'
          ? 'Please provide a valid UPI VPA ID (e.g., arena@okaxis).'
          : 'Please complete all required bank account fields including IFSC and beneficiary name.'
      );
      return;
    }
    if (!agreedToTerms) {
      setErrorMsg('Please confirm the settlement destination verification checkbox.');
      return;
    }

    try {
      setLoading(true);
      const turfNames = turfs.map((t) => t.name).join(', ') || 'All Managed Venues';

      const finalDestination = withdrawMode === 'UPI'
        ? `UPI: ${(useSavedDetails ? savedUpi : customUpi).trim()}`
        : `${(useSavedDetails ? savedBankName : customBankName).trim()} | A/C ${(useSavedDetails ? savedAccountNumber : customAccountNumber).trim()} | IFSC: ${(useSavedDetails ? savedIfscCode : customIfscCode).trim().toUpperCase()} | Beneficiary: ${(useSavedDetails ? savedBeneficiary : customBeneficiary).trim()}`;

      const reqId = await requestOwnerWithdrawal({
        ownerId,
        ownerName,
        turfId: turfs[0]?.id || undefined,
        turfName: turfNames,
        amount: requestedAmount,
        destination: finalDestination,
        payoutMode: withdrawMode,
        upiId: withdrawMode === 'UPI' ? (useSavedDetails ? savedUpi : customUpi).trim() : undefined,
        bankName: withdrawMode === 'BANK' ? (useSavedDetails ? savedBankName : customBankName).trim() : undefined,
        accountNumber: withdrawMode === 'BANK' ? (useSavedDetails ? savedAccountNumber : customAccountNumber).trim() : undefined,
        ifscCode: withdrawMode === 'BANK' ? (useSavedDetails ? savedIfscCode : customIfscCode).trim().toUpperCase() : undefined,
        beneficiaryName: withdrawMode === 'BANK' ? (useSavedDetails ? savedBeneficiary : customBeneficiary).trim() : (savedBeneficiary || ownerName),
        availableBalanceBefore: availableOnlineBalance,
        notes: notes.trim() || `Owner withdrawal request for ${turfNames}`,
      });

      setSubmittedRequestId(reqId);
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit withdrawal request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = () => {
    if (!submittedRequestId) return;
    navigator.clipboard.writeText(submittedRequestId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/40 p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">
                  Official Settlement Portal
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Zero Platform Fee
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                Initiate Online Earnings Withdrawal
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Confirmation Success View */}
        {submittedRequestId ? (
          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">Withdrawal Request Submitted!</h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                Your request to withdraw <strong className="text-emerald-400 font-black">₹{requestedAmount.toLocaleString('en-IN')}</strong> has been formally queued for Admin settlement.
              </p>
            </div>

            {/* Request Summary Receipt Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-left space-y-3 max-w-lg mx-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Request Reference</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="flex items-center gap-1.5 text-xs font-mono font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 border border-indigo-500/30 px-2.5 py-1 rounded-lg cursor-pointer"
                >
                  <span>{submittedRequestId.slice(0, 14)}...</span>
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Disbursal Amount</span>
                  <span className="text-sm font-black text-emerald-400">₹{requestedAmount.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Status</span>
                  <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> Under Admin Review
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Receiving Destination</span>
                  <span className="text-xs font-mono text-slate-300 break-all">{selectedDestination || 'Registered Account'}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>Remaining Wallet Balance:</span>
                <span className="font-mono font-bold text-white">₹{remainingBalance.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-4 text-xs text-indigo-300 text-left max-w-lg mx-auto flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-white block">What happens next?</span>
                <p className="text-[11px] text-indigo-200/80 leading-relaxed">
                  TruFit Finance Admin will verify your booking revenues and disburse the funds directly to your receiving account within 24–48 hours. A bank UTR reference number will be issued upon clearance.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
            >
              Done & Return to Wallet
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-6">
            {/* Financial Transparency Balance Breakdown Banner */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">
                    Available Online Withdrawable Balance
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                      ₹{availableOnlineBalance.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] text-slate-400">Held in Central Escrow</span>
                  </div>
                </div>

                <div className="text-right sm:text-right text-[11px] text-slate-400 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] font-bold">Online Gross</span>
                  <span className="font-mono text-white font-bold">₹{onlineRevenue.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Counter Cash Transparency Notice */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-slate-400">
                <HelpCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong className="text-slate-300">Transparency Note:</strong> Desk Counter Cash (<strong className="text-amber-400">₹{cashRevenue.toLocaleString('en-IN')}</strong>) is received in-hand at your venue desk and is NOT part of this online gateway withdrawal.
                  {pendingPayouts > 0 && (
                    <> (₹{pendingPayouts.toLocaleString('en-IN')} currently in pending review).</>
                  )}
                </p>
              </div>
            </div>

            {/* Amount Selection */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Withdrawal Amount</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  Min ₹100 • Max ₹{availableOnlineBalance.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">₹</span>
                <input
                  type="number"
                  min={100}
                  max={availableOnlineBalance}
                  step={10}
                  value={amountStr}
                  onChange={(e) => {
                    setAmountStr(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="0"
                  className={`w-full bg-slate-950 border ${
                    !isAmountValid && requestedAmount > 0 ? 'border-red-500/70 focus:border-red-500' : 'border-slate-700 focus:border-emerald-500'
                  } rounded-2xl pl-9 pr-4 py-3.5 text-lg font-mono font-black text-white focus:outline-none transition-colors`}
                  required
                />
              </div>

              {/* Percentage Quick Selector Chips */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[
                  { label: '25%', pct: 25 },
                  { label: '50%', pct: 50 },
                  { label: '75%', pct: 75 },
                  { label: '100% (MAX)', pct: 100 },
                ].map((preset) => {
                  const targetAmt = Math.floor((availableOnlineBalance * preset.pct) / 100);
                  const isSelected = requestedAmount === targetAmt && targetAmt > 0;
                  return (
                    <button
                      key={preset.pct}
                      type="button"
                      disabled={availableOnlineBalance <= 0}
                      onClick={() => handlePresetPercentage(preset.pct)}
                      className={`py-2 px-2 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Projection Bar */}
              {isAmountValid && (
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Transfer Amount</span>
                    <span className="font-mono font-black text-white">₹{requestedAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Platform Fee</span>
                    <span className="font-mono font-bold text-emerald-400">₹0 (Free)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Remaining Balance</span>
                    <span className="font-mono font-bold text-slate-300">₹{remainingBalance.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Settlement Destination Method Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Building className="w-4 h-4 text-indigo-400" />
                <span>Receiving Destination Channel</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setWithdrawMode('UPI')}
                  className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    withdrawMode === 'UPI'
                      ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-lg shadow-indigo-950/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                    withdrawMode === 'UPI' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    UPI
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-white">UPI VPA Transfer</span>
                    <span className="text-[10px] text-slate-400 block">Instant Disbursal</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setWithdrawMode('BANK')}
                  className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    withdrawMode === 'BANK'
                      ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-lg shadow-indigo-950/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                    withdrawMode === 'BANK' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-white">Bank IMPS / NEFT</span>
                    <span className="text-[10px] text-slate-400 block">Direct Account Credit</span>
                  </div>
                </button>
              </div>

              {/* Destination Form Fields */}
              {withdrawMode === 'UPI' ? (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  {savedUpi && (
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          id="useSavedUpi"
                          checked={useSavedDetails}
                          onChange={(e) => setUseSavedDetails(e.target.checked)}
                          className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="useSavedUpi" className="text-slate-300 font-semibold cursor-pointer">
                          Use Saved UPI ID: <span className="font-mono text-indigo-300">{savedUpi}</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {(!savedUpi || !useSavedDetails) && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Enter UPI VPA ID
                      </label>
                      <input
                        type="text"
                        value={customUpi}
                        onChange={(e) => setCustomUpi(e.target.value.toLowerCase().trim())}
                        placeholder="e.g. yourturf@okaxis or 9876543210@paytm"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  {savedAccountNumber && (
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          id="useSavedBank"
                          checked={useSavedDetails}
                          onChange={(e) => setUseSavedDetails(e.target.checked)}
                          className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="useSavedBank" className="text-slate-300 font-semibold cursor-pointer">
                          Use Saved Bank A/C: <span className="font-mono text-indigo-300">{savedBankName} ({savedAccountNumber.slice(-4).padStart(savedAccountNumber.length, '•')})</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {(!savedAccountNumber || !useSavedDetails) && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">
                          Account Beneficiary / Legal Entity Name
                        </label>
                        <input
                          type="text"
                          value={customBeneficiary}
                          onChange={(e) => setCustomBeneficiary(e.target.value)}
                          placeholder="e.g. Apex Arena Private Limited"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Bank Name</label>
                          <input
                            type="text"
                            value={customBankName}
                            onChange={(e) => setCustomBankName(e.target.value)}
                            placeholder="HDFC Bank"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Account Number</label>
                          <input
                            type="text"
                            value={customAccountNumber}
                            onChange={(e) => setCustomAccountNumber(e.target.value.trim())}
                            placeholder="501002345678"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">IFSC Code</label>
                          <input
                            type="text"
                            value={customIfscCode}
                            onChange={(e) => setCustomIfscCode(e.target.value.toUpperCase().trim())}
                            placeholder="HDFC0001234"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono uppercase text-white focus:outline-none focus:border-indigo-500"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Internal Audit Note (Optional) */}
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Internal Reference Note (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. September Match Booking Settlement"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Declaration & Checkbox */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="agreeWithdrawal"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="agreeWithdrawal" className="text-[11px] text-slate-300 leading-relaxed cursor-pointer">
                I certify that the recipient account / UPI VPA is authentic and matches my business entity. I acknowledge that TruFit Admin will process and credit this payout with an official bank UTR reference within 24–48 hours.
              </label>
            </div>

            {/* Error Display */}
            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3.5 rounded-xl text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !isAmountValid || availableOnlineBalance <= 0 || !agreedToTerms}
                className="flex-[2] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-950/50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Transmitting Formal Request...</span>
                  </>
                ) : (
                  <>
                    <ArrowDownToLine className="w-4 h-4" />
                    <span>Submit Payout Request (₹{requestedAmount > 0 ? requestedAmount.toLocaleString('en-IN') : '0'})</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

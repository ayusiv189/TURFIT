import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Turf, OwnerPaymentSettings } from '../../types';
import { updateOwnerPaymentSettings, saveTurfPaymentSettings } from '../../lib/db';
import { readFileAsDataURL } from '../../lib/utils';
import {
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Building2,
  ShieldCheck,
  Zap,
  DollarSign,
  Smartphone,
  Landmark,
  Save,
  Eye,
  HelpCircle,
  Sparkles,
  Upload,
  Info,
  RefreshCw,
} from 'lucide-react';

interface OwnerPaymentSettingsTabProps {
  turfs: Turf[];
  showToast: (text: string, type?: 'success' | 'error') => void;
  onTurfsUpdated?: () => void;
}

export const OwnerPaymentSettingsTab: React.FC<OwnerPaymentSettingsTabProps> = ({
  turfs,
  showToast,
  onTurfsUpdated,
}) => {
  const { user, profile, updateUserProfile } = useAuth();

  const existingSettings: OwnerPaymentSettings = profile?.paymentSettings || {};

  // Form State
  const [upiId, setUpiId] = useState<string>(existingSettings.upiId || '');
  const [beneficiaryName, setBeneficiaryName] = useState<string>(
    existingSettings.beneficiaryName || profile?.businessName || profile?.displayName || ''
  );
  const [razorpayAccountId, setRazorpayAccountId] = useState<string>(
    existingSettings.razorpayAccountId || ''
  );
  const [razorpayKeyId, setRazorpayKeyId] = useState<string>(
    existingSettings.razorpayKeyId || ''
  );
  const [bankName, setBankName] = useState<string>(existingSettings.bankName || '');
  const [accountNumber, setAccountNumber] = useState<string>(
    existingSettings.accountNumber || ''
  );
  const [ifscCode, setIfscCode] = useState<string>(existingSettings.ifscCode || '');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>(existingSettings.qrCodeUrl || '');
  const [paymentInstructions, setPaymentInstructions] = useState<string>(
    existingSettings.paymentInstructions ||
      'Please mention your Booking ID in the UPI payment remarks. Show payment confirmation at the venue counter.'
  );

  // Accepted methods
  const [allowDirectUpi, setAllowDirectUpi] = useState<boolean>(
    existingSettings.allowDirectUpi !== false
  );
  const [allowOnlineRazorpay, setAllowOnlineRazorpay] = useState<boolean>(
    existingSettings.allowOnlineRazorpay !== false
  );
  const [allowPayAtVenue, setAllowPayAtVenue] = useState<boolean>(
    existingSettings.allowPayAtVenue !== false
  );

  // Selected Turf for venue-specific override
  const [selectedTurfId, setSelectedTurfId] = useState<string>('ALL');
  const [saving, setSaving] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [testedVerified, setTestedVerified] = useState<boolean>(!!existingSettings.upiId);

  // Sync state when profile loads
  useEffect(() => {
    if (profile?.paymentSettings) {
      const s = profile.paymentSettings;
      setUpiId(s.upiId || '');
      setBeneficiaryName(s.beneficiaryName || profile?.businessName || profile?.displayName || '');
      setRazorpayAccountId(s.razorpayAccountId || '');
      setRazorpayKeyId(s.razorpayKeyId || '');
      setBankName(s.bankName || '');
      setAccountNumber(s.accountNumber || '');
      setIfscCode(s.ifscCode || '');
      setQrCodeUrl(s.qrCodeUrl || '');
      setPaymentInstructions(
        s.paymentInstructions ||
          'Please mention your Booking ID in the UPI payment remarks. Show payment confirmation at the venue counter.'
      );
      setAllowDirectUpi(s.allowDirectUpi !== false);
      setAllowOnlineRazorpay(s.allowOnlineRazorpay !== false);
      setAllowPayAtVenue(s.allowPayAtVenue !== false);
      setTestedVerified(!!s.upiId);
    }
  }, [profile]);

  // Handle Turf selection switch
  const handleTurfSelect = (tId: string) => {
    setSelectedTurfId(tId);
    if (tId === 'ALL') {
      const s = profile?.paymentSettings || {};
      setUpiId(s.upiId || '');
      setBeneficiaryName(s.beneficiaryName || profile?.businessName || profile?.displayName || '');
    } else {
      const turf = turfs.find((t) => t.id === tId);
      if (turf) {
        setUpiId(turf.upiId || turf.paymentSettings?.upiId || profile?.paymentSettings?.upiId || '');
        setBeneficiaryName(
          turf.beneficiaryName ||
            turf.paymentSettings?.beneficiaryName ||
            turf.name ||
            profile?.businessName ||
            ''
        );
      }
    }
  };

  const handleCopyUpi = () => {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
    showToast('UPI ID copied to clipboard!');
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataURL(file);
      setQrCodeUrl(dataUrl);
      showToast('Custom QR Code standee uploaded successfully!');
    } catch (err) {
      showToast('Failed to read image file.', 'error');
    }
  };

  // Generate UPI QR Code URL for preview
  const encodedUpiUrl = `upi://pay?pa=${encodeURIComponent(upiId || 'turfowner@upi')}&pn=${encodeURIComponent(
    beneficiaryName || 'Turf Venue'
  )}&cu=INR&tn=TurfSlotBooking`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    encodedUpiUrl
  )}`;

  const isValidUpi = upiId.includes('@') && upiId.length >= 5;

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (upiId && !isValidUpi) {
      showToast('Please enter a valid UPI ID (e.g. yourname@bank or 9876543210@paytm)', 'error');
      return;
    }

    setSaving(true);
    try {
      const settingsPayload: OwnerPaymentSettings = {
        upiId: upiId.trim(),
        beneficiaryName: beneficiaryName.trim(),
        razorpayAccountId: razorpayAccountId.trim() || undefined,
        razorpayKeyId: razorpayKeyId.trim() || undefined,
        bankName: bankName.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        ifscCode: ifscCode.trim().toUpperCase() || undefined,
        qrCodeUrl: qrCodeUrl || undefined,
        allowDirectUpi,
        allowOnlineRazorpay,
        allowPayAtVenue,
        paymentInstructions: paymentInstructions.trim(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Update Owner User Profile
      await updateOwnerPaymentSettings(user.uid, settingsPayload);
      await updateUserProfile({
        paymentSettings: settingsPayload,
      });

      // 2. If specific turf or all turfs, sync with Turf document
      if (selectedTurfId === 'ALL') {
        for (const t of turfs) {
          await saveTurfPaymentSettings(t.id, {
            upiId: upiId.trim(),
            beneficiaryName: beneficiaryName.trim(),
            paymentSettings: settingsPayload,
          });
        }
      } else {
        await saveTurfPaymentSettings(selectedTurfId, {
          upiId: upiId.trim(),
          beneficiaryName: beneficiaryName.trim(),
          paymentSettings: settingsPayload,
        });
      }

      setTestedVerified(true);
      showToast('Payment ID & Payout settings saved successfully! Athletes can now pay directly to your account.');
      onTurfsUpdated?.();
    } catch (err: any) {
      console.error('Error saving payment settings:', err);
      showToast(err.message || 'Failed to save payment settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400">
                  Payouts & Direct Settlements
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Owner Payment ID & Payout Accounts
                </h2>
              </div>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl">
              Add your <strong className="text-white">UPI ID (VPA)</strong>,{' '}
              <strong className="text-white">Razorpay Merchant ID</strong>, or{' '}
              <strong className="text-white">Bank Account</strong> to receive instant payments
              directly when athletes book slots and join lobbies at your turf.
            </p>
          </div>

          {/* Quick Status Pill */}
          <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 p-3 rounded-2xl">
            <div
              className={`w-3 h-3 rounded-full ${
                isValidUpi ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Payment Channel
              </span>
              <span className="text-xs font-bold text-white">
                {isValidUpi ? 'Active (Direct UPI Ready)' : 'Pending Setup'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Target Venue Selector (All vs Specific Turf) */}
      {turfs.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-white">Apply Payment ID To:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleTurfSelect('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedTurfId === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
              }`}
            >
              All My Venues ({turfs.length})
            </button>
            {turfs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTurfSelect(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedTurfId === t.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Settings Form & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls (7 Cols) */}
        <form
          onSubmit={handleSaveSettings}
          className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6"
        >
          {/* Section 1: Direct UPI ID (Primary) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4" />
                <span>1. Primary UPI ID / VPA (Instant Settlement)</span>
              </label>
              {isValidUpi && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Valid VPA
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400">
              Athletes can pay via Google Pay, PhonePe, Paytm, BHIM, or any UPI app. Funds are
              credited directly to this VPA.
            </p>

            <div className="relative">
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value.toLowerCase().trim())}
                placeholder="e.g. yourbusiness@okhdfcbank or 9876543210@paytm"
                className={`w-full bg-slate-950 border ${
                  isValidUpi ? 'border-indigo-500/80 ring-1 ring-indigo-500/30' : 'border-slate-700'
                } rounded-2xl px-4 py-3 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500`}
              />
              {upiId && (
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white p-1 text-xs bg-slate-800/80 rounded-lg"
                >
                  {copiedUpi ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>

            {/* Quick Suffix Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-500 mr-1">Quick Suffix:</span>
              {['@okhdfcbank', '@okaxis', '@okicici', '@paytm', '@ybl', '@upi', '@ibl'].map(
                (suffix) => (
                  <button
                    key={suffix}
                    type="button"
                    onClick={() => {
                      const prefix = upiId.includes('@') ? upiId.split('@')[0] : upiId || 'turf';
                      setUpiId(`${prefix}${suffix}`);
                    }}
                    className="bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-indigo-300 text-[10px] font-mono px-2 py-1 rounded-lg border border-slate-800 transition-colors"
                  >
                    {suffix}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Section 2: Beneficiary / Brand Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>2. Beneficiary / Business Account Name</span>
            </label>
            <input
              type="text"
              value={beneficiaryName}
              onChange={(e) => setBeneficiaryName(e.target.value)}
              placeholder="e.g. Apex Sports Arena LLP"
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-500">
              This name is shown to players in the payment confirmation and bank receipt.
            </p>
          </div>

          {/* Section 3: Razorpay Account / Merchant ID (Optional Gateway) */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4" />
                <span>3. Razorpay Account / Merchant Key (Optional Gateway)</span>
              </label>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-semibold">
                Cards / Netbanking / UPI
              </span>
            </div>

            <p className="text-xs text-slate-400">
              If you have a Razorpay merchant account, you can route card/netbanking payments directly
              to your account.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Razorpay Key ID (rzp_live / rzp_test)
                </label>
                <input
                  type="text"
                  value={razorpayKeyId}
                  onChange={(e) => setRazorpayKeyId(e.target.value.trim())}
                  placeholder="rzp_live_..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Razorpay Linked Account ID (Optional)
                </label>
                <input
                  type="text"
                  value={razorpayAccountId}
                  onChange={(e) => setRazorpayAccountId(e.target.value.trim())}
                  placeholder="acc_..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Bank Account Details for NEFT / IMPS Settlements */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Landmark className="w-4 h-4 text-indigo-400" />
              <span>4. Bank Account for Direct Payouts (Optional)</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Account Number
                </label>
                <input
                  type="password"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.trim())}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase().trim())}
                  placeholder="HDFC0001234"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs uppercase font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Custom Standee QR Upload */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-indigo-400" />
              <span>5. Custom Printed QR Standee Image (Optional)</span>
            </label>
            <p className="text-[11px] text-slate-400">
              Upload an image of your turf counter's official QR standee (GPay / PhonePe / Paytm). If
              left blank, a dynamic high-resolution QR code is generated automatically from your UPI
              ID.
            </p>
            <div className="flex items-center gap-3">
              <label className="bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-2 transition-colors">
                <Upload className="w-4 h-4 text-indigo-400" />
                <span>Upload QR Standee</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQrUpload}
                  className="hidden"
                />
              </label>
              {qrCodeUrl && (
                <button
                  type="button"
                  onClick={() => setQrCodeUrl('')}
                  className="text-rose-400 hover:text-rose-300 text-xs font-semibold"
                >
                  Remove Custom QR
                </button>
              )}
            </div>
          </div>

          {/* Section 6: Accepted Methods & Note */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              6. Accepted Payment Channels
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <label className="flex items-center gap-2.5 bg-slate-950 p-3 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowDirectUpi}
                  onChange={(e) => setAllowDirectUpi(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-white font-medium">Direct UPI & QR</span>
              </label>

              <label className="flex items-center gap-2.5 bg-slate-950 p-3 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowOnlineRazorpay}
                  onChange={(e) => setAllowOnlineRazorpay(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-white font-medium">Razorpay Gateway</span>
              </label>

              <label className="flex items-center gap-2.5 bg-slate-950 p-3 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowPayAtVenue}
                  onChange={(e) => setAllowPayAtVenue(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-white font-medium">Pay at Counter (Cash)</span>
              </label>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Custom Payment Remarks for Players
              </label>
              <textarea
                rows={2}
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                placeholder="Instructions shown to players on the payment confirmation screen..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-indigo-950/60 cursor-pointer flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Saving Payment ID...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Payment ID & Payout Accounts</span>
              </>
            )}
          </button>
        </form>

        {/* Right Column: Live Player Checkout Preview Card (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>Live Athlete Checkout Preview</span>
              </span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
                Player View
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              This is the exact payment screen athletes will see when booking a slot or joining a
              match at your venue.
            </p>

            {/* Simulated Checkout Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-center space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Pay Directly To</span>
                <h4 className="text-base font-extrabold text-white">
                  {beneficiaryName || 'Apex Sports Arena'}
                </h4>
                <p className="text-xs text-indigo-400 font-mono font-bold mt-0.5">
                  {upiId || 'owner@okhdfcbank'}
                </p>
              </div>

              {/* QR Code Container */}
              <div className="bg-white p-4 rounded-2xl inline-block shadow-lg mx-auto max-w-[200px]">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="Custom QR Standee"
                    className="w-40 h-40 object-contain rounded-lg mx-auto"
                  />
                ) : (
                  <img
                    src={qrApiUrl}
                    alt="UPI QR Code"
                    className="w-40 h-40 object-contain rounded-lg mx-auto"
                  />
                )}
              </div>

              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center justify-center gap-1.5 text-slate-300 font-medium">
                  <span>Scan with GPay, PhonePe, Paytm, or BHIM</span>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl text-[11px] text-slate-300 text-left flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <span>{paymentInstructions}</span>
                </div>
              </div>

              {/* Action Simulation Button */}
              <button
                type="button"
                onClick={handleCopyUpi}
                className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedUpi ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied {upiId || 'UPI ID'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy UPI ID for Instant Transfer</span>
                  </>
                )}
              </button>
            </div>

            {/* Zero Platform Fee Badge */}
            <div className="mt-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold flex-shrink-0">
                ⚡
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-emerald-300 block">
                  0% Commission Direct UPI Payouts
                </span>
                <span className="text-[11px] text-slate-400">
                  Direct UPI transfers go 100% directly into your bank without payment gateway fees.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

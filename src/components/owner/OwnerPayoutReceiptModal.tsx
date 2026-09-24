import React, { useRef } from 'react';
import {
  Landmark,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Printer,
  Copy,
  Check,
  X,
  Building,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { OwnerPayoutRequest } from '../../types';

interface OwnerPayoutReceiptModalProps {
  request: OwnerPayoutRequest | null;
  onClose: () => void;
  onCancelRequest?: (requestId: string) => void;
  isCancelling?: boolean;
}

export const OwnerPayoutReceiptModal: React.FC<OwnerPayoutReceiptModalProps> = ({
  request,
  onClose,
  onCancelRequest,
  isCancelling = false,
}) => {
  const [copiedUtr, setCopiedUtr] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState(false);

  if (!request) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = (text: string, type: 'UTR' | 'ID') => {
    navigator.clipboard.writeText(text);
    if (type === 'UTR') {
      setCopiedUtr(true);
      setTimeout(() => setCopiedUtr(false), 2000);
    } else {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const isPending = request.status === 'REQUESTED' || request.status === 'PROCESSING';
  const isSettled = request.status === 'COMPLETED';
  const isRejected = request.status === 'REJECTED';
  const isCancelled = request.status === 'CANCELLED';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-950 p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                TruFit Financial Settlement
              </span>
              <h3 className="text-base font-bold text-white">Withdrawal Statement</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              title="Print Receipt"
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-7 space-y-6">
          {/* Status Badge & Main Amount */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-1"
              style={{
                backgroundColor: isSettled ? 'rgba(16, 185, 129, 0.2)' : isPending ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: isSettled ? '#34d399' : isPending ? '#fbbf24' : '#f87171',
                border: `1px solid ${isSettled ? 'rgba(16, 185, 129, 0.3)' : isPending ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}
            >
              {isSettled ? <CheckCircle2 className="w-3.5 h-3.5" /> : isPending ? <Clock className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              <span>{request.status}</span>
            </div>

            <span className="text-[10px] text-slate-400 uppercase font-bold block">Settled Disbursal Amount</span>
            <div className="text-3xl font-black text-white font-mono">
              ₹{request.amount?.toLocaleString('en-IN')}
            </div>

            {request.utr && request.utr !== 'Pending Admin Settlement' && (
              <div className="pt-2 flex items-center justify-center gap-2">
                <span className="text-xs font-mono text-indigo-400 bg-indigo-950/50 border border-indigo-500/30 px-3 py-1 rounded-lg">
                  Bank UTR: {request.utr}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(request.utr || '', 'UTR')}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  {copiedUtr ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400 font-medium">Request Reference</span>
              <div className="flex items-center gap-1.5 font-mono font-bold text-slate-200">
                <span>{request.id}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(request.id, 'ID')}
                  className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                >
                  {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400 font-medium">Requested Date</span>
              <span className="text-white font-medium">
                {new Date(request.date || Date.now()).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>

            {request.processedAt && (
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400 font-medium">Admin Settlement Date</span>
                <span className="text-emerald-400 font-medium">
                  {new Date(request.processedAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
            )}

            <div className="py-2 border-b border-slate-800">
              <span className="text-slate-400 font-medium block mb-1">Destination Channel</span>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-slate-200 break-all">
                {request.destination}
              </div>
            </div>

            {request.notes && (
              <div className="py-2 border-b border-slate-800">
                <span className="text-slate-400 font-medium block mb-0.5">Notes</span>
                <span className="text-slate-300 italic">{request.notes}</span>
              </div>
            )}

            {request.rejectionReason && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs space-y-1">
                <span className="font-bold block">Rejection Reason:</span>
                <p>{request.rejectionReason}</p>
              </div>
            )}
          </div>

          {/* Cancel Option for Pending Requests */}
          {isPending && onCancelRequest && (
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Need to change account? You can recall this pending request.
              </span>
              <button
                type="button"
                onClick={() => onCancelRequest(request.id)}
                disabled={isCancelling}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Request'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { ShieldAlert, UserX, Flag, Lock, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { blockUser, reportUserOrContent, restrictUser } from '../../lib/db';

interface SafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  targetUserId: string;
  targetUserName: string;
  targetType?: 'user' | 'post' | 'turf';
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const SafetyModal: React.FC<SafetyModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  targetUserId,
  targetUserName,
  targetType = 'user',
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'block' | 'report' | 'restrict'>('report');
  const [reportReason, setReportReason] = useState('Harassment or Bullying');
  const [reportDetails, setReportDetails] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleBlock = async () => {
    if (!currentUserId || !targetUserId) return;
    setLoading(true);
    try {
      await blockUser(currentUserId, targetUserId);
      showToast(`Successfully blocked ${targetUserName}. You will no longer see their content or messages.`, 'success');
      onClose();
    } catch (err) {
      console.error('Error blocking user:', err);
      showToast('Failed to block user. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestrict = async () => {
    if (!currentUserId || !targetUserId) return;
    setLoading(true);
    try {
      await restrictUser(currentUserId, targetUserId);
      showToast(`Restricted ${targetUserName}. Their comments and interactions will be hidden.`, 'success');
      onClose();
    } catch (err) {
      console.error('Error restricting user:', err);
      showToast('Failed to restrict user.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !targetUserId) return;
    setLoading(true);
    try {
      await reportUserOrContent({
        reporterId: currentUserId,
        targetId: targetUserId,
        targetType: (targetType || 'user') as 'user' | 'post' | 'turf',
        reason: reportReason,
        details: reportDetails.trim(),
      });
      showToast('Report submitted securely to safety moderation team. Thank you!', 'success');
      onClose();
    } catch (err) {
      console.error('Error submitting report:', err);
      showToast('Failed to submit report. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Safety & Moderation</h3>
              <p className="text-[11px] text-slate-400">Manage interactions with {targetUserName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Tabs */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-slate-950 border-b border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('report')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'report'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Report</span>
          </button>
          <button
            onClick={() => setActiveTab('restrict')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'restrict'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Restrict</span>
          </button>
          <button
            onClick={() => setActiveTab('block')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'block'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserX className="w-3.5 h-3.5" />
            <span>Block</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'report' && (
            <form onSubmit={handleReport} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Reason for Reporting
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Harassment or Bullying">Harassment or Bullying</option>
                  <option value="Fake Profile or Impersonation">Fake Profile or Impersonation</option>
                  <option value="Inappropriate Content or Language">Inappropriate Content or Language</option>
                  <option value="Spam or Commercial Solicitation">Spam or Commercial Solicitation</option>
                  <option value="No-show or Unsportsmanlike Conduct">No-show or Unsportsmanlike Conduct</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Additional Details (Optional)
                </label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide context or description of the issue..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-lg shadow-amber-950/50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? 'Submitting Report...' : 'Submit Confidential Report'}
              </button>
            </form>
          )}

          {activeTab === 'restrict' && (
            <div className="space-y-4 text-left">
              <div className="bg-indigo-950/40 border border-indigo-900/50 p-4 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                  <Lock className="w-4 h-4" />
                  <span>What happens when you restrict someone?</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Restricting <strong className="text-white">{targetUserName}</strong> limits their interactions. Their comments on your posts or match lobbies will only be visible to them unless you approve them.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRestrict}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-lg shadow-indigo-950/50 cursor-pointer"
              >
                {loading ? 'Restricting...' : `Restrict ${targetUserName}`}
              </button>
            </div>
          )}

          {activeTab === 'block' && (
            <div className="space-y-4 text-left">
              <div className="bg-rose-950/40 border border-rose-900/50 p-4 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Block {targetUserName}?</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  They won't be able to find your profile, view your posts, invite you to matches, or send you direct messages. They will not be notified that you blocked them.
                </p>
              </div>

              <button
                type="button"
                onClick={handleBlock}
                disabled={loading}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-lg shadow-rose-950/50 cursor-pointer"
              >
                {loading ? 'Blocking...' : `Block ${targetUserName}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

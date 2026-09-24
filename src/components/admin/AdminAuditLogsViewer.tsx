import React, { useState, useEffect } from 'react';
import { SubscriptionAuditLog, VerificationAuditLog } from '../../types';
import { getSubscriptionAuditLogs, getVerificationAuditLogs } from '../../lib/db';
import {
  FileText,
  Search,
  RefreshCw,
  Download,
  Filter,
  ShieldCheck,
  CreditCard,
  Award,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Tag,
} from 'lucide-react';

interface AdminAuditLogsViewerProps {
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const AdminAuditLogsViewer: React.FC<AdminAuditLogsViewerProps> = ({ showToast }) => {
  const [logType, setLogType] = useState<'ALL' | 'SUBSCRIPTIONS' | 'VERIFICATIONS'>('ALL');
  const [subLogs, setSubLogs] = useState<SubscriptionAuditLog[]>([]);
  const [verLogs, setVerLogs] = useState<VerificationAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const [sLogs, vLogs] = await Promise.all([
        getSubscriptionAuditLogs(200),
        getVerificationAuditLogs(200),
      ]);
      setSubLogs(sLogs);
      setVerLogs(vLogs);
    } catch (err) {
      console.error('Error loading audit logs:', err);
      showToast('Failed to load audit trail', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Normalize unified list
  const unifiedLogs = [
    ...subLogs.map((l) => ({
      id: l.id,
      category: 'SUBSCRIPTION' as const,
      type: l.type,
      targetId: l.targetId,
      targetName: l.targetName,
      action: l.action,
      amount: l.amount,
      planName: l.planName,
      performedBy: l.performedBy,
      notes: l.details ? JSON.stringify(l.details) : undefined,
      timestamp: l.timestamp,
    })),
    ...verLogs.map((l) => ({
      id: l.id,
      category: 'VERIFICATION' as const,
      type: l.type,
      targetId: l.targetId,
      targetName: l.targetName,
      action: l.action,
      amount: l.amount,
      planName: undefined,
      performedBy: l.performedBy,
      notes: l.notes,
      timestamp: l.timestamp,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredLogs = unifiedLogs.filter((l) => {
    if (logType === 'SUBSCRIPTIONS' && l.category !== 'SUBSCRIPTION') return false;
    if (logType === 'VERIFICATIONS' && l.category !== 'VERIFICATION') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        l.targetName.toLowerCase().includes(q) ||
        l.targetId.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.performedBy.toLowerCase().includes(q) ||
        (l.planName && l.planName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Category', 'Target Name', 'Target ID', 'Action', 'Plan', 'Amount', 'Performed By', 'Notes'];
    const rows = filteredLogs.map((l) => [
      new Date(l.timestamp).toISOString(),
      l.category,
      `"${l.targetName.replace(/"/g, '""')}"`,
      `"${l.targetId}"`,
      l.action,
      `"${l.planName || ''}"`,
      l.amount || 0,
      `"${l.performedBy}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `trufit_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Audit trail exported to CSV', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-3xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FileText className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-white tracking-tight">Audit Trail & Access Log</h2>
          </div>
          <p className="text-xs text-slate-400">
            Immutable log of all Owner & Player subscription changes, trial expiries, verification grants, and admin overrides.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <button
            type="button"
            onClick={loadLogs}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-blue-950/40"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setLogType('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              logType === 'ALL' ? 'bg-blue-600 text-white font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Logs ({unifiedLogs.length})
          </button>
          <button
            type="button"
            onClick={() => setLogType('SUBSCRIPTIONS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              logType === 'SUBSCRIPTIONS' ? 'bg-blue-600 text-white font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            Subscriptions ({subLogs.length})
          </button>
          <button
            type="button"
            onClick={() => setLogType('VERIFICATIONS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              logType === 'VERIFICATIONS' ? 'bg-blue-600 text-white font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            Verifications ({verLogs.length})
          </button>
        </div>

        <div className="flex items-center gap-3 bg-slate-900 px-3 py-2 rounded-2xl border border-slate-800 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by Target Name, ID, Performed By, Plan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Event Category</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Target Entity</th>
                <th className="py-3.5 px-4">Plan / Details</th>
                <th className="py-3.5 px-4">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No audit records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1 ${
                          log.category === 'SUBSCRIPTION'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {log.category === 'SUBSCRIPTION' ? <CreditCard className="w-3 h-3" /> : <Award className="w-3 h-3" />}
                        {log.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-black">
                      <span
                        className={`text-[11px] ${
                          log.action.includes('ACTIVATED') || log.action.includes('GRANTED')
                            ? 'text-emerald-400'
                            : log.action.includes('EXPIRED') || log.action.includes('REVOKED')
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{log.targetName}</div>
                      <div className="text-[10px] font-mono text-slate-500">{log.targetId}</div>
                    </td>
                    <td className="py-3 px-4">
                      {log.planName && <div className="text-white font-medium">{log.planName}</div>}
                      {log.amount !== undefined && log.amount > 0 && (
                        <div className="text-emerald-400 font-bold">₹{log.amount}</div>
                      )}
                      {log.notes && <div className="text-[11px] text-slate-400 line-clamp-1">{log.notes}</div>}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-300">
                      <span className="bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 text-[11px]">
                        {log.performedBy}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

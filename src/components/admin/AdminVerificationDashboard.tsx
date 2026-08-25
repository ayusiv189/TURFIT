import React, { useState, useEffect } from 'react';
import { Turf, VerificationDocument, VerificationHistory, TurfVerificationStatus } from '../../types';
import {
  getAllTurfsForAdmin,
  getVerificationDocuments,
  getVerificationHistory,
  adminApproveTurf,
  adminRejectTurf,
  adminRequestMoreInfo,
  adminSuspendTurf,
  adminRequestPhysicalVerification,
  adminReviewDocument,
  checkNearbyTurfDuplicates,
} from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Video,
  Camera,
  MapPin,
  Phone,
  Mail,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  User,
  Building2,
  Award,
  Ban,
  Check,
  Eye,
} from 'lucide-react';

export const AdminVerificationDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTurf, setSelectedTurf] = useState<Turf | null>(null);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [history, setHistory] = useState<VerificationHistory[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TurfVerificationStatus | 'DUPLICATES'>('ALL');

  // Action Modals
  const [modalType, setModalType] = useState<
    'NONE' | 'REJECT' | 'MORE_INFO' | 'SUSPEND' | 'APPROVE_CONFIRM' | 'REQUEST_PHYSICAL'
  >('NONE');
  const [modalText, setModalText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Duplicate info for selected turf
  const [duplicateCheck, setDuplicateCheck] = useState<{
    hasDuplicate: boolean;
    duplicateTurfName?: string;
    distanceMeters?: number;
  } | null>(null);

  const loadTurfs = async () => {
    setLoading(true);
    try {
      const allTurfs = await getAllTurfsForAdmin();
      setTurfs(allTurfs);
      if (selectedTurf) {
        const updated = allTurfs.find((t) => t.id === selectedTurf.id);
        if (updated) setSelectedTurf(updated);
      }
    } catch (err) {
      console.warn('Error loading admin turfs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTurfs();
  }, []);

  const loadTurfDetails = async (turf: Turf) => {
    setSelectedTurf(turf);
    setLoadingDetails(true);
    try {
      const [docs, hist, dup] = await Promise.all([
        getVerificationDocuments(turf.id),
        getVerificationHistory(turf.id),
        turf.latitude && turf.longitude
          ? checkNearbyTurfDuplicates(turf.latitude, turf.longitude, turf.id)
          : Promise.resolve({ hasDuplicate: false }),
      ]);
      setDocuments(docs as VerificationDocument[]);
      setHistory(hist as VerificationHistory[]);
      setDuplicateCheck(dup);
    } catch (err) {
      console.warn('Error loading turf inspection data:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleApprove = async (level: 2 | 3) => {
    if (!selectedTurf) return;
    setActionLoading(true);
    try {
      const adminUid = user?.uid || 'admin-ops';
      const adminName = profile?.displayName || 'TruFit Admin';
      await adminApproveTurf(selectedTurf.id, adminUid, adminName, level, modalText || undefined);
      showToast(
        `Venue approved at Level ${level} (${level === 3 ? 'Physically Verified' : 'Turf Verified'})!`
      );
      setModalType('NONE');
      setModalText('');
      await loadTurfs();
      await loadTurfDetails(selectedTurf);
    } catch (err: any) {
      showToast(err.message || 'Failed to approve turf.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedTurf || !modalText.trim()) {
      showToast('Please provide a mandatory rejection reason.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const adminUid = user?.uid || 'admin-ops';
      const adminName = profile?.displayName || 'TruFit Admin';
      await adminRejectTurf(selectedTurf.id, adminUid, adminName, modalText.trim());
      showToast('Venue verification rejected. Feedback dispatched to owner.');
      setModalType('NONE');
      setModalText('');
      await loadTurfs();
      await loadTurfDetails(selectedTurf);
    } catch (err: any) {
      showToast(err.message || 'Failed to reject turf.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestMoreInfo = async () => {
    if (!selectedTurf || !modalText.trim()) {
      showToast('Please specify the requested information.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const adminUid = user?.uid || 'admin-ops';
      const adminName = profile?.displayName || 'TruFit Admin';
      await adminRequestMoreInfo(selectedTurf.id, adminUid, adminName, modalText.trim());
      showToast('Requested clarification sent to owner.');
      setModalType('NONE');
      setModalText('');
      await loadTurfs();
      await loadTurfDetails(selectedTurf);
    } catch (err: any) {
      showToast(err.message || 'Failed to request info.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!selectedTurf || !modalText.trim()) {
      showToast('Please provide a suspension reason.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const adminUid = user?.uid || 'admin-ops';
      const adminName = profile?.displayName || 'TruFit Admin';
      await adminSuspendTurf(selectedTurf.id, adminUid, adminName, modalText.trim());
      showToast('Venue suspended and future bookings blocked.', 'error');
      setModalType('NONE');
      setModalText('');
      await loadTurfs();
      await loadTurfDetails(selectedTurf);
    } catch (err: any) {
      showToast(err.message || 'Failed to suspend turf.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestPhysical = async () => {
    if (!selectedTurf) return;
    setActionLoading(true);
    try {
      const adminUid = user?.uid || 'admin-ops';
      const adminName = profile?.displayName || 'TruFit Admin';
      const code = await adminRequestPhysicalVerification(selectedTurf.id, adminUid, adminName);
      showToast(`Physical verification requested with code: ${code}`);
      setModalType('NONE');
      await loadTurfs();
      await loadTurfDetails(selectedTurf);
    } catch (err: any) {
      showToast(err.message || 'Failed to request physical verification.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDocumentReview = async (docId: string, status: 'verified' | 'rejected') => {
    if (!selectedTurf) return;
    try {
      const adminUid = user?.uid || 'admin-ops';
      await adminReviewDocument(selectedTurf.id, docId, adminUid, status);
      showToast(`Document marked as ${status}.`);
      const updatedDocs = await getVerificationDocuments(selectedTurf.id);
      setDocuments(updatedDocs as VerificationDocument[]);
    } catch (err: any) {
      showToast(err.message || 'Failed to review document.', 'error');
    }
  };

  // Filtered Turfs
  const filteredTurfs = turfs.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.area.toLowerCase().includes(searchQuery.toLowerCase());

    const tStatus = t.verificationStatus || 'pending_verification';

    if (statusFilter === 'DUPLICATES') {
      return matchesSearch && t.verification?.duplicateWarning?.flagged;
    }
    if (statusFilter !== 'ALL') {
      return matchesSearch && tStatus === statusFilter;
    }
    return matchesSearch;
  });

  return (
    <div id="admin-verification-dashboard" className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold text-white animate-fade-in ${
            toastMessage.type === 'error'
              ? 'bg-rose-600 border border-rose-500'
              : 'bg-emerald-600 border border-emerald-500'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <XCircle className="w-4 h-4" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Venue Verification Operations Console
            </h1>
            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
              Admin Only
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Review submitted owner venues, legal documentation, signboard photos, geo coordinates, and live walkthroughs.
          </p>
        </div>

        <button
          onClick={loadTurfs}
          className="self-start sm:self-auto px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh All</span>
        </button>
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Venues</span>
          <p className="text-xl font-extrabold text-white mt-0.5">{turfs.length}</p>
        </div>
        <div className="bg-slate-900 border border-amber-900/40 p-3.5 rounded-xl">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Pending Review</span>
          <p className="text-xl font-extrabold text-amber-400 mt-0.5">
            {turfs.filter((t) => t.verificationStatus === 'pending_verification' || t.verificationStatus === 'under_review').length}
          </p>
        </div>
        <div className="bg-slate-900 border border-emerald-900/40 p-3.5 rounded-xl">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Verified Live</span>
          <p className="text-xl font-extrabold text-emerald-400 mt-0.5">
            {turfs.filter((t) => t.verificationStatus === 'verified').length}
          </p>
        </div>
        <div className="bg-slate-900 border border-rose-900/40 p-3.5 rounded-xl">
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Rejected</span>
          <p className="text-xl font-extrabold text-rose-400 mt-0.5">
            {turfs.filter((t) => t.verificationStatus === 'rejected').length}
          </p>
        </div>
        <div className="bg-slate-900 border border-red-900/40 p-3.5 rounded-xl">
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Suspended</span>
          <p className="text-xl font-extrabold text-red-400 mt-0.5">
            {turfs.filter((t) => t.verificationStatus === 'suspended').length}
          </p>
        </div>
      </div>

      {/* Main Grid: List & Detailed Inspection Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Venue Queue List */}
        <div className="lg:col-span-5 space-y-3">
          {/* Search & Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search venue name, area, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] pb-1">
              {(
                [
                  { id: 'ALL', label: 'All' },
                  { id: 'pending_verification', label: 'Pending' },
                  { id: 'under_review', label: 'In Review' },
                  { id: 'verified', label: 'Verified' },
                  { id: 'rejected', label: 'Rejected' },
                  { id: 'suspended', label: 'Suspended' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer transition-colors ${
                    statusFilter === tab.id
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* List of Turfs */}
          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {filteredTurfs.map((turf) => {
              const tStatus = turf.verificationStatus || 'pending_verification';
              const isSelected = selectedTurf?.id === turf.id;

              return (
                <div
                  key={turf.id}
                  onClick={() => loadTurfDetails(turf)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/80 shadow-lg shadow-indigo-950/50'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-white">{turf.name}</span>
                        {turf.verificationLevel === 3 && (
                          <Award className="w-3.5 h-3.5 text-amber-400" title="Level 3 Physically Verified" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{turf.area}, {turf.city}</span>
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {tStatus === 'verified' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                        </span>
                      )}
                      {(tStatus === 'pending_verification' || tStatus === 'under_review') && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Review
                        </span>
                      )}
                      {tStatus === 'rejected' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <XCircle className="w-2.5 h-2.5" /> Rejected
                        </span>
                      )}
                      {tStatus === 'suspended' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/40 flex items-center gap-1">
                          <Ban className="w-2.5 h-2.5" /> Suspended
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Proximity / Duplicate warning flag */}
                  {turf.verification?.duplicateWarning?.flagged && (
                    <div className="mt-2 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Duplicate warning flagged ({turf.verification.duplicateWarning.distanceMeters}m to nearby turf)</span>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredTurfs.length === 0 && (
              <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
                No venues match the selected filter.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Inspection Details & Action Console */}
        <div className="lg:col-span-7">
          {selectedTurf ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-6">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">{selectedTurf.name}</h2>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      ID: {selectedTurf.id.slice(0, 8)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedTurf.address}, {selectedTurf.area}, {selectedTurf.city}
                  </p>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center flex-wrap gap-1.5">
                  <button
                    onClick={() => handleApprove(2)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve Level 2</span>
                  </button>

                  <button
                    onClick={() => handleApprove(3)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Approve Level 3</span>
                  </button>

                  <button
                    onClick={() => {
                      setModalType('MORE_INFO');
                      setModalText('');
                    }}
                    className="px-3 py-1.5 bg-blue-600/80 hover:bg-blue-600 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Request Info
                  </button>

                  <button
                    onClick={() => {
                      setModalType('REJECT');
                      setModalText('');
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Reject
                  </button>

                  <button
                    onClick={() => {
                      setModalType('SUSPEND');
                      setModalText('');
                    }}
                    className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Suspend
                  </button>
                </div>
              </div>

              {/* Duplicate & Proximity Check Alert */}
              {duplicateCheck?.hasDuplicate && (
                <div className="p-4 bg-amber-950/40 border border-amber-600/50 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Potential Duplicate Turf Flagged</span>
                  </div>
                  <p className="text-xs text-amber-200/90 leading-relaxed">
                    This venue is located within <strong>{duplicateCheck.distanceMeters} meters</strong> of existing turf "<strong>{duplicateCheck.duplicateTurfName}</strong>".
                    Ensure ownership deed and signboard are distinct before approving.
                  </p>
                </div>
              )}

              {/* Contact Verification Checkpoints */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Owner Identity & Contact</span>
                  <div className="flex items-center gap-2 text-xs text-white">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Owner UID: {selectedTurf.ownerId.slice(0, 10)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{selectedTurf.phoneNumber} (OTP Verified ✓)</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">GPS Location Pin</span>
                  <p className="text-xs text-white">
                    Lat: {selectedTurf.latitude || 'N/A'}, Lon: {selectedTurf.longitude || 'N/A'}
                  </p>
                  {selectedTurf.latitude && selectedTurf.longitude && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedTurf.latitude},${selectedTurf.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" /> Open in Google Maps
                    </a>
                  )}
                </div>
              </div>

              {/* Photo Verification Gallery */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-400" />
                  Signboard & Grounds Photos
                </h4>
                {selectedTurf.photos && selectedTurf.photos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {selectedTurf.photos.map((photo, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video">
                        <img
                          src={photo}
                          alt={`Venue photo ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-[9px] text-white">
                          {idx === 0 ? 'Entrance' : idx === 1 ? 'Signboard' : `Photo ${idx + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No photos uploaded by owner.</p>
                )}
              </div>

              {/* Legal & Ownership Documents */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  Legal Verification Documents ({documents.length})
                </h4>

                {documents.length > 0 ? (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">{doc.documentName}</span>
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                              {doc.documentType.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Uploaded {new Date(doc.uploadedAt).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {doc.fileUrl && (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" /> View Doc
                            </a>
                          )}

                          {doc.status !== 'verified' && (
                            <button
                              onClick={() => handleDocumentReview(doc.id, 'verified')}
                              className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                            >
                              Approve
                            </button>
                          )}

                          {doc.status !== 'rejected' && (
                            <button
                              onClick={() => handleDocumentReview(doc.id, 'rejected')}
                              className="px-2.5 py-1 bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No legal documents submitted yet.</p>
                )}
              </div>

              {/* Physical Live Verification Video Review */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase">Level 3 Physical Video Walk-Through</span>
                  </div>
                  <button
                    onClick={handleRequestPhysical}
                    disabled={actionLoading}
                    className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 text-[11px] font-semibold rounded-lg border border-amber-500/30 cursor-pointer"
                  >
                    Generate Verification Code
                  </button>
                </div>

                {selectedTurf.verification?.physicalVerificationCode && (
                  <p className="text-xs text-slate-400">
                    Active Code: <strong className="text-amber-400">{selectedTurf.verification.physicalVerificationCode}</strong>
                  </p>
                )}

                {selectedTurf.verification?.physicalVerificationVideoUrl ? (
                  <div className="pt-1">
                    <a
                      href={selectedTurf.verification.physicalVerificationVideoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Watch Submitted Walk-Through Video</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">No physical walkthrough video submitted yet.</p>
                )}
              </div>

              {/* Verification Audit Log */}
              {history.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-xs font-bold uppercase text-slate-400">Chronological Audit History</span>
                  <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar">
                    {history.map((h) => (
                      <div
                        key={h.id}
                        className="p-2 bg-slate-950/80 rounded-lg border border-slate-800/80 flex items-start justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white capitalize">{h.action.replace('_', ' ')}</span>
                            <span className="text-slate-500">by {h.performedByName}</span>
                          </div>
                          {h.notes && <p className="text-slate-400 text-[11px] mt-0.5">{h.notes}</p>}
                        </div>
                        <span className="text-slate-500 text-[10px]">
                          {new Date(h.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2">
              <Building2 className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <h3 className="text-base font-bold text-slate-300">Select a Venue to Inspect</h3>
              <p className="text-xs max-w-sm mx-auto">
                Choose any turf from the left queue to inspect photos, documents, and execute verification approvals.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Modal (Reject / More Info / Suspend) */}
      {modalType !== 'NONE' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4">
            <h3 className="text-base font-bold text-white">
              {modalType === 'REJECT' && 'Reject Venue Verification'}
              {modalType === 'MORE_INFO' && 'Request More Information'}
              {modalType === 'SUSPEND' && 'Suspend Venue Access'}
            </h3>

            <p className="text-xs text-slate-400">
              {modalType === 'REJECT' && 'Please specify the exact reasons for rejection so the owner can rectify and resubmit.'}
              {modalType === 'MORE_INFO' && 'Specify what additional documents, photos, or clarifications are required.'}
              {modalType === 'SUSPEND' && 'Provide reason for venue suspension (e.g. policy violations, expired lease, player disputes).'}
            </p>

            <textarea
              rows={4}
              value={modalText}
              onChange={(e) => setModalText(e.target.value)}
              placeholder="Enter detailed notes for the venue owner..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setModalType('NONE')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg cursor-pointer"
              >
                Cancel
              </button>

              {modalType === 'REJECT' && (
                <button
                  onClick={handleReject}
                  disabled={actionLoading || !modalText.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              )}

              {modalType === 'MORE_INFO' && (
                <button
                  onClick={handleRequestMoreInfo}
                  disabled={actionLoading || !modalText.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {actionLoading ? 'Sending...' : 'Send Request'}
                </button>
              )}

              {modalType === 'SUSPEND' && (
                <button
                  onClick={handleSuspend}
                  disabled={actionLoading || !modalText.trim()}
                  className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {actionLoading ? 'Suspending...' : 'Confirm Suspension'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

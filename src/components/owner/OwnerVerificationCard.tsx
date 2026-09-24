import React, { useState, useEffect } from 'react';
import { Turf, VerificationDocument, VerificationHistory, DocumentType } from '../../types';
import {
  getVerificationDocuments,
  getVerificationHistory,
  uploadVerificationDocument,
  deleteVerificationDocument,
  submitTurfForReview,
  submitPhysicalVerification,
  checkNearbyTurfDuplicates,
} from '../../lib/db';
import { readFileAsDataURL } from '../../lib/utils';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  UploadCloud,
  Video,
  Camera,
  MapPin,
  Phone,
  Mail,
  Send,
  Trash2,
  ExternalLink,
  Info,
  RefreshCw,
  Award,
  ChevronRight,
} from 'lucide-react';

interface OwnerVerificationCardProps {
  turf: Turf;
  ownerName: string;
  onRefresh?: () => void;
}

export const OwnerVerificationCard: React.FC<OwnerVerificationCardProps> = ({
  turf,
  ownerName,
  onRefresh,
}) => {
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [history, setHistory] = useState<VerificationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Upload modal / state
  const [docType, setDocType] = useState<DocumentType>('BUSINESS_REGISTRATION');
  const [docName, setDocName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Physical verification state
  const [videoUrl, setVideoUrl] = useState('');
  const [physicalCodeInput, setPhysicalCodeInput] = useState('');
  const [submittingVideo, setSubmittingVideo] = useState(false);

  // Notes for resubmission
  const [resubmitNotes, setResubmitNotes] = useState('');
  const [showResubmitModal, setShowResubmitModal] = useState(false);

  // Duplicate distance check
  const [dupInfo, setDupInfo] = useState<{ hasDuplicate: boolean; duplicateTurfName?: string; distanceMeters?: number } | null>(null);

  const status = turf.verificationStatus || 'pending_verification';
  const level = turf.verificationLevel || (status === 'verified' ? 2 : 1);

  const loadData = async () => {
    setLoading(true);
    try {
      const [docs, hist] = await Promise.all([
        getVerificationDocuments(turf.id),
        getVerificationHistory(turf.id),
      ]);
      setDocuments(docs as VerificationDocument[]);
      setHistory(hist as VerificationHistory[]);

      if (turf.latitude && turf.longitude) {
        const dup = await checkNearbyTurfDuplicates(turf.latitude, turf.longitude, turf.id);
        if (dup.hasDuplicate) {
          setDupInfo(dup);
        }
      }
    } catch (err) {
      console.warn('Error loading verification data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [turf.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setDocName(file.name);
      const base64 = await readFileAsDataURL(file);
      setFileUrl(base64);
    } catch (err) {
      setError('Could not process file. Please try another image or document.');
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileUrl) {
      setError('Please select or upload a document file.');
      return;
    }
    setUploadingDoc(true);
    setError(null);
    try {
      await uploadVerificationDocument(turf.id, turf.ownerId, {
        documentType: docType,
        documentName: docName || `${docType.replace('_', ' ')} Document`,
        fileUrl,
      });
      setFileUrl('');
      setDocName('');
      setSuccess('Document uploaded successfully. TurFit Operations team will review it.');
      await loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to upload document.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to remove this document?')) return;
    try {
      await deleteVerificationDocument(turf.id, docId);
      await loadData();
    } catch (err) {
      console.warn('Failed to delete document:', err);
    }
  };

  const handleResubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await submitTurfForReview(turf.id, turf.ownerId, ownerName, resubmitNotes);
      setShowResubmitModal(false);
      setResubmitNotes('');
      setSuccess('Your venue verification request has been resubmitted for admin review.');
      await loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to submit verification request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitPhysicalVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl) {
      setError('Please provide a video link or upload confirmation.');
      return;
    }
    setSubmittingVideo(true);
    setError(null);
    try {
      const code = physicalCodeInput || turf.verification?.physicalVerificationCode || 'LIVE-WALKTHROUGH';
      await submitPhysicalVerification(turf.id, videoUrl, code, turf.ownerId, ownerName);
      setSuccess('Physical live verification video submitted! Our operations team will review within 24 hours.');
      setVideoUrl('');
      setPhysicalCodeInput('');
      await loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to submit physical verification.');
    } finally {
      setSubmittingVideo(false);
    }
  };

  return (
    <div id={`turf-verification-card-${turf.id}`} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Venue Status</span>
            {status === 'verified' && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {level === 3 ? 'Level 3: Physically Verified' : 'Level 2: Turf Verified'}
              </span>
            )}
            {status === 'pending_verification' && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Clock className="w-3.5 h-3.5" />
                Pending Verification
              </span>
            )}
            {status === 'under_review' && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Under Review
              </span>
            )}
            {status === 'rejected' && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                <XCircle className="w-3.5 h-3.5" />
                Verification Rejected
              </span>
            )}
            {status === 'suspended' && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/40">
                <ShieldAlert className="w-3.5 h-3.5" />
                Venue Suspended
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-white mt-1">{turf.name} Verification Hub</h3>
          <p className="text-xs text-slate-400">
            {status === 'verified'
              ? 'Your venue is fully verified and discoverable on TurFit player search and bookings.'
              : 'Complete the verification checklist below to activate public bookings.'}
          </p>
        </div>

        <button
          onClick={loadData}
          className="self-start sm:self-auto p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1.5"
          title="Refresh Verification Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Notifications / Alerts */}
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Rejection / More Info Banner */}
      {status === 'rejected' && turf.verification?.rejectionReason && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/50 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-rose-400 text-sm font-semibold">
            <XCircle className="w-4 h-4" />
            <span>Reason for Rejection</span>
          </div>
          <p className="text-xs text-rose-200/90 leading-relaxed bg-rose-950/60 p-3 rounded-lg border border-rose-900/40">
            "{turf.verification.rejectionReason}"
          </p>
          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-slate-400">Update documents and photos, then resubmit for review.</p>
            <button
              onClick={() => setShowResubmitModal(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
            >
              Fix & Resubmit
            </button>
          </div>
        </div>
      )}

      {turf.verification?.moreInfoRequestedNotes && status !== 'rejected' && (
        <div className="p-4 bg-blue-950/40 border border-blue-800/50 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-blue-400 text-sm font-semibold">
            <Info className="w-4 h-4" />
            <span>Action Required: More Information Requested by Admin</span>
          </div>
          <p className="text-xs text-blue-200/90 bg-blue-950/60 p-3 rounded-lg border border-blue-900/40">
            "{turf.verification.moreInfoRequestedNotes}"
          </p>
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400">Please provide the requested documents below.</span>
            <button
              onClick={() => setShowResubmitModal(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
            >
              Resubmit Response
            </button>
          </div>
        </div>
      )}

      {/* Duplicate Warning Alert */}
      {dupInfo?.hasDuplicate && (
        <div className="p-3 bg-amber-950/30 border border-amber-700/40 rounded-xl text-amber-300 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <span className="font-semibold">Nearby Venue Proximity Notice:</span> Another venue (
            <span className="font-bold underline">{dupInfo.duplicateTurfName}</span>) is located approx {dupInfo.distanceMeters}m away. Admin will manually verify ownership deed and signboard to ensure no duplication.
          </div>
        </div>
      )}

      {/* 5-Step Verification Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Step 1: Contact & Profile */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">1. Contact Identity</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="space-y-1 text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-slate-500" />
              <span>{turf.phoneNumber || 'Owner Mobile'}</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-medium">OTP Verified</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-slate-500" />
              <span>Email Verified</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-medium">Active</span>
            </div>
          </div>
        </div>

        {/* Step 2: Location & Coordinates */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">2. Geo Coordinates</span>
            {turf.latitude && turf.longitude ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div className="space-y-1 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
              <span className="truncate">{turf.address}, {turf.area}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              GPS: {turf.latitude?.toFixed(4) || 'N/A'}, {turf.longitude?.toFixed(4) || 'N/A'}
            </p>
          </div>
        </div>

        {/* Step 3: Photos & Signboard */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">3. Venue Photos</span>
            {turf.photos && turf.photos.length >= 2 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <p className="text-xs text-slate-300">
            {turf.photos?.length || 0} photos uploaded (Entrance, Signboard & Grounds).
          </p>
          <div className="flex items-center gap-1 overflow-hidden">
            {turf.photos?.slice(0, 3).map((p, idx) => (
              <img
                key={idx}
                src={p}
                alt="Turf preview"
                className="w-8 h-8 rounded object-cover border border-slate-700"
                referrerPolicy="no-referrer"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Step 4: Legal & Ownership Documents Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              Legal & Business Verification Documents
            </h4>
            <p className="text-xs text-slate-400">
              Upload proof of ownership (GST, Trade License, Lease Agreement, or Electricity Bill).
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {documents.length} Uploaded
          </span>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleAddDocument} className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Document Type</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocumentType)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="BUSINESS_REGISTRATION">Business Registration Certificate</option>
                <option value="GST_CERTIFICATE">GST Certificate</option>
                <option value="TRADE_LICENSE">Municipality / Trade License</option>
                <option value="LEASE_AGREEMENT">Commercial Lease Agreement</option>
                <option value="OWNERSHIP_DEED">Property / Land Ownership Deed</option>
                <option value="ELECTRICITY_BILL">Utility / Electricity Bill</option>
                <option value="OTHER_PROOF">Other Government / Identity Proof</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Document Title / Reference</label>
              <input
                type="text"
                placeholder="e.g. GSTIN Certificate 2026"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <label className="flex-1 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-850 border border-dashed border-slate-700 rounded-lg cursor-pointer text-xs text-slate-300 transition-colors">
              <UploadCloud className="w-4 h-4 text-indigo-400" />
              <span>{fileUrl ? 'Document File Selected (Click to change)' : 'Select PDF or Document Image (PNG/JPG)'}</span>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              type="submit"
              disabled={uploadingDoc || !fileUrl}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{uploadingDoc ? 'Uploading...' : 'Upload Document'}</span>
            </button>
          </div>
        </form>

        {/* Documents Table */}
        {documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-800 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{doc.documentName}</span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider bg-slate-800 px-1.5 py-0.5 rounded">
                        {doc.documentType.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {doc.status === 'verified' && (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                    </span>
                  )}
                  {doc.status === 'rejected' && (
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1" title={doc.rejectionReason}>
                      <XCircle className="w-3.5 h-3.5" /> Rejected
                    </span>
                  )}
                  {doc.status === 'uploaded' && (
                    <span className="text-xs font-medium text-amber-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Awaiting Review
                    </span>
                  )}

                  {doc.fileUrl && (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                      title="View Document"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                    title="Remove Document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-slate-950/40 border border-slate-800/60 rounded-xl text-center text-xs text-slate-400">
            No legal documents uploaded yet. Upload at least one business registration or lease proof for Level 2 verification.
          </div>
        )}
      </div>

      {/* Step 5: Optional Physical Verification (Level 3) */}
      <div className="bg-slate-950/80 border border-indigo-950/60 p-4 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-bold text-white">Level 3: Physical Live Video Verification</h4>
          </div>
          {turf.verification?.physicalVerificationStatus === 'verified' || level === 3 ? (
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Physically Verified
            </span>
          ) : (
            <span className="text-xs text-slate-400">Optional (Earns Gold Verified Badge)</span>
          )}
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Record a brief 30-second continuous video walk-through from the main entrance showing your turf name signboard, playing turf surface, floodlights, and entrance gate.
          {turf.verification?.physicalVerificationCode && (
            <span className="text-indigo-400 font-semibold ml-1">
              Your required verification code is: <strong className="underline tracking-wider">{turf.verification.physicalVerificationCode}</strong>.
            </span>
          )}
        </p>

        {turf.verification?.physicalVerificationStatus !== 'verified' && (
          <form onSubmit={handleSubmitPhysicalVideo} className="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="text"
              placeholder="Video link (Google Drive / YouTube unlisted / Cloud link)"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={submittingVideo || !videoUrl}
              className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <Video className="w-3.5 h-3.5" />
              <span>{submittingVideo ? 'Submitting...' : 'Submit Video'}</span>
            </button>
          </form>
        )}
      </div>

      {/* Audit History Timeline */}
      {history.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Verification History & Audit Log</span>
          <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar pr-1">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex items-start justify-between text-[11px] p-2 bg-slate-950/60 rounded-lg border border-slate-800/60"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-200 capitalize">{h.action.replace('_', ' ')}</span>
                    <span className="text-slate-500">by {h.performedByName || 'Operations'}</span>
                  </div>
                  {h.notes && <p className="text-slate-400 text-[10px] mt-0.5">{h.notes}</p>}
                </div>
                <span className="text-slate-500 text-[10px] shrink-0">
                  {new Date(h.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resubmit Modal */}
      {showResubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4">
            <h3 className="text-base font-bold text-white">Resubmit Venue Verification</h3>
            <p className="text-xs text-slate-400">
              Add any explanation or notes regarding updated documents and resolved issues.
            </p>
            <textarea
              rows={3}
              value={resubmitNotes}
              onChange={(e) => setResubmitNotes(e.target.value)}
              placeholder="e.g. Uploaded updated GST registration and high-resolution signboard photo."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResubmitModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResubmit}
                disabled={submitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Submitting...' : 'Submit to Admin'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

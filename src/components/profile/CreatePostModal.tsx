import React, { useState, useRef } from 'react';
import { UserProfile, SocialMediaType } from '../../types';
import { validateMediaFile, uploadPostMedia } from '../../lib/mediaUpload';
import { createSocialPost } from '../../lib/db';
import {
  X,
  Image as ImageIcon,
  Film,
  UploadCloud,
  Loader2,
  Sparkles,
  MapPin,
  AlertCircle,
  Check,
  Trash2,
} from 'lucide-react';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onPostCreated?: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const COMMON_SPORTS = [
  'Football',
  'Box Cricket',
  'Cricket',
  'Badminton',
  'Basketball',
  'Pickleball',
  'Tennis',
  'Padel',
  'Volleyball',
  'General Fitness',
];

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  profile,
  onPostCreated,
  showToast,
}) => {
  const [caption, setCaption] = useState('');
  const [selectedSport, setSelectedSport] = useState(profile.preferredSport || 'Football');
  const [city, setCity] = useState(profile.city || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<SocialMediaType>('NONE');
  
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    setErrorMessage(null);
    const validation = validateMediaFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid media file');
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setMediaType(validation.mediaType);
    setPreviewUrl(validation.previewUrl || URL.createObjectURL(file));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveMedia = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setMediaType('NONE');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim() && !selectedFile) {
      setErrorMessage('Please add a caption or attach a photo/video.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setUploadProgress(0);

    try {
      let mediaDownloadUrl: string | undefined = undefined;
      let detectedMediaType: SocialMediaType = 'NONE';

      if (selectedFile) {
        const uploadResult = await uploadPostMedia(
          selectedFile,
          profile.uid,
          (percent) => setUploadProgress(percent)
        );
        mediaDownloadUrl = uploadResult.downloadUrl;
        detectedMediaType = uploadResult.mediaType;
      }

      await createSocialPost({
        authorId: profile.uid,
        authorType: profile.role === 'OWNER' ? 'OWNER' : 'PLAYER',
        authorName: profile.displayName || 'Athlete',
        authorUsername: profile.username || '',
        authorAvatar: profile.photoURL || '',
        authorRole: profile.role,
        authorCity: city.trim() || profile.city || '',
        caption: caption.trim(),
        mediaUrl: mediaDownloadUrl,
        mediaUrls: mediaDownloadUrl ? [mediaDownloadUrl] : [],
        mediaType: detectedMediaType,
        sport: selectedSport,
        city: city.trim() || profile.city || '',
      });

      showToast?.('Post published successfully!', 'success');
      handleRemoveMedia();
      setCaption('');
      onPostCreated?.();
      onClose();
    } catch (err: any) {
      console.error('Error publishing post:', err);
      setErrorMessage(err.message || 'Failed to publish post. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div
      id="create-post-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUploading) {
          onClose();
        }
      }}
    >
      <div
        id="create-post-modal-content"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scale-up"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Create Sports Post</h2>
              <p className="text-xs text-slate-400">Share game highlights, drills, or turf moments</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isUploading}
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Author Badge */}
          <div className="flex items-center gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-bold overflow-hidden flex-shrink-0">
              {profile.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt={profile.displayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                profile.displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate">{profile.displayName}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded">
                  {profile.role === 'OWNER' ? 'VENUE OWNER' : 'ATHLETE'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                @{profile.username || profile.displayName.toLowerCase().replace(/\s+/g, '_')}
              </span>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-rose-950/60 border border-rose-500/40 text-rose-300 p-3 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Caption Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Caption / Game Notes
            </label>
            <textarea
              id="post-caption-input"
              rows={4}
              maxLength={1000}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What happened on the turf? Great match, epic goal, or new turf announcement..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white text-xs sm:text-sm rounded-xl p-3 focus:outline-none transition-colors leading-relaxed placeholder:text-slate-600"
            />
            <div className="flex justify-end text-[10px] text-slate-500 font-mono">
              {caption.length} / 1000
            </div>
          </div>

          {/* Sport & City Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Sport
              </label>
              <select
                id="post-sport-select"
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-emerald-500"
              >
                {COMMON_SPORTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                City / Location
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="post-city-input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Mumbai, Bangalore"
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-2.5 pl-8 focus:outline-none focus:border-emerald-500"
                />
                <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-3" />
              </div>
            </div>
          </div>

          {/* Media Upload Area */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Attach Photo or Video (Optional)
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,video/*"
              className="hidden"
              onChange={handleInputChange}
            />

            {!previewUrl ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/60'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <UploadCloud className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-xs font-bold text-white mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-[11px] text-slate-500">
                  Photos (JPG, PNG, WEBP up to 15MB) or Short Videos (MP4, WEBM up to 60MB)
                </p>
                <div className="flex items-center justify-center gap-3 mt-3">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded">
                    <ImageIcon className="w-3 h-3 text-emerald-400" /> Photo
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded">
                    <Film className="w-3 h-3 text-indigo-400" /> Video
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                {mediaType === 'VIDEO' ? (
                  <video
                    src={previewUrl}
                    controls
                    className="w-full max-h-64 object-contain bg-black"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full max-h-64 object-contain bg-black/40"
                  />
                )}

                <button
                  type="button"
                  onClick={handleRemoveMedia}
                  disabled={isUploading}
                  className="absolute top-2.5 right-2.5 p-1.5 bg-slate-900/90 hover:bg-rose-950/90 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 rounded-xl transition-colors cursor-pointer shadow-lg"
                  title="Remove media"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="p-2.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 font-bold text-slate-300 truncate max-w-[200px]">
                    {mediaType === 'VIDEO' ? (
                      <Film className="w-3.5 h-3.5 text-indigo-400" />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    {selectedFile?.name}
                  </span>
                  <span>
                    {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : ''}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-1.5 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  Uploading media to secure storage...
                </span>
                <span className="text-emerald-400 font-mono">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(5, uploadProgress)}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isUploading}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-submit-social-post"
              disabled={isUploading || (!caption.trim() && !selectedFile)}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/40 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Publish Post</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

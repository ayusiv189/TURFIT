import React, { useState, useEffect } from 'react';
import { PromotionalBanner, BannerAudience } from '../../types';
import { getPromotionalBanners, savePromotionalBanner, deletePromotionalBanner, listenPromotionalBanners } from '../../lib/db';
import { readFileAsDataURL } from '../../lib/utils';
import {
  Image,
  Plus,
  Edit3,
  Trash2,
  Calendar,
  Layers,
  CheckCircle2,
  XCircle,
  Megaphone,
  Upload,
  Link,
  Users,
} from 'lucide-react';

interface AdminBannerManagerProps {
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const AdminBannerManager: React.FC<AdminBannerManagerProps> = ({ showToast }) => {
  const [banners, setBanners] = useState<PromotionalBanner[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form state
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    imageUrl: '',
    buttonText: 'Explore Now',
    targetScreen: 'explore',
    startDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    displayOrder: 1,
    isActive: true,
    targetAudience: 'ALL' as BannerAudience,
  });

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenPromotionalBanners(true, (data) => {
      setBanners(data);
      setLoading(false);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      title: '',
      subtitle: '',
      imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800',
      buttonText: 'Join Now',
      targetScreen: 'explore',
      startDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      displayOrder: banners.length + 1,
      isActive: true,
      targetAudience: 'ALL',
    });
    setIsEditing(true);
  };

  const handleOpenEdit = (banner: PromotionalBanner) => {
    setEditingId(banner.id);
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle,
      imageUrl: banner.imageUrl,
      buttonText: banner.buttonText,
      targetScreen: banner.targetScreen,
      startDate: banner.startDate,
      expiryDate: banner.expiryDate,
      displayOrder: banner.displayOrder,
      isActive: banner.isActive,
      targetAudience: banner.targetAudience,
    });
    setIsEditing(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await readFileAsDataURL(file);
      setFormData((prev) => ({ ...prev, imageUrl: base64 }));
      showToast('Banner image uploaded successfully!');
    } catch (err) {
      console.error('Error reading image file:', err);
      showToast('Failed to read image file.', 'error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('Please enter a banner title.', 'error');
      return;
    }

    setSaving(true);
    try {
      const bannerId = editingId || `banner_${Date.now()}`;
      const payload: PromotionalBanner = {
        id: bannerId,
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim(),
        imageUrl: formData.imageUrl || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800',
        buttonText: formData.buttonText.trim() || 'Explore',
        targetScreen: formData.targetScreen,
        startDate: formData.startDate,
        expiryDate: formData.expiryDate,
        displayOrder: Number(formData.displayOrder) || 1,
        isActive: formData.isActive,
        targetAudience: formData.targetAudience,
        createdAt: editingId ? (banners.find((b) => b.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await savePromotionalBanner(payload);
      showToast(editingId ? 'Banner updated successfully!' : 'Promotional banner created successfully!');
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving banner:', err);
      showToast('Failed to save banner.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePromotionalBanner(deleteTarget.id);
      showToast('Banner deleted successfully.');
      setDeleteTarget(null);
    } catch (err) {
      console.error('Error deleting banner:', err);
      showToast('Failed to delete banner.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (banner: PromotionalBanner) => {
    try {
      const updated: PromotionalBanner = {
        ...banner,
        isActive: !banner.isActive,
        updatedAt: new Date().toISOString(),
      };
      await savePromotionalBanner(updated);
      showToast(`Banner ${updated.isActive ? 'activated' : 'deactivated'} successfully!`);
    } catch (err) {
      console.error('Error toggling banner status:', err);
      showToast('Failed to update banner status.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Megaphone className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Promotional Banner Management</h2>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Upload promotional banners, control target audience (Players, Owners, or All), scheduling dates, display order, and target screens without needing a new APK release.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-950/50 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Upload New Banner</span>
        </button>
      </div>

      {/* Banners List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">Loading banners from Firestore...</div>
      ) : banners.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
          <p className="text-sm font-bold text-white mb-1">No promotional banners configured</p>
          <p className="text-xs text-slate-500 mb-4">Click "Upload New Banner" above to add your first promotional campaign.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map((b) => (
            <div
              key={b.id}
              className={`bg-slate-900 border rounded-3xl overflow-hidden flex flex-col justify-between shadow-xl ${
                b.isActive ? 'border-slate-800' : 'border-slate-800/60 opacity-60 bg-slate-950/40'
              }`}
            >
              <div>
                <div className="relative h-40 w-full bg-slate-950">
                  <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <span className="bg-slate-900/90 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-700">
                      Order #{b.displayOrder}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        b.isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {b.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <span className="bg-indigo-600/90 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {b.targetAudience}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="text-base font-bold text-white mb-1">{b.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2">{b.subtitle}</p>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300 border-t border-slate-800 pt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Target Screen:</span>
                      <code className="text-indigo-400 font-mono bg-indigo-950/40 px-2 py-0.5 rounded">{b.targetScreen}</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Schedule:</span>
                      <span className="text-slate-300 font-medium">{b.startDate} to {b.expiryDate}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive(b)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                    b.isActive
                      ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
                  }`}
                  title={b.isActive ? 'Disable Banner (Hide from users)' : 'Enable Banner (Show to users)'}
                >
                  {b.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>{b.isActive ? 'Active' : 'Paused'}</span>
                </button>
                <button
                  onClick={() => handleOpenEdit(b)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => setDeleteTarget({ id: b.id, title: b.title })}
                  className="p-2 bg-slate-800 hover:bg-rose-950/50 hover:text-rose-400 text-slate-400 rounded-xl transition-colors cursor-pointer"
                  title="Delete Banner"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 relative max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">
              {editingId ? 'Edit Promotional Banner' : 'Create New Promotional Banner'}
            </h3>
            <p className="text-xs text-slate-400 mb-5">Configure banner artwork, scheduling, and target screen link.</p>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Banner Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Weekend Super Cup 🏆"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Subtitle / Description</label>
                <textarea
                  rows={2}
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="Register your squad for 5v5 football & win ₹10,000 cash prize!"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-400">Banner Image (File Upload or URL)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                  />
                </div>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="Or paste image URL"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-300 font-mono"
                />
                {formData.imageUrl && (
                  <div className="relative h-28 w-full rounded-2xl overflow-hidden border border-slate-800 mt-2">
                    <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Button Text</label>
                  <input
                    type="text"
                    value={formData.buttonText}
                    onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                    placeholder="Join Now"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Target Screen / Action</label>
                  <select
                    value={formData.targetScreen}
                    onChange={(e) => setFormData({ ...formData, targetScreen: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white"
                  >
                    <option value="explore">Explore / Home</option>
                    <option value="lobbies">Community Lobbies</option>
                    <option value="tournaments">Tournaments</option>
                    <option value="subscription">Owner Pro Subscription</option>
                    <option value="payments">Payment ID / Payouts</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Display Order</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Target Audience</label>
                  <select
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as BannerAudience })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white"
                  >
                    <option value="ALL">All Users (Players & Owners)</option>
                    <option value="PLAYERS">Players Only</option>
                    <option value="OWNERS">Turf Owners Only</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 w-full">
                    <input
                      type="checkbox"
                      id="bannerActiveCheck"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                    />
                    <label htmlFor="bannerActiveCheck" className="text-xs font-semibold text-white cursor-pointer">
                      Active Banner
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-xs shadow-lg shadow-indigo-950/50 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Banner' : 'Upload Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center text-xl">
              ⚠️
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">Delete Banner</h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to delete <span className="text-white font-semibold">"{deleteTarget.title}"</span>? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl text-xs shadow-lg shadow-rose-950/50 disabled:opacity-50 cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

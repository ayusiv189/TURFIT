import React, { useState, useEffect } from 'react';
import {
  Building2,
  ShieldCheck,
  Sparkles,
  MapPin,
  Phone,
  MessageCircle,
  Instagram,
  Plus,
  Save,
  Eye,
  Tag,
  CheckCircle2,
  ExternalLink,
  Calendar,
  AlertCircle,
  Flame,
  Send,
} from 'lucide-react';
import { OwnerBrandProfile, Turf, SocialPost } from '../../types';
import {
  listenOwnerBrandProfile,
  saveOwnerBrandProfile,
  createSocialPost,
  getOwnerSubscriptionStatus,
} from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import { OwnerBrandProfileModal } from '../social/OwnerBrandProfileModal';

interface OwnerBrandProfileTabProps {
  turfs: Turf[];
  showToast: (text: string, type: 'success' | 'error') => void;
  onNavigateToSubscription?: () => void;
}

const POPULAR_AMENITIES = [
  'FIFA Certified Turf',
  'LED Floodlights',
  'Free Parking',
  'Café & Refreshments',
  'Changing Rooms & Showers',
  'Free High-Speed Wi-Fi',
  'Air-Conditioned Lounge',
  'Footballs & Bibs Included',
  'First Aid & Water Station',
  'Covered Weather-Proof Roof',
];

export const OwnerBrandProfileTab: React.FC<OwnerBrandProfileTabProps> = ({
  turfs,
  showToast,
  onNavigateToSubscription,
}) => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [brandProfile, setBrandProfile] = useState<OwnerBrandProfile | null>(null);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [hasPaidSaaS, setHasPaidSaaS] = useState<boolean>(false);
  const [planName, setPlanName] = useState<string>('Free Plan');

  // Form State
  const [handle, setHandle] = useState<string>('');
  const [brandName, setBrandName] = useState<string>('');
  const [tagline, setTagline] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [city, setCity] = useState<string>('Mumbai');
  const [address, setAddress] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [whatsapp, setWhatsapp] = useState<string>('');
  const [instagramHandle, setInstagramHandle] = useState<string>('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedTurfIds, setSelectedTurfIds] = useState<string[]>([]);

  // Post Creator State (Quick Post from Owner tab)
  const [showPostModal, setShowPostModal] = useState<boolean>(false);
  const [postCaption, setPostCaption] = useState<string>('');
  const [postMediaUrl, setPostMediaUrl] = useState<string>('');
  const [postSport, setPostSport] = useState<string>('Football');
  const [postPromoTag, setPostPromoTag] = useState<string>('⚡ 20% OFF TONIGHT');
  const [postIsPromo, setPostIsPromo] = useState<boolean>(true);
  const [postSelectedTurfId, setPostSelectedTurfId] = useState<string>('');
  const [creatingPost, setCreatingPost] = useState<boolean>(false);

  // Load existing profile & SaaS status
  useEffect(() => {
    if (!user) return;

    // Check SaaS status
    getOwnerSubscriptionStatus(user.uid).then((sub) => {
      if (sub && sub.status === 'ACTIVE' && sub.planId !== 'free') {
        setHasPaidSaaS(true);
        setPlanName(sub.planId.toUpperCase());
      } else {
        setHasPaidSaaS(false);
        setPlanName('Starter');
      }
    });

    const unsubscribe = listenOwnerBrandProfile(user.uid, (existing) => {
      if (existing) {
        setBrandProfile(existing);
        setHandle(existing.handle || '');
        setBrandName(existing.brandName || '');
        setTagline(existing.tagline || '');
        setLogoUrl(existing.logoUrl || '');
        setCoverUrl(existing.coverUrl || '');
        setBio(existing.bio || '');
        setCity(existing.city || 'Mumbai');
        setAddress(existing.address || '');
        setPhone(existing.phone || '');
        setWhatsapp(existing.whatsapp || '');
        setInstagramHandle(existing.instagramHandle || '');
        setSelectedAmenities(existing.amenities || []);
        setSelectedTurfIds(existing.turfIds || turfs.map((t) => t.id));
      } else {
        // Pre-populate with user details
        const defaultName = profile?.businessName || (turfs.length > 0 ? turfs[0].name : 'Sports Arena');
        const defaultHandle = '@' + defaultName.toLowerCase().replace(/[^a-z0-9]/g, '');
        setBrandName(defaultName);
        setHandle(defaultHandle);
        setCity(turfs.length > 0 ? turfs[0].city : 'Mumbai');
        setAddress(turfs.length > 0 ? turfs[0].location : '');
        setLogoUrl(turfs.length > 0 && turfs[0].images?.[0] ? turfs[0].images[0] : '');
        setSelectedTurfIds(turfs.map((t) => t.id));
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, profile, turfs]);

  // Handle amenity toggle
  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  // Handle turf link toggle
  const toggleTurf = (turfId: string) => {
    setSelectedTurfIds((prev) =>
      prev.includes(turfId) ? prev.filter((id) => id !== turfId) : [...prev, turfId]
    );
  };

  // Save Brand Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!brandName.trim()) {
      showToast('Brand or Venue Name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const cleanHandle = handle.trim().startsWith('@')
        ? handle.trim()
        : `@${handle.trim().replace(/[^a-zA-Z0-9_]/g, '')}`;

      await saveOwnerBrandProfile({
        id: user.uid,
        ownerId: user.uid,
        handle: cleanHandle || `@arena_${user.uid.substring(0, 5)}`,
        brandName: brandName.trim(),
        tagline: tagline.trim(),
        logoUrl: logoUrl.trim() || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=300',
        coverUrl: coverUrl.trim() || 'https://images.unsplash.com/photo-1529900248461-90567a60518d?w=1000',
        bio: bio.trim(),
        city: city || 'Mumbai',
        address: address.trim(),
        amenities: selectedAmenities,
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        instagramHandle: instagramHandle.trim(),
        isVerified: hasPaidSaaS, // Verified badge automatically unlocked with SaaS plan!
        saasPlanName: planName,
        turfIds: selectedTurfIds,
      });

      showToast('Brand Profile successfully saved and published!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to save profile. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle Creating an Owner Post / Promotion
  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!postCaption.trim()) {
      showToast('Please provide a caption or description for your post', 'error');
      return;
    }

    setCreatingPost(true);
    try {
      const activeTurf = turfs.find((t) => t.id === postSelectedTurfId) || turfs[0];

      await createSocialPost({
        authorId: user.uid,
        authorType: 'OWNER',
        authorName: brandName || 'Venue Partner',
        authorUsername: handle || '@arena',
        authorAvatar: logoUrl || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=300',
        authorRole: 'Venue Partner',
        authorCity: city,
        isVerified: hasPaidSaaS,
        ownerTurfId: activeTurf?.id,
        ownerTurfName: activeTurf?.name,
        caption: postCaption.trim(),
        mediaUrl:
          postMediaUrl.trim() ||
          activeTurf?.images?.[0] ||
          'https://images.unsplash.com/photo-1529900248461-90567a60518d?w=800',
        sport: postSport,
        city: city,
        isPromotional: postIsPromo,
        promoTag: postIsPromo ? postPromoTag.trim() : undefined,
        ctaText: postIsPromo ? 'Book Slot Now' : undefined,
      });

      showToast('Post published to the Community Feed!', 'success');
      setShowPostModal(false);
      setPostCaption('');
      setPostMediaUrl('');
    } catch (err) {
      console.error(err);
      showToast('Failed to publish post', 'error');
    } finally {
      setCreatingPost(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs">
        Loading Brand Profile details...
      </div>
    );
  }

  return (
    <div id="tab-owner-brand-profile" className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-emerald-950 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Venue Brand Profile
            </h1>
            {hasPaidSaaS ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Partner
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                Starter Tier
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
            Create an official Instagram-style brand page for your sports facility. Players in your city can follow your venues, browse highlight photos, and book slots directly from your posts.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {brandProfile && (
            <button
              id="btn-preview-brand-profile"
              onClick={() => setPreviewOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              Preview Profile
            </button>
          )}

          <button
            id="btn-create-owner-post"
            onClick={() => setShowPostModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            Post to Feed
          </button>
        </div>
      </div>

      {/* SaaS Feature Upsell Banner (If on Free plan) */}
      {!hasPaidSaaS && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
                Unlock Verified Gold Badge & Boosted Promotions
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Pro SaaS subscribers get the Official Verified checkmark, priority ranking in the player feed, and direct "Book Slot" buttons on their promotional posts.
              </p>
            </div>
          </div>
          {onNavigateToSubscription && (
            <button
              onClick={onNavigateToSubscription}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black whitespace-nowrap cursor-pointer transition-all shadow-md shadow-amber-500/20"
            >
              Upgrade to Pro →
            </button>
          )}
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Core Identity Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Brand Identity & Handles
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Official Brand / Arena Name *
              </label>
              <input
                type="text"
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. Apex Sports Arena"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Unique Social Handle *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="@apexarena"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all font-mono"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Catchy Tagline / Slogan
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Mumbai's Premier 7v7 FIFA Artificial Turf Arena"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1">
                About Your Facility & Story (Bio)
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Describe your arena, operating hours, coaching camps, tournament hosting, and high-quality amenities..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Visual Media (Logo & Cover) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Visual Assets & Photos
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Official Logo URL
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://... logo image link"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Square 1:1 image recommended (PNG or JPG).
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Cover Banner Photo URL
              </label>
              <input
                type="url"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://... wide banner image link"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Landscape 16:9 banner of your arena floodlights/turf.
              </p>
            </div>
          </div>

          {/* Quick preview of images */}
          {(logoUrl || coverUrl) && (
            <div className="relative rounded-2xl overflow-hidden h-28 bg-slate-950 border border-slate-800 mt-2 flex items-center p-4 gap-4">
              {coverUrl && (
                <img
                  src={coverUrl}
                  alt="Cover Preview"
                  className="absolute inset-0 w-full h-full object-cover opacity-40"
                />
              )}
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-slate-800 border-2 border-slate-700 overflow-hidden shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-8 h-8 m-auto text-slate-600" />
                  )}
                </div>
                <div className="relative z-10">
                  <h4 className="text-sm font-bold text-white">{brandName || 'Brand Name'}</h4>
                  <p className="text-xs text-indigo-300 font-mono">{handle || '@handle'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Location & Contact Channels */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Location & Player Contact Channels
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Primary City
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none cursor-pointer"
              >
                <option value="Mumbai">Mumbai</option>
                <option value="Pune">Pune</option>
                <option value="Bengaluru">Bengaluru</option>
                <option value="Delhi NCR">Delhi NCR</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Chennai">Chennai</option>
                <option value="Kolkata">Kolkata</option>
                <option value="Ahmedabad">Ahmedabad</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Full Address / Landmark
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Near Link Road, Andheri West"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-indigo-400" />
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                WhatsApp Direct Inquiries
              </label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="WhatsApp number with country code"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Instagram className="w-3.5 h-3.5 text-pink-400" />
                Instagram Business Page Handle
              </label>
              <input
                type="text"
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
                placeholder="@official_apexturf"
                className="w-full bg-slate-950 border border-slate-800 focus:border-pink-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all font-mono"
              />
            </div>
          </div>
        </div>

        {/* Facility Amenities Chips */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-3 shadow-xl">
          <h3 className="text-sm font-black uppercase tracking-wider text-purple-400 flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Facility Highlights & Amenities
          </h3>
          <p className="text-xs text-slate-400">
            Select the amenities you offer so players know what to expect.
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            {POPULAR_AMENITIES.map((amenity) => {
              const selected = selectedAmenities.includes(amenity);
              return (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selected
                      ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20 font-black'
                      : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {selected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {amenity}
                </button>
              );
            })}
          </div>
        </div>

        {/* Linked Turfs Selection */}
        {turfs.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-3 shadow-xl">
            <h3 className="text-sm font-black uppercase tracking-wider text-teal-400 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Turfs Linked to this Brand Profile
            </h3>
            <p className="text-xs text-slate-400">
              Select which of your grounds should appear on your public brand page:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {turfs.map((turf) => {
                const isLinked = selectedTurfIds.includes(turf.id);
                return (
                  <div
                    key={turf.id}
                    onClick={() => toggleTurf(turf.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isLinked
                        ? 'bg-teal-500/10 border-teal-500/40 text-teal-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white">{turf.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{turf.location}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                        isLinked
                          ? 'bg-teal-500 border-teal-400 text-slate-950 font-black'
                          : 'border-slate-700 bg-slate-900'
                      }`}
                    >
                      {isLinked && '✓'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Submit Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-indigo-600/30 cursor-pointer disabled:opacity-50 transition-all"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Profile...' : 'Save & Publish Brand Profile'}
          </button>
        </div>
      </form>

      {/* Quick Post / Promo Modal */}
      {showPostModal && (
        <div
          id="modal-create-owner-post"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
        >
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black text-white">
                  Post to Community Player Feed
                </h3>
              </div>
              <button
                onClick={() => setShowPostModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePublishPost} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Caption / Announcement *
                </label>
                <textarea
                  required
                  rows={3}
                  value={postCaption}
                  onChange={(e) => setPostCaption(e.target.value)}
                  placeholder="e.g. Flash Slot Sale! Tonight 10 PM - 12 AM slots open with 25% discount. Fresh turf maintenance complete! ⚽"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Sport
                  </label>
                  <select
                    value={postSport}
                    onChange={(e) => setPostSport(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none cursor-pointer"
                  >
                    <option value="Football">Football</option>
                    <option value="Cricket">Cricket</option>
                    <option value="Badminton">Badminton</option>
                    <option value="Pickleball">Pickleball</option>
                    <option value="Basketball">Basketball</option>
                    <option value="General">General Announcement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Target Turf
                  </label>
                  <select
                    value={postSelectedTurfId}
                    onChange={(e) => setPostSelectedTurfId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none cursor-pointer"
                  >
                    {turfs.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Photo / Banner URL (Optional)
                </label>
                <input
                  type="url"
                  value={postMediaUrl}
                  onChange={(e) => setPostMediaUrl(e.target.value)}
                  placeholder="Paste image link or leaves blank to use turf photo"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none"
                />
              </div>

              {/* Promotional Discount Badge Toggle */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    Add Flash Deal / Discount Badge
                  </h5>
                  <p className="text-[10px] text-slate-400">
                    Highlights your post with a colorful offer tag and a direct "Book Slot" button.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={postIsPromo}
                  onChange={(e) => setPostIsPromo(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              {postIsPromo && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Discount / Deal Tag
                  </label>
                  <input
                    type="text"
                    value={postPromoTag}
                    onChange={(e) => setPostPromoTag(e.target.value)}
                    placeholder="e.g. ⚡ 20% OFF NIGHT SLOTS"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold uppercase placeholder-slate-500 outline-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPost}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  {creatingPost ? 'Publishing...' : 'Publish Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Preview Modal */}
      {previewOpen && brandProfile && (
        <OwnerBrandProfileModal
          brandProfile={brandProfile}
          turfs={turfs}
          onClose={() => setPreviewOpen(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
};

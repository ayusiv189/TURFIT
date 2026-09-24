import React, { useState, useEffect } from 'react';
import { UserProfile, ExperienceLevel, UserRole } from '../../types';
import { checkUsernameAvailability } from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  User,
  Building2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Camera,
  Sparkles,
  Lock,
  Globe,
  Loader2,
  ShieldCheck,
  Bell,
  Shield,
} from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onSave: (updates: Partial<UserProfile>) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const AVAILABLE_SPORTS = [
  { name: 'Football', icon: '⚽' },
  { name: 'Box Cricket', icon: '🏏' },
  { name: 'Badminton', icon: '🏸' },
  { name: 'Basketball', icon: '🏀' },
  { name: 'Pickleball', icon: '🏓' },
  { name: 'Tennis', icon: '🎾' },
  { name: 'Volleyball', icon: '🏐' },
  { name: 'Table Tennis', icon: '🏓' },
  { name: 'Padel', icon: '🎾' },
  { name: 'Squash', icon: '🏸' },
];

const PRESET_PLAYER_POSITIONS = [
  'Striker / Forward',
  'Winger',
  'Attacking Midfielder',
  'Central Midfielder',
  'Defensive Midfielder',
  'Center Back',
  'Full Back',
  'Goalkeeper',
  'Top-Order Batsman',
  'Middle-Order Finisher',
  'Fast Bowler',
  'Spin Bowler',
  'All-Rounder',
  'Wicketkeeper',
  'Singles Specialist',
  'Doubles - Net Player',
  'Doubles - Smasher',
  'Point Guard',
  'Shooting Guard',
  'Center',
  'Flex / Any Position',
];

const OWNER_FACILITIES_PRESETS = [
  'FIFA Standard 50mm Turf',
  'Pro LED Floodlights',
  'Changing Rooms',
  'Showers & Lockers',
  'Free Parking',
  'Drinking Water (RO)',
  'Cafeteria / Snack Bar',
  'Air Conditioned Lounge',
  'High-Speed Wi-Fi',
  'Spectator Seating Gallery',
  'First Aid & Ice Packs',
  'Equipment Rental (Balls/Cues)',
  'Restrooms',
  'Video Recording Setup',
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSave,
  showToast,
}) => {
  const { switchRole, isOwnerRegistered, isAdmin } = useAuth();

  const isRegisteredOwner = Boolean(
    isAdmin ||
    isOwnerRegistered ||
    profile?.role === 'OWNER' ||
    profile?.isOwnerRegistered === true ||
    (profile?.businessName && profile.businessName.trim().length > 0)
  );

  const [selectedRole, setSelectedRole] = useState<UserRole>(
    profile?.role === 'OWNER' ? 'OWNER' : profile?.role === 'ADMIN' ? 'ADMIN' : 'PLAYER'
  );

  const isOwner = selectedRole === 'OWNER';

  // State
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [businessName, setBusinessName] = useState(profile?.businessName || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [usernameFeedback, setUsernameFeedback] = useState<string>('');

  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [city, setCity] = useState(profile?.city || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || '');

  // Player fields
  const [sports, setSports] = useState<string[]>(
    profile?.preferredSports && profile.preferredSports.length > 0
      ? profile.preferredSports
      : profile?.preferredSport
      ? [profile.preferredSport]
      : ['Football']
  );
  const [positions, setPositions] = useState<string[]>(
    profile?.preferredPositions && profile.preferredPositions.length > 0
      ? profile.preferredPositions
      : profile?.preferredPosition
      ? [profile.preferredPosition]
      : ['Forward']
  );
  const [customPosition, setCustomPosition] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    profile?.experienceLevel || 'INTERMEDIATE'
  );

  // Owner fields
  const [facilities, setFacilities] = useState<string[]>(
    profile?.facilities && profile.facilities.length > 0
      ? profile.facilities
      : ['FIFA Standard 50mm Turf', 'Pro LED Floodlights', 'Free Parking', 'Drinking Water (RO)']
  );
  const [customFacility, setCustomFacility] = useState('');

  // Privacy & Safety Controls
  const [profileVisibility, setProfileVisibility] = useState<'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE'>(
    profile?.profileVisibility || (profile?.isPublic === false ? 'PRIVATE' : 'PUBLIC')
  );
  const [showPhoneNumber, setShowPhoneNumber] = useState<boolean>(
    profile?.privacySettings?.showPhoneNumber ?? false
  );
  const [showEmail, setShowEmail] = useState<boolean>(
    profile?.privacySettings?.showEmail ?? false
  );
  const [showExactLocation, setShowExactLocation] = useState<boolean>(
    profile?.privacySettings?.showExactLocation ?? true
  );
  const [showMatchHistory, setShowMatchHistory] = useState<boolean>(
    profile?.privacySettings?.showMatchHistory ?? true
  );
  const [allowPlayerInvitations, setAllowPlayerInvitations] = useState<boolean>(
    profile?.privacySettings?.allowPlayerInvitations ?? true
  );
  const [allowDirectMessages, setAllowDirectMessages] = useState<'EVERYONE' | 'FOLLOWERS' | 'NOBODY' | boolean>(
    profile?.privacySettings?.allowDirectMessages ?? 'EVERYONE'
  );

  // Notification Preferences
  const [socialLikesNotif, setSocialLikesNotif] = useState<boolean>(
    profile?.notificationSettings?.socialLikes !== false
  );
  const [socialCommentsNotif, setSocialCommentsNotif] = useState<boolean>(
    profile?.notificationSettings?.socialComments !== false
  );
  const [socialFollowsNotif, setSocialFollowsNotif] = useState<boolean>(
    profile?.notificationSettings?.socialFollows !== false
  );

  const [saving, setSaving] = useState(false);

  // Sync state when profile or isOpen changes
  useEffect(() => {
    if (profile && isOpen) {
      setSelectedRole(profile.role === 'OWNER' ? 'OWNER' : profile.role === 'ADMIN' ? 'ADMIN' : 'PLAYER');
      setDisplayName(profile.displayName || '');
      setBusinessName(profile.businessName || '');
      setUsername(profile.username || '');
      setPhotoURL(profile.photoURL || '');
      setBio(profile.bio || '');
      setCity(profile.city || '');
      setPhoneNumber(profile.phoneNumber || '');
      setSports(
        profile.preferredSports && profile.preferredSports.length > 0
          ? profile.preferredSports
          : profile.preferredSport
          ? [profile.preferredSport]
          : ['Football']
      );
      setPositions(
        profile.preferredPositions && profile.preferredPositions.length > 0
          ? profile.preferredPositions
          : profile.preferredPosition
          ? [profile.preferredPosition]
          : ['Forward']
      );
      setExperienceLevel(profile.experienceLevel || 'INTERMEDIATE');
      setFacilities(
        profile.facilities && profile.facilities.length > 0
          ? profile.facilities
          : ['FIFA Standard 50mm Turf', 'Pro LED Floodlights', 'Free Parking', 'Drinking Water (RO)']
      );
      setProfileVisibility(
        profile.profileVisibility || (profile.isPublic === false ? 'PRIVATE' : 'PUBLIC')
      );
      setShowPhoneNumber(profile.privacySettings?.showPhoneNumber ?? false);
      setShowEmail(profile.privacySettings?.showEmail ?? false);
      setShowExactLocation(profile.privacySettings?.showExactLocation ?? true);
      setShowMatchHistory(profile.privacySettings?.showMatchHistory ?? true);
      setAllowPlayerInvitations(profile.privacySettings?.allowPlayerInvitations ?? true);
      setAllowDirectMessages(profile.privacySettings?.allowDirectMessages ?? 'EVERYONE');
      setSocialLikesNotif(profile.notificationSettings?.socialLikes !== false);
      setSocialCommentsNotif(profile.notificationSettings?.socialComments !== false);
      setSocialFollowsNotif(profile.notificationSettings?.socialFollows !== false);
    }
  }, [profile, isOpen]);

  // Check username uniqueness on change with debounce
  useEffect(() => {
    if (!profile) return;
    const clean = username.trim().toLowerCase().replace(/^@/, '');
    if (!clean) {
      setUsernameStatus('idle');
      setUsernameFeedback('');
      return;
    }

    if (clean === (profile.username || '').toLowerCase()) {
      setUsernameStatus('available');
      setUsernameFeedback('Current username');
      return;
    }

    if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
      setUsernameStatus('taken');
      setUsernameFeedback('Must be 3-20 characters (a-z, 0-9, and _ only)');
      return;
    }

    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      const res = await checkUsernameAvailability(clean, profile.uid);
      if (res.available) {
        setUsernameStatus('available');
        setUsernameFeedback('Available! ✓');
      } else {
        setUsernameStatus('taken');
        setUsernameFeedback(res.message || 'Already taken');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, profile?.uid, profile?.username]);

  if (!isOpen || !profile) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (usernameStatus === 'taken') {
      showToast(usernameFeedback || 'Please choose a valid and available username.', 'error');
      return;
    }

    if (sports.length === 0) {
      showToast('Please select at least one sport.', 'error');
      return;
    }

    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');

    setSaving(true);
    try {
      if (selectedRole !== profile.role && selectedRole !== 'ADMIN') {
        await switchRole(selectedRole);
      }

      const payload: Partial<UserProfile> = {
        displayName: displayName.trim() || profile.displayName,
        username: cleanUsername || undefined,
        photoURL: photoURL.trim() || undefined,
        bio: bio.trim(),
        city: city.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        role: selectedRole,
        preferredSports: sports,
        preferredSport: sports[0] || 'Football',
        isPublic: profileVisibility === 'PUBLIC',
        profileVisibility,
        privacySettings: {
          profileVisibility,
          showPhoneNumber,
          showEmail,
          showExactLocation,
          showMatchHistory,
          allowPlayerInvitations,
          allowDirectMessages,
        },
        notificationSettings: {
          socialLikes: socialLikesNotif,
          socialComments: socialCommentsNotif,
          socialFollows: socialFollowsNotif,
          matchAlerts: profile.notificationSettings?.matchAlerts !== false,
          bookingAlerts: profile.notificationSettings?.bookingAlerts !== false,
        },
      };

      if (isOwner) {
        payload.isOwnerRegistered = true;
        payload.businessName = businessName.trim() || undefined;
        payload.facilities = facilities;
      } else {
        payload.preferredPositions = positions;
        payload.preferredPosition = positions[0] || 'Flex';
        payload.experienceLevel = experienceLevel;
      }

      await onSave(payload);
      showToast('Profile updated successfully!');
      onClose();
    } catch (err: any) {
      console.error('Error saving profile:', err);
      showToast('Failed to save profile changes.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('Image size should be under 2MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPhotoURL(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              {isOwner ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Edit {isOwner ? 'Turf Owner & Venue Profile' : 'Athlete Social Profile'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Connected to TruFit UID: <span className="font-mono text-emerald-400">{profile.uid.slice(0, 8)}...</span>
              </p>
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar text-left">
          {/* Account Portal / Role Switcher Card - Only visible if user is a registered owner or admin */}
          {isRegisteredOwner && (
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Select Account Portal & Role:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRole('PLAYER')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer text-xs font-bold ${
                    selectedRole === 'PLAYER'
                      ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 shadow-md shadow-emerald-950/40'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Player Portal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('OWNER')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer text-xs font-bold ${
                    selectedRole === 'OWNER'
                      ? 'border-amber-500 bg-amber-950/40 text-amber-300 shadow-md shadow-amber-950/40'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Turf Owner Dashboard</span>
                </button>
              </div>
            </div>
          )}

          {/* Avatar & Photo Section */}
          <div className="flex items-center gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-800 border-2 border-emerald-500/40 shadow-lg flex items-center justify-center">
                {photoURL ? (
                  <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-emerald-400 uppercase">
                    {(displayName || 'U').charAt(0)}
                  </span>
                )}
              </div>
              <label
                htmlFor="profile-photo-upload"
                className="absolute -bottom-2 -right-2 bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-xl cursor-pointer shadow-md transition-all"
                title="Change Photo"
              >
                <Camera className="w-3.5 h-3.5" />
                <input
                  id="profile-photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                {isOwner ? 'Venue Logo / Owner Photo' : 'Profile Photo'}
              </label>
              <input
                type="url"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="Or paste image URL (https://...)"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-500">
                Click camera button to upload from device or paste an image link.
              </p>
            </div>
          </div>

          {/* Names and Unique Handle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Display Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your full name"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {isOwner && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Business / Venue Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Apex Sports Arena"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            <div className={isOwner ? 'sm:col-span-2' : ''}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Unique Username <span className="text-rose-400">*</span>
                </label>
                {usernameStatus === 'checking' && (
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                    Checking...
                  </span>
                )}
                {usernameStatus === 'available' && (
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {usernameFeedback}
                  </span>
                )}
                {usernameStatus === 'taken' && (
                  <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {usernameFeedback}
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold text-sm">@</span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="alex_striker"
                  maxLength={20}
                  className={`w-full bg-slate-950 border rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-mono text-white focus:outline-none ${
                    usernameStatus === 'taken'
                      ? 'border-rose-500/80 focus:border-rose-500'
                      : usernameStatus === 'available'
                      ? 'border-emerald-500/80 focus:border-emerald-500'
                      : 'border-slate-700 focus:border-emerald-500'
                  }`}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Your unique handle across TruFit (3-20 chars, lowercase letters, numbers, underscores).
              </p>
            </div>
          </div>

          {/* Location & Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                City / Location
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Mumbai, Bangalore, Pune..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Bio / Description */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {isOwner ? 'Venue & Business Description' : 'Athlete Bio & Playstyle'}
              </label>
              <span className="text-[11px] text-slate-500">{bio.length}/300</span>
            </div>
            <textarea
              rows={3}
              maxLength={300}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={
                isOwner
                  ? "Describe your sports facility, playing surface quality, parking convenience, and tournament hosting capacity..."
                  : "Tell other players and turf hosts about yourself (e.g., 'Attacking midfielder who loves 5v5 weekend turf matches and evening box cricket leagues')..."
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Sports Selection (for both Player and Owner) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isOwner ? 'Sports Hosted at Venue' : 'Sports You Play'}</span>
              </label>
              <span className="text-[11px] font-bold text-emerald-400">{sports.length} Selected</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SPORTS.map((s) => {
                const isSelected = sports.includes(s.name);
                return (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        if (sports.length > 1) {
                          setSports(sports.filter((sp) => sp !== s.name));
                        } else {
                          showToast('Select at least one sport', 'error');
                        }
                      } else {
                        setSports([...sports, s.name]);
                      }
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600/90 text-white border-emerald-500 shadow-md shadow-emerald-950/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span>{s.icon}</span>
                    <span>{s.name}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 ml-0.5 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Player-Only Fields: Positions & Skill Level */}
          {!isOwner && (
            <>
              {/* Skill Tier */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Skill Level / Experience Tier
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PRO'] as ExperienceLevel[]).map((level) => {
                    const isSelected = experienceLevel === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setExperienceLevel(level)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-950/40'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Playing Positions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Playing Positions & Roles
                  </label>
                  <span className="text-[11px] text-slate-400">{positions.length} Selected</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_PLAYER_POSITIONS.map((pos) => {
                    const isSelected = positions.includes(pos);
                    return (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setPositions(positions.filter((p) => p !== pos));
                          } else {
                            setPositions([...positions, pos]);
                          }
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {pos}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Position Input */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={customPosition}
                    onChange={(e) => setCustomPosition(e.target.value)}
                    placeholder="Add custom position (e.g., Deep-Lying Playmaker)..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (customPosition.trim() && !positions.includes(customPosition.trim())) {
                          setPositions([...positions, customPosition.trim()]);
                          setCustomPosition('');
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customPosition.trim() && !positions.includes(customPosition.trim())) {
                        setPositions([...positions, customPosition.trim()]);
                        setCustomPosition('');
                      }
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Owner-Only Fields: Facilities */}
          {isOwner && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Venue Facilities & Amenities
                </label>
                <span className="text-[11px] text-emerald-400 font-bold">{facilities.length} Selected</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {OWNER_FACILITIES_PRESETS.map((f) => {
                  const isSelected = facilities.includes(f);
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setFacilities(facilities.filter((item) => item !== f));
                        } else {
                          setFacilities([...facilities, f]);
                        }
                      }}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {f}
                    </button>
                  );
                })}
              </div>

              {/* Custom Facility input */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={customFacility}
                  onChange={(e) => setCustomFacility(e.target.value)}
                  placeholder="Add custom amenity (e.g., Ice Bath, GoPro Replay)..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (customFacility.trim() && !facilities.includes(customFacility.trim())) {
                        setFacilities([...facilities, customFacility.trim()]);
                        setCustomFacility('');
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customFacility.trim() && !facilities.includes(customFacility.trim())) {
                      setFacilities([...facilities, customFacility.trim()]);
                      setCustomFacility('');
                    }
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer"
                >
                  + Add
                </button>
              </div>
            </div>
          )}

          {/* Privacy & Safety Controls Section */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-4 text-left">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Profile Privacy & Safety Controls
              </h4>
            </div>

            {/* Profile Visibility Mode */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Profile Visibility
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'PUBLIC', label: 'Public', desc: 'Visible to everyone' },
                  { id: 'FOLLOWERS_ONLY', label: 'Followers Only', desc: 'Followers can view' },
                  { id: 'PRIVATE', label: 'Private', desc: 'Hidden from discovery' },
                ].map((item) => {
                  const isSelected = profileVisibility === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setProfileVisibility(item.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 shadow-md shadow-emerald-950/30'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className="text-[10px] text-slate-500">{item.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Granular Visibility Toggles */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Granular Information & Interaction Visibility
              </span>

              <div className="space-y-2.5 text-xs">
                {[
                  {
                    label: 'Show Phone Number on Profile',
                    val: showPhoneNumber,
                    set: setShowPhoneNumber,
                  },
                  {
                    label: 'Show Email Address',
                    val: showEmail,
                    set: setShowEmail,
                  },
                  {
                    label: 'Show Exact City & Location',
                    val: showExactLocation,
                    set: setShowExactLocation,
                  },
                  {
                    label: 'Show Match History & Stats',
                    val: showMatchHistory,
                    set: setShowMatchHistory,
                  },
                  {
                    label: 'Allow Player Invitations / Squad Invites',
                    val: allowPlayerInvitations,
                    set: setAllowPlayerInvitations,
                  },
                ].map((toggle, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-300 font-medium">{toggle.label}</span>
                    <button
                      type="button"
                      onClick={() => toggle.set(!toggle.val)}
                      className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                        toggle.val ? 'bg-emerald-600 justify-end' : 'bg-slate-800 justify-start'
                      }`}
                    >
                      <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
                    </button>
                  </div>
                ))}

                {/* Messaging Privacy Selection Dropdown */}
                <div className="flex flex-col gap-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-200 font-semibold text-xs">Who can Direct Message you</span>
                    <select
                      value={allowDirectMessages === true ? 'EVERYONE' : allowDirectMessages === false ? 'NOBODY' : allowDirectMessages}
                      onChange={(e) => setAllowDirectMessages(e.target.value as any)}
                      className="bg-slate-950 text-slate-200 border border-slate-800 focus:border-emerald-500 rounded-lg px-2.5 py-1 text-xs font-semibold outline-none transition-colors"
                    >
                      <option value="EVERYONE">Everyone</option>
                      <option value="FOLLOWERS">Followers Only</option>
                      <option value="NOBODY">Nobody</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Choose who can start direct message conversations with you. Setting your profile visibility to Private will also restrict messaging to followers only.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Social Notification Preferences Section */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Interaction Notifications
              </h4>
            </div>

            <div className="space-y-2.5 pt-1">
              {/* Social Likes */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Post Likes</div>
                  <div className="text-[10px] text-slate-400">Get notified when athletes like your plays & photos</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSocialLikesNotif(!socialLikesNotif)}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    socialLikesNotif ? 'bg-emerald-600 justify-end' : 'bg-slate-800 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                </button>
              </div>

              {/* Social Comments */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Post Comments</div>
                  <div className="text-[10px] text-slate-400">Get notified when someone comments on your posts</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSocialCommentsNotif(!socialCommentsNotif)}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    socialCommentsNotif ? 'bg-emerald-600 justify-end' : 'bg-slate-800 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                </button>
              </div>

              {/* Social Follows */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">New Followers</div>
                  <div className="text-[10px] text-slate-400">Get notified when players or owners follow your profile</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSocialFollowsNotif(!socialFollowsNotif)}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    socialFollowsNotif ? 'bg-emerald-600 justify-end' : 'bg-slate-800 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || usernameStatus === 'checking' || usernameStatus === 'taken'}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

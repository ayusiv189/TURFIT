import React, { useState } from 'react';
import { OwnerEcosystemSummary } from '../../lib/profileEcosystem';
import { UserProfile } from '../../types';
import { DirectMessageModal } from '../messaging/DirectMessageModal';
import {
  Building2,
  Trophy,
  Tag,
  MapPin,
  Sparkles,
  Award,
  CheckCircle2,
  Calendar,
  Clock,
  ExternalLink,
  ShieldCheck,
  Flame,
  Check,
  MessageSquare,
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface OwnerEcosystemSectionsProps {
  data: OwnerEcosystemSummary;
  profile: UserProfile;
  isLoading: boolean;
  activeSubSection: 'arenas' | 'tournaments' | 'offers' | 'info';
  onBookTurf?: (turfId: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}

export const OwnerEcosystemSections: React.FC<OwnerEcosystemSectionsProps> = ({
  data,
  profile,
  isLoading,
  activeSubSection,
  onBookTurf,
  showToast,
}) => {
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="py-12 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-medium">Loading venue sports ecosystem...</p>
      </div>
    );
  }

  const { turfs, arenas, tournaments, offers } = data;

  if (activeSubSection === 'arenas') {
    if (turfs.length === 0) {
      return (
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white">No Arenas Listed</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            This turf owner has not listed active grounds yet.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Managed Venues ({turfs.length}) & Arenas ({arenas.length})</span>
          </span>
        </div>

        <div className="space-y-3">
          {turfs.map((t) => {
            const turfArenas = arenas.filter((a) => a.turfId === t.id);
            return (
              <div
                key={t.id}
                className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 transition-all duration-200 shadow-md space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{t.name}</span>
                      <span className="bg-emerald-500/15 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                        Verified Venue
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span>{t.address || t.city}</span>
                    </p>
                  </div>

                  {onBookTurf && (
                    <button
                      type="button"
                      onClick={() => onBookTurf(t.id)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer flex-shrink-0 shadow-md"
                    >
                      Book Slot
                    </button>
                  )}
                </div>

                {/* Sports and Amenities */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {t.sports?.map((s) => (
                    <span
                      key={s}
                      className="bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-medium px-2 py-0.5 rounded-lg"
                    >
                      {s}
                    </span>
                  ))}
                  {t.amenities?.slice(0, 4).map((a) => (
                    <span
                      key={a}
                      className="bg-emerald-950/40 text-emerald-300 text-[10px] font-medium px-2 py-0.5 rounded-lg flex items-center gap-1 border border-emerald-500/20"
                    >
                      <Check className="w-2.5 h-2.5" />
                      {a}
                    </span>
                  ))}
                </div>

                {/* Arenas Sub-List */}
                {turfArenas.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] font-bold text-slate-400 block mb-2 uppercase tracking-wider">
                      Grounds & Pitches
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {turfArenas.map((ar) => (
                        <div
                          key={ar.id}
                          className="bg-slate-900/60 border border-slate-800/60 p-2.5 rounded-xl flex items-center justify-between"
                        >
                          <div>
                            <span className="text-xs font-bold text-white block">{ar.name}</span>
                            <span className="text-[10px] text-slate-400">
                              {ar.sport} • {ar.surfaceType || 'Turf Pitch'}
                            </span>
                          </div>
                          <span className="text-xs font-black text-emerald-400">
                            {formatCurrency(ar.pricePerSlot || 800)}/hr
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (activeSubSection === 'tournaments') {
    if (tournaments.length === 0) {
      return (
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Trophy className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white">No Tournaments Scheduled</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            This venue does not have upcoming championship tournaments at this time.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3 animate-fade-in">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Hosted Tournaments ({tournaments.length})</span>
          </span>
        </div>

        <div className="space-y-3">
          {tournaments.map((t) => (
            <div
              key={t.id}
              className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 shadow-md space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-bold text-white">{t.title}</span>
                    <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {t.category}
                    </span>
                    <span className="bg-slate-800 text-slate-300 text-[10px] font-medium px-2 py-0.5 rounded-md">
                      {t.sport}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    <span>{t.turfName}</span>
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md block">
                    {t.status}
                  </span>
                  <span className="text-xs font-black text-amber-400 mt-1 block">
                    {formatCurrency(t.prizePool?.firstPrize || 0)} Prize
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <span>{t.startDate} - {t.endDate}</span>
                </span>
                <span>•</span>
                <span>{t.registeredTeamsCount || 0}/{t.maxTeams} Teams Registered</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeSubSection === 'offers') {
    if (offers.length === 0) {
      return (
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <Tag className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white">No Active Promos</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Check back soon for seasonal discounts and membership promo codes.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3 animate-fade-in">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-emerald-400" />
            <span>Active Turf Offers & Promo Codes ({offers.length})</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {offers.map((off) => (
            <div
              key={off.id}
              className="bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-3.5 shadow-md space-y-2 relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-black text-white">{off.title}</span>
                <span className="font-mono text-xs font-black text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-lg">
                  {off.code}
                </span>
              </div>

              {off.description && (
                <p className="text-[11px] text-slate-400 line-clamp-2">{off.description}</p>
              )}

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-emerald-400 font-bold">
                  {off.discountType === 'PERCENTAGE'
                    ? `${off.discountValue}% OFF`
                    : `₹${off.discountValue} OFF`}
                </span>
                <span className="text-[10px] text-slate-500">
                  Valid until {off.endDate}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Info Section
  return (
    <>
      <div className="space-y-4 animate-fade-in">
        {/* Operating Hours & Facilities */}
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Venue Operating Hours & Information</span>
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
            <div>
              <span className="text-slate-500 block text-[10px] font-bold uppercase">Opening Hours</span>
              <span className="font-semibold">06:00 AM - 12:00 AM (Daily)</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-bold uppercase">Booking Mode</span>
              <span className="font-semibold text-emerald-400">Instant UPI & Advance</span>
            </div>
          </div>
        </div>

        {/* Facilities */}
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 space-y-2.5">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Amenities & Facilities</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {(profile.facilities || ['Floodlights', 'Changing Rooms', 'Drinking Water', 'Parking', 'Seating Dugouts']).map(
              (fac) => (
                <span
                  key={fac}
                  className="bg-slate-900 border border-slate-800 text-slate-200 text-xs px-2.5 py-1 rounded-xl flex items-center gap-1.5"
                >
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>{fac}</span>
                </span>
              )
            )}
          </div>
        </div>

        {/* Contact Owner */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 text-center space-y-4">
          <h4 className="text-sm font-bold text-white">Contact Venue Owner</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Have questions about bookings, pricing, or arena details? Message the owner directly.
          </p>
          <button
            type="button"
            onClick={() => setIsMessageModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 mx-auto"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Message Owner</span>
          </button>
        </div>
      </div>

      <DirectMessageModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        targetPlayer={{
          uid: profile.uid,
          displayName: profile.displayName,
          photoURL: profile.photoURL,
        }}
        showToast={showToast}
      />
    </>
  );
};

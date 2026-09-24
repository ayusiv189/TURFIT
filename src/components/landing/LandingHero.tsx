import React, { useState } from 'react';
import {
  Calendar,
  Users,
  Trophy,
  Building2,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  MapPin,
  Star,
  QrCode,
  DollarSign,
  ChevronRight,
} from 'lucide-react';

interface LandingHeroProps {
  onExploreFeatures?: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onExploreFeatures,
}) => {
  const [activePreviewTab, setActivePreviewTab] = useState<'booking' | 'lobby' | 'owner'>('booking');

  return (
    <section id="hero" className="relative pt-28 pb-16 sm:pt-36 sm:pb-24 overflow-hidden">
      {/* Background Ambience Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Headline, Value Proposition, Action CTAs */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Pill Announcement */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] font-bold text-emerald-400 tracking-wide uppercase">
                TruFit Sports & Turf Ecosystem
              </span>
              <span className="text-[10px] text-slate-400 border-l border-slate-800 pl-2">
                Version 3.0 Live
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
              Book Turfs in Seconds. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400">
                Play Matches. Fill Arenas.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              TruFit is the all-in-one sports pitch network. Athletes discover verified turf venues, 
              match in live player lobbies, form squad rosters, and battle in tournaments. 
              Turf owners get a powerful SaaS to manage slot schedules, QR check-ins, payments, and credit dues with zero double-bookings.
            </p>

            {/* Key Trust Signals */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-1 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero Double Bookings</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl">
                <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Verified Turfs & Badges</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Instant UPI & QR Passes</span>
              </div>
            </div>

            {/* Dual Action CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-3">
              <a
                href="#players"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider transition-all shadow-xl shadow-emerald-500/25 cursor-pointer transform hover:-translate-y-0.5"
              >
                <span>Explore Player Network</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <a
                href="#owners"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-indigo-500/40 text-indigo-300 hover:text-white font-bold text-sm transition-all cursor-pointer transform hover:-translate-y-0.5"
              >
                <Building2 className="w-4 h-4 text-indigo-400" />
                <span>Arena SaaS Architecture</span>
              </a>
            </div>

            {/* Live Metrics Row */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-800/80 max-w-lg mx-auto lg:mx-0">
              <div>
                <p className="text-xl sm:text-2xl font-black text-white">500+</p>
                <p className="text-[11px] font-semibold text-slate-400">Verified Arenas</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-emerald-400">45,000+</p>
                <p className="text-[11px] font-semibold text-slate-400">Matches Scheduled</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-indigo-400">99.8%</p>
                <p className="text-[11px] font-semibold text-slate-400">Booking Accuracy</p>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Live Platform Showcase */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl p-4 sm:p-5 backdrop-blur-xl">
              {/* Top Showcase Tabs */}
              <div className="flex rounded-2xl bg-slate-950/80 p-1 border border-slate-800/80 mb-4">
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('booking')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
                    activePreviewTab === 'booking'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Slot Booking
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('lobby')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
                    activePreviewTab === 'lobby'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pick-up Lobby
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('owner')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
                    activePreviewTab === 'owner'
                      ? 'bg-indigo-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Owner SaaS
                </button>
              </div>

              {/* Dynamic Interactive Card Views */}
              {activePreviewTab === 'booking' && (
                <div className="space-y-3 animate-in fade-in-50 duration-200">
                  {/* Turf Venue Card */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-white">Apex International Turf</span>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                            FIFA 2-Star
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-emerald-400" />
                          Bandra Sports Complex, Mumbai • 5v5 & 7v7
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>4.9</span>
                      </div>
                    </div>

                    {/* Live Slot Selection Grid */}
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Today's Available Pitch Slots:
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center opacity-50">
                        <p className="text-[11px] font-bold text-slate-400 line-through">06:00 PM</p>
                        <p className="text-[9px] text-rose-400">Booked</p>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-500/15 border-2 border-emerald-500 text-center shadow-md">
                        <p className="text-[11px] font-bold text-emerald-300">07:00 PM</p>
                        <p className="text-[9px] font-semibold text-emerald-400">₹1,200/hr</p>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center hover:border-slate-700 cursor-pointer">
                        <p className="text-[11px] font-bold text-slate-200">08:00 PM</p>
                        <p className="text-[9px] text-slate-400">₹1,400/hr</p>
                      </div>
                    </div>

                    {/* Booking summary bar */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total for 1 Hour</span>
                        <span className="text-sm font-black text-white">₹1,200</span>
                      </div>
                      <a
                        href="#players"
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-sm hover:bg-emerald-400 cursor-pointer block text-center"
                      >
                        Explore Slots
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {activePreviewTab === 'lobby' && (
                <div className="space-y-3 animate-in fade-in-50 duration-200">
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-bold text-white">Friday Night Football Pick-up</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                        Need 2 Players
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Venue</p>
                        <p className="font-semibold text-slate-200">Turf Park Arena</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Split Share</p>
                        <p className="font-bold text-emerald-400">₹150 / Player</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Squad Status</p>
                        <p className="font-bold text-amber-400">8 / 10 Joined</p>
                      </div>
                    </div>

                    {/* Player avatars */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex -space-x-2">
                        {['⚽', '🏃', '🥅', '👟', '🎯'].map((emoji, i) => (
                          <div
                            key={i}
                            className="w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-950 flex items-center justify-center text-xs"
                          >
                            {emoji}
                          </div>
                        ))}
                        <div className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 font-bold border-2 border-slate-950 flex items-center justify-center text-[10px]">
                          +3
                        </div>
                      </div>
                      <a
                        href="#community"
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-md block text-center"
                      >
                        Explore Lobbies
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {activePreviewTab === 'owner' && (
                <div className="space-y-3 animate-in fade-in-50 duration-200">
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-indigo-400" />
                        Today's Arena Operations
                      </span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        100% Slot Utilization
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Gross Revenue</p>
                        <p className="text-base font-black text-white mt-0.5">₹14,400</p>
                        <p className="text-[9px] text-emerald-400">12 slots fulfilled today</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Player Dues Ledger</p>
                        <p className="text-base font-black text-amber-400 mt-0.5">₹1,800</p>
                        <p className="text-[9px] text-slate-400">2 pending team balances</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                      <span className="text-[11px] text-slate-400">Digital Gate Pass QR Active</span>
                      <a
                        href="#owners"
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-md block text-center"
                      >
                        Owner Capabilities
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom live indicator */}
              <div className="mt-3.5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Live Sync Across Web & Mobile PWA
                </span>
                <span className="text-emerald-400 font-medium">98ms Latency</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

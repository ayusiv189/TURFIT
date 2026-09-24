import React from 'react';
import {
  Compass,
  CheckCircle2,
  XCircle,
  Zap,
  Shield,
  Users,
  Building2,
  Trophy,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const LandingAbout: React.FC = () => {
  return (
    <section id="about" className="py-20 bg-slate-950 border-t border-slate-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5" />
            <span>About TruFit</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Bridging Grassroots Athletes & Professional Arenas
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Recreational sports are thriving, but coordinating games, filling empty spots, 
            and managing arena bookings has been trapped in a mess of phone calls, cash tracking, 
            and chaotic WhatsApp groups. TruFit modernizes the entire sporting journey.
          </p>
        </div>

        {/* The Old Way vs The TruFit Way Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* The Old Way */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/40 border border-rose-500/20 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">The Old Broken Process</h3>
                <p className="text-xs text-slate-400">Frustrating, unreliable, manual chaos</p>
              </div>
            </div>

            <ul className="space-y-3.5 text-xs sm:text-sm text-slate-400">
              <li className="flex items-start gap-2.5">
                <span className="text-rose-400 font-bold">✕</span>
                <span>Calling 5 different venues trying to find who has a slot open this Friday night.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-400 font-bold">✕</span>
                <span>Matches cancelled at the last minute because 2 players bailed from the group chat.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-400 font-bold">✕</span>
                <span>Turf venue owners dealing with double bookings, no-shows, and lost revenue.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-400 font-bold">✕</span>
                <span>Unrecorded cash credit dues scribbled in paper notebooks that never get collected.</span>
              </li>
            </ul>
          </div>

          {/* The TruFit Way */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-emerald-500/30 space-y-5 relative overflow-hidden shadow-xl shadow-emerald-500/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">The TruFit Standard</h3>
                <p className="text-xs text-emerald-400 font-medium">Fast, verified, real-time, seamless</p>
              </div>
            </div>

            <ul className="space-y-3.5 text-xs sm:text-sm text-slate-300">
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Instant live slot booking with dynamic pricing and zero double-booking locks.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Match Lobbies that match players by skill and automatically split pitch fees per person.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Digital QR check-in passes confirming athlete entry in real time at the turf gate.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Integrated dues tracking & WhatsApp payment reminders that collect venue receivables.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 4 Core Pillars of TruFit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Live Slot Booking</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Explore 500+ verified arenas across football, box cricket, badminton, and pickleball with upfront slot availability.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Lobbies & Pick-up</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Never miss a game. Open public lobbies, find teammates, and split fees automatically without cash awkwardness.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Tournaments & Squads</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Register squad rosters, compete in official knockout brackets, and earn verified TruFit champion accolades.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Venue SaaS Cloud</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Complete arena management with recurring academy blocks, staff access, player ledger, and instant online payouts.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

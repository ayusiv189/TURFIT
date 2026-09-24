import React from 'react';
import {
  Trophy,
  Users,
  MessageSquare,
  Clock,
  ShieldCheck,
  Medal,
  Award,
  Sparkles,
  Flame,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

interface LandingCommunityTournamentsProps {}

export const LandingCommunityTournaments: React.FC<LandingCommunityTournamentsProps> = () => {
  return (
    <section id="tournaments" className="py-20 bg-slate-900/60 border-t border-slate-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        {/* Sub-Section 1: Tournaments & Competitive Leagues */}
        <div>
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Trophy className="w-3.5 h-3.5" />
              <span>Tournaments & Competitions</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Digitally Managed Tournaments with Live Brackets
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Ditch messy spreadsheets and whiteboard brackets. TruFit automates open cups, 
              corporate tournaments, and competitive city leagues from team registration to the final trophy celebration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Medal className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Knockout & Round-Robin Tables</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Automated group stages, goal difference tiebreakers, and single or double-elimination knockout brackets update immediately as scores are submitted.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Verified Squad Rosters</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Captains register their official starting lineup and substitutes. TruFit verifies player credentials to prevent unregistered ringers or smurf accounts.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Prize Pools & Digital Trophies</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Winners earn official TruFit Champion credentials, Golden Boot awards, and digital tournament trophy badges immortalized on their athlete profiles.
              </p>
            </div>
          </div>
        </div>

        {/* Sub-Section 2: Lobbies, Community & Ephemeral Messaging */}
        <div id="lobbies" className="pt-8 border-t border-slate-800/80">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Explaining Lobbies & 24h Chat */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                <Users className="w-3.5 h-3.5" />
                <span>Lobbies & Community</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                No Squad? No Problem. Jump into Live Match Lobbies.
              </h2>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                TruFit match lobbies turn solo athletes into complete teams. 
                Host a game, set the turf location and time, and open slots to the community. 
                Every player who joins automatically contributes their share of the turf booking fee.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Fair Automatic Fee Splitting</h4>
                    <p className="text-xs text-slate-400">
                      Total court rent is split evenly among joined players. Organizers never get stuck footing the bill for dropouts.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Privacy-First 24-Hour Ephemeral Direct Chat</h4>
                    <p className="text-xs text-slate-400">
                      Coordinate gear, pitch arrival, and team colors safely. To protect athlete privacy and prevent unsolicited spam, all direct chat conversations and messages automatically purge from the database after 24 hours.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Vibrant Community Athletic Feed</h4>
                    <p className="text-xs text-slate-400">
                      Share top-corner screamers, match photos, post-game banter, vote in polls, and discover upcoming local rivalries.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Visual Lobby Card Showcase */}
            <div className="lg:col-span-5">
              <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-white">Match Lobby #TRU-4912</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    Auto-Purges in 24h
                  </span>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-white">Sunday Evening 7v7 Box Cricket</h4>
                  <p className="text-xs text-slate-400">Champions Turf, Andheri West • 7:00 PM</p>
                </div>

                {/* Split calculation box */}
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Total Pitch Cost</p>
                    <p className="text-sm font-black text-white">₹1,800</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Split per Athlete</p>
                    <p className="text-sm font-black text-emerald-400">₹150 (12/14 Players)</p>
                  </div>
                </div>

                {/* Ephemeral chat note */}
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-[11px] text-amber-300">
                  <Clock className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Direct athlete communications disappear after 24 hours.</span>
                </div>

                <a
                  href="#contact"
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer text-center block"
                >
                  Inquire on Lobby Matchmaking
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

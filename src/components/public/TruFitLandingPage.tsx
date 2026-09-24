import React, { useState } from 'react';
import {
  Trophy,
  ShieldCheck,
  Award,
  Users,
  Building2,
  Calendar,
  Sparkles,
  Zap,
  ArrowRight,
  CheckCircle2,
  Star,
  MapPin,
  Clock,
  CreditCard,
  Crown,
  ChevronRight,
  Check,
  HelpCircle,
  Lock,
  Search,
  Share2,
  Smartphone,
  Flame,
  Activity,
  Layers,
} from 'lucide-react';
import { DEFAULT_OWNER_PLANS, DEFAULT_PLAYER_SUBSCRIPTION_PLANS, DEFAULT_COACH_SUBSCRIPTION_PLANS } from '../../types';

interface TruFitLandingPageProps {
  onOpenAuthModal?: () => void;
  onNavigateToAdmin?: () => void;
  onNavigateToOwnerSaaS?: () => void;
  onNavigateToPlayerSaaS?: () => void;
  onNavigateToVerification?: () => void;
}

export const TruFitLandingPage: React.FC<TruFitLandingPageProps> = ({
  onOpenAuthModal,
  onNavigateToAdmin,
  onNavigateToOwnerSaaS,
  onNavigateToPlayerSaaS,
  onNavigateToVerification,
}) => {
  const [activePlanTab, setActivePlanTab] = useState<'OWNER' | 'COACH' | 'PLAYER'>('OWNER');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: 'What is TruFit?',
      a: 'TruFit is India’s comprehensive sports infrastructure ecosystem connecting athletes, turf owners, coaches, and sports communities. We unify real-time turf slot booking, open squads/lobbies, verified tournament cups, and intelligent venue management SaaS in a single unified platform.',
    },
    {
      q: 'How does the 30-Day Free Owner Trial work?',
      a: 'Every new turf venue operator receives an immediate 30-day free trial of TruFit Owner SaaS with full access to court creation, bulk slot pricing, WhatsApp QR pass generation, and direct player bookings. After 30 days, data remains completely safe in read-only mode until a SaaS plan is activated.',
    },
    {
      q: 'What are TruFit Verified Badges?',
      a: 'TruFit Verification Badges provide authentic digital proof of athletic reputation (for players) and physical venue quality (for turf owners). Verified profiles enjoy priority matchmaking, gold profile ticks, and tournament exemptions.',
    },
    {
      q: 'How do Squad Lobbies and Matchmaking work?',
      a: 'Players can create or join open lobbies for Football, Cricket, Badminton, Pickleball, and more. Set match time, required skill level, split payments evenly via UPI, and receive automated squad notifications with disappearing match chats.',
    },
    {
      q: 'Can Turf Owners host corporate tournaments on TruFit?',
      a: 'Yes! TruFit includes a complete tournament engine supporting knockout brackets, round-robin fixtures, live match scoring, player rating leaderboards, and automated prize pool distribution.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Trophy className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <span className="text-xl font-black text-white tracking-tight">TRUFIT</span>
              <span className="text-[10px] font-bold text-amber-400 tracking-widest block -mt-1 uppercase">Sports OS</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-300">
            <a href="#features" className="hover:text-amber-400 transition-colors">Features</a>
            <a href="#players" className="hover:text-amber-400 transition-colors">For Players</a>
            <a href="#owners" className="hover:text-amber-400 transition-colors">For Turf Owners</a>
            <a href="#tournaments" className="hover:text-amber-400 transition-colors">Tournaments</a>
            <a href="#pricing" className="hover:text-amber-400 transition-colors">Pricing & Plans</a>
            <a href="#badges" className="hover:text-amber-400 transition-colors">Verified Badges</a>
            <a href="#faq" className="hover:text-amber-400 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-amber-950/40 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 overflow-hidden border-b border-slate-800/80">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-slate-950 to-slate-950 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 shadow-xl">
              <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider">India's Leading Sports & Turf Network</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1]">
              The Ultimate Operating System for <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">Turfs & Athletes</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Book real-time turf slots, assemble squad lobbies, compete in verified tournament cups, and scale arena operations with automated booking passes.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-sm font-black rounded-2xl shadow-xl shadow-amber-950/40 flex items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>Launch TruFit Mobile App</span>
              </button>

              <a
                href="#pricing"
                className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-2xl border border-slate-800 flex items-center justify-center gap-2 transition-colors"
              >
                <span>Explore SaaS Plans</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </a>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-12 text-left">
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800">
                <div className="text-2xl font-black text-amber-400">500+</div>
                <div className="text-xs text-slate-400">Verified Turfs</div>
              </div>
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800">
                <div className="text-2xl font-black text-emerald-400">50,000+</div>
                <div className="text-xs text-slate-400">Match Bookings</div>
              </div>
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800">
                <div className="text-2xl font-black text-indigo-400">1,200+</div>
                <div className="text-xs text-slate-400">Squad Lobbies</div>
              </div>
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800">
                <div className="text-2xl font-black text-yellow-400">₹0 Fee</div>
                <div className="text-xs text-slate-400">30-Day Free Trial</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillar 1: PLAYER FEATURES */}
      <section id="players" className="py-20 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              For Athletes & Players
            </span>
            <h2 className="text-3xl font-black text-white">Play Anytime, Anywhere With Your Squad</h2>
            <p className="text-xs sm:text-sm text-slate-400">
              From instant slot discovery to seamless UPI split payments and post-match sportsmanship ratings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-amber-500/40 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">Live Turf Slot Booking</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Check real-time court availability, surface types (FIFA-grade turf, wooden badminton, clay courts), night floodlights, and pricing.
              </p>
              <ul className="text-xs text-slate-400 space-y-2 pt-2">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Instant slot confirmation</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp digital pass with QR</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Flexible cancellations & refunds</li>
              </ul>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-amber-500/40 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">Squad Lobbies & Matchmaking</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Short on players? Create a public squad lobby or join local open matches filtered by skill rating and proximity.
              </p>
              <ul className="text-xs text-slate-400 space-y-2 pt-2">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Equal slot split-payment links</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Disappearing 24h match group chat</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Automatic squad team invitations</li>
              </ul>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-amber-500/40 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">Radar Performance Stats</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Track goals, stamina, sportsmanship badges, MVP awards, and head-to-head match histories on your public social profile.
              </p>
              <ul className="text-xs text-slate-400 space-y-2 pt-2">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Multi-sport skill ratings</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Verified Gold athlete identity</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Post-match peer evaluations</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillar 2: OWNER SAAS PLATFORM */}
      <section id="owners" className="py-20 border-b border-slate-800/80 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              For Turf & Arena Operators
            </span>
            <h2 className="text-3xl font-black text-white">Full-Stack SaaS Platform to Automate Your Venue</h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Everything you need to eliminate double bookings, automate slot pricing, collect payments, and drive 100% capacity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
              <Clock className="w-8 h-8 text-amber-400" />
              <h3 className="text-base font-black text-white">30-Day Free Trial</h3>
              <p className="text-xs text-slate-400">
                Test drive all features with zero risk. Create courts, generate slots, and accept bookings immediately without a credit card.
              </p>
            </div>

            <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
              <Layers className="w-8 h-8 text-indigo-400" />
              <h3 className="text-base font-black text-white">Slot Generator</h3>
              <p className="text-xs text-slate-400">
                Bulk create 30-minute or 60-minute time slots with dynamic weekend surge pricing and automated lighting surcharges.
              </p>
            </div>

            <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
              <Smartphone className="w-8 h-8 text-emerald-400" />
              <h3 className="text-base font-black text-white">WhatsApp Passes</h3>
              <p className="text-xs text-slate-400">
                Delight players with branded WhatsApp confirmation passes containing QR codes for instant court gate check-in.
              </p>
            </div>

            <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
              <CreditCard className="w-8 h-8 text-yellow-400" />
              <h3 className="text-base font-black text-white">Direct Payouts</h3>
              <p className="text-xs text-slate-400">
                Daily or weekly automated settlement ledger directly into your verified bank account with zero hidden transaction costs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillar 3: TOURNAMENTS */}
      <section id="tournaments" className="py-20 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 rounded-3xl border border-amber-500/30 p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-xl">
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-amber-500 text-slate-950">
                Official TruFit Cups
              </span>
              <h2 className="text-3xl font-black text-white">Host & Join Premier Sports Tournaments</h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Automated knockout trees, round-robin fixtures, live goal updates, corporate brackets, and cash prize distribution.
              </p>
              <div className="flex flex-wrap gap-4 pt-2 text-xs font-bold text-slate-200">
                <span className="flex items-center gap-1.5"><Trophy className="w-4 h-4 text-amber-400" /> Verified Trophies</span>
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Official Referees</span>
                <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-yellow-400" /> MVP Leaderboards</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenAuthModal}
              className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-2xl shadow-xl shadow-amber-950/50 shrink-0 cursor-pointer"
            >
              Browse Open Tournaments
            </button>
          </div>
        </div>
      </section>

      {/* Verified Badges Section */}
      <section id="badges" className="py-20 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              Verified Authenticity
            </span>
            <h2 className="text-3xl font-black text-white">Stand Out With TruFit Official Badges</h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Verified Gold badges build trust across players and turf venues.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 space-y-4 relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Award className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Player Verified Gold Badge</h3>
                  <div className="text-xs text-amber-400 font-bold">₹499 / Year</div>
                </div>
              </div>

              <p className="text-xs text-slate-300">
                Stand out with an exclusive gold tick beside your name on lobbies, leaderboard rankings, and post-match MVP votes.
              </p>

              <ul className="text-xs text-slate-400 space-y-2 pt-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Gold tick on profile and match rosters</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Priority squad matchmaking queue</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Direct invite access to corporate cups</li>
              </ul>
            </div>

            <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 space-y-4 relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Turf Venue Verified Seal</h3>
                  <div className="text-xs text-indigo-400 font-bold">Included Free in Owner SaaS Pro</div>
                </div>
              </div>

              <p className="text-xs text-slate-300">
                Guarantees verified FIFA-standard turf, safe amenities, verified geo-coordinates, and authentic photographs.
              </p>

              <ul className="text-xs text-slate-400 space-y-2 pt-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> High-trust verified badge on venue cards</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 3x higher booking click-through rate</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Featured placement on city search explore</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 border-b border-slate-800/80 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              Transparent Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">Choose the Right Plan For You</h2>
            <p className="text-xs sm:text-sm text-slate-400">
              No hidden fees. Scale your arena operations or supercharge your athletic journey.
            </p>

            {/* Plan Switcher */}
            <div className="inline-flex p-1.5 bg-slate-950 rounded-2xl border border-slate-800 gap-2 overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setActivePlanTab('OWNER')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                  activePlanTab === 'OWNER'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Turf Owner SaaS (30d Trial)
              </button>

              <button
                type="button"
                onClick={() => setActivePlanTab('COACH')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                  activePlanTab === 'COACH'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Coach & Academy SaaS
              </button>

              <button
                type="button"
                onClick={() => setActivePlanTab('PLAYER')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                  activePlanTab === 'PLAYER'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Athlete Pro Passes
              </button>
            </div>
          </div>

          {/* Owner SaaS Plans */}
          {activePlanTab === 'OWNER' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              {DEFAULT_OWNER_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-3xl p-6 border flex flex-col justify-between ${
                    plan.popular
                      ? 'bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 border-amber-500 shadow-2xl shadow-amber-950/30'
                      : 'bg-slate-900/90 border-slate-800'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
                        {plan.billingPeriod} • {plan.durationDays} Days
                      </span>
                      {plan.popular && (
                        <span className="text-[10px] font-black bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full">
                          Most Popular
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-white">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-3xl font-black text-amber-400">₹{plan.price}</span>
                        <span className="text-xs text-slate-400">/{plan.billingPeriod.toLowerCase()}</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      {plan.features.map((f, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={onOpenAuthModal}
                      className={`w-full py-3 rounded-2xl text-xs font-black shadow-xl transition-all cursor-pointer ${
                        plan.popular
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/40'
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                    >
                      Start 30-Day Free Trial
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Coach & Academy SaaS Plans */}
          {activePlanTab === 'COACH' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              {DEFAULT_COACH_SUBSCRIPTION_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-3xl p-6 border flex flex-col justify-between ${
                    plan.popular
                      ? 'bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500 shadow-2xl shadow-emerald-950/30'
                      : 'bg-slate-900/90 border-slate-800'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
                        {plan.role} • {plan.durationDays} Days
                      </span>
                      {plan.popular && (
                        <span className="text-[10px] font-black bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full">
                          Top Coach Value
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-white">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-3xl font-black text-emerald-400">₹{plan.price}</span>
                        {plan.originalPrice && plan.originalPrice > plan.price && (
                          <span className="text-xs text-slate-500 line-through ml-2">₹{plan.originalPrice}</span>
                        )}
                        <span className="text-xs text-slate-400">/{plan.duration || 'yr'}</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      {(plan.features || []).map((f, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={onOpenAuthModal}
                      className={`w-full py-3 rounded-2xl text-xs font-black shadow-xl transition-all cursor-pointer ${
                        plan.popular
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/40'
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                    >
                      Join as Coach / Academy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Player SaaS Plans */}
          {activePlanTab === 'PLAYER' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              {DEFAULT_PLAYER_SUBSCRIPTION_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-3xl p-6 border flex flex-col justify-between ${
                    plan.popular
                      ? 'bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 border-amber-500 shadow-2xl shadow-amber-950/30'
                      : 'bg-slate-900/90 border-slate-800'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
                        {plan.billingPeriod} • {plan.durationDays} Days
                      </span>
                      {plan.popular && (
                        <span className="text-[10px] font-black bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full">
                          Best Athlete Value
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-white">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-3xl font-black text-amber-400">₹{plan.price}</span>
                        <span className="text-xs text-slate-400">/{plan.billingPeriod.toLowerCase()}</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      {plan.features.map((f, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={onOpenAuthModal}
                      className={`w-full py-3 rounded-2xl text-xs font-black shadow-xl transition-all cursor-pointer ${
                        plan.popular
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/40'
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                    >
                      Subscribe as Athlete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 border-b border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              Got Questions?
            </span>
            <h2 className="text-3xl font-black text-white">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4"
                  >
                    <span className="font-bold text-sm text-white">{faq.q}</span>
                    <ChevronRight
                      className={`w-4 h-4 text-amber-400 shrink-0 transition-transform ${
                        isOpen ? 'rotate-90' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-slate-300 leading-relaxed border-t border-slate-800/50 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-950 border-t border-slate-800/80 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-black text-white">TRUFIT</span>
              <p className="text-[11px] text-slate-500">© {new Date().getFullYear()} TruFit Sports Inc. All rights reserved.</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-slate-200">Features</a>
            <a href="#pricing" className="hover:text-slate-200">SaaS Plans</a>
            <a href="#badges" className="hover:text-slate-200">Badges</a>
            <a href="#faq" className="hover:text-slate-200">FAQ</a>
            {/* Protected Admin Portal link for authorized personnel */}
            {onNavigateToAdmin && (
              <button
                type="button"
                onClick={onNavigateToAdmin}
                className="text-slate-600 hover:text-amber-400 text-[11px] flex items-center gap-1 transition-colors"
                title="Admin Portal Access"
              >
                <Lock className="w-3 h-3" />
                <span>Admin Portal</span>
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

import React, { useState } from 'react';
import {
  CreditCard,
  Building2,
  User,
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface LandingPricingProps {}

export const LandingPricing: React.FC<LandingPricingProps> = () => {
  const [pricingTab, setPricingTab] = useState<'OWNERS' | 'PLAYERS'>('OWNERS');

  const ownerPlans = [
    {
      name: 'Starter Arena',
      price: '₹0',
      period: 'free forever',
      badge: 'Getting Started',
      description: 'Perfect for small single-pitch facilities digitizing their manual diary bookings.',
      features: [
        '1 Pitch / Court management',
        'Real-time slot availability calendar',
        'Instant Razorpay & UPI online bookings',
        'Basic digital QR booking confirmation',
        'Standard search listing in city directory',
      ],
      ctaText: 'Inquire for Starter Setup',
      popular: false,
    },
    {
      name: 'Pro Arena SaaS',
      price: '₹1,499',
      period: '/ month',
      badge: 'Arena Operator Favorite',
      description: 'The powerhouse operating system for high-volume urban turfs and sports hubs.',
      features: [
        'Up to 4 Courts / Pitches',
        'Multi-Staff Role Access (Managers & Guards)',
        'Player Credit & Unpaid Dues Tracking',
        'Dynamic Pricing (Weekend peak & night floodlight surcharges)',
        'Automated WhatsApp booking confirmations',
        'Direct cash & UPI counter reconciliations',
        'Verified Arena Badge & Search Rank Boost',
      ],
      ctaText: 'Inquire for Pro Arena',
      popular: true,
    },
    {
      name: 'Enterprise Franchise',
      price: '₹3,999',
      period: '/ month',
      badge: 'Sports Franchises & Chains',
      description: 'For multi-location sports facilities, academies, and tournament arena networks.',
      features: [
        'Unlimited Pitches & Multi-Branch Management',
        'Tournament Hosting & Bracket Organization Engine',
        'Recurring slot subscriptions for sports academies',
        'Custom SMS sender ID & branded invoicing',
        'Priority 24/7 dedicated account manager',
        'Advanced revenue export (Tally & Excel)',
      ],
      ctaText: 'Contact Enterprise Sales',
      popular: false,
    },
  ];

  const playerPlans = [
    {
      name: 'Free Athlete Pass',
      price: '₹0',
      period: 'forever free',
      badge: 'Casual Player',
      description: 'Everything you need to find games, book turf pitches, and play with friends.',
      features: [
        'Search & book verified turfs with live slot status',
        'Create & join public pick-up match lobbies',
        'Fair automatic match fee splitting',
        'Join city-wide tournaments & open cups',
        '24-hour privacy-protected match group chats',
        'Standard community athletic feed access',
      ],
      ctaText: 'Explore Available Pitches',
      popular: false,
    },
    {
      name: 'TruFit Pro Athlete Pass',
      price: '₹199',
      period: '/ month',
      badge: 'Power Athlete',
      description: 'For competitive players who play weekly and want maximum savings and verified recognition.',
      features: [
        'Zero convenience fees on all turf bookings (Save ₹50–₹100/game)',
        'Exclusive Gold Verified Athlete badge on profile',
        '10% automatic rebate on all tournament entry fees',
        'Priority spot guarantee in competitive match lobbies',
        'Advanced match performance statistics & player rating',
        'Early-bird booking access for prime weekend night slots',
      ],
      ctaText: 'Inquire for Pro Athlete Pass',
      popular: true,
    },
  ];

  return (
    <section id="pricing" className="py-20 bg-slate-950 border-t border-slate-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Transparent Plans</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Fair Pricing For Arenas & Athletes
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            No hidden setup fees. Scale your sports arena with our specialized SaaS, or play more for less with athlete membership.
          </p>

          {/* Interactive Switcher */}
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-950 border border-slate-800 mt-4 shadow-xl">
            <button
              type="button"
              onClick={() => setPricingTab('OWNERS')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                pricingTab === 'OWNERS'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>For Turf & Arena Owners (SaaS)</span>
            </button>

            <button
              type="button"
              onClick={() => setPricingTab('PLAYERS')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                pricingTab === 'PLAYERS'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>For Players & Squads</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards: Owners */}
        {pricingTab === 'OWNERS' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {ownerPlans.map((plan, idx) => (
              <div
                key={idx}
                className={`p-6 sm:p-8 rounded-3xl bg-slate-900 border transition-all flex flex-col justify-between relative shadow-xl ${
                  plan.popular
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-indigo-500/10'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                    Most Popular Choice
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      {plan.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-3xl sm:text-4xl font-black text-white">{plan.price}</span>
                      <span className="text-xs text-slate-400 font-semibold">{plan.period}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">{plan.description}</p>

                  <div className="pt-4 border-t border-slate-800 space-y-2.5">
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Key Capabilities:
                    </p>
                    <ul className="space-y-2 text-xs text-slate-300">
                      {plan.features.map((feature, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-6">
                  <a
                    href="#contact"
                    className={`w-full py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer block text-center ${
                      plan.popular
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                    }`}
                  >
                    {plan.ctaText}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pricing Cards: Players */}
        {pricingTab === 'PLAYERS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {playerPlans.map((plan, idx) => (
              <div
                key={idx}
                className={`p-6 sm:p-8 rounded-3xl bg-slate-900 border transition-all flex flex-col justify-between relative shadow-xl ${
                  plan.popular
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-emerald-500/10'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md">
                    Recommended For Regulars
                  </div>
                )}

                <div className="space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    {plan.badge}
                  </span>

                  <div>
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-3xl sm:text-4xl font-black text-white">{plan.price}</span>
                      <span className="text-xs text-slate-400 font-semibold">{plan.period}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">{plan.description}</p>

                  <div className="pt-4 border-t border-slate-800 space-y-2.5">
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      What's Included:
                    </p>
                    <ul className="space-y-2 text-xs text-slate-300">
                      {plan.features.map((feature, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-6">
                  <a
                    href="#contact"
                    className={`w-full py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer block text-center ${
                      plan.popular
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                    }`}
                  >
                    {plan.ctaText}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Building2,
  User,
  GraduationCap,
  Sparkles,
  Lock,
  Award,
} from 'lucide-react';

export const LandingVerification: React.FC = () => {
  const badgeTiers = [
    {
      title: 'Verified Athlete Badge',
      icon: User,
      badgeColor: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
      badgeIconColor: 'text-sky-400',
      description:
        'Awarded to dedicated athletes with verified phone & identity. Guarantees fair play in open lobbies, prevents tournament multi-accounting/smurfing, and highlights reliable attendance.',
      perks: [
        'Tournament eligibility badge',
        'Priority placement in pick-up lobbies',
        'Official match MVP recognition',
      ],
    },
    {
      title: 'Verified Arena & Turf Badge',
      icon: Building2,
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      badgeIconColor: 'text-emerald-400',
      description:
        'Conferred on premier sports facilities meeting strict TruFit standards: certified turf quality, active floodlights, verified venue ownership, clean change rooms, and zero double-booking track record.',
      perks: [
        'Top rank in local city turf search',
        'Official TruFit Verified Facility seal',
        'Direct UPI & Razorpay instant escrow settlement',
      ],
    },
    {
      title: 'Certified Coach & Academy Badge',
      icon: GraduationCap,
      badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      badgeIconColor: 'text-purple-400',
      description:
        'Conferred on certified professional trainers and accredited sports academies. Requires verification of coaching licenses (AFC, UEFA, BCCI, BWF) and background safety checks.',
      perks: [
        'Direct coaching trial bookings',
        'Official academy batch enrollment registry',
        'Verified credential badge on public profile',
      ],
    },
  ];

  return (
    <section id="verification" className="py-20 bg-slate-950 border-t border-slate-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Trust & Verification Badges</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Built on Authenticity, Fair Play, and Verified Standards
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Every booking, lobby match, and tournament is protected by TruFit’s verification system. 
            Athletes know their venue is authentic, and arena owners know who is playing on their pitch.
          </p>
        </div>

        {/* 3 Verification Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {badgeTiers.map((tier, idx) => {
            const Icon = tier.icon;
            return (
              <div
                key={idx}
                className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-5 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${tier.badgeColor}`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified</span>
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white tracking-tight">{tier.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {tier.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800/80 space-y-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    Verification Benefits:
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {tier.perks.map((perk, pIdx) => (
                      <li key={pIdx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Verification Guarantee Box */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-base font-bold text-white">How Does Verification Work?</h4>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Arena owners submit proof of venue ownership and undergo turf safety checks. 
              Athletes verify their mobile number and sports credentials. 
              Our integrity team audits submissions to maintain a safe, zero-fraud community for everyone.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

import React from 'react';
import {
  Building2,
  Clock,
  CreditCard,
  QrCode,
  Tag,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Smartphone,
  Users2,
} from 'lucide-react';

interface LandingForOwnersProps {}

export const LandingForOwners: React.FC<LandingForOwnersProps> = () => {
  const ownerFeatures = [
    {
      icon: Clock,
      title: 'Dynamic Slot Scheduling Engine',
      description:
        'Set up individual courts, 5v5/7v7 grass pitches, box cricket nets, and badminton courts. Define custom operating hours, 30m/60m/90m slot increments, peak weekend rates, night floodlight surcharges, and recurring blocks for academies.',
      highlight: 'Zero Double-Booking Guarantee',
    },
    {
      icon: CreditCard,
      title: 'Automated Payments & Instant Payouts',
      description:
        'Collect payments directly via Razorpay, UPI, cards, and net banking. Funds settle safely to your verified bank account with automated digital receipts sent to players.',
      highlight: 'Seamless Razorpay & UPI Integration',
    },
    {
      icon: QrCode,
      title: 'Gate Pass QR Verification',
      description:
        'Eliminate unauthorized play and fraudulent reservations. Every player receives an encrypted digital QR pass. Your gate attendant or manager scans it with any smartphone camera in under 2 seconds.',
      highlight: 'Instant Smartphone Scanner',
    },
    {
      icon: DollarSign,
      title: 'Player Dues & Credit Ledger',
      description:
        'Stop losing track of unpaid corporate games or regular teams who pay later. TruFit’s integrated dues ledger tracks pending balances, partial deposits, and sends 1-tap WhatsApp payment reminders.',
      highlight: 'Recover 100% of Uncollected Revenue',
    },
    {
      icon: Tag,
      title: 'Promo Engine & Off-Peak Discounts',
      description:
        'Turn slow weekday afternoons into profit. Create limited-time coupon codes (e.g. "AFTERNOON20"), early bird discounts, and student deals to maintain 90%+ turf utilization all week.',
      highlight: 'Boost Off-Peak Court Utilization',
    },
    {
      icon: Users2,
      title: 'Staff & Manager Role Delegation',
      description:
        'Invite ground staff, booking managers, and desk clerks with safe restricted access. They can book walk-in players and scan QR passes without viewing your revenue stats or bank payout details.',
      highlight: 'Granular Role Protection',
    },
  ];

  return (
    <section id="owners" className="py-20 bg-slate-950 border-t border-slate-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5" />
            <span>TruFit Venue SaaS</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            The Complete Operating System For Sports Venue Owners
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            From single-court box cricket venues to massive multi-sport complexes, 
            TruFit eliminates scheduling chaos, cuts no-shows to near zero, and maximizes your turf’s monthly revenue.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12">
          {ownerFeatures.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition-all space-y-4 flex flex-col justify-between group hover:-translate-y-1 shadow-lg shadow-black/20"
              >
                <div className="space-y-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80">
                  <span className="text-[11px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full inline-block">
                    {item.highlight}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Owner Business Value Metrics */}
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-900 border border-indigo-500/30 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-2xl">
          <div className="space-y-3 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
              <TrendingUp className="w-4 h-4" />
              <span>Proven Venue Impact</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              Increase Court Earnings by Up to 38%
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Arena owners using TruFit report a 95% reduction in booking coordination time, 
              zero double bookings, and instant recovery of uncollected player credit balances.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 w-full sm:w-auto">
            <a
              href="#contact"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xl shadow-indigo-500/20 cursor-pointer"
            >
              <span>Contact Arena Operations</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

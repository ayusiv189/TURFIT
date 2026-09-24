import React from 'react';
import {
  Calendar,
  Users,
  Shield,
  User,
  Sparkles,
  Trophy,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Flame,
  Award,
  GraduationCap,
  MessageCircle,
} from 'lucide-react';

interface LandingForPlayersProps {}

export const LandingForPlayers: React.FC<LandingForPlayersProps> = () => {
  const playerFeatures = [
    {
      icon: Calendar,
      color: 'emerald',
      title: 'Precision Turf & Pitch Booking',
      description:
        'Search verified arenas by sport (Football, Box Cricket, Badminton, Pickleball, Tennis) and surface (FIFA turf, natural grass, indoor synthetic). Check live slot availability, review floodlights, and book instantly with Razorpay or UPI.',
      badges: ['Instant Slot Confirmation', 'Zero Double Bookings', 'Digital QR Gate Pass'],
    },
    {
      icon: Users,
      color: 'indigo',
      title: 'Live Match Lobbies & Matchmaking',
      description:
        'Need 3 more players for an 8 PM kickoff? Open a public or private lobby, set skill expectations, and let our lobby system automatically calculate and collect each player’s split fee. No more covering for absent players.',
      badges: ['Automated Split Share', 'Skill-Matched Teammates', 'Live Lobby Chat'],
    },
    {
      icon: Shield,
      color: 'amber',
      title: 'Squads & Team Lineup Management',
      description:
        'Build your club identity. Create squads with custom crests, manage primary and substitute lineups, track competitive match records (W/D/L), and challenge rival neighborhood squads to official friendlies.',
      badges: ['Custom Squad Crests', 'Roster Lineups', 'Head-to-Head Challenges'],
    },
    {
      icon: User,
      color: 'purple',
      title: 'Athlete Social Identity (@username)',
      description:
        'Your sports resume in one link. Claim your unique @username, showcase your preferred foot/hand, playing positions, match MVP badges, bio, and verified athlete status to gain recognition across local leagues.',
      badges: ['Unique @handle', 'Verified Player Badge', 'Performance Showcase'],
    },
    {
      icon: MessageCircle,
      color: 'rose',
      title: 'Community Social Feed & Highlights',
      description:
        'Connect with local sports enthusiasts. Share match winning goals, photo reels, vote on community polls, discuss pro leagues, and coordinate with athletes in safe 24-hour ephemeral direct chats.',
      badges: ['Match Highlights', 'Community Polls', '24h Safe Direct Chat'],
    },
    {
      icon: GraduationCap,
      color: 'sky',
      title: 'Certified Coach & Academy Registry',
      description:
        'Take your game to the next level. Browse verified personal coaches, football academies, and cricket camps. View coaching credentials, specialties, hourly rates, and book direct training sessions.',
      badges: ['Certified Trainers', 'Academy Batches', 'Direct Trial Sessions'],
    },
  ];

  return (
    <section id="players" className="py-20 bg-slate-900/50 border-t border-slate-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5" />
            <span>Built For Athletes & Teams</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Everything You Need To Play, Connect, and Compete
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Whether you play weekly casual friendlies or compete in high-stakes corporate leagues, 
            TruFit gives you a professional digital locker room and instant access to premier sports pitches.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12">
          {playerFeatures.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-4 flex flex-col justify-between group hover:-translate-y-1 shadow-lg shadow-black/20"
              >
                <div className="space-y-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                  {item.badges.map((badge, bIdx) => (
                    <span
                      key={bIdx}
                      className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Player CTA Banner */}
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Ready to hit the pitch?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Create your free TruFit athlete profile, search available slots near you, and find active lobbies in minutes.
            </p>
          </div>
          <a
            href="#lobbies"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-emerald-500/20 cursor-pointer shrink-0"
          >
            <span>Explore Pick-up Lobbies</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
};

import React from 'react';
import {
  ShieldCheck,
  Building2,
  User,
  Heart,
  Globe,
  Lock,
} from 'lucide-react';

interface LandingFooterProps {
  onOpenAuth: (role?: 'PLAYER' | 'OWNER') => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({ onOpenAuth }) => {
  return (
    <footer id="public-landing-footer" className="bg-slate-950 border-t border-slate-800 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Col 1 & 2: Brand & Mission */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-base shadow-md">
                ⚽
              </div>
              <span className="text-xl font-black tracking-wider text-white">TRUFIT</span>
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                OS
              </span>
            </div>

            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              TruFit is the sports arena network connecting athletes with certified turfs, 
              live matchmaking lobbies, competitive tournaments, and automated venue operating software.
            </p>

            <div className="flex items-center gap-2 text-[11px] text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All Systems Operational • 99.98% Slot Uptime</span>
            </div>
          </div>

          {/* Col 3: For Athletes */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-white">For Players</p>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#players" className="hover:text-emerald-400 transition-colors">
                  Turf Slot Booking
                </a>
              </li>
              <li>
                <a href="#lobbies" className="hover:text-emerald-400 transition-colors">
                  Match Lobbies & Pick-up
                </a>
              </li>
              <li>
                <a href="#tournaments" className="hover:text-emerald-400 transition-colors">
                  Open Tournaments & Cups
                </a>
              </li>
              <li>
                <a href="#verification" className="hover:text-emerald-400 transition-colors">
                  Verified Athlete Badge
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenAuth('PLAYER')}
                  className="hover:text-emerald-400 transition-colors text-left cursor-pointer"
                >
                  Athlete Login / Register
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: For Venue Owners */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-white">For Turf Owners</p>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#owners" className="hover:text-indigo-400 transition-colors">
                  Arena SaaS Software
                </a>
              </li>
              <li>
                <a href="#owners" className="hover:text-indigo-400 transition-colors">
                  Dynamic Slot Scheduling
                </a>
              </li>
              <li>
                <a href="#owners" className="hover:text-indigo-400 transition-colors">
                  Dues & Player Ledger
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-indigo-400 transition-colors">
                  Owner SaaS Plans
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenAuth('OWNER')}
                  className="hover:text-indigo-400 transition-colors text-left cursor-pointer"
                >
                  List Your Turf / Login
                </button>
              </li>
            </ul>
          </div>

          {/* Col 5: Security & Platform */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-white">Trust & Safety</p>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>24h Ephemeral Chat Purge</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Audited Pitch Standards</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Zero Double Booking Locks</span>
              </li>
              <li className="pt-1">
                <a href="#faq" className="hover:text-white transition-colors">
                  Frequently Asked Questions
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} TruFit Technologies Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Fair Play Code of Conduct</span>
            <button
              type="button"
              onClick={() => onOpenAuth('ADMIN' as any)}
              className="text-slate-600 hover:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
              title="Protected Admin Portal Login"
            >
              <Lock className="w-3 h-3" />
              <span>Admin Portal</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

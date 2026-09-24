import React, { useState, useEffect } from 'react';
import { LandingNavbar } from './LandingNavbar';
import { LandingHero } from './LandingHero';
import { LandingAbout } from './LandingAbout';
import { LandingForPlayers } from './LandingForPlayers';
import { LandingForOwners } from './LandingForOwners';
import { LandingCommunityTournaments } from './LandingCommunityTournaments';
import { LandingVerification } from './LandingVerification';
import { LandingPricing } from './LandingPricing';
import { LandingFAQ } from './LandingFAQ';
import { LandingContact } from './LandingContact';
import { LandingFooter } from './LandingFooter';
import { ArrowUp } from 'lucide-react';

interface TruFitLandingPageProps {
  onOpenAdmin: () => void;
  isLoggedIn?: boolean;
  isAdmin?: boolean;
  onGoToApp?: () => void;
  activeRole?: string;
}

export const TruFitLandingPage: React.FC<TruFitLandingPageProps> = ({
  onOpenAdmin,
  isLoggedIn = false,
  isAdmin = false,
  onGoToApp,
  activeRole,
}) => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExploreFeatures = () => {
    const aboutSection = document.getElementById('about');
    if (aboutSection) {
      aboutSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div id="trufit-public-landing" className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950 font-sans">
      {/* Public Navigation Bar */}
      <LandingNavbar
        onOpenAdmin={onOpenAdmin}
        isLoggedIn={isLoggedIn}
        onGoToApp={onGoToApp}
        activeRole={activeRole}
      />

      {/* Hero Section */}
      <LandingHero
        onExploreFeatures={handleExploreFeatures}
      />

      {/* About TruFit Section */}
      <LandingAbout />

      {/* For Players Section */}
      <LandingForPlayers />

      {/* For Turf Owners (SaaS) Section */}
      <LandingForOwners />

      {/* Community, Lobbies & Tournaments Section */}
      <LandingCommunityTournaments />

      {/* Trust & Verification Badges Section */}
      <LandingVerification />

      {/* Pricing & SaaS Plans Section */}
      <LandingPricing />

      {/* FAQ Section */}
      <LandingFAQ />

      {/* Contact & Inquiries Section */}
      <LandingContact />

      {/* Footer Section */}
      <LandingFooter onOpenAdmin={onOpenAdmin} />

      {/* Floating Scroll-to-Top Button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white flex items-center justify-center shadow-2xl backdrop-blur-md hover:bg-slate-800 transition-all cursor-pointer group"
          aria-label="Scroll back to top"
        >
          <ArrowUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { PromotionalBanner, BannerAudience } from '../types';
import { listenPromotionalBanners } from '../lib/db';
import { Sparkles, ArrowRight, Megaphone } from 'lucide-react';

interface PromotionalBannerCarouselProps {
  audience: BannerAudience;
  onNavigate?: (screen: string) => void;
}

export const PromotionalBannerCarousel: React.FC<PromotionalBannerCarouselProps> = ({ audience, onNavigate }) => {
  const [banners, setBanners] = useState<PromotionalBanner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const unsubscribe = listenPromotionalBanners(false, (allBanners) => {
      const filtered = allBanners.filter((b) => {
        if (!b.isActive) return false;
        if (b.targetAudience !== 'ALL' && b.targetAudience !== audience) return false;
        if (b.startDate && todayStr < b.startDate) return false;
        if (b.expiryDate && todayStr > b.expiryDate) return false;
        return true;
      });
      setBanners(filtered);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [audience]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const current = banners[currentIndex];

  return (
    <div className="w-full my-4">
      <div className="relative rounded-3xl overflow-hidden border border-indigo-500/30 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 shadow-xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-15 space-y-3 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Featured Campaign
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {currentIndex + 1} / {banners.length}
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-black text-white">{current.title}</h2>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">{current.subtitle}</p>

          {current.buttonText && (
            <button
              type="button"
              onClick={() => {
                if (onNavigate) {
                  onNavigate(current.targetScreen);
                }
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-950/50 flex items-center gap-2 transition-all cursor-pointer inline-flex mt-2"
            >
              <span>{current.buttonText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="relative w-full md:w-80 h-44 rounded-2xl overflow-hidden border border-slate-700/60 shadow-lg flex-shrink-0">
          <img src={current.imageUrl} alt={current.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent"></div>
        </div>
      </div>

      {banners.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === currentIndex ? 'w-6 bg-indigo-500' : 'w-1.5 bg-slate-700 hover:bg-slate-600'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

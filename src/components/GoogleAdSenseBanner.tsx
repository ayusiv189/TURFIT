import React, { useState } from 'react';
import { Shield, Info, X, ExternalLink, Sparkles } from 'lucide-react';

export type AdSenseFormat = 'BANNER_728x90' | 'RECTANGLE_300x250' | 'RESPONSIVE_HORIZONTAL' | 'POST_BOOKING_SPONSOR';

interface GoogleAdSenseBannerProps {
  format?: AdSenseFormat;
  adClient?: string;
  adSlot?: string;
  className?: string;
}

interface WebAdCreative {
  title: string;
  description: string;
  sponsor: string;
  cta: string;
  imageUrl: string;
  badge: string;
  promoCode?: string;
}

const WEB_CREATIVES: WebAdCreative[] = [
  {
    title: 'HydraMax Zero-Sugar Electrolytes',
    description: 'Instant hydration fuel for amateur and pro athletes. Dissolves in 10s for pure match stamina.',
    sponsor: 'HydraMax Athletics India',
    cta: 'Order Match Pack',
    imageUrl: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&w=600&q=80',
    badge: 'SPORTS NUTRITION',
    promoCode: 'TURF25',
  },
  {
    title: 'ProGrip Elite Synthetic Turf Studs',
    description: 'Ultra-lightweight micro-grip studs designed for high-speed turns on 3G & 5G astro-turfs.',
    sponsor: 'ProGrip Athletic Co.',
    cta: 'View Collection',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
    badge: 'PERFORMANCE FOOTWEAR',
    promoCode: 'PLAYPRO',
  },
];

export const GoogleAdSenseBanner: React.FC<GoogleAdSenseBannerProps> = ({
  format = 'RESPONSIVE_HORIZONTAL',
  adClient = 'ca-pub-3940256099942544',
  adSlot = '8111978111',
  className = '',
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [creative] = useState(() => WEB_CREATIVES[Math.floor(Math.random() * WEB_CREATIVES.length)]);

  if (dismissed) return null;

  if (format === 'POST_BOOKING_SPONSOR') {
    return (
      <div className={`my-4 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 text-white relative ${className}`}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded">Ad</span>
            <span>Google AdSense • Verified Partner Offer</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowInfo(!showInfo)} className="hover:text-slate-200 cursor-pointer">
              <Info className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setDismissed(true)} className="hover:text-slate-200 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {showInfo && (
          <div className="my-2 p-3 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-300">
            <p className="font-semibold text-white mb-1">Google AdSense Placement</p>
            <p className="font-mono text-[10px] text-indigo-400">client: {adClient} | slot: {adSlot}</p>
          </div>
        )}

        <div className="mt-3 flex flex-col sm:flex-row items-center gap-4">
          <img src={creative.imageUrl} alt={creative.title} className="w-20 h-20 rounded-xl object-cover border border-slate-700 flex-shrink-0" />
          <div className="flex-1 space-y-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-400 bg-sky-950/60 border border-sky-800/40 px-2 py-0.5 rounded">
              <Sparkles className="w-3 h-3" /> {creative.badge}
            </div>
            <h4 className="font-bold text-sm text-white">{creative.title}</h4>
            <p className="text-xs text-slate-300">{creative.description}</p>
            {creative.promoCode && (
              <p className="text-xs font-mono text-amber-400">Coupon: <span className="font-bold bg-amber-950/50 border border-amber-600/40 px-1.5 py-0.5 rounded">{creative.promoCode}</span></p>
            )}
          </div>
          <button
            onClick={() => window.open('https://google.com', '_blank')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-lg cursor-pointer flex-shrink-0"
          >
            <span>{creative.cta}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`my-4 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 flex items-center justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3">
        <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded">Ad</span>
        <img src={creative.imageUrl} alt={creative.title} className="w-10 h-10 rounded-lg object-cover" />
        <div>
          <p className="text-xs font-bold text-white leading-tight">{creative.title}</p>
          <p className="text-[11px] text-slate-400">{creative.sponsor} • {creative.cta}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => window.open('https://google.com', '_blank')}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
        >
          <span>Visit</span>
          <ExternalLink className="w-3 h-3" />
        </button>
        <button onClick={() => setDismissed(true)} className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';

export const LandingFAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'How do turf bookings and slot reservations work on TruFit?',
      answer:
        'Athletes search by location, sport (Football, Cricket, Badminton, Pickleball), and preferred timing. You see live, real-time slot availability. When you select a slot and complete payment via Razorpay or UPI, that slot is instantly locked in the venue’s schedule, generating a digital QR gate pass. You receive instant confirmation with zero risk of double booking.',
    },
    {
      question: 'How do Match Lobbies work if our squad is short on players?',
      answer:
        'If you booked a 5v5 turf but only have 7 friends, you can open a public TruFit Match Lobby for that slot. Other verified athletes nearby can view the game, see the venue, skill level, and split share fee. When an athlete joins, TruFit automatically calculates and collects their share of the fee, filling your game without manual payment collection.',
    },
    {
      question: 'How does TruFit protect turf venue owners against double bookings and no-shows?',
      answer:
        'TruFit connects directly to the arena’s master slot grid. The moment an online player books a slot, that time block is locked across all devices. Walk-in bookings can also be blocked out by your manager in 1 tap. Because online players pre-pay or place a confirmed deposit, no-shows drop by over 90%.',
    },
    {
      question: 'What is the 24-hour ephemeral direct messaging rule?',
      answer:
        'To protect athlete privacy, keep chats focused, and eliminate spam or harassment, all direct chat conversations between athletes automatically disappear after 24 hours. The conversation and its messages are permanently purged from Firebase, giving athletes a clean, secure coordination channel on game days.',
    },
    {
      question: 'What is the TruFit Verification Badge and how do I qualify?',
      answer:
        'Verification badges signify authenticity. For athletes, verification confirms your phone number, match attendance record, and identity for official tournament eligibility. For turf owners, verification confirms audited pitch standards, reliable lighting lumens, and verified venue ownership.',
    },
    {
      question: 'How do venue owners collect dues and manage credit balances?',
      answer:
        'The TruFit Owner SaaS includes an integrated Dues & Player Credit Ledger. When regular teams or corporate groups pay partially or play on credit, owners can log the balance under the team’s account. Owners can trigger automated WhatsApp and SMS reminders with instant 1-tap UPI payment links to collect receivables without awkward phone calls.',
    },
    {
      question: 'How do tournament registrations and live brackets function?',
      answer:
        'Tournament organizers post event dates, prize pools, and squad formats. Squad captains register their certified player roster directly through TruFit. Once the tournament begins, single or double-elimination knockout brackets and round-robin group tables update automatically in real time as match scores are reported.',
    },
    {
      question: 'Can TruFit be used as a mobile application?',
      answer:
        'Yes! TruFit is built as a Progressive Web App (PWA) with responsive mobile performance. You can open TruFit in Chrome, Safari, or any mobile browser and tap "Add to Home Screen" to install it as a standalone app with full-screen experience and instant loading.',
    },
  ];

  return (
    <section id="faq" className="py-20 bg-slate-950 border-t border-slate-800/80 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center space-y-4 mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Got Questions? We’ve Got Answers.
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Everything you need to know about booking turfs, organizing lobbies, and managing your sports arena.
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                >
                  <span className="text-sm sm:text-base font-bold text-white leading-snug">
                    {faq.question}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3 animate-in fade-in duration-200">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

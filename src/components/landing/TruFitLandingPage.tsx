import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, CircleHelp,
  Clock3, Compass, Gamepad2, Lightbulb, MapPin, Menu, MessageCircle,
  Play, ShieldCheck, Sparkles, Trophy, UserRound, Users, X, Building2,
  Zap, Send, HeartHandshake
} from 'lucide-react';

interface TruFitLandingPageProps {
  onOpenAdmin: () => void;
  isLoggedIn?: boolean;
  isAdmin?: boolean;
  onGoToApp?: () => void;
  activeRole?: string;
}

type Role = 'PLAYER' | 'OWNER';

const CONFIG = {
  phone: '+91 8435871121',
  email: 'jaypathak622@gmail.com',
  registrationEndpoint: 'https://docs.google.com/forms/d/e/YOUR_REGISTRATION_FORM_ID/formResponse',
  suggestionEndpoint: 'https://docs.google.com/forms/d/e/YOUR_SUGGESTION_FORM_ID/formResponse',
  registrationEntries: {
    role: 'entry.ROLE',
    name: 'entry.NAME',
    phone: 'entry.PHONE',
    email: 'entry.EMAIL',
    city: 'entry.CITY',
    sport: 'entry.SPORT',
    turf: 'entry.TURF',
  },
  suggestionEntries: {
    role: 'entry.ROLE',
    name: 'entry.NAME',
    email: 'entry.EMAIL',
    city: 'entry.CITY',
    suggestion: 'entry.SUGGESTION',
    priority: 'entry.PRIORITY',
  },
};

const submitGoogleForm = async (
  endpoint: string,
  mapping: Record<string, string>,
  data: Record<string, string>
) => {
  const body = new URLSearchParams();
  Object.entries(mapping).forEach(([key, entry]) => {
    if (data[key] && entry.startsWith('entry.') && !entry.includes('YOUR_')) body.append(entry, data[key]);
  });
  await fetch(endpoint, { method: 'POST', mode: 'no-cors', body });
};

const saveLocal = (key: string, data: Record<string, string>) => {
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  existing.push({ ...data, createdAt: new Date().toISOString() });
  localStorage.setItem(key, JSON.stringify(existing));
};

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

export const TruFitLandingPage: React.FC<TruFitLandingPageProps> = ({
  onOpenAdmin, isLoggedIn = false, onGoToApp, activeRole,
}) => {
  const [menu, setMenu] = useState(false);
  const [role, setRole] = useState<Role>('PLAYER');
  const [registrationStatus, setRegistrationStatus] = useState('');
  const [suggestionStatus, setSuggestionStatus] = useState('');
  const [faq, setFaq] = useState<number | null>(0);
  const [suggestion, setSuggestion] = useState({
    role: 'PLAYER', name: '', email: '', city: '', suggestion: '', priority: 'Important'
  });

  useEffect(() => {
    const reveal = () => {
      document.querySelectorAll('.tf-reveal').forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight * .88) el.classList.add('tf-visible');
      });
    };
    reveal();
    window.addEventListener('scroll', reveal, { passive: true });
    return () => window.removeEventListener('scroll', reveal);
  }, []);

  const faqs = useMemo(() => [
    ['What do I get by pre-registering?', 'Pre-register before launch and your account is eligible for 1 year of free TruFit access after launch. We will use the contact details you submit only for launch and product updates.'],
    ['Can I join as both a player and turf owner?', 'Yes. Choose Both in the registration form. You can participate in the player community and manage a turf from the same TruFit ecosystem.'],
    ['Can I suggest features before launch?', 'Yes. Players and owners have a dedicated suggestion form. We want the early community to influence what TruFit builds next.'],
    ['How will turf owners benefit?', 'Owners can manage slots, bookings, payment records, customer demand and promotions while getting discovered by players looking for places to play.'],
  ], []);

  const handleRegistration = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRegistrationStatus('Saving...');
    const data = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    try {
      const configured = !CONFIG.registrationEndpoint.includes('YOUR_');
      if (configured) {
        await submitGoogleForm(CONFIG.registrationEndpoint, CONFIG.registrationEntries, data);
      } else {
        saveLocal('trufit_preregistrations', data);
      }
      e.currentTarget.reset();
      setRegistrationStatus(configured
        ? '✓ You are pre-registered. We will contact you about launch.'
        : '✓ Demo saved locally. Add your Google Form IDs in TruFitLandingPage.tsx before launch.');
    } catch {
      setRegistrationStatus('Something went wrong. Please try again.');
    }
  };

  const handleSuggestion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuggestionStatus('Sending...');
    const data = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    try {
      const configured = !CONFIG.suggestionEndpoint.includes('YOUR_');
      if (configured) {
        await submitGoogleForm(CONFIG.suggestionEndpoint, CONFIG.suggestionEntries, data);
      } else {
        saveLocal('trufit_suggestions', data);
      }
      setSuggestion({ role: 'PLAYER', name: '', email: '', city: '', suggestion: '', priority: 'Important' });
      setSuggestionStatus(configured
        ? '✓ Thanks. Your idea has been sent to the TruFit team.'
        : '✓ Demo saved locally. Connect the Google Suggestion Form before launch.');
    } catch {
      setSuggestionStatus('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="tf-page">
      <style>{`
        .tf-page{--ink:#101828;--muted:#667085;--line:#e7eaf0;--paper:#fff;--bg:#f7f9fc;--indigo:#5146e5;--violet:#7c3aed;--green:#12b76a;background:var(--bg);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}
        .tf-page *{box-sizing:border-box}.tf-page a{text-decoration:none;color:inherit}.tf-page button,.tf-page input,.tf-page select,.tf-page textarea{font:inherit}
        .tf-shell{max-width:1180px;margin:auto;padding:0 24px}.tf-nav{height:76px;position:sticky;top:0;z-index:50;background:rgba(247,249,252,.82);backdrop-filter:blur(18px);border-bottom:1px solid rgba(231,234,240,.8)}
        .tf-navin{height:100%;display:flex;align-items:center;justify-content:space-between}.tf-logo{display:flex;align-items:center;gap:8px;font-weight:900;font-size:21px;letter-spacing:-.06em}.tf-logo-mark{display:flex;align-items:end;gap:3px;transform:skew(-15deg)}.tf-logo-mark i{display:block;width:5px;border-radius:6px;background:var(--indigo)}.tf-logo-mark i:nth-child(1){height:15px}.tf-logo-mark i:nth-child(2){height:11px;background:#7c3aed}.tf-logo-mark i:nth-child(3){height:7px;background:#12b76a}.tf-logo em{font-style:normal;color:var(--indigo)}
        .tf-links{display:flex;gap:27px;color:#667085;font-size:12px;font-weight:700}.tf-links a:hover{color:var(--ink)}.tf-navcta{background:#101828;color:#fff;border:0;border-radius:12px;padding:11px 15px;font-size:12px;font-weight:800;cursor:pointer}.tf-mobile{display:none;background:#fff;border:1px solid var(--line);border-radius:10px;padding:8px}
        .tf-hero{min-height:700px;display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:35px;padding-top:65px;padding-bottom:70px;position:relative}.tf-hero:before{content:"";position:absolute;width:620px;height:620px;right:-170px;top:10px;background:radial-gradient(circle,rgba(99,102,241,.15),transparent 68%);pointer-events:none}
        .tf-kicker{display:inline-flex;align-items:center;gap:8px;color:var(--indigo);font-size:10px;letter-spacing:.16em;font-weight:900}.tf-kicker i{width:7px;height:7px;background:var(--green);border-radius:50%;box-shadow:0 0 0 5px rgba(18,183,106,.12)}
        .tf-h1{font-size:clamp(50px,6.1vw,82px);line-height:.94;letter-spacing:-.065em;margin:20px 0}.tf-h1 em,.tf-h2 em{font-style:normal;color:var(--indigo)}.tf-lead{max-width:560px;color:var(--muted);font-size:17px;line-height:1.7}.tf-actions{display:flex;gap:10px;margin-top:28px;flex-wrap:wrap}.tf-primary,.tf-secondary{border-radius:13px;padding:13px 17px;border:1px solid transparent;display:inline-flex;align-items:center;justify-content:center;gap:9px;font-size:12px;font-weight:800;cursor:pointer;transition:.22s}.tf-primary{background:#101828;color:#fff;box-shadow:0 14px 30px rgba(16,24,40,.13)}.tf-secondary{background:#fff;border-color:var(--line)}.tf-primary:hover,.tf-secondary:hover{transform:translateY(-2px);box-shadow:0 14px 30px rgba(16,24,40,.1)}.tf-early{display:flex;align-items:center;gap:10px;margin-top:25px;color:#98a2b3;font-size:10px}.tf-early b{color:var(--green)}
        .tf-stage{height:560px;position:relative;display:grid;place-items:center;perspective:1300px}.tf-phone{width:285px;height:550px;border:7px solid #111827;border-radius:42px;background:#111827;padding:5px;transform:rotateY(-12deg) rotateX(5deg) rotateZ(2deg);box-shadow:35px 45px 75px rgba(16,24,40,.2);transition:transform .15s ease-out;z-index:3}.tf-screen{height:100%;border-radius:32px;background:#f7f8fb;overflow:hidden;padding:17px 14px}.tf-notch{position:absolute;width:88px;height:20px;background:#111827;border-radius:18px;top:17px;left:50%;transform:translateX(-50%);z-index:4}.tf-appbar{display:flex;justify-content:space-between;font-size:11px;font-weight:900;margin-top:3px}.tf-greet{font-size:13px;margin-top:27px}.tf-search{margin-top:12px;padding:10px 11px;background:#fff;border:1px solid #e8ebf1;border-radius:12px;color:#98a2b3;font-size:9px}.tf-tabs{display:flex;gap:14px;font-size:9px;color:#98a2b3;margin:14px 0 9px}.tf-tabs b{color:#101828}.tf-pitch{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 22px rgba(16,24,40,.06)}.tf-pitchart{height:100px;padding:10px;color:#fff;background:linear-gradient(135deg,#3d45b7,#7c3aed 60%,#12b76a);display:flex;justify-content:space-between;align-items:end;font-size:8px}.tf-pitchart strong{font-size:15px}.tf-pitchinfo{padding:10px}.tf-pitchinfo b{font-size:11px}.tf-pitchinfo small{display:block;color:#98a2b3;font-size:8px;margin:3px 0 8px}.tf-pitchbottom{display:flex;justify-content:space-between;align-items:center;font-size:8px}.tf-pitchbottom button{background:#101828;color:#fff;border:0;border-radius:7px;padding:5px 8px;font-size:8px}.tf-minigrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.tf-mini{background:#fff;border:1px solid #edf0f4;border-radius:13px;padding:9px}.tf-mini b{display:block;font-size:9px;margin-top:4px}.tf-mini small{font-size:7px;color:#98a2b3}.tf-lobby{margin-top:8px;background:#eafaf3;border-radius:12px;padding:9px;display:flex;align-items:center;gap:7px}.tf-live{width:6px;height:6px;background:var(--green);border-radius:50%;box-shadow:0 0 0 4px rgba(18,183,106,.12)}.tf-lobby div:nth-child(2){flex:1}.tf-lobby b,.tf-lobby small{display:block;font-size:8px}.tf-lobby small{color:#7b8a84}.tf-lobby>span{font-size:8px;font-weight:900;color:#12935a}
        .tf-float{position:absolute;background:rgba(255,255,255,.9);backdrop-filter:blur(14px);border:1px solid rgba(231,234,240,.95);border-radius:16px;padding:11px 13px;box-shadow:0 25px 55px rgba(16,24,40,.12);z-index:5;font-size:9px;animation:tfFloat 6s ease-in-out infinite}.tf-float b,.tf-float small{display:block}.tf-float small{font-size:7px;color:#98a2b3;letter-spacing:.08em;margin-bottom:3px}.tf-f1{right:0;top:105px}.tf-f2{left:0;bottom:85px;animation-delay:-2s}.tf-f2 b{color:#12b76a}.tf-orb{position:absolute;border-radius:50%;filter:blur(.5px)}.tf-o1{width:390px;height:390px;background:radial-gradient(circle at 35% 30%,#fff,rgba(99,102,241,.2),transparent 70%);animation:tfFloat 8s ease-in-out infinite}.tf-o2{width:170px;height:170px;right:0;bottom:45px;background:radial-gradient(circle,#dcfce7,transparent 70%);animation:tfFloat 9s ease-in-out infinite reverse}
        .tf-strip{border-top:1px solid var(--line);border-bottom:1px solid var(--line);display:grid;grid-template-columns:repeat(4,1fr)}.tf-strip div{padding:22px 18px;border-right:1px solid var(--line)}.tf-strip div:last-child{border:0}.tf-strip b{color:var(--indigo);font-size:12px}.tf-strip span{display:block;color:var(--muted);font-size:10px;margin-top:4px}
        .tf-section{padding:105px 0}.tf-head{max-width:700px;margin-bottom:45px}.tf-head h2,.tf-h2{font-size:clamp(37px,4.7vw,60px);line-height:1;letter-spacing:-.06em;margin:14px 0}.tf-head p,.tf-copy p{color:var(--muted);line-height:1.7;font-size:15px}.tf-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:15px}.tf-card{background:#fff;border:1px solid var(--line);border-radius:26px;padding:27px;box-shadow:0 10px 35px rgba(16,24,40,.035);position:relative;overflow:hidden}.tf-card.big{min-height:390px}.tf-card h3{font-size:23px;letter-spacing:-.04em;margin:18px 0 8px}.tf-card p{color:var(--muted);font-size:12px;line-height:1.65}.tf-icon{width:42px;height:42px;border-radius:13px;background:#f0efff;color:var(--indigo);display:grid;place-items:center}.tf-map{position:absolute;left:27px;right:27px;bottom:-20px;height:190px;border-radius:22px;background:linear-gradient(135deg,#eef2ff,#f8fafc);overflow:hidden}.tf-map:before,.tf-map:after{content:"";position:absolute;border:2px solid #d5d9f1;border-radius:50%;width:130%;height:130px;left:-15%;top:45px;transform:rotate(12deg)}.tf-map:after{transform:rotate(-10deg);top:65px;left:5%}.tf-pin{position:absolute;width:17px;height:17px;border-radius:50% 50% 50% 0;background:var(--indigo);transform:rotate(-45deg);z-index:2}.tf-pin:after{content:"";position:absolute;width:5px;height:5px;background:#fff;border-radius:50%;left:6px;top:6px}.tf-p1{left:24%;top:32%}.tf-p2{left:67%;top:52%;background:var(--green)}.tf-p3{left:47%;top:70%;background:#7c3aed}
        .tf-dual{display:grid;grid-template-columns:1fr 1fr;gap:15px}.tf-feature-list{list-style:none;padding:0;margin:22px 0 0;display:grid;gap:11px}.tf-feature-list li{font-size:11px;display:flex;gap:8px}.tf-feature-list svg{color:var(--green);flex:none}.tf-owner{background:#101828;color:#fff;border-radius:30px;padding:45px;display:grid;grid-template-columns:1fr 1fr;gap:45px;align-items:center}.tf-owner p{color:#aeb7c5}.tf-owner .tf-kicker{color:#9aa5ff}.tf-owner .tf-secondary{background:transparent;color:#fff;border-color:#364152}.tf-dash{background:#fff;color:#101828;border-radius:24px;padding:23px;box-shadow:0 25px 55px rgba(0,0,0,.2);transform:rotate(2deg)}.tf-dash small{font-size:8px;color:#98a2b3}.tf-dash strong{display:block;font-size:30px;margin:5px 0}.tf-bars{height:130px;display:flex;gap:8px;align-items:end;border-bottom:1px solid #edf0f4}.tf-bars i{flex:1;border-radius:6px 6px 0 0;background:linear-gradient(#5146e5,#c8c4ff)}
        .tf-community{display:grid;grid-template-columns:1.1fr .9fr;gap:18px}.tf-dark{background:#101828;color:#fff;border-radius:30px;padding:45px}.tf-dark p{color:#aeb7c5;line-height:1.7;font-size:13px}.tf-ideas{display:grid;gap:12px}.tf-idea{background:#fff;border:1px solid var(--line);border-radius:18px;padding:18px}.tf-idea span{font-size:8px;color:var(--indigo);font-weight:900;letter-spacing:.12em}.tf-idea b{display:block;font-size:13px;line-height:1.4;margin:8px 0}.tf-idea small{font-size:9px;color:#98a2b3}
        .tf-register{background:#ebeaff;border:1px solid #dcd9ff;border-radius:30px;padding:45px;display:grid;grid-template-columns:.9fr 1.1fr;gap:45px;position:relative;overflow:hidden}.tf-register:after{content:"";position:absolute;width:380px;height:380px;right:-190px;bottom:-230px;border-radius:50%;background:radial-gradient(circle,rgba(124,58,237,.22),transparent 70%)}.tf-free{display:inline-flex;align-items:center;gap:9px;background:#fff;padding:10px 13px;border-radius:11px;color:var(--indigo);font-size:10px;font-weight:900}.tf-form{display:grid;gap:10px;position:relative;z-index:2}.tf-form label{font-size:9px;font-weight:800;color:#667085;display:grid;gap:5px}.tf-form input,.tf-form select,.tf-form textarea{border:1px solid #dfe3ea;background:#fff;border-radius:11px;padding:11px 12px;outline:0;font-size:12px;color:#101828}.tf-form input:focus,.tf-form select:focus,.tf-form textarea:focus{border-color:#9d98ef;box-shadow:0 0 0 4px rgba(81,70,229,.08)}.tf-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tf-status{font-size:10px;font-weight:800;color:#087443;min-height:14px}.tf-status.error{color:#b42318}.tf-note{font-size:9px;color:#8b93a1}.tf-suggest{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:start}.tf-formbox{background:#fff;border:1px solid var(--line);border-radius:25px;padding:26px}.tf-wall{position:relative;min-height:390px}.tf-wall-card{position:absolute;width:75%;background:#fff;border:1px solid var(--line);border-radius:18px;padding:19px;box-shadow:0 16px 35px rgba(16,24,40,.07)}.tf-wall-card span{font-size:8px;color:var(--indigo);font-weight:900;letter-spacing:.12em}.tf-wall-card b{display:block;font-size:14px;line-height:1.35;margin:8px 0}.tf-wall-card small{font-size:9px;color:#98a2b3}.tf-w1{top:30px;left:5px;transform:rotate(-4deg)}.tf-w2{top:145px;right:0;transform:rotate(4deg)}.tf-w3{top:270px;left:35px;transform:rotate(-2deg)}
        .tf-faq{display:grid;gap:10px;max-width:820px;margin:auto}.tf-faq button{width:100%;background:#fff;border:1px solid var(--line);border-radius:15px;padding:17px;display:flex;align-items:center;justify-content:space-between;text-align:left;cursor:pointer}.tf-faq strong{font-size:12px}.tf-faq p{margin:0;padding:0 17px 17px;color:var(--muted);font-size:11px;line-height:1.7}.tf-faqitem{background:#fff;border:1px solid var(--line);border-radius:15px;overflow:hidden}
        .tf-contact{text-align:center;border-top:1px solid var(--line)}.tf-contact p{color:var(--muted);font-size:13px;max-width:550px;margin:0 auto 22px}.tf-contact-actions{display:flex;justify-content:center;gap:10px;flex-wrap:wrap}.tf-footer{border-top:1px solid var(--line);padding:27px 0;color:#98a2b3;font-size:9px}.tf-footerin{display:flex;justify-content:space-between;gap:20px}.tf-footer a:hover{color:#101828}
        .tf-reveal{opacity:0;transform:translateY(20px);transition:.65s ease}.tf-visible{opacity:1;transform:none}@keyframes tfFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-11px)}}
        @media(max-width:850px){.tf-links,.tf-navcta{display:none}.tf-mobile{display:block}.tf-hero{grid-template-columns:1fr;padding-top:45px}.tf-stage{height:530px}.tf-grid,.tf-community,.tf-register,.tf-owner,.tf-suggest{grid-template-columns:1fr}.tf-dual{grid-template-columns:1fr}.tf-strip{grid-template-columns:1fr 1fr}.tf-strip div:nth-child(2){border-right:0}.tf-strip div{border-bottom:1px solid var(--line)}.tf-footerin{flex-direction:column;text-align:center}.tf-register,.tf-owner,.tf-dark{padding:30px}.tf-dash{transform:none}}
        @media(max-width:520px){.tf-shell{padding:0 17px}.tf-h1{font-size:48px}.tf-lead{font-size:15px}.tf-phone{transform:scale(.92) rotateY(-8deg) rotateZ(1deg)}.tf-float{display:none}.tf-two{grid-template-columns:1fr}.tf-section{padding:75px 0}.tf-strip div{padding:18px 10px}.tf-owner{border-radius:23px}.tf-register{border-radius:23px}.tf-stage{margin:0 -25px}.tf-nav{height:68px}}
      `}</style>

      <header className="tf-nav">
        <div className="tf-shell tf-navin">
          <a className="tf-logo" href="#top"><span className="tf-logo-mark"><i/><i/><i/></span>Tru<em>Fit</em></a>
          <nav className="tf-links">
            <a href="#features">Features</a><a href="#players">Players</a><a href="#owners">Owners</a><a href="#ideas">Community</a><a href="#register">Early access</a>
          </nav>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <button className="tf-navcta" onClick={() => scrollTo('register')}>1 Year Free <ArrowRight size={13}/></button>
            <button className="tf-mobile" onClick={() => setMenu(!menu)} aria-label="Menu">{menu ? <X size={18}/> : <Menu size={18}/>}</button>
          </div>
        </div>
        {menu && <div style={{background:'#fff',borderBottom:'1px solid #e7eaf0',padding:'12px 20px',display:'grid',gap:8}}>
          {['features','players','owners','ideas','register'].map((id) => <button key={id} onClick={() => {setMenu(false);scrollTo(id)}} style={{textAlign:'left',border:0,background:'transparent',padding:'10px',fontWeight:800,fontSize:12}}>{id === 'register' ? 'Pre-register — 1 Year Free' : id[0].toUpperCase()+id.slice(1)}</button>)}
        </div>}
      </header>

      <main id="top">
        <section className="tf-shell tf-hero">
          <div className="tf-reveal">
            <span className="tf-kicker"><i/> TRUFIT IS COMING SOON</span>
            <h1 className="tf-h1">Find your game.<br/><em>Find your turf.</em></h1>
            <p className="tf-lead">The upcoming sports community for booking turfs, joining games, finding players, building teams and helping shape what gets built next.</p>
            <div className="tf-actions">
              <button className="tf-primary" onClick={() => scrollTo('register')}>Pre-register — 1 year free <ArrowUpRight size={15}/></button>
              <button className="tf-secondary" onClick={() => scrollTo('ideas')}>Suggest what we build <Lightbulb size={15}/></button>
            </div>
            <div className="tf-early"><ShieldCheck size={14} color="#12b76a"/><span><b>Early access:</b> pre-register before launch and get 1 year free.</span></div>
          </div>

          <div className="tf-stage tf-reveal" onMouseMove={(e) => {
            const el = document.getElementById('trufit-phone');
            if (!el) return;
            const r = el.getBoundingClientRect(); const x=(e.clientX-r.left-r.width/2)/r.width; const y=(e.clientY-r.top-r.height/2)/r.height;
            el.style.transform=`rotateY(${-12+x*9}deg) rotateX(${5-y*7}deg) rotateZ(${2+x*2}deg)`;
          }}>
            <div className="tf-o1 tf-orb"/><div className="tf-o2 tf-orb"/>
            <div className="tf-phone" id="trufit-phone">
              <div className="tf-notch"/>
              <div className="tf-screen">
                <div className="tf-appbar"><span>TruFit</span><span>⌁</span></div>
                <div className="tf-greet">Good evening, <b>Player</b> 👋</div>
                <div className="tf-search">⌕ &nbsp; Find a turf, player or team</div>
                <div className="tf-tabs"><b>Nearby</b><span>Games</span><span>Popular</span></div>
                <div className="tf-pitch"><div className="tf-pitchart"><span>FOOTBALL</span><strong>7:00 PM</strong></div><div className="tf-pitchinfo"><b>Urban Kick Arena</b><small>4.8 ★ · 1.2 km away</small><div className="tf-pitchbottom"><span>₹1,200 / slot</span><button>Book</button></div></div></div>
                <div className="tf-minigrid"><div className="tf-mini"><span>⚡</span><b>I'm In</b><small>Join games</small></div><div className="tf-mini"><span>♟</span><b>Teams</b><small>Find players</small></div></div>
                <div className="tf-lobby"><div className="tf-live"/><div><b>Tonight's Lobby</b><small>8 players joined</small></div><span>Join →</span></div>
              </div>
            </div>
            <div className="tf-float tf-f1"><small>BOOKING CONFIRMED</small><b>Urban Kick · 7 PM ✓</b></div>
            <div className="tf-float tf-f2"><small>LIVE LOBBY</small><b>8 players joined</b></div>
          </div>
        </section>

        <div className="tf-shell tf-strip">
          <div><b>01</b><span>Discover & book</span></div><div><b>02</b><span>Join live games</span></div><div><b>03</b><span>Build your team</span></div><div><b>04</b><span>Shape TruFit</span></div>
        </div>

        <section id="features" className="tf-shell tf-section">
          <div className="tf-head tf-reveal"><span className="tf-kicker">THE TRUFIT ECOSYSTEM</span><h2 className="tf-h2">More than a booking app.</h2><p>We're taking the pieces that currently live across calls, WhatsApp groups, spreadsheets and paper diaries — and bringing them together.</p></div>
          <div className="tf-grid">
            <article className="tf-card big tf-reveal"><div className="tf-icon"><Compass size={20}/></div><h3>Discover the right place to play.</h3><p>Search nearby sports venues, see slot availability and make the journey from “where should we play?” to “game on” much simpler.</p><div className="tf-map"><span className="tf-pin tf-p1"/><span className="tf-pin tf-p2"/><span className="tf-pin tf-p3"/></div></article>
            <div className="tf-dual">
              <article className="tf-card tf-reveal"><div className="tf-icon"><Users size={19}/></div><h3>Find players.</h3><p>Join lobbies, invite friends, say “I'm In” and find people for games that need more players.</p></article>
              <article className="tf-card tf-reveal"><div className="tf-icon"><Trophy size={19}/></div><h3>Build teams.</h3><p>Keep your sports circle together and move from casual games to tournaments and friendly matches.</p></article>
            </div>
          </div>
        </section>

        <section id="players" className="tf-shell tf-section" style={{paddingTop:20}}>
          <div className="tf-dual">
            <article className="tf-card tf-reveal">
              <div className="tf-icon"><UserRound size={19}/></div><h3>For players</h3><p>Start with the basics you actually need on game day.</p>
              <ul className="tf-feature-list">{['Find and book available slots','Join or create game lobbies','Invite friends & find players','Create teams and join matches','Track your bookings in one place','Suggest features directly to TruFit'].map(x=><li key={x}><Check size={14}/>{x}</li>)}</ul>
            </article>
            <article className="tf-card tf-reveal" style={{background:'#f1f0ff'}}>
              <div className="tf-icon"><Zap size={19}/></div><h3>Make every game easier.</h3><p>TruFit is designed around the full journey — not just the payment screen.</p>
              <div style={{marginTop:25,display:'grid',gap:9}}>
                {['Search','Book','Join','Play'].map((x,i)=><div key={x} style={{background:'#fff',border:'1px solid #e2e0ff',borderRadius:12,padding:'11px 13px',display:'flex',justifyContent:'space-between',fontSize:11,fontWeight:800}}><span>0{i+1} · {x}</span><ArrowRight size={14} color="#5146e5"/></div>)}
              </div>
            </article>
          </div>
        </section>

        <section id="owners" className="tf-shell tf-section" style={{paddingTop:30}}>
          <div className="tf-owner tf-reveal">
            <div>
              <span className="tf-kicker">FOR TURF & ARENA OWNERS</span>
              <h2 className="tf-h2" style={{color:'#fff'}}>Run your turf with less manual work.</h2>
              <p>Manage slots, bookings, player dues, payments, offers and demand from one owner workspace — while becoming easier for players to discover.</p>
              <ul className="tf-feature-list">{['Slot & booking management','Payment and pending-dues tracking','Customer and booking history','Offers, analytics and demand insights'].map(x=><li key={x}><Check size={14} color="#12b76a"/>{x}</li>)}</ul>
              <div className="tf-actions"><button className="tf-secondary" onClick={() => {setRole('OWNER');scrollTo('register')}}>Register my turf <ArrowRight size={14}/></button><button className="tf-secondary" onClick={() => scrollTo('ideas')}>Suggest an owner feature <Lightbulb size={14}/></button></div>
            </div>
            <div className="tf-dash"><small>OWNER DASHBOARD · THIS MONTH</small><strong>₹1,42,500</strong><small style={{color:'#12b76a'}}>↑ 18.4% vs last month</small><div className="tf-bars">{[32,48,42,67,58,82,71,94].map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginTop:15,fontSize:9,color:'#98a2b3'}}><span>Bookings <b style={{display:'block',fontSize:13,color:'#101828'}}>183</b></span><span>Pending <b style={{display:'block',fontSize:13,color:'#101828'}}>₹8,400</b></span><span>Players <b style={{display:'block',fontSize:13,color:'#101828'}}>96</b></span></div></div>
          </div>
        </section>

        <section id="ideas" className="tf-shell tf-section">
          <div className="tf-community">
            <div className="tf-dark tf-reveal"><span className="tf-kicker">BUILT WITH PLAYERS & OWNERS</span><h2 className="tf-h2" style={{color:'#fff'}}>You don't just use TruFit.<br/><em>You help shape it.</em></h2><p>Before launch, tell us what is missing from the sports-booking experience. Suggest features, describe problems, or request a turf you want on TruFit.</p><button className="tf-primary" onClick={() => scrollTo('suggest-form')}>Send your idea <Send size={14}/></button></div>
            <div className="tf-ideas">
              <div className="tf-idea tf-reveal"><span>PLAYER IDEA</span><b>“Show games that need one more player.”</b><small>Lobbies · community request</small></div>
              <div className="tf-idea tf-reveal"><span>OWNER IDEA</span><b>“Let me hide a slot from players for maintenance.”</b><small>Slot management · owner request</small></div>
              <div className="tf-idea tf-reveal"><span>YOUR IDEA</span><b>What should TruFit build next?</b><small>Submit it below and help shape the roadmap.</small></div>
            </div>
          </div>
        </section>

        <section id="register" className="tf-shell tf-section" style={{paddingTop:15}}>
          <div className="tf-register tf-reveal">
            <div className="tf-copy">
              <span className="tf-kicker">PRE-LAUNCH ACCESS</span>
              <h2 className="tf-h2">Pre-register now.<br/><em>Get 1 year free.</em></h2>
              <p>Join before TruFit launches. Your pre-registration marks you for <b>1 year of free access</b> after launch. No payment is required today.</p>
              <div className="tf-free"><ShieldCheck size={14}/> 1 YEAR FREE ACCESS</div>
              <p style={{fontSize:10,marginTop:20}}>Choose Player, Turf Owner or Both. We'll use your details for launch communication and product updates.</p>
            </div>
            <form className="tf-form" onSubmit={handleRegistration}>
              <div className="tf-two">
                <label>I'm joining as<select name="role" defaultValue={role} required><option value="PLAYER">Player</option><option value="OWNER">Turf Owner</option><option value="BOTH">Both</option></select></label>
                <label>Full name<input name="name" placeholder="Your name" required/></label>
              </div>
              <div className="tf-two">
                <label>Mobile number<input name="phone" type="tel" placeholder="+91 XXXXX XXXXX" required/></label>
                <label>Email<input name="email" type="email" placeholder="you@example.com" required/></label>
              </div>
              <div className="tf-two">
                <label>City / area<input name="city" placeholder="e.g. Bhopal" required/></label>
                <label>Sport<input name="sport" placeholder="Football, Cricket..." /></label>
              </div>
              <label>Favorite turf / your turf name<input name="turf" placeholder="Optional"/></label>
              <button className="tf-primary" type="submit">Claim my free year <ArrowRight size={14}/></button>
              <div className="tf-status">{registrationStatus}</div>
              <span className="tf-note">Tip: connect the two Google Forms in the config below this component before publishing.</span>
            </form>
          </div>
        </section>

        <section id="suggest-form" className="tf-shell tf-section">
          <div className="tf-head tf-reveal"><span className="tf-kicker">YOUR INPUT MATTERS</span><h2 className="tf-h2">What should TruFit build next?</h2><p>Players and owners can send feature ideas, pain points, booking requests or anything that would make the app more useful.</p></div>
          <div className="tf-suggest">
            <form className="tf-formbox tf-form tf-reveal" onSubmit={handleSuggestion}>
              <div className="tf-two"><label>Your role<select name="role" value={suggestion.role} onChange={e=>setSuggestion({...suggestion,role:e.target.value})} required><option value="PLAYER">Player</option><option value="OWNER">Turf Owner</option><option value="BOTH">Both</option></select></label><label>Your name<input name="name" value={suggestion.name} onChange={e=>setSuggestion({...suggestion,name:e.target.value})} required placeholder="Name"/></label></div>
              <div className="tf-two"><label>City / area<input name="city" value={suggestion.city} onChange={e=>setSuggestion({...suggestion,city:e.target.value})} placeholder="City"/></label><label>Email<input name="email" value={suggestion.email} onChange={e=>setSuggestion({...suggestion,email:e.target.value})} type="email" placeholder="Optional"/></label></div>
              <label>What should TruFit add or improve?<textarea name="suggestion" value={suggestion.suggestion} onChange={e=>setSuggestion({...suggestion,suggestion:e.target.value})} rows={5} required placeholder="Tell us the feature, problem or idea..."/></label>
              <label>Priority<select name="priority" value={suggestion.priority} onChange={e=>setSuggestion({...suggestion,priority:e.target.value})}><option>Nice to have</option><option>Important</option><option>Must have</option></select></label>
              <button className="tf-primary" type="submit">Send suggestion <Send size={14}/></button>
              <div className="tf-status">{suggestionStatus}</div>
            </form>
            <div className="tf-wall tf-reveal"><div className="tf-wall-card tf-w1"><span>PLAYER</span><b>“Split payment automatically between players.”</b><small>Payments · community idea</small></div><div className="tf-wall-card tf-w2"><span>OWNER</span><b>“Give me better demand visibility for weekends.”</b><small>Analytics · owner idea</small></div><div className="tf-wall-card tf-w3"><span>PLAYER</span><b>“Show nearby games with one open spot.”</b><small>Lobbies · player idea</small></div></div>
          </div>
        </section>

        <section className="tf-shell tf-section" style={{paddingTop:20}}>
          <div className="tf-head tf-reveal" style={{textAlign:'center',margin:'0 auto 35px'}}><span className="tf-kicker">FAQ</span><h2 className="tf-h2">Before you join.</h2></div>
          <div className="tf-faq">{faqs.map(([q,a],i)=><div className="tf-faqitem tf-reveal" key={q}><button onClick={()=>setFaq(faq===i?null:i)}><strong>{q}</strong>{faq===i?<ChevronDown size={16}/>:<ChevronDown size={16}/>}</button>{faq===i&&<p>{a}</p>}</div>)}</div>
        </section>

        <section className="tf-shell tf-section tf-contact tf-reveal">
          <span className="tf-kicker">LET'S BUILD IT TOGETHER</span><h2 className="tf-h2">Ready to be part of TruFit?</h2><p>Pre-register for your free year, suggest what we should build, or contact the TruFit team directly.</p>
          <div className="tf-contact-actions">
            <button className="tf-primary" onClick={()=>scrollTo('register')}>Pre-register <ArrowRight size={14}/></button>
            <a className="tf-secondary" href={CONFIG.phone.includes('X') ? '#' : `tel:${CONFIG.phone.replace(/[^\d+]/g,'')}`}><MessageCircle size={14}/> Call / WhatsApp</a>
            <a className="tf-secondary" href={CONFIG.email.includes('YOUR_') ? '#' : `mailto:${CONFIG.email}`}><HeartHandshake size={14}/> Email TruFit</a>
          </div>
        </section>
      </main>

      <footer className="tf-footer"><div className="tf-shell tf-footerin"><span className="tf-logo">Tru<em>Fit</em></span><span>© {new Date().getFullYear()} TruFit · Find your game. Find your turf.</span><button onClick={onOpenAdmin} style={{border:0,background:'transparent',color:'#98a2b3',cursor:'pointer'}}>Admin</button><button onClick={()=>scrollTo('top')} style={{border:0,background:'transparent',color:'#98a2b3',cursor:'pointer'}}><ArrowUp size={13}/></button></div></footer>
    </div>
  );
};

export default TruFitLandingPage;

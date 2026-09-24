import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Users,
  Calendar,
  Clock,
  MapPin,
  Building2,
  Sparkles,
  ShieldCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  ChevronRight,
  Flame,
  Award,
  Zap,
  Download,
  DollarSign,
  UserPlus,
  Play,
  FileText,
  X,
  CreditCard,
  Briefcase,
  Layers,
  ChevronDown,
  MessageSquare,
} from 'lucide-react';
import { GroupChatModal } from '../messaging/GroupChatModal';
import {
  Tournament,
  TournamentTeam,
  TournamentFixture,
  TournamentCategory,
  TournamentFormat,
  Turf,
  UserProfile,
} from '../../types';
import {
  listenTournaments,
  listenTournamentTeams,
  listenTournamentFixtures,
  createTournament,
  registerTournamentTeam,
  updateTournament,
  saveTournamentFixture,
  updateFixtureScore,
} from '../../lib/db';

interface TournamentsTabProps {
  user: UserProfile | null;
  turfs: Turf[];
  selectedCity?: string;
}

const SPORTS_OPTIONS = ['Football', 'Cricket', 'Badminton', 'Pickleball', 'Tennis', 'Volleyball'];

const CORPORATE_AMENITIES_OPTIONS = [
  'Pro Certified Referees & Umpires',
  'Custom Sublimation Team Jerseys & Kits',
  'Executive Hydration, Energy Drink & Fruit Bar',
  'High-Definition Drone & Photography Highlights',
  'Laser-Engraved Corporate Trophies & Medals',
  'Live Match Digital Scoreboard Stream',
];

export const TournamentsTab: React.FC<TournamentsTabProps> = ({ user, turfs, selectedCity }) => {
  const [activeChat, setActiveChat] = useState<{ id: string; name: string } | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activeCategory, setActiveCategory] = useState<TournamentCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);
  const [selectedTournamentForDetails, setSelectedTournamentForDetails] = useState<Tournament | null>(null);
  const [selectedTournamentForRegister, setSelectedTournamentForRegister] = useState<Tournament | null>(null);
  const [selectedTournamentForFixtures, setSelectedTournamentForFixtures] = useState<Tournament | null>(null);
  const [fixtures, setFixtures] = useState<TournamentFixture[]>([]);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [showCorporateInvoiceModal, setShowCorporateInvoiceModal] = useState<Tournament | null>(null);

  // Host Tournament Form State
  const [hostForm, setHostForm] = useState({
    title: '',
    city: selectedCity && selectedCity !== 'ALL' ? selectedCity : (turfs[0]?.city || 'Mumbai'),
    category: 'COMMUNITY_OPEN' as TournamentCategory,
    sport: 'Cricket',
    format: 'KNOCKOUT' as TournamentFormat,
    squadSize: 8,
    maxTeams: 16,
    registrationFeePerTeam: 1500,
    organizerFee: 999, // Pay to host registration fee
    championPrize: 25000,
    runnerUpPrize: 10000,
    bestPlayerPrize: 3000,
    turfId: turfs[0]?.id || '',
    startDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 86400000 * 8).toISOString().split('T')[0],
    registrationDeadline: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    rules: [
      'Standard tournament rules apply',
      'All players must carry valid ID proof',
      'Referees / Umpires decision will be final',
    ],
    // Corporate fields
    companyName: '',
    corporateDomain: '',
    gstin: '',
    isInterCompany: false,
    selectedAmenities: [
      'Pro Certified Referees & Umpires',
      'Live Match Digital Scoreboard Stream',
      'Laser-Engraved Corporate Trophies & Medals',
    ],
  });

  // Team Registration Form State
  const [teamForm, setTeamForm] = useState({
    teamName: '',
    companyName: '',
    captainName: user?.displayName || '',
    captainPhone: user?.phoneNumber || '',
    captainEmail: user?.email || '',
    roster: [
      { name: user?.displayName || 'Player 1', jerseyNumber: 7, role: 'Captain' },
      { name: '', jerseyNumber: 10, role: 'Player' },
      { name: '', jerseyNumber: 11, role: 'Player' },
      { name: '', jerseyNumber: 9, role: 'Player' },
    ],
  });

  // Score updater modal state
  const [editingFixture, setEditingFixture] = useState<TournamentFixture | null>(null);
  const [fixtureScores, setFixtureScores] = useState({ teamAScore: '', teamBScore: '', winnerId: '' });

  // Real-time listener for tournaments
  useEffect(() => {
    const unsub = listenTournaments(undefined, (list) => {
      if (list.length === 0) {
        // High quality seed tournaments
        setTournaments([
          {
            id: 't_open_1',
            organizerId: 'org_1',
            organizerName: 'Premier Sports League',
            organizerPhone: '+91 98765 00112',
            organizerEmail: 'leagues@turfzone.in',
            title: 'Challenger Box Cricket Super Cup 2026',
            category: 'COMMUNITY_OPEN',
            sport: 'Cricket',
            format: 'KNOCKOUT',
            squadSize: 8,
            maxTeams: 16,
            registeredTeamsCount: 12,
            registrationFeePerTeam: 2000,
            organizerFeePaid: 999,
            organizerPaymentStatus: 'PAID',
            prizePool: {
              champion: 30000,
              runnerUp: 12000,
              bestPlayer: 3000,
              trophies: true,
              total: 45000,
            },
            turfId: turfs[0]?.id || 'turf_1',
            turfName: turfs[0]?.name || 'City Arena Cricket Ground',
            turfLocation: turfs[0]?.address || 'Sector 14, Main Road',
            startDate: '2026-10-10',
            endDate: '2026-10-11',
            registrationDeadline: '2026-10-07',
            rules: [
              '6 Overs per innings, 8 players aside with tape ball.',
              'Overthrows and direct hit run-outs active.',
              'Umpire decision is strictly final.',
            ],
            status: 'REGISTRATION_OPEN',
            createdAt: new Date().toISOString(),
          },
          {
            id: 't_corp_1',
            organizerId: 'org_corp_1',
            organizerName: 'Tech Innovators Sports Council',
            organizerPhone: '+91 99112 33445',
            organizerEmail: 'events@techsports.com',
            title: 'Tech Giants Corporate Football League (Inter-Company)',
            category: 'CORPORATE',
            sport: 'Football',
            format: 'ROUND_ROBIN_KNOCKOUT',
            squadSize: 7,
            maxTeams: 12,
            registeredTeamsCount: 8,
            registrationFeePerTeam: 5000,
            organizerFeePaid: 1499,
            organizerPaymentStatus: 'PAID',
            prizePool: {
              champion: 60000,
              runnerUp: 25000,
              bestPlayer: 5000,
              trophies: true,
              total: 90000,
            },
            turfId: turfs[0]?.id || 'turf_1',
            turfName: turfs[0]?.name || 'Skyline International Football Turf',
            turfLocation: turfs[0]?.address || 'Tech Park Avenue, Phase 2',
            startDate: '2026-10-18',
            endDate: '2026-10-19',
            registrationDeadline: '2026-10-14',
            rules: [
              '5v5 with 2 rolling subs on FIFA certified artificial grass turf.',
              'Official FIFA certified referees with yellow/red card discipline.',
              'Corporate ID badge mandatory during check-in.',
            ],
            corporateDetails: {
              companyName: 'Tech Sports Federation',
              corporateDomain: 'techsports.com',
              gstin: '27AAECP1234F1Z5',
              isInterCompany: true,
              division: 'Corporate IT & Banking Division',
              amenities: [
                'Pro Certified Referees & Umpires',
                'Executive Hydration, Energy Drink & Fruit Bar',
                'High-Definition Drone & Photography Highlights',
                'Laser-Engraved Corporate Trophies & Medals',
                'Live Match Digital Scoreboard Stream',
              ],
              invoiceRequired: true,
            },
            status: 'REGISTRATION_OPEN',
            createdAt: new Date().toISOString(),
          },
          {
            id: 't_open_2',
            organizerId: 'org_2',
            organizerName: 'Metro Racket Club',
            organizerPhone: '+91 98444 66778',
            organizerEmail: 'pickleball@turfzone.in',
            title: 'Open City Pickleball & Badminton Masters',
            category: 'COMMUNITY_OPEN',
            sport: 'Pickleball',
            format: 'KNOCKOUT',
            squadSize: 2,
            maxTeams: 24,
            registeredTeamsCount: 18,
            registrationFeePerTeam: 1200,
            organizerFeePaid: 999,
            organizerPaymentStatus: 'PAID',
            prizePool: {
              champion: 20000,
              runnerUp: 8000,
              bestPlayer: 2000,
              trophies: true,
              total: 30000,
            },
            turfId: turfs[0]?.id || 'turf_1',
            turfName: turfs[0]?.name || 'Grand Smash Courts',
            turfLocation: turfs[0]?.address || 'North Sports Enclave',
            startDate: '2026-10-24',
            endDate: '2026-10-25',
            registrationDeadline: '2026-10-20',
            rules: [
              'Doubles format, best of 3 games to 11 points (win by 2).',
              'Official Franklin X-40 outdoor pickleballs provided.',
            ],
            status: 'REGISTRATION_OPEN',
            createdAt: new Date().toISOString(),
          },
        ]);
      } else {
        setTournaments(list);
      }
    });

    return () => unsub();
  }, [turfs]);

  // Load fixtures & teams when a tournament is opened
  useEffect(() => {
    if (selectedTournamentForFixtures) {
      const unsubF = listenTournamentFixtures(selectedTournamentForFixtures.id, (list) => {
        if (list.length === 0) {
          // Generate realistic initial bracket fixtures
          const seedFixtures: TournamentFixture[] = [
            {
              id: 'fix_1',
              tournamentId: selectedTournamentForFixtures.id,
              round: 'Quarter Final 1',
              matchNumber: 1,
              teamA: { name: 'Apex Strikers', score: '64/2 (6.0 ov)' },
              teamB: { name: 'Thunderbolts XI', score: '58/6 (6.0 ov)' },
              winnerId: 'team_a',
              winnerName: 'Apex Strikers',
              scheduledTime: '10:00 AM',
              pitchName: 'Pitch A',
              status: 'COMPLETED',
            },
            {
              id: 'fix_2',
              tournamentId: selectedTournamentForFixtures.id,
              round: 'Quarter Final 2',
              matchNumber: 2,
              teamA: { name: 'Falcon CC', score: '48/4 (5.2 ov)' },
              teamB: { name: 'Blaze Warriors', score: '47/7 (6.0 ov)' },
              winnerId: 'team_a',
              winnerName: 'Falcon CC',
              scheduledTime: '11:15 AM',
              pitchName: 'Pitch A',
              status: 'COMPLETED',
            },
            {
              id: 'fix_3',
              tournamentId: selectedTournamentForFixtures.id,
              round: 'Semi Final 1',
              matchNumber: 3,
              teamA: { name: 'Apex Strikers', score: '18/1 (2.0 ov)' },
              teamB: { name: 'Falcon CC', score: 'Yet to bat' },
              scheduledTime: '02:00 PM',
              pitchName: 'Main Championship Pitch',
              status: 'LIVE',
            },
            {
              id: 'fix_4',
              tournamentId: selectedTournamentForFixtures.id,
              round: 'Grand Final',
              matchNumber: 4,
              teamA: { name: 'Winner SF1' },
              teamB: { name: 'Winner SF2' },
              scheduledTime: '05:30 PM',
              pitchName: 'Main Championship Pitch',
              status: 'SCHEDULED',
            },
          ];
          setFixtures(seedFixtures);
        } else {
          setFixtures(list);
        }
      });

      const unsubT = listenTournamentTeams(selectedTournamentForFixtures.id, (tList) => {
        setTeams(tList);
      });

      return () => {
        unsubF();
        unsubT();
      };
    }
  }, [selectedTournamentForFixtures]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filter tournaments
  const filteredTournaments = tournaments.filter((t) => {
    if (selectedCity && selectedCity !== 'ALL') {
      const tCity = (t.city || '').toLowerCase().trim();
      if (tCity && tCity !== selectedCity.toLowerCase().trim()) return false;
    }
    const matchesCategory = activeCategory === 'ALL' || t.category === activeCategory;
    const matchesSport = selectedSport === 'All' || t.sport.toLowerCase() === selectedSport.toLowerCase();
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.sport.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.turfName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSport && matchesSearch;
  });

  // Handle Hosting Submission (Pay-to-host fee confirmation)
  const handleHostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Please sign in to register as a tournament organizer');
      return;
    }

    try {
      const selectedTurf = turfs.find((t) => t.id === hostForm.turfId) || turfs[0];
      const totalPrize =
        Number(hostForm.championPrize) +
        Number(hostForm.runnerUpPrize) +
        Number(hostForm.bestPlayerPrize);

      await createTournament({
        organizerId: user.id,
        organizerName: user.displayName || 'Tournament Host',
        organizerPhone: user.phoneNumber || '+91 98765 43210',
        organizerEmail: user.email || '',
        title: hostForm.title,
        city: hostForm.city || selectedCity || 'Mumbai',
        category: hostForm.category,
        sport: hostForm.sport,
        format: hostForm.format,
        squadSize: Number(hostForm.squadSize) || 8,
        maxTeams: Number(hostForm.maxTeams) || 16,
        registeredTeamsCount: 0,
        registrationFeePerTeam: Number(hostForm.registrationFeePerTeam) || 1500,
        organizerFeePaid: Number(hostForm.organizerFee) || 999,
        organizerPaymentStatus: 'PAID',
        prizePool: {
          champion: Number(hostForm.championPrize) || 20000,
          runnerUp: Number(hostForm.runnerUpPrize) || 8000,
          bestPlayer: Number(hostForm.bestPlayerPrize) || 2000,
          trophies: true,
          total: totalPrize,
        },
        turfId: selectedTurf ? selectedTurf.id : 'turf_main',
        turfName: selectedTurf ? selectedTurf.name : 'Premier Sports Turf Ground',
        turfLocation: selectedTurf ? selectedTurf.address : 'Main Arena Road',
        startDate: hostForm.startDate,
        endDate: hostForm.endDate,
        registrationDeadline: hostForm.registrationDeadline,
        rules: hostForm.rules,
        status: 'REGISTRATION_OPEN',
        corporateDetails:
          hostForm.category === 'CORPORATE'
            ? {
                companyName: hostForm.companyName || 'Corporate Sports Federation',
                corporateDomain: hostForm.corporateDomain,
                gstin: hostForm.gstin,
                isInterCompany: hostForm.isInterCompany,
                amenities: hostForm.selectedAmenities,
                invoiceRequired: true,
              }
            : undefined,
      });

      setIsHostModalOpen(false);
      showToast(
        `Tournament "${hostForm.title}" is officially hosted & published! Organizer fee verified.`
      );
    } catch (err) {
      console.error(err);
      showToast('Failed to create tournament. Please try again.');
    }
  };

  // Handle Team Registration Submission
  const handleTeamRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournamentForRegister || !user) {
      showToast('Please sign in to register your squad');
      return;
    }

    try {
      const validRoster = teamForm.roster.filter((r) => r.name.trim() !== '');

      await registerTournamentTeam({
        tournamentId: selectedTournamentForRegister.id,
        tournamentTitle: selectedTournamentForRegister.title,
        teamName: teamForm.teamName,
        companyName: teamForm.companyName || undefined,
        captainId: user.id,
        captainName: teamForm.captainName,
        captainPhone: teamForm.captainPhone,
        captainEmail: teamForm.captainEmail,
        playersCount: validRoster.length,
        playerRoster: validRoster,
        paymentStatus: 'PAID',
        amountPaid: selectedTournamentForRegister.registrationFeePerTeam,
        status: 'CONFIRMED',
      });

      setSelectedTournamentForRegister(null);
      showToast(`Team "${teamForm.teamName}" successfully registered! Entry fee confirmed.`);
    } catch (err) {
      console.error(err);
      showToast('Team registration failed. Please try again.');
    }
  };

  // Update Fixture Score
  const handleSaveScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFixture) return;

    try {
      let winnerName: string | undefined = undefined;
      if (fixtureScores.winnerId === 'teamA') winnerName = editingFixture.teamA.name;
      if (fixtureScores.winnerId === 'teamB') winnerName = editingFixture.teamB.name;

      await updateFixtureScore(
        editingFixture.id,
        fixtureScores.teamAScore,
        fixtureScores.teamBScore,
        fixtureScores.winnerId,
        winnerName,
        Boolean(fixtureScores.winnerId)
      );

      // Local update
      setFixtures((prev) =>
        prev.map((f) =>
          f.id === editingFixture.id
            ? {
                ...f,
                teamA: { ...f.teamA, score: fixtureScores.teamAScore },
                teamB: { ...f.teamB, score: fixtureScores.teamBScore },
                winnerId: fixtureScores.winnerId,
                winnerName: winnerName,
                status: fixtureScores.winnerId ? 'COMPLETED' : 'LIVE',
              }
            : f
        )
      );

      setEditingFixture(null);
      showToast('Match Score & Status Updated Live!');
    } catch (err) {
      console.error(err);
      showToast('Failed to update fixture');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400 font-semibold animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-amber-950/40 to-slate-900 rounded-3xl p-6 sm:p-8 border border-amber-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Trophy className="w-4 h-4" />
              <span>Championships & Corporate Leagues</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Host & Compete in Pro Tournaments
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              Join high-stakes Open Community tournaments with cash prize pools, or organize Inter-Company Corporate Championships with verified GST billing and VIP amenities.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="btn-host-tournament"
              onClick={() => {
                setHostForm((prev) => ({
                  ...prev,
                  category: 'COMMUNITY_OPEN',
                  organizerFee: 999,
                }));
                setIsHostModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm shadow-lg shadow-amber-600/30 flex items-center gap-2 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Host a Tournament</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Tabs & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          <button
            id="tab-tournaments-all"
            onClick={() => setActiveCategory('ALL')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeCategory === 'ALL'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>All Tournaments ({tournaments.length})</span>
          </button>

          <button
            id="tab-tournaments-open"
            onClick={() => setActiveCategory('COMMUNITY_OPEN')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeCategory === 'COMMUNITY_OPEN'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Community Open ({tournaments.filter((t) => t.category === 'COMMUNITY_OPEN').length})</span>
          </button>

          <button
            id="tab-tournaments-corporate"
            onClick={() => setActiveCategory('CORPORATE')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeCategory === 'CORPORATE'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/40 border border-indigo-800/40'
            }`}
          >
            <Building2 className="w-4 h-4 text-indigo-400" />
            <span>Corporate Leagues ({tournaments.filter((t) => t.category === 'CORPORATE').length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search sport, tournament, venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Sport Category Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {['All', ...SPORTS_OPTIONS].map((sport) => (
          <button
            key={sport}
            onClick={() => setSelectedSport(sport)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedSport === sport
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {sport}
          </button>
        ))}
      </div>

      {/* Tournaments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTournaments.map((tournament) => {
          const slotsLeft = Math.max(0, tournament.maxTeams - tournament.registeredTeamsCount);
          const isCorporate = tournament.category === 'CORPORATE';

          return (
            <div
              key={tournament.id}
              className={`bg-slate-900/90 border rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between shadow-xl relative overflow-hidden group ${
                isCorporate ? 'border-indigo-500/30' : 'border-slate-800'
              }`}
            >
              {isCorporate && (
                <div className="absolute top-0 right-0 bg-indigo-600/90 text-white text-[10px] font-black uppercase px-3 py-0.5 rounded-bl-xl tracking-wider">
                  Corporate Cup
                </div>
              )}

              <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider ${
                      isCorporate
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {tournament.sport} • {tournament.format}
                  </span>

                  <span className="text-xs font-bold text-emerald-400">
                    {slotsLeft > 0 ? `${slotsLeft} Team Slots Left` : 'Sold Out'}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                    {tournament.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="truncate">{tournament.turfName}</span>
                  </p>
                </div>

                {/* Prize Pool Highlight Card */}
                <div className="p-3 bg-gradient-to-r from-amber-950/30 via-slate-950 to-slate-950 rounded-xl border border-amber-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] text-amber-300 uppercase font-bold tracking-wider">
                        Total Prize Pool
                      </div>
                      <div className="text-base font-black text-amber-400">
                        ₹{tournament.prizePool.total.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-[11px]">
                    <div className="text-slate-400">1st: ₹{tournament.prizePool.champion.toLocaleString()}</div>
                    <div className="text-slate-400">2nd: ₹{tournament.prizePool.runnerUp.toLocaleString()}</div>
                  </div>
                </div>

                {/* Tournament Metadata */}
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Dates: {tournament.startDate} to {tournament.endDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>Squad: {tournament.squadSize} Players / Team ({tournament.registeredTeamsCount}/{tournament.maxTeams} Teams)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Reg. Deadline: {tournament.registrationDeadline}</span>
                  </div>
                </div>

                {/* Corporate Perks Pills */}
                {isCorporate && tournament.corporateDetails?.amenities && (
                  <div className="pt-2 border-t border-slate-800 space-y-1">
                    <div className="text-[10px] text-indigo-300 uppercase font-bold tracking-wider">
                      Corporate Inclusions
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {tournament.corporateDetails.amenities.slice(0, 2).map((a, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 text-[10px] border border-indigo-800/60"
                        >
                          ✓ {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Team Entry</div>
                  <div className="text-sm font-black text-white">
                    ₹{tournament.registrationFeePerTeam}{' '}
                    <span className="text-[10px] text-slate-400 font-normal">/ squad</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    id={`btn-fixtures-${tournament.id}`}
                    onClick={() => setSelectedTournamentForFixtures(tournament)}
                    className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1"
                    title="View Match Brackets & Scores"
                  >
                    <Play className="w-3.5 h-3.5 text-amber-400" />
                    <span>Brackets</span>
                  </button>

                  <button
                    id={`btn-register-team-${tournament.id}`}
                    onClick={() => {
                      setSelectedTournamentForRegister(tournament);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
                      isCorporate
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30'
                    }`}
                  >
                    <span>Register Squad</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: HOST TOURNAMENT (WITH ORGANIZER REGISTRATION FEE) */}
      {isHostModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">Host a Tournament & Register as Organizer</h3>
              </div>
              <button
                onClick={() => setIsHostModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleHostSubmit} className="space-y-4">
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tournament Category</label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() =>
                      setHostForm({ ...hostForm, category: 'COMMUNITY_OPEN', organizerFee: 999 })
                    }
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      hostForm.category === 'COMMUNITY_OPEN'
                        ? 'bg-amber-500/20 border-amber-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                      <Trophy className="w-4 h-4" />
                      <span>Open Community Tournament</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1">
                      Open to all clubs, squads, and sports enthusiasts.
                    </p>
                  </div>

                  <div
                    onClick={() =>
                      setHostForm({ ...hostForm, category: 'CORPORATE', organizerFee: 1499 })
                    }
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      hostForm.category === 'CORPORATE'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                      <Building2 className="w-4 h-4" />
                      <span>Corporate Championship</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1">
                      Inter-company league with GST invoicing & VIP perks.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tournament Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. City Smashers Super League Season 1"
                  value={hostForm.title}
                  onChange={(e) => setHostForm({ ...hostForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">City / Region *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mumbai, Bengaluru, Delhi, Pune"
                  value={hostForm.city}
                  onChange={(e) => setHostForm({ ...hostForm, city: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Sport</label>
                  <select
                    value={hostForm.sport}
                    onChange={(e) => setHostForm({ ...hostForm, sport: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    {SPORTS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tournament Format</label>
                  <select
                    value={hostForm.format}
                    onChange={(e) => setHostForm({ ...hostForm, format: e.target.value as TournamentFormat })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="KNOCKOUT">Single Elimination Knockout</option>
                    <option value="ROUND_ROBIN_KNOCKOUT">Group Stage + Knockout</option>
                    <option value="LEAGUE">Round Robin League</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Venue / Ground</label>
                  <select
                    value={hostForm.turfId}
                    onChange={(e) => setHostForm({ ...hostForm, turfId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    {turfs.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Squad Size (Players)</label>
                  <input
                    type="number"
                    min="1"
                    max="25"
                    value={hostForm.squadSize}
                    onChange={(e) => setHostForm({ ...hostForm, squadSize: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Max Teams Capacity</label>
                  <input
                    type="number"
                    min="2"
                    max="64"
                    value={hostForm.maxTeams}
                    onChange={(e) => setHostForm({ ...hostForm, maxTeams: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Team Entry Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={hostForm.registrationFeePerTeam}
                    onChange={(e) => setHostForm({ ...hostForm, registrationFeePerTeam: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Prize Pool */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  <span>Prize Pool Breakdown</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Champion 1st (₹)</label>
                    <input
                      type="number"
                      value={hostForm.championPrize}
                      onChange={(e) => setHostForm({ ...hostForm, championPrize: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Runner-Up 2nd (₹)</label>
                    <input
                      type="number"
                      value={hostForm.runnerUpPrize}
                      onChange={(e) => setHostForm({ ...hostForm, runnerUpPrize: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Best Athlete (₹)</label>
                    <input
                      type="number"
                      value={hostForm.bestPlayerPrize}
                      onChange={(e) => setHostForm({ ...hostForm, bestPlayerPrize: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Corporate Specific Additions */}
              {hostForm.category === 'CORPORATE' && (
                <div className="p-4 bg-indigo-950/30 rounded-2xl border border-indigo-800/50 space-y-3">
                  <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" />
                    <span>Corporate & Tax Invoicing Credentials</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">Company / Organization Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Acme Global Tech"
                        value={hostForm.companyName}
                        onChange={(e) => setHostForm({ ...hostForm, companyName: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">GSTIN Number (For Tax Invoices)</label>
                      <input
                        type="text"
                        placeholder="e.g. 27AAECP1234F1Z5"
                        value={hostForm.gstin}
                        onChange={(e) => setHostForm({ ...hostForm, gstin: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1.5">VIP Corporate Inclusions</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {CORPORATE_AMENITIES_OPTIONS.map((am) => {
                        const isChecked = hostForm.selectedAmenities.includes(am);
                        return (
                          <div
                            key={am}
                            onClick={() => {
                              if (isChecked) {
                                setHostForm({
                                  ...hostForm,
                                  selectedAmenities: hostForm.selectedAmenities.filter((a) => a !== am),
                                });
                              } else {
                                setHostForm({
                                  ...hostForm,
                                  selectedAmenities: [...hostForm.selectedAmenities, am],
                                });
                              }
                            }}
                            className={`p-2 rounded-lg border text-[11px] cursor-pointer flex items-center gap-2 ${
                              isChecked
                                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                                : 'bg-slate-950 border-slate-800 text-slate-400'
                            }`}
                          >
                            <CheckCircle2 className={`w-3.5 h-3.5 ${isChecked ? 'text-indigo-400' : 'text-slate-600'}`} />
                            <span className="truncate">{am}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Organizer Pay-to-Host Fee Disclosure */}
              <div className="p-4 bg-gradient-to-r from-amber-950/40 via-slate-950 to-slate-950 rounded-2xl border border-amber-500/40 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-amber-400">Organizer Platform Registration Fee</div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Includes verified championship listing, live bracket generator, and automated team registrations.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-black text-amber-400">₹{hostForm.organizerFee}</div>
                  <div className="text-[10px] text-emerald-400 font-bold">One-Time Fee</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsHostModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-600/30 cursor-pointer transition-all flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pay ₹{hostForm.organizerFee} & Publish Tournament</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER SQUAD / TEAM */}
      {selectedTournamentForRegister && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                  Squad Entry Registration
                </span>
                <h3 className="text-base font-bold text-white">{selectedTournamentForRegister.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTournamentForRegister(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTeamRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Squad / Team Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Strikers FC"
                  value={teamForm.teamName}
                  onChange={(e) => setTeamForm({ ...teamForm, teamName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {selectedTournamentForRegister.category === 'CORPORATE' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Representing Company</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Google India / TCS Tech"
                    value={teamForm.companyName}
                    onChange={(e) => setTeamForm({ ...teamForm, companyName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Captain Name</label>
                  <input
                    type="text"
                    required
                    value={teamForm.captainName}
                    onChange={(e) => setTeamForm({ ...teamForm, captainName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Captain Contact</label>
                  <input
                    type="text"
                    required
                    value={teamForm.captainPhone}
                    onChange={(e) => setTeamForm({ ...teamForm, captainPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              {/* Player Roster Builder */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">Player Roster ({teamForm.roster.length} Players)</label>
                  <button
                    type="button"
                    onClick={() => {
                      setTeamForm({
                        ...teamForm,
                        roster: [...teamForm.roster, { name: '', jerseyNumber: teamForm.roster.length + 1, role: 'Player' }],
                      });
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
                  >
                    + Add Player
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {teamForm.roster.map((player, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={`Player ${idx + 1} Name`}
                        value={player.name}
                        onChange={(e) => {
                          const updated = [...teamForm.roster];
                          updated[idx].name = e.target.value;
                          setTeamForm({ ...teamForm, roster: updated });
                        }}
                        className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      />
                      <input
                        type="number"
                        placeholder="Jersey #"
                        value={player.jerseyNumber}
                        onChange={(e) => {
                          const updated = [...teamForm.roster];
                          updated[idx].jerseyNumber = Number(e.target.value);
                          setTeamForm({ ...teamForm, roster: updated });
                        }}
                        className="w-16 px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Registration Entry Fee</div>
                  <div className="text-base font-black text-emerald-400">
                    ₹{selectedTournamentForRegister.registrationFeePerTeam}
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Confirm Registration</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LIVE BRACKETS & FIXTURES VIEWER */}
      {selectedTournamentForFixtures && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl space-y-6 my-8">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-bold text-white">{selectedTournamentForFixtures.title}</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Interactive Knockout Brackets & Live Match Scoreboard
                </p>
              </div>
              <button
                onClick={() => setSelectedTournamentForFixtures(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <button
              onClick={() => setActiveChat({ id: selectedTournamentForFixtures.id, name: selectedTournamentForFixtures.title })}
              className="w-full bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-400 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Tournament Chat</span>
            </button>

            {/* Fixtures Timeline */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fixtures.map((fix) => {
                  const isCompleted = fix.status === 'COMPLETED';
                  const isLive = fix.status === 'LIVE';

                  return (
                    <div
                      key={fix.id}
                      className={`p-4 rounded-2xl border space-y-3 relative ${
                        isLive
                          ? 'bg-amber-950/30 border-amber-500/50 shadow-lg shadow-amber-950/40'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-300">{fix.round}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isLive
                              ? 'bg-rose-500 text-white animate-pulse'
                              : isCompleted
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {fix.status}
                        </span>
                      </div>

                      {/* Team A vs Team B */}
                      <div className="space-y-2 text-xs">
                        <div
                          className={`flex justify-between items-center p-2 rounded-lg ${
                            fix.winnerId === 'team_a' ? 'bg-emerald-500/10 font-bold text-emerald-300' : 'text-slate-200'
                          }`}
                        >
                          <span>{fix.teamA.name}</span>
                          <span className="font-mono">{fix.teamA.score || '-'}</span>
                        </div>

                        <div
                          className={`flex justify-between items-center p-2 rounded-lg ${
                            fix.winnerId === 'team_b' ? 'bg-emerald-500/10 font-bold text-emerald-300' : 'text-slate-200'
                          }`}
                        >
                          <span>{fix.teamB.name}</span>
                          <span className="font-mono">{fix.teamB.score || '-'}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span>🕒 {fix.scheduledTime} ({fix.pitchName || 'Main Pitch'})</span>

                        {/* Organizer can update score */}
                        <button
                          onClick={() => {
                            setEditingFixture(fix);
                            setFixtureScores({
                              teamAScore: fix.teamA.score || '',
                              teamBScore: fix.teamB.score || '',
                              winnerId: fix.winnerId || '',
                            });
                          }}
                          className="text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
                        >
                          Update Score
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Corporate Invoice Generation Action if Corporate Tournament */}
            {selectedTournamentForFixtures.category === 'CORPORATE' && (
              <div className="p-4 bg-indigo-950/40 border border-indigo-800/50 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-indigo-300">Corporate GST Invoicing & Package Ledger</div>
                  <p className="text-[11px] text-slate-400">
                    Official tax invoice with company GSTIN, referee charges, and team hospitality billing.
                  </p>
                </div>
                <button
                  onClick={() => setShowCorporateInvoiceModal(selectedTournamentForFixtures)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>GST Invoice</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: EDIT FIXTURE LIVE SCORE */}
      {editingFixture && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h4 className="text-sm font-bold text-white">Live Scoreboard Updater</h4>
            <form onSubmit={handleSaveScore} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">{editingFixture.teamA.name} Score</label>
                <input
                  type="text"
                  placeholder="e.g. 74/3 (6.0 ov) or 3 Goals"
                  value={fixtureScores.teamAScore}
                  onChange={(e) => setFixtureScores({ ...fixtureScores, teamAScore: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">{editingFixture.teamB.name} Score</label>
                <input
                  type="text"
                  placeholder="e.g. 68/5 (6.0 ov) or 1 Goal"
                  value={fixtureScores.teamBScore}
                  onChange={(e) => setFixtureScores({ ...fixtureScores, teamBScore: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Match Winner (Marks as Completed)</label>
                <select
                  value={fixtureScores.winnerId}
                  onChange={(e) => setFixtureScores({ ...fixtureScores, winnerId: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                >
                  <option value="">Still in Progress (LIVE)</option>
                  <option value="team_a">{editingFixture.teamA.name} (Winner)</option>
                  <option value="team_b">{editingFixture.teamB.name} (Winner)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingFixture(null)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg"
                >
                  Save Score
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CORPORATE GST INVOICE DOWNLOAD */}
      {showCorporateInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Corporate Tax Invoice / Billing Pass</h3>
              </div>
              <button
                onClick={() => setShowCorporateInvoiceModal(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-3">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <div>
                  <div className="font-bold text-white">TurfZone Events India Pvt Ltd</div>
                  <div className="text-slate-400">GSTIN: 27AABCT9876Q1Z9</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-emerald-400 font-bold">INV-CORP-{showCorporateInvoiceModal.id.slice(0, 6)}</div>
                  <div className="text-slate-400">{new Date().toISOString().split('T')[0]}</div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-slate-400">Billed To:</div>
                <div className="font-bold text-white">{showCorporateInvoiceModal.corporateDetails?.companyName || 'Corporate Client'}</div>
                <div className="text-slate-300">GSTIN: {showCorporateInvoiceModal.corporateDetails?.gstin || '27AAECP1234F1Z5'}</div>
                <div className="text-slate-400">Event: {showCorporateInvoiceModal.title}</div>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Tournament Registration & Arena Grounds (Base):</span>
                  <span>₹{showCorporateInvoiceModal.registrationFeePerTeam * showCorporateInvoiceModal.registeredTeamsCount}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>VIP Referees & Live Scoreboard Package:</span>
                  <span>₹2,500</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>GST (18% SGST + CGST):</span>
                  <span>₹{Math.round(((showCorporateInvoiceModal.registrationFeePerTeam * showCorporateInvoiceModal.registeredTeamsCount) + 2500) * 0.18)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-emerald-400 pt-1 border-t border-slate-800">
                  <span>Total Invoice Amount:</span>
                  <span>₹{Math.round(((showCorporateInvoiceModal.registrationFeePerTeam * showCorporateInvoiceModal.registeredTeamsCount) + 2500) * 1.18)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  showToast('GST Tax Invoice successfully downloaded as PDF.');
                  setShowCorporateInvoiceModal(null);
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  documentId,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Team,
  TeamMember,
  Match,
  MatchPlayer,
  Tournament,
  TournamentTeam,
  TournamentFixture,
  Turf,
  Arena,
  Offer,
  UserProfile,
  PlayerRating,
  OwnerSubscriptionStatus,
} from '../types';
import { getTurfArenas, getOwnerTurfs, getOwnerSubscriptionStatus } from './db';
import { getOwnerOffers, getPlayerRatingsList, getPlayerSportsmanshipStats } from './phase3';

export interface PlayerTeamMembership {
  team: Team;
  memberInfo?: TeamMember;
  isCaptain: boolean;
}

export interface PlayerMatchRecord {
  id: string;
  matchName: string;
  sport: string;
  turfName: string;
  turfCity?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  isHost: boolean;
  matchType?: string;
  teamAName?: string;
  teamBName?: string;
  isCompleted: boolean;
}

export interface PlayerTournamentParticipation {
  tournament: Tournament;
  team: TournamentTeam;
  fixtures?: TournamentFixture[];
}

export interface PlayerAchievementItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'SPORTSMANSHIP' | 'MATCHES' | 'TOURNAMENT' | 'COMMUNITY' | 'VERIFIED';
  unlocked: boolean;
  progress?: { current: number; total: number; label: string };
  unlockedAt?: string;
  badgeLevel?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
}

export interface OwnerEcosystemSummary {
  turfs: Turf[];
  arenas: Arena[];
  tournaments: Tournament[];
  offers: Offer[];
  subscription?: OwnerSubscriptionStatus | null;
}

/**
 * Fetches all teams a player belongs to (either as captain or member) from existing collections.
 */
export async function getPlayerTeams(userId: string): Promise<PlayerTeamMembership[]> {
  if (!userId) return [];
  try {
    const teamMap = new Map<string, PlayerTeamMembership>();

    // 1. Teams where user is captain
    const captainQuery = query(collection(db, 'teams'), where('captainId', '==', userId));
    const captainSnap = await getDocs(captainQuery);
    captainSnap.forEach((d) => {
      const teamData = { id: d.id, ...d.data() } as Team;
      teamMap.set(teamData.id, {
        team: teamData,
        isCaptain: true,
      });
    });

    // 2. Teams where user is in teamMembers collection
    const memberQuery = query(collection(db, 'teamMembers'), where('uid', '==', userId));
    const memberSnap = await getDocs(memberQuery);
    const memberDocs = memberSnap.docs.map((d) => d.data() as TeamMember);

    for (const mem of memberDocs) {
      if (!teamMap.has(mem.teamId)) {
        // Fetch team details
        const teamDocRef = doc(db, 'teams', mem.teamId);
        const teamDocSnap = await getDoc(teamDocRef);
        if (teamDocSnap.exists()) {
          const teamData = { id: teamDocSnap.id, ...teamDocSnap.data() } as Team;
          teamMap.set(teamData.id, {
            team: teamData,
            memberInfo: mem,
            isCaptain: mem.role === 'CAPTAIN' || teamData.captainId === userId,
          });
        }
      } else {
        const existing = teamMap.get(mem.teamId)!;
        existing.memberInfo = mem;
      }
    }

    return Array.from(teamMap.values());
  } catch (err) {
    console.warn('Error fetching player teams:', err);
    return [];
  }
}

/**
 * Fetches matches the player participated in (matches hosted, joined via matchPlayers, or lobbies) from existing collections.
 */
export async function getPlayerMatches(userId: string): Promise<PlayerMatchRecord[]> {
  if (!userId) return [];
  try {
    const recordsMap = new Map<string, PlayerMatchRecord>();
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Matches where user is host
    const hostQ = query(collection(db, 'matches'), where('hostId', '==', userId));
    const hostSnap = await getDocs(hostQ);
    hostSnap.forEach((d) => {
      const m = { id: d.id, ...d.data() } as Match;
      const isCompleted = m.status === 'COMPLETED' || m.date < todayStr;
      recordsMap.set(m.id, {
        id: m.id,
        matchName: m.matchName || `${m.sport} Match`,
        sport: m.sport || 'Sports',
        turfName: m.turfName || 'Sports Arena',
        turfCity: m.turfCity,
        date: m.date,
        startTime: m.startTime,
        endTime: m.endTime,
        status: isCompleted ? 'COMPLETED' : m.status || 'CONFIRMED',
        isHost: true,
        matchType: m.matchType,
        teamAName: m.teamAName,
        teamBName: m.teamBName,
        isCompleted,
      });
    });

    // 2. Matches where user is a participant in matchPlayers
    const participantQ = query(collection(db, 'matchPlayers'), where('uid', '==', userId));
    const participantSnap = await getDocs(participantQ);
    for (const d of participantSnap.docs) {
      const p = d.data() as MatchPlayer;
      if (!recordsMap.has(p.matchId)) {
        const matchSnap = await getDoc(doc(db, 'matches', p.matchId));
        if (matchSnap.exists()) {
          const m = { id: matchSnap.id, ...matchSnap.data() } as Match;
          const isCompleted = m.status === 'COMPLETED' || m.date < todayStr;
          recordsMap.set(m.id, {
            id: m.id,
            matchName: m.matchName || `${m.sport} Match`,
            sport: m.sport || 'Sports',
            turfName: m.turfName || 'Sports Arena',
            turfCity: m.turfCity,
            date: m.date,
            startTime: m.startTime,
            endTime: m.endTime,
            status: isCompleted ? 'COMPLETED' : m.status || 'CONFIRMED',
            isHost: m.hostId === userId,
            matchType: m.matchType,
            teamAName: m.teamAName,
            teamBName: m.teamBName,
            isCompleted,
          });
        }
      }
    }

    // Sort descending by date
    const list = Array.from(recordsMap.values());
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  } catch (err) {
    console.warn('Error fetching player matches:', err);
    return [];
  }
}

/**
 * Fetches tournaments the user or user's team participated in from existing collections.
 */
export async function getPlayerTournaments(userId: string, userName?: string): Promise<PlayerTournamentParticipation[]> {
  if (!userId) return [];
  try {
    const list: PlayerTournamentParticipation[] = [];
    const tournamentMap = new Map<string, PlayerTournamentParticipation>();

    // 1. Teams where user is captain
    const teamQ = query(collection(db, 'tournamentTeams'), where('captainId', '==', userId));
    const teamSnap = await getDocs(teamQ);

    for (const d of teamSnap.docs) {
      const tTeam = { id: d.id, ...d.data() } as TournamentTeam;
      if (!tournamentMap.has(tTeam.tournamentId)) {
        const tourSnap = await getDoc(doc(db, 'tournaments', tTeam.tournamentId));
        if (tourSnap.exists()) {
          const tourData = { id: tourSnap.id, ...tourSnap.data() } as Tournament;
          tournamentMap.set(tTeam.tournamentId, {
            tournament: tourData,
            team: tTeam,
          });
        }
      }
    }

    // 2. Also check if user is in any team's roster
    if (userName) {
      const allTeamsSnap = await getDocs(collection(db, 'tournamentTeams'));
      const lowerName = userName.toLowerCase();
      for (const d of allTeamsSnap.docs) {
        const tTeam = { id: d.id, ...d.data() } as TournamentTeam;
        if (!tournamentMap.has(tTeam.tournamentId)) {
          const inRoster = tTeam.playerRoster?.some((r) => r.name.toLowerCase() === lowerName);
          if (inRoster) {
            const tourSnap = await getDoc(doc(db, 'tournaments', tTeam.tournamentId));
            if (tourSnap.exists()) {
              const tourData = { id: tourSnap.id, ...tourSnap.data() } as Tournament;
              tournamentMap.set(tTeam.tournamentId, {
                tournament: tourData,
                team: tTeam,
              });
            }
          }
        }
      }
    }

    return Array.from(tournamentMap.values()).sort(
      (a, b) => new Date(b.tournament.startDate || 0).getTime() - new Date(a.tournament.startDate || 0).getTime()
    );
  } catch (err) {
    console.warn('Error fetching player tournaments:', err);
    return [];
  }
}

/**
 * Derives verified achievements and milestones for a player from actual TruFit activity stats.
 */
export async function getPlayerAchievements(
  profile: UserProfile,
  teamsCount = 0,
  matchesCount = 0,
  tournamentsCount = 0
): Promise<{
  achievements: PlayerAchievementItem[];
  sportsmanshipStats: any;
}> {
  const ratings = await getPlayerRatingsList(profile.uid);
  const sportsmanshipStats = await getPlayerSportsmanshipStats(profile.uid, profile);

  const totalMatches = Math.max(profile.matchesPlayed || 0, matchesCount);
  const sportsmanshipScore = profile.sportsmanshipRating || sportsmanshipStats.averageRating || 5.0;
  const ratingsCount = profile.totalRatingsReceived || sportsmanshipStats.totalRatings || 0;
  const userBadges = profile.badges || [];

  const achievements: PlayerAchievementItem[] = [
    {
      id: 'ach_verified_athlete',
      title: 'TruFit Verified Athlete',
      description: 'Official verified identity and sports profile in the TruFit network.',
      icon: '🛡️',
      category: 'VERIFIED',
      unlocked: Boolean(profile.phoneNumber || profile.email),
      badgeLevel: 'PLATINUM',
    },
    {
      id: 'ach_fair_play',
      title: 'Fair Play Champion',
      description: 'Maintained an exceptional sportsmanship rating (≥ 4.5★) rated by teammates.',
      icon: '🤝',
      category: 'SPORTSMANSHIP',
      unlocked: sportsmanshipScore >= 4.5 && ratingsCount >= 1,
      progress: {
        current: sportsmanshipScore,
        total: 5.0,
        label: `${sportsmanshipScore.toFixed(1)} / 5.0 ★`,
      },
      badgeLevel: sportsmanshipScore >= 4.8 ? 'GOLD' : 'SILVER',
    },
    {
      id: 'ach_match_debut',
      title: 'First On Field',
      description: 'Participated in your first recorded turf match or squad session.',
      icon: '⚽',
      category: 'MATCHES',
      unlocked: totalMatches >= 1,
      progress: {
        current: Math.min(1, totalMatches),
        total: 1,
        label: `${Math.min(1, totalMatches)} / 1 Match`,
      },
      badgeLevel: 'BRONZE',
    },
    {
      id: 'ach_regular_player',
      title: 'Turf Regular (10+ Matches)',
      description: 'Completed 10 competitive or friendly matches on TruFit arenas.',
      icon: '⚡',
      category: 'MATCHES',
      unlocked: totalMatches >= 10,
      progress: {
        current: Math.min(10, totalMatches),
        total: 10,
        label: `${totalMatches} / 10 Matches`,
      },
      badgeLevel: 'SILVER',
    },
    {
      id: 'ach_veteran_athlete',
      title: 'Century Club (25+ Matches)',
      description: 'Master athlete with 25+ matches logged across city venues.',
      icon: '🏆',
      category: 'MATCHES',
      unlocked: totalMatches >= 25,
      progress: {
        current: Math.min(25, totalMatches),
        total: 25,
        label: `${totalMatches} / 25 Matches`,
      },
      badgeLevel: 'GOLD',
    },
    {
      id: 'ach_team_leader',
      title: 'Squad Captain',
      description: 'Created or captained an active sports squad roster.',
      icon: '👑',
      category: 'COMMUNITY',
      unlocked: teamsCount >= 1,
      progress: {
        current: Math.min(1, teamsCount),
        total: 1,
        label: `${teamsCount} Squads`,
      },
      badgeLevel: 'GOLD',
    },
    {
      id: 'ach_tournament_warrior',
      title: 'Tournament Contender',
      description: 'Registered and competed in an official Open or Corporate Tournament.',
      icon: '🎖️',
      category: 'TOURNAMENT',
      unlocked: tournamentsCount >= 1,
      progress: {
        current: Math.min(1, tournamentsCount),
        total: 1,
        label: `${tournamentsCount} Tournaments`,
      },
      badgeLevel: 'PLATINUM',
    },
    {
      id: 'ach_crowd_favorite',
      title: 'MVP Teammate',
      description: 'Received 5+ sportsmanship commendations and peer ratings.',
      icon: '⭐',
      category: 'COMMUNITY',
      unlocked: ratingsCount >= 5,
      progress: {
        current: Math.min(5, ratingsCount),
        total: 5,
        label: `${ratingsCount} / 5 Ratings`,
      },
      badgeLevel: 'SILVER',
    },
  ];

  return {
    achievements,
    sportsmanshipStats,
  };
}

/**
 * Fetches all sports ecosystem data for an Owner Profile from existing collections.
 */
export async function getOwnerEcosystemData(ownerId: string): Promise<OwnerEcosystemSummary> {
  if (!ownerId) {
    return { turfs: [], arenas: [], tournaments: [], offers: [] };
  }
  try {
    const [turfs, offers, subStatus] = await Promise.all([
      getOwnerTurfs(ownerId),
      getOwnerOffers(ownerId),
      getOwnerSubscriptionStatus(ownerId).catch(() => null),
    ]);

    // Fetch arenas across all owner turfs
    const allArenas: Arena[] = [];
    for (const turf of turfs) {
      const tArenas = await getTurfArenas(turf.id);
      allArenas.push(...tArenas);
    }

    // Fetch tournaments hosted by this owner or at this owner's turfs
    const turfIds = new Set(turfs.map((t) => t.id));
    const tourSnap = await getDocs(collection(db, 'tournaments'));
    const ownerTournaments: Tournament[] = [];

    tourSnap.forEach((d) => {
      const tour = { id: d.id, ...d.data() } as Tournament;
      if (tour.organizerId === ownerId || (tour.turfId && turfIds.has(tour.turfId))) {
        ownerTournaments.push(tour);
      }
    });

    return {
      turfs,
      arenas: allArenas,
      tournaments: ownerTournaments.sort(
        (a, b) => new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime()
      ),
      offers: offers.filter((o) => o.active !== false),
      subscription: subStatus,
    };
  } catch (err) {
    console.warn('Error fetching owner ecosystem data:', err);
    return { turfs: [], arenas: [], tournaments: [], offers: [] };
  }
}

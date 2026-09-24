import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { OwnerSubscriptionProvider } from '../contexts/OwnerSubscriptionContext';

// Icons
import {
  Home,
  Search,
  Users,
  Calendar,
  User,
  Building,
  Clock,
  CreditCard,
  TrendingUp,
  LayoutDashboard,
  GraduationCap,
  MessageSquare,
  Trophy,
  Rss,
  Settings,
} from 'lucide-react-native';

// Auth Screens
import { SplashScreen } from '../screens/auth/SplashScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { EmailVerificationScreen } from '../screens/auth/EmailVerificationScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';

// Player Screens
import { PlayerHomeScreen } from '../screens/player/PlayerHomeScreen';
import { PlayerMenuScreen } from '../screens/player/PlayerMenuScreen';
import { ExploreTurfsScreen } from '../screens/player/ExploreTurfsScreen';
import { TurfDetailsScreen } from '../screens/player/TurfDetailsScreen';
import { BookingFlowScreen } from '../screens/player/BookingFlowScreen';
import { PlayerBookingsScreen } from '../screens/player/PlayerBookingsScreen';
import { PlayerPaymentsScreen } from '../screens/player/PlayerPaymentsScreen';
import { LobbiesScreen } from '../screens/player/LobbiesScreen';
import { TeamsScreen } from '../screens/player/TeamsScreen';
import { MatchesScreen } from '../screens/player/MatchesScreen';
import { PlayerStatsScreen } from '../screens/player/PlayerStatsScreen';
import { NotificationsScreen } from '../screens/player/NotificationsScreen';
import { PlayerProfileScreen } from '../screens/player/PlayerProfileScreen';
import { GamingZoneScreen } from '../screens/player/GamingZoneScreen';
import { CoachesScreen } from '../screens/player/CoachesScreen';
import { CommunityFeedScreen } from '../screens/player/CommunityFeedScreen';
import { MessagingInboxScreen } from '../screens/player/MessagingInboxScreen';
import { ChatThreadScreen } from '../screens/player/ChatThreadScreen';
import { TournamentsScreen } from '../screens/player/TournamentsScreen';
import { SocialProfileScreen } from '../screens/player/SocialProfileScreen';
import { FollowersFollowingScreen } from '../screens/player/FollowersFollowingScreen';
import { PostDetailScreen } from '../screens/player/PostDetailScreen';

// Owner Screens
import { OwnerDashboardScreen } from '../screens/owner/OwnerDashboardScreen';
import { OwnerMenuScreen } from '../screens/owner/OwnerMenuScreen';
import { OwnerTurfsScreen } from '../screens/owner/OwnerTurfsScreen';
import { OwnerSlotsScreen } from '../screens/owner/OwnerSlotsScreen';
import { OwnerBookingsScreen } from '../screens/owner/OwnerBookingsScreen';
import { OwnerPlayersDuesScreen } from '../screens/owner/OwnerPlayersDuesScreen';
import { OwnerOffersScreen } from '../screens/owner/OwnerOffersScreen';
import { OwnerAnalyticsScreen } from '../screens/owner/OwnerAnalyticsScreen';
import { OwnerProfileScreen } from '../screens/owner/OwnerProfileScreen';
import { OwnerPaymentSettingsScreen } from '../screens/owner/OwnerPaymentSettingsScreen';
import { OwnerBrandProfileScreen } from '../screens/owner/OwnerBrandProfileScreen';

const AuthStack = createNativeStackNavigator();
const PlayerStack = createNativeStackNavigator();
const OwnerStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const getCommonScreenOptions = (colors: any) => ({
  headerStyle: { backgroundColor: colors.card },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { fontWeight: '800' as const, fontSize: 16 },
  headerShadowVisible: false,
});

const getTabScreenOptions = (colors: any) => ({
  tabBarStyle: {
    backgroundColor: colors.tabBarBg || '#0f172a',
    borderTopColor: colors.tabBarBorder || '#1e293b',
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 86 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  tabBarActiveTintColor: colors.primary || '#10b981',
  tabBarInactiveTintColor: colors.textMuted || '#94a3b8',
  tabBarLabelStyle: { fontSize: 11, fontWeight: '700' as const, marginTop: 2 },
  tabBarItemStyle: { paddingVertical: 2 },
  ...getCommonScreenOptions(colors),
});

// Auth Navigator
const AuthNavigator = () => (
  <AuthStack.Navigator id="AuthStack" screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
  </AuthStack.Navigator>
);

// Player Tabs
const PlayerTabs = () => {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      id="PlayerTabs"
      screenOptions={{
        ...getTabScreenOptions(colors),
        lazy: true,
      }}
    >
      <Tab.Screen
        name="PlayerHomeTab"
        component={PlayerHomeScreen}
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ExploreTab"
        component={ExploreTurfsScreen}
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="CoachesTab"
        component={CoachesScreen}
        options={{
          title: 'Coaches',
          tabBarIcon: ({ color, size }) => <GraduationCap size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="LobbiesTab"
        component={LobbiesScreen}
        options={{
          title: 'Community',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="BookingsTab"
        component={PlayerBookingsScreen}
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={PlayerProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="MenuTab"
        component={PlayerMenuScreen}
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

// Player Stack
const PlayerNavigator = () => {
  const { colors } = useTheme();
  return (
    <PlayerStack.Navigator
      id="PlayerStack"
      screenOptions={{
        ...getCommonScreenOptions(colors),
        animation: 'slide_from_right',
      }}
    >
    <PlayerStack.Screen
      name="PlayerTabs"
      component={PlayerTabs}
      options={{ headerShown: false }}
    />
    <PlayerStack.Screen
      name="TurfDetails"
      component={TurfDetailsScreen}
      options={{ title: 'Turf Details' }}
    />
    <PlayerStack.Screen
      name="BookingFlow"
      component={BookingFlowScreen}
      options={{ title: 'Select Slots & Book' }}
    />
    <PlayerStack.Screen
      name="PlayerBookings"
      component={PlayerBookingsScreen}
      options={{ title: 'My Bookings' }}
    />
    <PlayerStack.Screen
      name="PlayerPayments"
      component={PlayerPaymentsScreen}
      options={{ title: 'Payments & Dues' }}
    />
    <PlayerStack.Screen
      name="Lobbies"
      component={LobbiesScreen}
      options={{ title: 'Game Lobbies' }}
    />
    <PlayerStack.Screen
      name="Teams"
      component={TeamsScreen}
      options={{ title: 'Squads & Clubs' }}
    />
    <PlayerStack.Screen
      name="Matches"
      component={MatchesScreen}
      options={{ title: 'Friendly Fixtures' }}
    />
    <PlayerStack.Screen
      name="PlayerStats"
      component={PlayerStatsScreen}
      options={{ title: 'Athlete Stats' }}
    />
    <PlayerStack.Screen
      name="Notifications"
      component={NotificationsScreen}
      options={{ title: 'Alerts & Updates' }}
    />
    <PlayerStack.Screen
      name="PlayerProfile"
      component={PlayerProfileScreen}
      options={{ title: 'My Profile' }}
    />
    <PlayerStack.Screen
      name="ExploreTurfs"
      component={ExploreTurfsScreen}
      options={{ title: 'Explore Arenas' }}
    />
    <PlayerStack.Screen
      name="GamingZone"
      component={GamingZoneScreen}
      options={{ title: 'Indoor Gaming Zone' }}
    />
    <PlayerStack.Screen
      name="Coaches"
      component={CoachesScreen}
      options={{ title: 'Professional Coaches' }}
    />
    <PlayerStack.Screen
      name="CommunityFeed"
      component={CommunityFeedScreen}
      options={{ title: 'Community Feed' }}
    />
    <PlayerStack.Screen
      name="MessagingInbox"
      component={MessagingInboxScreen}
      options={{ title: 'Messages' }}
    />
    <PlayerStack.Screen
      name="ChatThread"
      component={ChatThreadScreen}
      options={{ title: 'Chat' }}
    />
    <PlayerStack.Screen
      name="Tournaments"
      component={TournamentsScreen}
      options={{ title: 'Tournaments' }}
    />
    <PlayerStack.Screen
      name="SocialProfile"
      component={SocialProfileScreen}
      options={{ title: 'Athlete Profile' }}
    />
    <PlayerStack.Screen
      name="FollowersFollowing"
      component={FollowersFollowingScreen}
      options={{ title: 'Connections' }}
    />
    <PlayerStack.Screen
      name="PostDetail"
      component={PostDetailScreen}
      options={{ title: 'Post Details' }}
    />
    {/* Owner screens accessible in Player Navigator */}
    <PlayerStack.Screen
      name="OwnerPaymentSettings"
      component={OwnerPaymentSettingsScreen}
      options={{ title: 'Payment ID & Payouts' }}
    />
    <PlayerStack.Screen
      name="OwnerTurfs"
      component={OwnerTurfsScreen}
      options={{ title: 'Venues & Grounds' }}
    />
    <PlayerStack.Screen
      name="OwnerSlots"
      component={OwnerSlotsScreen}
      options={{ title: 'Slot Generator' }}
    />
    <PlayerStack.Screen
      name="OwnerBookings"
      component={OwnerBookingsScreen}
      options={{ title: 'Reservations & Desk' }}
    />
    <PlayerStack.Screen
      name="OwnerPlayersDues"
      component={OwnerPlayersDuesScreen}
      options={{ title: 'Pending Player Dues' }}
    />
    <PlayerStack.Screen
      name="OwnerOffers"
      component={OwnerOffersScreen}
      options={{ title: 'Promo Codes & Offers' }}
    />
    <PlayerStack.Screen
      name="OwnerAnalytics"
      component={OwnerAnalyticsScreen}
      options={{ title: 'Arena Performance' }}
    />
  </PlayerStack.Navigator>
  );
};

// Owner Tabs
const OwnerTabs = () => {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      id="OwnerTabs"
      screenOptions={{
        ...getTabScreenOptions(colors),
        lazy: true,
      }}
    >
      <Tab.Screen
        name="OwnerDashboardTab"
        component={OwnerDashboardScreen}
        options={{
          title: 'Control',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="OwnerTurfsTab"
        component={OwnerTurfsScreen}
        options={{
          title: 'Venues',
          tabBarIcon: ({ color, size }) => <Building size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="OwnerSlotsTab"
        component={OwnerSlotsScreen}
        options={{
          title: 'Slots',
          tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="OwnerBookingsTab"
        component={OwnerBookingsScreen}
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="OwnerProfileTab"
        component={OwnerProfileScreen}
        options={{
          title: 'Partner',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="OwnerMenuTab"
        component={OwnerMenuScreen}
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

// Owner Stack
const OwnerNavigator = () => {
  const { colors } = useTheme();
  return (
    <OwnerSubscriptionProvider>
      <OwnerStack.Navigator
        id="OwnerStack"
        screenOptions={{
          ...getCommonScreenOptions(colors),
          animation: 'slide_from_right',
        }}
      >
      <OwnerStack.Screen
        name="OwnerTabs"
        component={OwnerTabs}
        options={{ headerShown: false }}
      />
      <OwnerStack.Screen
        name="OwnerTurfs"
        component={OwnerTurfsScreen}
        options={{ title: 'Venues & Grounds' }}
      />
      <OwnerStack.Screen
        name="OwnerSlots"
        component={OwnerSlotsScreen}
        options={{ title: 'Slot Generator' }}
      />
      <OwnerStack.Screen
        name="OwnerBookings"
        component={OwnerBookingsScreen}
        options={{ title: 'Reservations & Desk' }}
      />
      <OwnerStack.Screen
        name="OwnerPlayersDues"
        component={OwnerPlayersDuesScreen}
        options={{ title: 'Pending Player Dues' }}
      />
      <OwnerStack.Screen
        name="OwnerOffers"
        component={OwnerOffersScreen}
        options={{ title: 'Promo Codes & Offers' }}
      />
      <OwnerStack.Screen
        name="OwnerAnalytics"
        component={OwnerAnalyticsScreen}
        options={{ title: 'Arena Performance' }}
      />
      <OwnerStack.Screen
        name="OwnerPaymentSettings"
        component={OwnerPaymentSettingsScreen}
        options={{ title: 'Payment ID & Payouts' }}
      />
      <OwnerStack.Screen
        name="OwnerBrandProfile"
        component={OwnerBrandProfileScreen}
        options={{ title: 'Brand Profile & Social' }}
      />
      {/* Player Screens accessible in Owner Navigator */}
      <OwnerStack.Screen
        name="TurfDetails"
        component={TurfDetailsScreen}
        options={{ title: 'Turf Details' }}
      />
      <OwnerStack.Screen
        name="BookingFlow"
        component={BookingFlowScreen}
        options={{ title: 'Select Slots & Book' }}
      />
      <OwnerStack.Screen
        name="PlayerBookings"
        component={PlayerBookingsScreen}
        options={{ title: 'My Bookings' }}
      />
      <OwnerStack.Screen
        name="PlayerPayments"
        component={PlayerPaymentsScreen}
        options={{ title: 'Payments & Dues' }}
      />
      <OwnerStack.Screen
        name="Lobbies"
        component={LobbiesScreen}
        options={{ title: 'Game Lobbies' }}
      />
      <OwnerStack.Screen
        name="Teams"
        component={TeamsScreen}
        options={{ title: 'Squads & Clubs' }}
      />
      <OwnerStack.Screen
        name="Matches"
        component={MatchesScreen}
        options={{ title: 'Friendly Fixtures' }}
      />
      <OwnerStack.Screen
        name="PlayerStats"
        component={PlayerStatsScreen}
        options={{ title: 'Athlete Stats' }}
      />
      <OwnerStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Alerts & Updates' }}
      />
      <OwnerStack.Screen
        name="PlayerProfile"
        component={PlayerProfileScreen}
        options={{ title: 'My Profile' }}
      />
      <OwnerStack.Screen
        name="ExploreTurfs"
        component={ExploreTurfsScreen}
        options={{ title: 'Explore Arenas' }}
      />
      </OwnerStack.Navigator>
    </OwnerSubscriptionProvider>
  );
};

// Root Navigator
export const RootNavigator = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  if (!user) {
    return <AuthNavigator />;
  }

  if (profile?.role === 'OWNER') {
    return <OwnerNavigator />;
  }

  return <PlayerNavigator />;
};

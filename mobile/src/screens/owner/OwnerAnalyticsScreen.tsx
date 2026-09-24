import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useOwnerSubscription } from '../../contexts/OwnerSubscriptionContext';
import { SubscriptionFeatureGate } from '../../components/SubscriptionFeatureGate';
import { calculateOwnerRealAnalytics } from '../../services/dbService';
import { OwnerRealAnalytics } from '../../types';
import {
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Award,
  Flame,
  Clock,
  Sparkles,
  CreditCard,
  Banknote,
  ShieldCheck,
  Zap,
  ChevronRight,
  PieChart,
  Lock,
  Download,
  Layers,
  FileText,
  Share2,
} from 'lucide-react-native';

export const OwnerAnalyticsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { canAccess, plan } = useOwnerSubscription();
  const [analytics, setAnalytics] = useState<OwnerRealAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState<'ALL' | '30D' | '7D' | 'TODAY'>('7D');
  const [selectedArenaId, setSelectedArenaId] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'overview' | 'arenas' | 'heatmap' | 'vips' | 'tips'>('overview');

  const hasAccess = canAccess('analytics');
  const can7Days = canAccess('analytics7Days');
  const can30Days = canAccess('analytics30Days');
  const canAllTime = canAccess('analyticsAllTime');
  const canArenaAnalytics = canAccess('individualArenaAnalytics');
  const canDownloadReports = canAccess('downloadReports');

  const loadData = async (selectedTimeframe = timeframe, arenaId = selectedArenaId) => {
    if (!user || !hasAccess) return;
    try {
      setLoading(true);
      const data = await calculateOwnerRealAnalytics(user.uid, selectedTimeframe, arenaId);
      setAnalytics(data);
    } catch (err) {
      console.warn('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      loadData(timeframe, selectedArenaId);
    } else {
      setLoading(false);
    }
  }, [user, timeframe, selectedArenaId, hasAccess]);

  const onRefresh = async () => {
    if (!hasAccess) return;
    setRefreshing(true);
    await loadData(timeframe, selectedArenaId);
    setRefreshing(false);
  };

  const promptUpgrade = (featureTitle: string, message: string) => {
    Alert.alert(
      `Pro SaaS Feature: ${featureTitle}`,
      `${message}\n\nUpgrade your subscription to unlock this feature.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade Plan',
          onPress: () => navigation?.navigate('OwnerSubscription'),
        },
      ]
    );
  };

  const handleTimeframeSelect = (tf: 'ALL' | '30D' | '7D' | 'TODAY') => {
    if (tf === '7D' && !can7Days) {
      promptUpgrade('7-Day Weekly Analytics', '7-Day velocity, weekly pacing, and slot trends are available on Pro SaaS plans.');
      return;
    }
    if (tf === '30D' && !can30Days) {
      promptUpgrade('30-Day Monthly Analytics', '30-Day financial audits, monthly occupancy curves, and month-over-month comparisons are exclusive to Pro SaaS plans.');
      return;
    }
    if (tf === 'ALL' && !canAllTime) {
      promptUpgrade('All-Time Lifetime Analytics', 'Lifetime revenue audits, all-time growth metrics, and cumulative player ledgers are exclusive to Pro SaaS plans.');
      return;
    }
    setTimeframe(tf);
  };

  const handleArenaSelect = (arenaId: string) => {
    if (arenaId !== 'ALL' && !canArenaAnalytics) {
      promptUpgrade(
        'Individual Arena & Court Analytics',
        'Drilling down into court-by-court financial performance, single pitch load heatmaps, and individual turf revenue is a Pro SaaS feature.'
      );
      return;
    }
    setSelectedArenaId(arenaId);
  };

  const handleDownloadReport = async (targetTf: 'ALL' | '30D' | '7D' | 'TODAY', label: string) => {
    if (!canDownloadReports) {
      promptUpgrade(
        'Downloadable Business Reports',
        'Exporting business audit reports for Today, Weekly, Monthly, and All-Time performance is available on Pro SaaS plans.'
      );
      return;
    }

    if (!analytics || !user) return;

    try {
      let data = analytics;
      if (targetTf !== timeframe) {
        data = await calculateOwnerRealAnalytics(user.uid, targetTf, selectedArenaId);
      }

      const tfLabels = {
        TODAY: "Today's Daily Ledger",
        '7D': 'Weekly (7-Day) Performance',
        '30D': 'Monthly (30-Day) Statement',
        ALL: 'All-Time Lifetime Audit',
      };

      const arenaName = data.selectedArenaName || (selectedArenaId === 'ALL' ? 'All Arenas' : 'Selected Arena');

      const csvRows = [
        'TRUFIT BUSINESS AUDIT REPORT',
        `Report Type: ${label}`,
        `Timeframe: ${tfLabels[targetTf]} (${targetTf})`,
        `Scope: ${arenaName}`,
        `Generated: ${new Date().toLocaleString()}`,
        '',
        'METRIC,AMOUNT_OR_VALUE',
        `Total Gross Booking Value,INR ${data.totalBookingValue}`,
        `Net Collected Revenue,INR ${data.amountCollected}`,
        `Online UPI/Card Gateway,INR ${data.onlineRevenue || 0}`,
        `Counter Cash In-Hand,INR ${data.cashRevenue || 0}`,
        `Pending Player Dues,INR ${data.amountPending}`,
        `Cancelled Match Losses,INR ${data.cancelledAmount}`,
        `Total Reservation Requests,${data.totalBookings}`,
        `Completed Matches,${data.completedBookings}`,
        `Turf Occupancy Rate,${data.occupancyRatePercent}%`,
        `Repeat Customer Rate,${data.repeatRatePercent || 0}%`,
        `Avg Advance Lead Time,${data.leadTimeHoursAvg || 0} hours`,
        '',
        'ARENA,BOOKINGS,REVENUE_INR,SHARE_PCT',
        ...(data.arenaPerformances || []).map(
          (a) => `"${a.arenaName}",${a.totalBookings},INR ${a.totalRevenue},${a.occupancyPercent}%`
        ),
        '',
        'SPORT,BOOKINGS,REVENUE_INR,SHARE_PCT',
        ...(data.sportShares || []).map(
          (s) => `"${s.sport}",${s.bookingsCount},INR ${s.revenue},${s.percentage}%`
        ),
      ];

      const csvContent = csvRows.join('\n');

      await Share.share({
        title: `Turfit Report: ${label} (${targetTf})`,
        message: csvContent,
      });
    } catch (err) {
      console.warn('Error sharing report:', err);
    }
  };

  if (!hasAccess) {
    return (
      <SubscriptionFeatureGate
        featureKey="analytics"
        featureTitle="Revenue & Peak Heatmap Analytics"
        featureDescription="Track verified customer collections, counter cash versus UPI breakdowns, hourly occupancy heatmaps, and repeat player retention rates."
        requiredPlanName={plan?.name || 'Pro Annual'}
        benefits={[
          'Detailed UPI vs Pay-at-Counter cash collection breakdown',
          'Hourly peak-hour pitch occupancy heatmaps (6 AM - Midnight)',
          'Top frequent players and repeat booking percentages',
          'AI-driven pricing and revenue optimization suggestions',
        ]}
        navigation={navigation}
      />
    );
  }

  const onlineShare =
    analytics && analytics.amountCollected > 0
      ? Math.round(((analytics.onlineRevenue || 0) / analytics.amountCollected) * 100)
      : 0;
  const cashShare = 100 - onlineShare;
  const availableArenas = analytics?.availableArenas || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
    >
      {/* Timeframe selector header with Pro Lock Indicators */}
      <View style={styles.timeframeContainer}>
        {[
          { id: 'TODAY', label: 'Today', locked: false },
          { id: '7D', label: '7 Days', locked: !can7Days },
          { id: '30D', label: '30 Days', locked: !can30Days },
          { id: 'ALL', label: 'All Time', locked: !canAllTime },
        ].map((t) => (
          <TouchableOpacity
            key={t.id}
            onPress={() => handleTimeframeSelect(t.id as any)}
            style={[styles.timeframeBtn, timeframe === t.id && styles.timeframeBtnActive]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text
                style={[
                  styles.timeframeBtnText,
                  timeframe === t.id && styles.timeframeBtnTextActive,
                ]}
              >
                {t.label}
              </Text>
              {t.locked && <Lock size={10} color="#f59e0b" />}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Arena / Court Scope Bar */}
      <View style={styles.arenaSelectorContainer}>
        <View style={styles.arenaHeaderRow}>
          <Layers size={13} color="#818cf8" />
          <Text style={styles.arenaHeaderLabel}>COURT SCOPE:</Text>
          <Text style={styles.arenaHeaderActiveName} numberOfLines={1}>
            {analytics?.selectedArenaName || 'All Arenas'}
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.arenaChipScroll}>
          <TouchableOpacity
            onPress={() => handleArenaSelect('ALL')}
            style={[styles.arenaChip, selectedArenaId === 'ALL' && styles.arenaChipActive]}
          >
            <Text style={[styles.arenaChipText, selectedArenaId === 'ALL' && styles.arenaChipTextActive]}>
              All Arenas
            </Text>
          </TouchableOpacity>

          {availableArenas.map((a) => {
            const isSelected = selectedArenaId === a.id;
            return (
              <TouchableOpacity
                key={a.id}
                onPress={() => handleArenaSelect(a.id)}
                style={[styles.arenaChip, isSelected && styles.arenaChipActive]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.arenaChipText, isSelected && styles.arenaChipTextActive]}>
                    {a.name}
                  </Text>
                  {!canArenaAnalytics && <Lock size={9} color="#f59e0b" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Download Business Reports Hub */}
      <View style={styles.downloadHubCard}>
        <View style={styles.downloadHubHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Download size={14} color="#10b981" />
            <Text style={styles.downloadHubTitle}>DOWNLOAD BUSINESS REPORTS</Text>
          </View>
          {!canDownloadReports && (
            <View style={styles.proPill}>
              <Lock size={10} color="#f59e0b" />
              <Text style={styles.proPillText}>Pro SaaS</Text>
            </View>
          )}
        </View>

        <View style={styles.downloadButtonsGrid}>
          <TouchableOpacity
            style={styles.downloadActionBtn}
            onPress={() => handleDownloadReport('TODAY', "Today's Daily Ledger")}
          >
            <Text style={styles.downloadActionTop}>Daily</Text>
            <Text style={styles.downloadActionMain}>Today</Text>
            <Share2 size={11} color="#10b981" style={{ marginTop: 2 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.downloadActionBtn}
            onPress={() => handleDownloadReport('7D', 'Weekly 7-Day Performance')}
          >
            <Text style={styles.downloadActionTop}>Velocity</Text>
            <Text style={styles.downloadActionMain}>Weekly</Text>
            <Share2 size={11} color="#10b981" style={{ marginTop: 2 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.downloadActionBtn}
            onPress={() => handleDownloadReport('30D', 'Monthly 30-Day Statement')}
          >
            <Text style={styles.downloadActionTop}>Statement</Text>
            <Text style={styles.downloadActionMain}>Monthly</Text>
            <Share2 size={11} color="#10b981" style={{ marginTop: 2 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.downloadActionBtn}
            onPress={() => handleDownloadReport('ALL', 'All-Time Lifetime Audit')}
          >
            <Text style={styles.downloadActionTop}>Audit</Text>
            <Text style={styles.downloadActionMain}>All Time</Text>
            <Share2 size={11} color="#10b981" style={{ marginTop: 2 }} />
          </TouchableOpacity>
        </View>
      </View>

      {loading && !analytics ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Syncing Arena Analytics & Ledger...</Text>
        </View>
      ) : !analytics || analytics.totalBookings === 0 ? (
        <View style={styles.emptyContainer}>
          <Award size={40} color="#10b981" />
          <Text style={styles.emptyTitle}>No Booking Ledger Data</Text>
          <Text style={styles.emptySubtitle}>
            Slot bookings, payment splits, and utilization trends will appear here as athletes book match slots.
          </Text>
        </View>
      ) : (
        <>
          {/* Main Revenue Card */}
          <View style={styles.revenueHeroCard}>
            <View style={styles.heroHeader}>
              <ShieldCheck size={16} color="#10b981" />
              <Text style={styles.heroHeaderLabel}>VERIFIED REVENUE COLLECTED ({timeframe})</Text>
            </View>
            <Text style={styles.heroAmount}>₹{analytics.amountCollected.toLocaleString()}</Text>
            <Text style={styles.heroSub}>
              {analytics.completedBookings} completed matches • ₹{analytics.totalBookingValue.toLocaleString()} gross value
            </Text>

            {/* Split Bar */}
            <View style={styles.splitSection}>
              <View style={styles.splitLabels}>
                <View style={styles.splitLabelItem}>
                  <CreditCard size={12} color="#10b981" />
                  <Text style={styles.splitText}>Online: ₹{(analytics.onlineRevenue || 0).toLocaleString()} ({onlineShare}%)</Text>
                </View>
                <View style={styles.splitLabelItem}>
                  <Banknote size={12} color="#38bdf8" />
                  <Text style={styles.splitText}>Cash: ₹{(analytics.cashRevenue || 0).toLocaleString()} ({cashShare}%)</Text>
                </View>
              </View>
              <View style={styles.splitTrack}>
                <View style={[styles.splitFillOnline, { width: `${Math.max(onlineShare, 5)}%` }]} />
                <View style={[styles.splitFillCash, { width: `${Math.max(cashShare, 5)}%` }]} />
              </View>
            </View>
          </View>

          {/* Quick 3 KPI Row */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Flame size={16} color="#10b981" />
              <Text style={styles.kpiValue}>{analytics.occupancyRatePercent}%</Text>
              <Text style={styles.kpiLabel}>Occupancy</Text>
            </View>
            <View style={styles.kpiCard}>
              <Users size={16} color="#38bdf8" />
              <Text style={styles.kpiValue}>{analytics.repeatRatePercent || 0}%</Text>
              <Text style={styles.kpiLabel}>Repeat Athletes</Text>
            </View>
            <View style={styles.kpiCard}>
              <Clock size={16} color="#f59e0b" />
              <Text style={styles.kpiValue}>{analytics.leadTimeHoursAvg || 0}h</Text>
              <Text style={styles.kpiLabel}>Avg Advance</Text>
            </View>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabNav}>
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'arenas', label: 'Arenas' },
              { id: 'heatmap', label: 'Heatmap' },
              { id: 'vips', label: 'VIPs' },
              { id: 'tips', label: 'Suggestions' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id as any)}
                style={[styles.tabNavItem, activeTab === tab.id && styles.tabNavItemActive]}
              >
                <Text
                  style={[
                    styles.tabNavText,
                    activeTab === tab.id && styles.tabNavTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <View style={styles.tabContent}>
              {/* Velocity summary */}
              <View style={styles.velocityGrid}>
                <View style={styles.velocityCard}>
                  <Text style={styles.velocityLabel}>Today</Text>
                  <Text style={styles.velocityNum}>{analytics.todayBookings}</Text>
                  <Text style={styles.velocitySub}>slots</Text>
                </View>
                <View style={styles.velocityCard}>
                  <Text style={styles.velocityLabel}>7 Days</Text>
                  <Text style={styles.velocityNum}>{analytics.weeklyBookings}</Text>
                  <Text style={styles.velocitySub}>velocity</Text>
                </View>
                <View style={styles.velocityCard}>
                  <Text style={styles.velocityLabel}>30 Days</Text>
                  <Text style={styles.velocityNum}>{analytics.monthlyBookings}</Text>
                  <Text style={styles.velocitySub}>monthly</Text>
                </View>
              </View>

              {/* Time Blocks */}
              <Text style={styles.sectionHeader}>Time-of-Day Distribution</Text>
              <View style={styles.cardBox}>
                {(analytics.timeBlocks || []).map((tb) => (
                  <View key={tb.block} style={styles.blockRow}>
                    <View style={styles.blockInfo}>
                      <Text style={styles.blockTitle}>{tb.label}</Text>
                      <Text style={styles.blockSub}>{tb.hours} • {tb.bookingsCount} matches</Text>
                    </View>
                    <View style={styles.blockRight}>
                      <Text style={styles.blockAmount}>₹{tb.revenue.toLocaleString()}</Text>
                      <Text style={styles.blockPct}>{tb.occupancyPercent}% load</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Sport Revenue Share */}
              <Text style={styles.sectionHeader}>Sport Revenue Breakdown</Text>
              <View style={styles.cardBox}>
                {(analytics.sportShares || []).map((s) => (
                  <View key={s.sport} style={styles.sportRow}>
                    <View style={styles.sportHeader}>
                      <Text style={styles.sportName}>{s.sport}</Text>
                      <Text style={styles.sportAmount}>₹{s.revenue.toLocaleString()} ({s.percentage}%)</Text>
                    </View>
                    <View style={styles.sportTrack}>
                      <View style={[styles.sportFill, { width: `${Math.max(s.percentage, 5)}%` }]} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* TAB: ARENAS DRILLDOWN */}
          {activeTab === 'arenas' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionHeader}>Court-by-Court Performance</Text>
              <View style={styles.cardBox}>
                {(analytics.arenaPerformances || []).map((ap) => {
                  const isFiltered = selectedArenaId === ap.arenaId;
                  return (
                    <TouchableOpacity
                      key={ap.arenaId}
                      onPress={() => handleArenaSelect(ap.arenaId)}
                      style={[styles.arenaPerformanceRow, isFiltered && styles.arenaPerformanceRowActive]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.arenaPerfName}>{ap.arenaName}</Text>
                        <Text style={styles.arenaPerfSub}>
                          {ap.totalBookings} bookings • {ap.occupancyPercent}% share
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.arenaPerfRevenue}>₹{ap.totalRevenue.toLocaleString()}</Text>
                        {isFiltered && (
                          <Text style={styles.arenaActiveFilterTag}>Filtered</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* TAB: HEATMAP */}
          {activeTab === 'heatmap' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionHeader}>Hourly Slot Heatmap (6 AM - 11 PM)</Text>
              <View style={styles.heatmapGrid}>
                {(analytics.hourlyHeatmap || []).map((slot) => {
                  const occ = slot.occupancyPercent;
                  let cardBg = '#131b2e';
                  let barColor = '#334155';
                  let textColor = '#94a3b8';
                  if (occ >= 70) {
                    cardBg = '#064e3b';
                    barColor = '#10b981';
                    textColor = '#6ee7b7';
                  } else if (occ >= 30) {
                    cardBg = '#0c4a6e';
                    barColor = '#38bdf8';
                    textColor = '#7dd3fc';
                  }

                  return (
                    <View key={slot.hourLabel} style={[styles.heatmapCard, { backgroundColor: cardBg }]}>
                      <Text style={[styles.heatmapHour, { color: textColor }]}>{slot.hourLabel}</Text>
                      <Text style={styles.heatmapCount}>{slot.bookingsCount} slots</Text>
                      <View style={styles.heatmapBarTrack}>
                        <View style={[styles.heatmapBarFill, { backgroundColor: barColor, width: `${Math.max(occ, 8)}%` }]} />
                      </View>
                      <Text style={styles.heatmapPct}>{occ}%</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* TAB: VIPS */}
          {activeTab === 'vips' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionHeader}>Top Regular Athletes & Captains</Text>
              <View style={styles.cardBox}>
                {(analytics.topRegularPlayers || []).map((p, idx) => (
                  <View key={p.playerId} style={styles.vipRow}>
                    <View style={styles.vipRankBadge}>
                      <Text style={styles.vipRankText}>#{idx + 1}</Text>
                    </View>
                    <View style={styles.vipInfo}>
                      <Text style={styles.vipName}>{p.playerName}</Text>
                      <Text style={styles.vipSport}>{p.favoriteSport || 'Multi-sport'} • {p.totalBookings} matches</Text>
                    </View>
                    <View style={styles.vipSpendBox}>
                      <Text style={styles.vipSpend}>₹{p.totalSpent.toLocaleString()}</Text>
                      <Text style={styles.vipSub}>{p.lastBookingDate || 'Recent'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* TAB: TIPS */}
          {activeTab === 'tips' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionHeader}>Smart Revenue Suggestions</Text>
              {(analytics.smartRecommendations || []).map((rec) => (
                <View key={rec.id} style={styles.recCard}>
                  <View style={styles.recHeader}>
                    <View style={styles.recBadge}>
                      <Zap size={10} color="#f59e0b" />
                      <Text style={styles.recBadgeText}>{rec.impactLevel} IMPACT</Text>
                    </View>
                    <Text style={styles.recType}>{rec.type}</Text>
                  </View>
                  <Text style={styles.recTitle}>{rec.title}</Text>
                  <Text style={styles.recDesc}>{rec.description}</Text>
                  {rec.actionLabel && (
                    <View style={styles.recActionRow}>
                      <Text style={styles.recActionText}>{rec.actionLabel}</Text>
                      <ChevronRight size={12} color="#10b981" />
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1d',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  timeframeContainer: {
    flexDirection: 'row',
    backgroundColor: '#131b2e',
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  timeframeBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  timeframeBtnActive: {
    backgroundColor: '#10b981',
  },
  timeframeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  timeframeBtnTextActive: {
    color: '#041014',
    fontWeight: '800',
  },
  arenaSelectorContainer: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  arenaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  arenaHeaderLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#818cf8',
    letterSpacing: 0.5,
  },
  arenaHeaderActiveName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  arenaChipScroll: {
    gap: 6,
  },
  arenaChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  arenaChipActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#6366f1',
  },
  arenaChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  arenaChipTextActive: {
    color: '#ffffff',
  },
  downloadHubCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  downloadHubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  downloadHubTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#10b981',
    letterSpacing: 0.5,
  },
  proPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  proPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#f59e0b',
  },
  downloadButtonsGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  downloadActionBtn: {
    flex: 1,
    backgroundColor: '#131b2e',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  downloadActionTop: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  downloadActionMain: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 1,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 24,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  emptySubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
  },
  revenueHeroCard: {
    backgroundColor: '#131b2e',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    marginBottom: 12,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  heroHeaderLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: 0.5,
  },
  heroAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 14,
  },
  splitSection: {
    backgroundColor: '#0a0f1d',
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  splitLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  splitLabelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  splitText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  splitTrack: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
  },
  splitFillOnline: {
    backgroundColor: '#10b981',
    height: '100%',
  },
  splitFillCash: {
    backgroundColor: '#38bdf8',
    height: '100%',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 2,
  },
  kpiValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 4,
  },
  kpiLabel: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tabNav: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    marginBottom: 14,
  },
  tabNavItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabNavItemActive: {
    borderBottomColor: '#10b981',
  },
  tabNavText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tabNavTextActive: {
    color: '#10b981',
  },
  tabContent: {
    gap: 14,
  },
  velocityGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  velocityCard: {
    flex: 1,
    backgroundColor: '#131b2e',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  velocityLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  velocityNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 2,
  },
  velocitySub: {
    fontSize: 9,
    color: '#94a3b8',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardBox: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 12,
  },
  blockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 8,
  },
  blockInfo: {
    flex: 1,
  },
  blockTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  blockSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  blockRight: {
    alignItems: 'flex-end',
  },
  blockAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10b981',
  },
  blockPct: {
    fontSize: 9,
    color: '#64748b',
  },
  sportRow: {
    gap: 4,
  },
  sportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sportName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  sportAmount: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38bdf8',
  },
  sportTrack: {
    height: 4,
    backgroundColor: '#0a0f1d',
    borderRadius: 2,
    overflow: 'hidden',
  },
  sportFill: {
    height: '100%',
    backgroundColor: '#38bdf8',
    borderRadius: 2,
  },
  arenaPerformanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  arenaPerformanceRowActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 6,
  },
  arenaPerfName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  arenaPerfSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  arenaPerfRevenue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#10b981',
  },
  arenaActiveFilterTag: {
    fontSize: 8,
    fontWeight: '800',
    color: '#818cf8',
    textTransform: 'uppercase',
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  heatmapCard: {
    width: '23%',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    gap: 2,
  },
  heatmapHour: {
    fontSize: 9,
    fontWeight: '700',
  },
  heatmapCount: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
  },
  heatmapBarTrack: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 1.5,
    overflow: 'hidden',
    marginVertical: 2,
  },
  heatmapBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  heatmapPct: {
    fontSize: 8,
    color: '#94a3b8',
    fontWeight: '600',
  },
  vipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  vipRankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0a0f1d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vipRankText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#f59e0b',
  },
  vipInfo: {
    flex: 1,
  },
  vipName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  vipSport: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  vipSpendBox: {
    alignItems: 'flex-end',
  },
  vipSpend: {
    fontSize: 13,
    fontWeight: '900',
    color: '#10b981',
  },
  vipSub: {
    fontSize: 9,
    color: '#64748b',
  },
  recCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 10,
    gap: 6,
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  recBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#f59e0b',
  },
  recType: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  recTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  recDesc: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
  },
  recActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  recActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10b981',
  },
});

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

const BAR_WIDTH = 260;
const BALL_SIZE = 24;
const NET_MARGIN = 26;
const MAX_BALL_TRAVEL = BAR_WIDTH - BALL_SIZE - NET_MARGIN;

const LOADING_STEPS = [
  'Dribbling onto the pitch...',
  'Checking grass & turf conditions...',
  'Powering up arena floodlights...',
  'Syncing live match slots...',
  'Ready for kickoff! ⚽',
];

export const SplashScreen: React.FC = () => {
  const progress = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    // Continuous ball rolling and progress fill with full native driver support
    const rollAnim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(progress, {
            toValue: 1,
            duration: 2200,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
          Animated.timing(rotation, {
            toValue: 1,
            duration: 2200,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(200),
        Animated.parallel([
          Animated.timing(progress, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(rotation, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // Subtle breathing pulse on logo
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.06,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    rollAnim.start();
    pulseAnim.start();

    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 1800);

    return () => {
      rollAnim.stop();
      pulseAnim.stop();
      clearInterval(interval);
    };
  }, [progress, rotation, pulseScale]);

  const fillTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-(BAR_WIDTH - NET_MARGIN), 0],
  });

  const ballTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [2, MAX_BALL_TRAVEL],
  });

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '720deg'],
  });

  return (
    <View style={styles.container}>
      {/* Brand Header */}
      <View style={styles.logoContainer}>
        <Animated.View style={[styles.iconCircle, { transform: [{ scale: pulseScale }] }]}>
          <Text style={styles.heroBall}>⚽</Text>
        </Animated.View>
        <Text style={styles.title}>TURFIT</Text>
        <Text style={styles.subtitle}>PREMIUM PITCHES • LIVE SLOTS • ARENAS</Text>
      </View>

      {/* Football Pitch Loading Bar */}
      <View style={styles.loadingSection}>
        <View style={styles.loadingHeader}>
          <Text style={styles.kickoffBadge}>KICKOFF LOADING</Text>
          <Text style={styles.matchTimeText}>00:90</Text>
        </View>

        {/* Pitch Track */}
        <View style={styles.pitchTrack}>
          {/* Pitch markings */}
          <View style={styles.centerLine} />
          <View style={styles.centerCircle} />
          <View style={styles.penaltyBox} />

          {/* Grass Fill Progress (Hardware Accelerated with native translateX) */}
          <Animated.View
            style={[
              styles.progressFill,
              {
                transform: [{ translateX: fillTranslateX }],
              },
            ]}
          />

          {/* Goal Net at the end */}
          <View style={styles.goalContainer}>
            <Text style={styles.goalIcon}>🥅</Text>
          </View>

          {/* Rolling Football */}
          <Animated.View
            style={[
              styles.ballWrapper,
              {
                transform: [
                  { translateX: ballTranslateX },
                  { rotate: spin },
                ],
              },
            ]}
          >
            <Text style={styles.ballText}>⚽</Text>
          </Animated.View>
        </View>

        {/* Progress Step Subtitle */}
        <Text style={styles.loadingStepText}>{LOADING_STEPS[stepIndex]}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070b12',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 70,
    paddingHorizontal: 24,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.5)',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  heroBall: {
    fontSize: 44,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 3,
    color: '#ffffff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#10b981',
  },
  loadingSection: {
    alignItems: 'center',
    width: '100%',
  },
  loadingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: BAR_WIDTH,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  kickoffBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34d399',
    letterSpacing: 1,
  },
  matchTimeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    fontVariant: ['tabular-nums'],
  },
  pitchTrack: {
    width: BAR_WIDTH,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#062013',
    borderWidth: 1.5,
    borderColor: '#10b981',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  centerLine: {
    position: 'absolute',
    left: (BAR_WIDTH - 2) / 2,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  centerCircle: {
    position: 'absolute',
    left: (BAR_WIDTH - 24) / 2,
    top: (38 - 24) / 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  penaltyBox: {
    position: 'absolute',
    right: 0,
    top: 6,
    bottom: 6,
    width: 32,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: BAR_WIDTH - NET_MARGIN,
    backgroundColor: 'rgba(16, 185, 129, 0.35)',
    borderTopLeftRadius: 19,
    borderBottomLeftRadius: 19,
  },
  goalContainer: {
    position: 'absolute',
    right: 6,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalIcon: {
    fontSize: 18,
  },
  ballWrapper: {
    position: 'absolute',
    left: 0,
    top: (38 - BALL_SIZE) / 2,
    width: BALL_SIZE,
    height: BALL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  ballText: {
    fontSize: 18,
  },
  loadingStepText: {
    marginTop: 14,
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
  },
});


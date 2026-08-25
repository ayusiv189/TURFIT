import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { ShieldCheck, Zap } from 'lucide-react-native';

export const SplashScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.iconCircle}>
          <Zap size={42} color="#10b981" />
        </View>
        <Text style={styles.title}>TRUFIT</Text>
        <Text style={styles.subtitle}>SPORTS ARENAS • COMMUNITY • BOOKINGS</Text>
      </View>
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#10b981" />
        <Text style={styles.loadingText}>Initializing TruFit Platform...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#ffffff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#94a3b8',
  },
  footer: {
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
});

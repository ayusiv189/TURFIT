import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { MailCheck, RefreshCw, LogOut } from 'lucide-react-native';

export const EmailVerificationScreen: React.FC = () => {
  const { user, reloadUser, logout } = useAuth();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');

  const handleCheckVerification = async () => {
    setChecking(true);
    setMessage('');
    try {
      await reloadUser();
      if (!auth.currentUser?.emailVerified) {
        setMessage('Your email is not verified yet. Please check your inbox or spam folder.');
      }
    } catch (err: any) {
      setMessage(err.message || 'Error checking verification status.');
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    if (!auth.currentUser) return;
    setResending(true);
    setMessage('');
    try {
      await sendEmailVerification(auth.currentUser);
      setMessage('A new verification email has been sent! Check your inbox.');
    } catch (err: any) {
      setMessage(err.message || 'Could not resend email right now. Please wait a moment.');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <MailCheck size={40} color="#10b981" />
        </View>

        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We sent a verification link to:
        </Text>
        <Text style={styles.emailText}>{user?.email}</Text>

        {!!message && (
          <View style={styles.messageBanner}>
            <Text style={styles.messageBannerText}>{message}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleCheckVerification}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator color="#064e3b" />
          ) : (
            <View style={styles.buttonInner}>
              <RefreshCw size={16} color="#064e3b" />
              <Text style={styles.primaryButtonText}>I've Verified My Email</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleResend}
          disabled={resending}
        >
          {resending ? (
            <ActivityIndicator color="#10b981" />
          ) : (
            <Text style={styles.secondaryButtonText}>Resend Verification Link</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <LogOut size={16} color="#ef4444" />
          <Text style={styles.logoutText}>Sign Out / Switch Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
  },
  emailText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#38bdf8',
    marginTop: 4,
    marginBottom: 16,
  },
  messageBanner: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  messageBannerText: {
    color: '#38bdf8',
    fontSize: 12,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#10b981',
    width: '100%',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#064e3b',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: '#1e293b',
    width: '100%',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  secondaryButtonText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
});

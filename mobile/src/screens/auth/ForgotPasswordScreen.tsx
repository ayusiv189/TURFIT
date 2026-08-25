import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { KeyRound, Mail, ArrowLeft } from 'lucide-react-native';

interface ForgotPasswordScreenProps {
  navigation: any;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Could not send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <ArrowLeft size={20} color="#94a3b8" />
        <Text style={styles.backText}>Back to Sign In</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <KeyRound size={36} color="#10b981" />
        </View>

        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter your registered email and we'll send you instructions to reset your password.
        </Text>

        {sent ? (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>Check Your Inbox</Text>
            <Text style={styles.successMessage}>
              Password reset link sent to {email}. Follow the instructions in the email to set a new password.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.primaryButtonText}>Return to Login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color="#94a3b8" />
                <TextInput
                  style={styles.input}
                  placeholder="yourname@domain.com"
                  placeholderTextColor="#64748b"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={handleReset}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#064e3b" />
              ) : (
                <Text style={styles.primaryButtonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  backText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
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
    width: 64,
    height: 64,
    borderRadius: 32,
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
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b1120',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#10b981',
    width: '100%',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#064e3b',
    fontSize: 14,
    fontWeight: '800',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    width: '100%',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    textAlign: 'center',
  },
  successBox: {
    alignItems: 'center',
    width: '100%',
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 13,
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
});

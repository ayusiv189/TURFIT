import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { UserRole } from '../../types';
import { sanitizeData } from '../../services/dbService';
import { Zap, Mail, Lock, User, MapPin } from 'lucide-react-native';

interface SignUpScreenProps {
  navigation: any;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation }) => {
  const [role, setRole] = useState<UserRole>('PLAYER');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('Mumbai');
  const [businessName, setBusinessName] = useState('');
  const [preferredSport, setPreferredSport] = useState('Football');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const sportsList = ['Football', 'Cricket', 'Badminton', 'Tennis', 'Basketball', 'Pickleball'];

  const handleSignUp = async () => {
    if (!displayName.trim() || !email.trim() || !password) {
      setErrorMessage('Please fill in all mandatory fields.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setErrorMessage('');
    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const fbUser = userCred.user;

      try {
        await updateProfile(fbUser, { displayName: displayName.trim() });
      } catch {}

      try {
        await sendEmailVerification(fbUser);
      } catch (e) {
        console.warn('Verification email send error:', e);
      }

      // Create user document in Firestore
      const userDocRef = doc(db, 'users', fbUser.uid);
      const now = new Date().toISOString();
      const profilePayload: Record<string, any> = {
        uid: fbUser.uid,
        email: fbUser.email || email.trim(),
        displayName: displayName.trim(),
        role,
        emailVerified: false,
        city: city.trim() || 'Mumbai',
        createdAt: now,
        updatedAt: now,
      };

      if (role === 'PLAYER') {
        profilePayload.preferredSport = preferredSport;
        profilePayload.preferredSports = [preferredSport];
      } else {
        profilePayload.businessName = businessName.trim() || `${displayName.trim()}'s Turf`;
        profilePayload.isOwnerAccount = true;
      }

      await setDoc(userDocRef, sanitizeData(profilePayload), { merge: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.appName}>Join TRUFIT</Text>
          <Text style={styles.tagline}>Create your account and get active</Text>
        </View>

        <View style={styles.roleToggleContainer}>
          <TouchableOpacity
            style={[styles.roleTab, role === 'PLAYER' && styles.activeRoleTab]}
            onPress={() => setRole('PLAYER')}
          >
            <Text style={[styles.roleTabText, role === 'PLAYER' && styles.activeRoleTabText]}>
              Player / Athlete
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleTab, role === 'OWNER' && styles.activeRoleTab]}
            onPress={() => setRole('OWNER')}
          >
            <Text style={[styles.roleTabText, role === 'OWNER' && styles.activeRoleTabText]}>
              Turf Owner
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {!!errorMessage && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <User size={18} color="#94a3b8" />
              <TextInput
                style={styles.input}
                placeholder="Rohit Sharma"
                placeholderTextColor="#64748b"
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>
          </View>

          {role === 'OWNER' && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Turf Business Name</Text>
              <View style={styles.inputWrapper}>
                <Zap size={18} color="#94a3b8" />
                <TextInput
                  style={styles.input}
                  placeholder="KickOff Sports Arena"
                  placeholderTextColor="#64748b"
                  value={businessName}
                  onChangeText={setBusinessName}
                />
              </View>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Mail size={18} color="#94a3b8" />
              <TextInput
                style={styles.input}
                placeholder="player@trufit.com"
                placeholderTextColor="#64748b"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Lock size={18} color="#94a3b8" />
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>City</Text>
            <View style={styles.inputWrapper}>
              <MapPin size={18} color="#94a3b8" />
              <TextInput
                style={styles.input}
                placeholder="Mumbai"
                placeholderTextColor="#64748b"
                value={city}
                onChangeText={setCity}
              />
            </View>
          </View>

          {role === 'PLAYER' && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Primary Sport</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportScroll}>
                {sportsList.map((sport) => (
                  <TouchableOpacity
                    key={sport}
                    style={[styles.sportChip, preferredSport === sport && styles.activeSportChip]}
                    onPress={() => setPreferredSport(sport)}
                  >
                    <Text
                      style={[
                        styles.sportChipText,
                        preferredSport === sport && styles.activeSportChipText,
                      ]}
                    >
                      {sport}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabledButton]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#064e3b" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {role === 'PLAYER' ? 'Create Athlete Account' : 'Register Turf Arena'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.signupLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
  },
  tagline: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  roleToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#131b2e',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  roleTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeRoleTab: {
    backgroundColor: '#10b981',
  },
  roleTabText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  activeRoleTabText: {
    color: '#064e3b',
  },
  card: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 14,
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
  sportScroll: {
    flexDirection: 'row',
    marginTop: 4,
  },
  sportChip: {
    backgroundColor: '#0b1120',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
  },
  activeSportChip: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  sportChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  activeSportChipText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#10b981',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#064e3b',
    fontSize: 14,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  footerText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  signupLink: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '700',
  },
});

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  cardSecondary: string;
  border: string;
  borderLight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  warning: string;
  error: string;
  success: string;
  inputBg: string;
  headerBg: string;
  tabBarBg: string;
  tabBarBorder: string;
  statusBarStyle: 'light' | 'dark';
}

export const darkColors: ThemeColors = {
  background: '#090d16',
  surface: '#0f172a',
  card: '#131d31',
  cardSecondary: '#1e293b',
  border: '#1e293b',
  borderLight: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',
  primary: '#10b981',
  primaryLight: '#34d399',
  primaryDark: '#064e3b',
  accent: '#38bdf8',
  warning: '#f59e0b',
  error: '#ef4444',
  success: '#10b981',
  inputBg: '#0b1120',
  headerBg: '#090d16',
  tabBarBg: '#0f172a',
  tabBarBorder: '#1e293b',
  statusBarStyle: 'light',
};

export const lightColors: ThemeColors = {
  background: '#f8fafc',
  surface: '#ffffff',
  card: '#ffffff',
  cardSecondary: '#f1f5f9',
  border: '#e2e8f0',
  borderLight: '#cbd5e1',
  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#64748b',
  primary: '#059669',
  primaryLight: '#10b981',
  primaryDark: '#064e3b',
  accent: '#0284c7',
  warning: '#d97706',
  error: '#dc2626',
  success: '#059669',
  inputBg: '#f1f5f9',
  headerBg: '#ffffff',
  tabBarBg: '#ffffff',
  tabBarBorder: '#e2e8f0',
  statusBarStyle: 'dark',
};

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  isDark: true,
  colors: darkColors,
  setMode: async () => {},
});

const THEME_STORAGE_KEY = '@trufit_theme_mode';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Requirement 6: Standardized single unified dark theme
  const mode: ThemeMode = 'dark';
  const isDark = true;
  const colors = darkColors;

  const setMode = async (_newMode: ThemeMode) => {
    // Single unified dark theme locked
  };

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

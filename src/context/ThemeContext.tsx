import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { AppColors, AppColorTheme } from '@/constants/colors';

type AppColorsType = Record<string, string>;

const THEME_STORAGE_KEY = '@inclusive-mapper/theme';

interface ThemeContextType {
  theme: AppColorTheme;
  colors: AppColorsType;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState<AppColorTheme>('dark');

  useEffect(() => {
    let isActive = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (!isActive) return;
      if (stored === 'light' || stored === 'dark') {
        setTheme(stored);
      } else {
        setTheme(systemScheme === 'light' ? 'light' : 'dark');
      }
    }).catch(() => undefined);
    return () => { isActive = false; };
  }, [systemScheme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => undefined);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors: AppColors[theme],
        toggleTheme,
        isDark: theme === 'dark',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from '../services/storage.service';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  toggleTheme: () => void;
  isDark: boolean;
  isCompact: boolean;
  toggleCompact: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'light',
  toggleTheme: () => {},
  isDark: false,
  isCompact: false,
  toggleCompact: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const STORAGE_KEY = 'his-theme-mode';
const COMPACT_KEY = 'his-theme-compact';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      const stored = storage.getRaw(STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') return stored;
    } catch { /* ignore */ }
    return 'light';
  });

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    try {
      return storage.getRaw(COMPACT_KEY) === '1';
    } catch { /* ignore */ }
    return false;
  });

  useEffect(() => {
    try {
      storage.set(STORAGE_KEY, themeMode);
    } catch { /* ignore */ }
    // Toggle a class on body for global CSS overrides if needed
    document.body.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  useEffect(() => {
    try {
      storage.set(COMPACT_KEY, isCompact ? '1' : '0');
    } catch { /* ignore */ }
    document.body.setAttribute('data-density', isCompact ? 'compact' : 'default');
  }, [isCompact]);

  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const toggleCompact = useCallback(() => {
    setIsCompact((prev) => !prev);
  }, []);

  return (
    <ThemeContext.Provider
      value={{ themeMode, toggleTheme, isDark: themeMode === 'dark', isCompact, toggleCompact }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;

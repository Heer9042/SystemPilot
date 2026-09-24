import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/tauriApi';

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('systempilot_theme') || 'dark';
    }
    return 'dark';
  });

  const getSystemTheme = useCallback(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  }, []);

  const applyThemeToDOM = useCallback((t) => {
    const root = document.documentElement;
    const resolved = t === 'system' ? getSystemTheme() : t;

    if (resolved === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [getSystemTheme]);

  useEffect(() => {
    async function loadSavedTheme() {
      try {
        const settings = await api.getSettings();
        if (settings?.theme) {
          setTheme(settings.theme);
          localStorage.setItem('systempilot_theme', settings.theme);
          applyThemeToDOM(settings.theme);
        } else {
          applyThemeToDOM(theme);
        }
      } catch (e) {
        applyThemeToDOM(theme);
      }
    }
    loadSavedTheme();
  }, [applyThemeToDOM]);

  // Listen for OS / Windows system theme changes if theme === 'system'
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      if (theme === 'system') {
        applyThemeToDOM('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyThemeToDOM]);

  const changeTheme = async (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('systempilot_theme', newTheme);
    applyThemeToDOM(newTheme);
    try {
      await api.setSetting('theme', newTheme);
    } catch (e) {
      console.warn('Could not persist theme to SQLite:', e);
    }
  };

  const toggleTheme = async () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    await changeTheme(nextTheme);
  };

  return { theme, toggleTheme, changeTheme };
}

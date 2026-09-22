import { useState, useEffect } from 'react';
import { api } from '../services/tauriApi';

export function useTheme() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    async function loadTheme() {
      const settings = await api.getSettings();
      if (settings?.theme) {
        setTheme(settings.theme);
        applyTheme(settings.theme);
      }
    }
    loadTheme();
  }, []);

  const applyTheme = (t) => {
    const root = document.documentElement;
    if (t === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    applyTheme(newTheme);
    await api.setSetting('theme', newTheme);
  };

  return { theme, toggleTheme };
}

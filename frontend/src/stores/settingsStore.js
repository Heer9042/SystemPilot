import { useState, useEffect, useCallback } from 'react';
import { databaseService } from '../services/database';

export function useSettingsStore() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const data = await databaseService.getSettings();
      setSettings(data || {});
      setLoading(false);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }, []);

  const updateSetting = useCallback(async (key, value) => {
    try {
      await databaseService.setSetting(key, String(value));
      setSettings((prev) => ({ ...prev, [key]: String(value) }));
    } catch (err) {
      console.error(`Failed to update setting ${key}:`, err);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return { settings, updateSetting, refresh: loadSettings, loading };
}

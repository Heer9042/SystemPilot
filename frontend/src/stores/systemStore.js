import { useState, useEffect, useCallback } from 'react';
import { systemService } from '../services/tauri/system';

export function useSystemStore(refreshInterval = 2000) {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const data = await systemService.getSystemStats();
      setStats(data);
      setHistory((prev) => [...prev.slice(-29), data]);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch system stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchStats, refreshInterval]);

  return { stats, history, loading, refresh: fetchStats };
}

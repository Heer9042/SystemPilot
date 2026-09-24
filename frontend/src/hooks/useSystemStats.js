import { useState, useEffect, useRef } from 'react';
import { api } from '../services/tauriApi';

export function useSystemStats(intervalMs = 1000) {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState({
    cpu: [],
    ram: [],
    netDown: [],
    netUp: [],
    disk: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    let inFlight = false;

    async function fetchStats() {
      if (inFlight || !isMounted.current) return;
      inFlight = true;
      try {
        const data = await api.getSystemStats();
        if (!isMounted.current) return;

        setStats(data);
        setLoading(false);

        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setHistory((prev) => {
          const maxPoints = 30;
          return {
            cpu: [...prev.cpu.slice(-maxPoints + 1), { time: nowStr, value: Math.round(data.cpu_usage) }],
            ram: [...prev.ram.slice(-maxPoints + 1), { time: nowStr, value: Math.round(data.ram_usage_percent) }],
            netDown: [...prev.netDown.slice(-maxPoints + 1), { time: nowStr, value: Math.round(data.net_download_bytes_sec / 1024) }],
            netUp: [...prev.netUp.slice(-maxPoints + 1), { time: nowStr, value: Math.round(data.net_upload_bytes_sec / 1024) }],
            disk: [...prev.disk.slice(-maxPoints + 1), { time: nowStr, value: Math.round(data.disk_read_bytes_sec + data.disk_write_bytes_sec) / 1024 }],
          };
        });
      } catch (err) {
        if (isMounted.current) {
          setError(err.toString());
          setLoading(false);
        }
      } finally {
        inFlight = false;
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, intervalMs);

    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [intervalMs]);

  return { stats, history, loading, error };
}

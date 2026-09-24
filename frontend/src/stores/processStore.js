import { useState, useEffect, useCallback } from 'react';
import { processService } from '../services/tauri/processes';

export function useProcessStore(refreshInterval = 3000) {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProcesses = useCallback(async () => {
    try {
      const list = await processService.getProcesses();
      setProcesses(list || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch processes:', err);
    }
  }, []);

  const terminate = useCallback(async (pid) => {
    await processService.terminateProcess(pid);
    await fetchProcesses();
  }, [fetchProcesses]);

  useEffect(() => {
    fetchProcesses();
    const interval = setInterval(fetchProcesses, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchProcesses, refreshInterval]);

  return { processes, loading, refresh: fetchProcesses, terminate };
}

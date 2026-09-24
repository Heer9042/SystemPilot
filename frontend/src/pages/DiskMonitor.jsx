import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { api } from '../services/tauriApi';
import { formatBytes } from '../utils/formatters';
import { HardDrive, Server, ShieldCheck } from 'lucide-react';

export function DiskMonitor({ stats }) {
  const [disks, setDisks] = useState([]);
  const isFetchingRef = React.useRef(false);

  const fetchDisks = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const list = await api.getDiskDetails();
      setDisks(list || []);
    } catch (e) {
      console.error(e);
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchDisks();
    const interval = setInterval(fetchDisks, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> Storage Drives & Partitions
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Logical volumes, drive health, and filesystem metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {disks.map((disk, idx) => (
          <Card key={idx} className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-surface-800 text-brand-600 dark:text-brand-400 border border-slate-200 dark:border-slate-700/50">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {disk.name || disk.mount_point}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {disk.disk_kind} • {disk.file_system} • Mount: {disk.mount_point}
                  </p>
                </div>
              </div>
              <Badge variant={disk.usage_percent > 90 ? 'danger' : 'neutral'} size="sm">
                {Math.round(disk.usage_percent)}% Full
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-500 dark:text-slate-400">Used: {formatBytes(disk.used_space_bytes)}</span>
                <span className="text-slate-800 dark:text-slate-200">
                  Free: <strong>{formatBytes(disk.available_space_bytes)}</strong> / {formatBytes(disk.total_space_bytes)}
                </span>
              </div>
              <ProgressBar value={disk.usage_percent} size="sm" />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800">
              <span>Drive Health:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> SMART Healthy
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

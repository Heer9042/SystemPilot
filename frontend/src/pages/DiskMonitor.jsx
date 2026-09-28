import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { AlertNotice } from '../components/ui/AlertNotice';
import { api } from '../services/tauriApi';
import { formatBytes, formatSpeed } from '../utils/formatters';
import { HardDrive, RefreshCw, AlertCircle, Info } from 'lucide-react';

function getDiskTypeIcon(diskKind) {
  // Return a text label for the disk type
  if (diskKind === 'SSD') return { label: 'SSD', color: 'brand' };
  if (diskKind === 'HDD') return { label: 'HDD', color: 'neutral' };
  return { label: 'Storage', color: 'neutral' };
}

function DiskCard({ disk }) {
  const diskType = getDiskTypeIcon(disk.disk_kind);
  const usagePercent = disk.usage_percent || 0;
  const isCritical = usagePercent > 90;
  const isWarning = usagePercent > 75;

  return (
    <Card className="space-y-4">
      {/* Drive Header */}
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
              {disk.disk_kind} • {disk.file_system} • {disk.mount_point}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="neutral" size="sm">{diskType.label}</Badge>
          <Badge variant={isCritical ? 'danger' : isWarning ? 'warning' : 'neutral'} size="sm">
            {Math.round(usagePercent)}% Full
          </Badge>
        </div>
      </div>

      {/* Space Usage */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-slate-500 dark:text-slate-400">
            Used: {formatBytes(disk.used_space_bytes)}
          </span>
          <span className="text-slate-800 dark:text-slate-200">
            Free: <strong>{formatBytes(disk.available_space_bytes)}</strong> / {formatBytes(disk.total_space_bytes)}
          </span>
        </div>
        <ProgressBar
          value={usagePercent}
          size="sm"
          color={isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : undefined}
        />
      </div>

      {/* I/O Metrics */}
      {(disk.read_speed_bytes_sec !== undefined || disk.write_speed_bytes_sec !== undefined) && (
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Read Speed</span>
            <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatSpeed(disk.read_speed_bytes_sec || 0)}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Write Speed</span>
            <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">
              {formatSpeed(disk.write_speed_bytes_sec || 0)}
            </span>
          </div>
        </div>
      )}

      {/* Health Status — honest about what is available */}
      <div className="flex items-start justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-800">
        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <Info className="w-3 h-3" />
          Drive Health
        </span>
        <span className="text-slate-400 dark:text-slate-500 italic text-right max-w-[60%]">
          {disk.smart_status || 'Health status unavailable without administrator privileges'}
        </span>
      </div>
    </Card>
  );
}

export function DiskMonitor({ stats }) {
  const [disks, setDisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isFetchingRef = React.useRef(false);

  const fetchDisks = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setError(null);
    try {
      const list = await api.getDiskDetails();
      setDisks(list || []);
    } catch (e) {
      console.error('Disk details fetch failed:', e);
      setError('Unable to retrieve storage information.');
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisks();
    const interval = setInterval(fetchDisks, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            Storage Drives & Partitions
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Logical volumes, filesystem metrics, and available space
          </p>
        </div>
        <div className="flex items-center gap-2">
          {disks.length > 0 && (
            <Badge variant="brand" size="md">
              {disks.length} Volume{disks.length !== 1 ? 's' : ''}
            </Badge>
          )}
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={fetchDisks} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <Card className="p-8 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Reading storage information...
        </Card>
      )}

      {/* Error */}
      {!loading && error && (
        <AlertNotice title="Storage information unavailable" message={error} />
      )}

      {/* No Disks */}
      {!loading && !error && disks.length === 0 && (
        <Card className="p-8 text-center space-y-2">
          <HardDrive className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No storage volumes detected</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            No accessible storage volumes were found on this system.
          </p>
        </Card>
      )}

      {/* Disk Grid */}
      {!loading && disks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {disks.map((disk) => (
            <DiskCard key={disk.mount_point || disk.name} disk={disk} />
          ))}
        </div>
      )}

      {/* Health Information Note */}
      {!loading && disks.length > 0 && (
        <Card className="p-3 border-blue-200 dark:border-blue-500/20 bg-blue-50/40 dark:bg-blue-950/20">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              <strong>Drive health (S.M.A.R.T.)</strong> data requires administrator privileges and low-level hardware access.
              Use the Windows built-in <em>chkdsk</em> tool or a dedicated drive diagnostic utility for health assessment.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
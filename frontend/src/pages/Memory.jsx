import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Toggle } from '../components/ui/Toggle';
import { MemoryBreakdownBar } from '../components/charts/MemoryBreakdownBar';
import { api } from '../services/tauriApi';
import { formatBytes } from '../utils/formatters';
import {
  Layers,
  Sparkles,
  RefreshCw,
  Clock,
  History,
  Info,
  CheckCircle2,
} from 'lucide-react';

export function Memory({ stats }) {
  const [memDetails, setMemDetails] = useState(null);
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState(null);
  const [cleanupHistory, setCleanupHistory] = useState([]);
  const [autoClean, setAutoClean] = useState(false);
  const [threshold, setThreshold] = useState(85);
  const [cooldown, setCooldown] = useState(5);

  const fetchMemoryDetails = async () => {
    try {
      const data = await api.getDetailedMemoryStats();
      setMemDetails(data);
      const hist = await api.getCleanupHistory();
      setCleanupHistory(hist || []);
      const settings = await api.getSettings();
      if (settings) {
        setAutoClean(settings.auto_clean_enabled === 'true');
        setThreshold(Number(settings.auto_clean_threshold) || 85);
        setCooldown(Number(settings.auto_clean_cooldown_min) || 5);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMemoryDetails();
    const interval = setInterval(fetchMemoryDetails, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleCleanMemory = async () => {
    setCleaning(true);
    setCleanResult(null);
    try {
      const res = await api.cleanMemory();
      setCleanResult(res);
      await fetchMemoryDetails();
    } catch (err) {
      console.error(err);
    } finally {
      setCleaning(false);
    }
  };

  const handleAutoCleanToggle = async (val) => {
    setAutoClean(val);
    await api.setSetting('auto_clean_enabled', val ? 'true' : 'false');
  };

  const handleThresholdChange = async (val) => {
    setThreshold(val);
    await api.setSetting('auto_clean_threshold', val.toString());
  };

  const handleCooldownChange = async (val) => {
    setCooldown(val);
    await api.setSetting('auto_clean_cooldown_min', val.toString());
  };

  const totalRam = memDetails?.total_ram || stats?.ram_total_bytes || 1;
  const usedRam = memDetails?.used_ram || stats?.ram_used_bytes || 0;
  const availableRam = memDetails?.available_ram || stats?.ram_available_bytes || 0;
  const freeRam = memDetails?.free_ram || stats?.ram_free_bytes || 0;
  const cachedRam = memDetails?.cached_ram || 0;
  const standbyRam = memDetails?.standby_ram || 0;

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Hero Cleaner Banner */}
      <Card className="p-6 bg-gradient-to-r from-slate-100 via-indigo-50/50 to-indigo-100/60 dark:from-surface-900 dark:via-surface-900 dark:to-indigo-950/40 border-slate-200 dark:border-brand-500/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-brand-500 dark:text-brand-400" />
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Windows Memory Manager & Optimizer</h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            SystemPilot uses official Windows memory management APIs to safely trim non-essential application working sets and flush dormant cached pages back to system standby pool without terminating apps.
          </p>
          <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
            <Info className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
            <span>Safe & Non-destructive • No background processes are terminated</span>
          </div>
        </div>

        {/* Big Clean Memory Button */}
        <div className="flex flex-col items-center gap-2">
          <Button
            variant="primary"
            size="xl"
            icon={Sparkles}
            disabled={cleaning}
            onClick={handleCleanMemory}
            className="w-56 h-14 text-base font-bold shadow-2xl shadow-brand-600/40 animate-glow"
          >
            {cleaning ? 'CLEANING...' : 'CLEAN MEMORY'}
          </Button>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Click to release unreferenced RAM</span>
        </div>
      </Card>

      {/* Clean Result Callout */}
      {cleanResult && (
        <Card className="p-4 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-500/40 animate-scaleUp">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">Memory Successfully Optimized</h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300/80">{cleanResult.message}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Before: </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatBytes(cleanResult.ram_before)}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">After: </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-300">{formatBytes(cleanResult.ram_after)}</span>
              </div>
              <Badge variant="success" size="md">
                - {formatBytes(cleanResult.ram_released)} Released
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* RAM Visualization Bar */}
      <Card className="space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-slate-800 dark:text-slate-200">Physical Memory Distribution</span>
          <span className="font-mono text-slate-500 dark:text-slate-400">
            Total: <strong className="text-slate-800 dark:text-slate-200">{formatBytes(totalRam)}</strong>
          </span>
        </div>
        <MemoryBreakdownBar
          used={usedRam}
          standby={standbyRam}
          free={freeRam}
          total={totalRam}
          formatBytesFn={formatBytes}
        />
      </Card>

      {/* Detailed Memory Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <Card className="p-3.5 space-y-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">In-Use Physical RAM</span>
          <div className="text-lg font-bold font-mono text-brand-600 dark:text-brand-300">{formatBytes(usedRam)}</div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">Active working sets</p>
        </Card>

        <Card className="p-3.5 space-y-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Available Memory</span>
          <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatBytes(availableRam)}</div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">Free + Reclaimable</p>
        </Card>

        <Card className="p-3.5 space-y-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Cached / Standby</span>
          <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">{formatBytes(cachedRam || standbyRam)}</div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">Fast cache standby pool</p>
        </Card>

        <Card className="p-3.5 space-y-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Committed Memory</span>
          <div className="text-lg font-bold font-mono text-slate-800 dark:text-slate-200">
            {formatBytes(memDetails?.committed_ram || 0)}
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">Limit: {formatBytes(memDetails?.commit_limit || 0)}</p>
        </Card>

        <Card className="p-3.5 space-y-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Paged Pool</span>
          <div className="text-lg font-bold font-mono text-slate-800 dark:text-slate-200">{formatBytes(memDetails?.paged_pool || 0)}</div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">Kernel paged allocations</p>
        </Card>

        <Card className="p-3.5 space-y-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Non-Paged Pool</span>
          <div className="text-lg font-bold font-mono text-slate-800 dark:text-slate-200">{formatBytes(memDetails?.non_paged_pool || 0)}</div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">Locked kernel structures</p>
        </Card>

        <Card className="p-3.5 space-y-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Page File Allocated</span>
          <div className="text-lg font-bold font-mono text-slate-800 dark:text-slate-200">{formatBytes(memDetails?.page_file_total || 0)}</div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">Used: {formatBytes(memDetails?.page_file_used || 0)}</p>
        </Card>

        <Card className="p-3.5 space-y-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">RAM Load %</span>
          <div className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
            {memDetails?.usage_percentage?.toFixed(1) || 0}%
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">Hardware utilization</p>
        </Card>
      </div>

      {/* Automatic Memory Cleaning Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            <Sparkles className="w-4 h-4 text-brand-500 dark:text-brand-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Automatic Memory Optimization</h3>
          </div>

          <Toggle
            enabled={autoClean}
            onChange={handleAutoCleanToggle}
            label="Enable Automatic Background Cleaning"
            description="Automatically flushes reclaimable working sets when memory load exceeds threshold."
          />

          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-700 dark:text-slate-300 font-medium">Trigger RAM Threshold:</span>
              <span className="font-bold text-brand-600 dark:text-brand-300 font-mono">{threshold}%</span>
            </div>
            <div className="flex gap-2">
              {[50, 60, 70, 80, 85, 90].map((val) => (
                <button
                  key={val}
                  onClick={() => handleThresholdChange(val)}
                  className={`flex-1 py-1 rounded text-xs font-semibold transition ${
                    threshold === val
                      ? 'bg-brand-600 text-white shadow'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-surface-800 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {val}%
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-700 dark:text-slate-300 font-medium">Cleanup Cooldown Period:</span>
              <span className="font-bold text-brand-600 dark:text-brand-300 font-mono">{cooldown} min</span>
            </div>
            <div className="flex gap-2">
              {[1, 5, 10, 30].map((min) => (
                <button
                  key={min}
                  onClick={() => handleCooldownChange(min)}
                  className={`flex-1 py-1 rounded text-xs font-semibold transition ${
                    cooldown === min
                      ? 'bg-brand-600 text-white shadow'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-surface-800 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {min}m
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Cleanup History Log from SQLite */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Optimization History (SQLite)</h3>
            </div>
            <button onClick={fetchMemoryDetails} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {cleanupHistory.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No cleanup operations logged yet.</p>
            ) : (
              cleanupHistory.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800/80 text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <span className="text-slate-700 dark:text-slate-300">{new Date(item.timestamp).toLocaleTimeString()}</span>
                    <span className="text-slate-500 font-sans">{item.categories}</span>
                  </div>
                  <Badge variant="success" size="xs">
                    +{formatBytes(item.bytes_cleaned)}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { api } from '../services/tauriApi';
import { formatFrequency } from '../utils/formatters';
import { Cpu, Zap, Activity, Info } from 'lucide-react';

export function CpuManager({ stats, history }) {
  const [cpuDetails, setCpuDetails] = useState(null);

  useEffect(() => {
    async function fetchCpu() {
      try {
        const data = await api.getCpuDetailedInfo();
        setCpuDetails(data);
      } catch (e) {
        console.error(e);
      }
    }
    fetchCpu();
    const interval = setInterval(fetchCpu, 1500);
    return () => clearInterval(interval);
  }, []);

  const cores = cpuDetails?.core_usages || stats?.cpu_cores || [];

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Overview Top Card */}
      <Card className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {cpuDetails?.brand || stats?.cpu_name || 'Processor'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {cpuDetails?.vendor_id || 'x86_64'} • {cpuDetails?.physical_cores || 8} Physical Cores /{' '}
            {cpuDetails?.logical_cores || cores.length} Logical Processors
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 text-right">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Current Clock</span>
            <span className="text-sm font-bold font-mono text-brand-600 dark:text-brand-300">
              {formatFrequency(cpuDetails?.current_frequency_mhz || stats?.cpu_freq_mhz)}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 text-right">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Overall Load</span>
            <span className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-300">
              {Math.round(cpuDetails?.global_usage || stats?.cpu_usage || 0)}%
            </span>
          </div>
        </div>
      </Card>

      {/* Logical Cores Grid */}
      <Card className="space-y-3">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-500 dark:text-brand-400" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Per-Core Activity & Utilization</h3>
          </div>
          <span className="text-slate-500 dark:text-slate-400 font-mono">{cores.length} Active Threads</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {cores.map((usage, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800/80 flex flex-col justify-between gap-1.5"
            >
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Core #{idx}</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{Math.round(usage)}%</span>
              </div>
              <ProgressBar value={usage} size="xs" />
            </div>
          ))}
        </div>
      </Card>

      {/* Architecture & Power Management Notice */}
      <Card className="p-4 bg-slate-50 dark:bg-surface-900/60 border-slate-200 dark:border-slate-800 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400">
        <Info className="w-4 h-4 text-brand-500 dark:text-brand-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-slate-800 dark:text-slate-200 font-medium">Windows CPU Scheduling & Power Profiles</p>
          <p className="leading-relaxed">
            Windows dynamically throttles individual core frequencies according to active workload demands, thermal headroom, and power profiles. Setting processes to high priority allocates preferential scheduling slices without artificial overclocking risks.
          </p>
        </div>
      </Card>
    </div>
  );
}

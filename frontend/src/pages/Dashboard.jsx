import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { GaugeMeter } from '../components/charts/GaugeMeter';
import { AreaChartLive } from '../components/charts/AreaChartLive';
import { formatBytes, formatSpeed, formatFrequency, formatUptime } from '../utils/formatters';
import {
  Cpu,
  Layers,
  HardDrive,
  Wifi,
  Sparkles,
  Zap,
  ShieldCheck,
  Battery,
  BatteryCharging,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Server,
  Activity,
} from 'lucide-react';

export function Dashboard({ stats, history, onCleanMemory, setActiveTab }) {
  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400 text-sm">
        <Activity className="w-5 h-5 animate-spin mr-2 text-brand-500" />
        Reading system telemetry...
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Top Hero Banner & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-white via-slate-50 to-brand-50/40 dark:from-surface-900 dark:via-surface-900 dark:to-brand-950/40 border-slate-200 dark:border-brand-500/20 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{stats.host_name}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-surface-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {stats.os_name}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {stats.cpu_name} • <span className="font-mono">{stats.cpu_cores?.length || 0} Logical Cores</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="primary"
              size="md"
              icon={Sparkles}
              onClick={onCleanMemory}
              className="shadow-md shadow-brand-600/30"
            >
              Clean Memory
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={Zap}
              onClick={() => setActiveTab('performance')}
            >
              Performance
            </Button>
          </div>
        </Card>

        {/* System Uptime & Status Card */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>System Health</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100">
              {formatUptime(stats.uptime_seconds)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" /> System Uptime
            </p>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-2">
            <span>Processes:</span>
            <span className="font-bold font-mono text-brand-600 dark:text-brand-300">{stats.process_count}</span>
          </div>
        </Card>
      </div>

      {/* Primary 4 Metric Gauges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card hover onClick={() => setActiveTab('cpu')} className="flex flex-col items-center">
          <GaugeMeter
            value={stats.cpu_usage}
            label="CPU Load"
            sublabel={formatFrequency(stats.cpu_freq_mhz)}
            icon={Cpu}
          />
        </Card>

        <Card hover onClick={() => setActiveTab('memory')} className="flex flex-col items-center">
          <GaugeMeter
            value={stats.ram_usage_percent}
            label="Memory Load"
            sublabel={`${formatBytes(stats.ram_used_bytes)} / ${formatBytes(stats.ram_total_bytes)}`}
            icon={Layers}
          />
        </Card>

        <Card hover onClick={() => setActiveTab('disk')} className="flex flex-col items-center">
          <GaugeMeter
            value={stats.disk_total_bytes > 0 ? ((stats.disk_total_bytes - stats.disk_free_bytes) / stats.disk_total_bytes) * 100 : 0}
            label="Storage Used"
            sublabel={`${formatBytes(stats.disk_total_bytes - stats.disk_free_bytes)} / ${formatBytes(stats.disk_total_bytes)}`}
            icon={HardDrive}
          />
        </Card>

        <Card hover onClick={() => setActiveTab('network')} className="flex flex-col items-center justify-center p-4">
          <div className="w-full flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1.5"><Wifi className="w-4 h-4 text-sky-500 dark:text-sky-400" /> Network Activity</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-slate-50 dark:bg-surface-900/80 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <ArrowDownRight className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  <span>Download</span>
                </div>
                <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-300">
                  {formatSpeed(stats.net_download_bytes_sec)}
                </span>
              </div>
              <div className="flex items-center justify-between bg-slate-50 dark:bg-surface-900/80 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span>Upload</span>
                </div>
                <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-300">
                  {formatSpeed(stats.net_upload_bytes_sec)}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Live Graph Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">CPU Usage Timeline</h3>
            </div>
            <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold">{Math.round(stats.cpu_usage)}%</span>
          </div>
          <AreaChartLive data={history.cpu} color="#6366f1" unit="%" height={110} />
        </Card>

        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">RAM Usage Timeline</h3>
            </div>
            <span className="font-mono text-xs text-cyan-600 dark:text-cyan-400 font-bold">{Math.round(stats.ram_usage_percent)}%</span>
          </div>
          <AreaChartLive data={history.ram} color="#06b6d4" unit="%" height={110} />
        </Card>
      </div>

      {/* Battery & Power Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-surface-800 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-slate-700/50">
            {stats.is_charging ? <BatteryCharging className="w-6 h-6" /> : <Battery className="w-6 h-6" />}
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Power & Battery</span>
            <div className="text-base font-bold text-slate-800 dark:text-slate-100">
              {stats.battery_percent !== null ? `${Math.round(stats.battery_percent)}%` : 'AC Power Connected'}
            </div>
            <p className="text-[11px] text-slate-500">
              {stats.is_charging ? 'Charging plugged in' : 'Standard Power'}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-surface-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-slate-700/50">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Virtual / Swap Memory</span>
            <div className="text-base font-bold text-slate-800 dark:text-slate-100 font-mono">
              {formatBytes(stats.swap_used_bytes)} / {formatBytes(stats.swap_total_bytes)}
            </div>
            <p className="text-[11px] text-slate-500">Page file commitment</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-surface-800 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-slate-700/50">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Total Network Data</span>
            <div className="text-base font-bold text-slate-800 dark:text-slate-100 font-mono text-xs">
              ↓ {formatBytes(stats.net_total_received_bytes)} • ↑ {formatBytes(stats.net_total_transmitted_bytes)}
            </div>
            <p className="text-[11px] text-slate-500">Session accumulated transfer</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

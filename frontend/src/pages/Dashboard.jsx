import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { GaugeMeter } from '../components/charts/GaugeMeter';
import { AreaChartLive } from '../components/charts/AreaChartLive';
import { formatBytes, formatSpeed, formatFrequency, formatUptime } from '../utils/formatters';
import { api } from '../services/tauriApi';
import {
  Cpu,
  Layers,
  HardDrive,
  Wifi,
  Sparkles,
  Zap,
  ShieldCheck,
  ShieldAlert,
  Battery,
  BatteryCharging,
  BatteryWarning,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Server,
  Activity,
  Monitor,
  AlertTriangle,
  Rocket,
  Trash2,
  Gauge,
  BarChart2,
  ChevronRight,
  Thermometer,
} from 'lucide-react';

function SystemStatusBanner({ stats }) {
  const alerts = [];

  if (!stats) return null;

  if (stats.cpu_usage > 90) {
    alerts.push({ id: 'cpu', level: 'danger', msg: 'Very high CPU activity detected', icon: Cpu });
  } else if (stats.cpu_usage > 75) {
    alerts.push({ id: 'cpu', level: 'warning', msg: 'Elevated CPU activity', icon: Cpu });
  }

  if (stats.ram_usage_percent > 90) {
    alerts.push({ id: 'ram', level: 'danger', msg: 'Critical memory pressure', icon: Layers });
  } else if (stats.ram_usage_percent > 80) {
    alerts.push({ id: 'ram', level: 'warning', msg: 'High memory usage', icon: Layers });
  }

  if (stats.battery_percent !== null && stats.battery_percent !== undefined) {
    if (stats.battery_percent < 10 && !stats.is_charging) {
      alerts.push({ id: 'battery', level: 'danger', msg: `Battery critically low (${Math.round(stats.battery_percent)}%)`, icon: Battery });
    } else if (stats.battery_percent < 20 && !stats.is_charging) {
      alerts.push({ id: 'battery', level: 'warning', msg: `Battery low (${Math.round(stats.battery_percent)}%)`, icon: Battery });
    }
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const Icon = alert.icon;
        return (
          <div
            key={alert.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border ${
              alert.level === 'danger'
                ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300'
            }`}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            {alert.msg}
          </div>
        );
      })}
    </div>
  );
}

function QuickActionButton({ icon: Icon, label, onClick, color = 'brand' }) {
  const colorMap = {
    brand: 'hover:bg-brand-50 dark:hover:bg-brand-950/30 hover:border-brand-300 dark:hover:border-brand-500/40 hover:text-brand-700 dark:hover:text-brand-300',
    emerald: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:text-emerald-700 dark:hover:text-emerald-300',
    amber: 'hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 dark:hover:border-amber-500/40 hover:text-amber-700 dark:hover:text-amber-300',
    indigo: 'hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:text-indigo-700 dark:hover:text-indigo-300',
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-all ${colorMap[color] || colorMap.brand}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      <ChevronRight className="w-3 h-3 ml-auto opacity-50" />
    </button>
  );
}

function BatteryWidget({ stats }) {
  const hasBattery = stats.battery_percent !== null && stats.battery_percent !== undefined;

  if (!hasBattery) {
    return (
      <Card className="flex items-center gap-3.5">
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-surface-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700/50">
          <BatteryWarning className="w-6 h-6" />
        </div>
        <div>
          <span className="text-xs text-slate-500 dark:text-slate-400">Power & Battery</span>
          <div className="text-sm font-bold text-slate-600 dark:text-slate-300">AC Power</div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">No battery detected</p>
        </div>
      </Card>
    );
  }

  const pct = Math.round(stats.battery_percent);
  const isCharging = stats.is_charging;
  const isCritical = pct < 15 && !isCharging;
  const isLow = pct < 30 && !isCharging;

  return (
    <Card className="flex items-center gap-3.5">
      <div className={`p-3 rounded-xl border ${
        isCharging
          ? 'bg-emerald-50 dark:bg-surface-800 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-slate-700/50'
          : isCritical
          ? 'bg-red-50 dark:bg-surface-800 text-red-500 dark:text-red-400 border-red-200 dark:border-slate-700/50'
          : isLow
          ? 'bg-amber-50 dark:bg-surface-800 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-slate-700/50'
          : 'bg-amber-50 dark:bg-surface-800 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-slate-700/50'
      }`}>
        {isCharging ? <BatteryCharging className="w-6 h-6" /> : <Battery className="w-6 h-6" />}
      </div>
      <div>
        <span className="text-xs text-slate-500 dark:text-slate-400">Battery</span>
        <div className={`text-base font-bold ${isCritical ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}>
          {pct}%
        </div>
        <p className="text-[11px] text-slate-500">
          {isCharging ? 'Charging' : isLow ? 'Low battery' : 'On battery'}
        </p>
      </div>
    </Card>
  );
}

export function Dashboard({ stats, history, onCleanMemory, setActiveTab }) {
  const [gpuSummary, setGpuSummary] = useState(null);

  // Fetch GPU summary once for the dashboard widget
  useEffect(() => {
    let mounted = true;
    api.getGpuInfo().then((list) => {
      if (!mounted) return;
      if (list && list.length > 0) {
        setGpuSummary(list[0]); // Show primary GPU in dashboard
      }
    }).catch(() => {
      // GPU info unavailable — show nothing rather than fake data
    });
    return () => { mounted = false; };
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400 text-sm">
        <Activity className="w-5 h-5 animate-spin mr-2 text-brand-500" />
        Loading system information...
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* System Status Alerts */}
      <SystemStatusBanner stats={stats} />

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
              icon={Gauge}
              onClick={() => setActiveTab('performance')}
            >
              Performance
            </Button>
          </div>
        </Card>

        {/* System Uptime & Status Card */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>System Uptime</span>
            <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100">
              {formatUptime(stats.uptime_seconds)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Running continuously</p>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-2">
            <span>Active Processes:</span>
            <span className="font-bold font-mono text-brand-600 dark:text-brand-300">{stats.process_count}</span>
          </div>
        </Card>
      </div>

      {/* Primary Metric Gauges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card hover onClick={() => setActiveTab('cpu')} className="flex flex-col items-center cursor-pointer">
          <GaugeMeter
            value={stats.cpu_usage}
            label="CPU Load"
            sublabel={formatFrequency(stats.cpu_freq_mhz)}
            icon={Cpu}
          />
        </Card>

        <Card hover onClick={() => setActiveTab('memory')} className="flex flex-col items-center cursor-pointer">
          <GaugeMeter
            value={stats.ram_usage_percent}
            label="Memory Load"
            sublabel={`${formatBytes(stats.ram_used_bytes)} / ${formatBytes(stats.ram_total_bytes)}`}
            icon={Layers}
          />
        </Card>

        <Card hover onClick={() => setActiveTab('disk')} className="flex flex-col items-center cursor-pointer">
          <GaugeMeter
            value={stats.disk_total_bytes > 0 ? ((stats.disk_total_bytes - stats.disk_free_bytes) / stats.disk_total_bytes) * 100 : 0}
            label="Storage Used"
            sublabel={`${formatBytes(stats.disk_total_bytes - stats.disk_free_bytes)} / ${formatBytes(stats.disk_total_bytes)}`}
            icon={HardDrive}
          />
        </Card>

        {/* GPU Widget — shows real data or "Unavailable" */}
        <Card hover onClick={() => setActiveTab('gpu')} className="flex flex-col items-center justify-center p-4 cursor-pointer">
          {gpuSummary ? (
            <div className="w-full flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <Monitor className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                  GPU
                </span>
                <Badge variant="neutral" size="xs">{gpuSummary.vendor}</Badge>
              </div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                {gpuSummary.name}
              </p>
              <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                {gpuSummary.utilization_percent !== null && gpuSummary.utilization_percent !== undefined ? (
                  <div className="flex justify-between">
                    <span>Load</span>
                    <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">
                      {Math.round(gpuSummary.utilization_percent)}%
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span>VRAM</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {gpuSummary.dedicated_memory_bytes > 0
                      ? formatBytes(gpuSummary.dedicated_memory_bytes)
                      : 'Shared'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center justify-center gap-2 py-2">
              <Monitor className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              <div className="text-center">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">GPU</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Tap to view details
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Live Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">CPU Usage</h3>
            </div>
            <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold">{Math.round(stats.cpu_usage)}%</span>
          </div>
          <AreaChartLive data={history.cpu} color="#6366f1" unit="%" height={110} />
        </Card>

        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Memory Usage</h3>
            </div>
            <span className="font-mono text-xs text-cyan-600 dark:text-cyan-400 font-bold">{Math.round(stats.ram_usage_percent)}%</span>
          </div>
          <AreaChartLive data={history.ram} color="#06b6d4" unit="%" height={110} />
        </Card>
      </div>

      {/* Bottom Info Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Battery Widget — hardware-adaptive */}
        <BatteryWidget stats={stats} />

        {/* Page File / Swap */}
        <Card className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-surface-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-slate-700/50">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Page File (Swap)</span>
            <div className="text-base font-bold text-slate-800 dark:text-slate-100 font-mono text-sm">
              {formatBytes(stats.swap_used_bytes)} / {formatBytes(stats.swap_total_bytes)}
            </div>
            <p className="text-[11px] text-slate-500">Virtual memory commitment</p>
          </div>
        </Card>

        {/* Network Totals */}
        <Card className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-surface-800 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-slate-700/50">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Network — Session Total</span>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono">
              ↓ {formatBytes(stats.net_total_received_bytes)}
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              ↑ {formatBytes(stats.net_total_transmitted_bytes)}
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Navigation Actions */}
      <Card className="p-4 space-y-3">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <QuickActionButton icon={Activity} label="View Processes" onClick={() => setActiveTab('processes')} color="brand" />
          <QuickActionButton icon={Trash2} label="Clean Storage" onClick={() => setActiveTab('cleanup')} color="emerald" />
          <QuickActionButton icon={BarChart2} label="Run Benchmark" onClick={() => setActiveTab('benchmark')} color="indigo" />
          <QuickActionButton icon={ShieldCheck} label="Security Check" onClick={() => setActiveTab('security')} color="brand" />
          <QuickActionButton icon={Rocket} label="Manage Startup" onClick={() => setActiveTab('startup')} color="amber" />
          <QuickActionButton icon={HardDrive} label="View Hardware" onClick={() => setActiveTab('hardware')} color="indigo" />
          <QuickActionButton icon={Gauge} label="Performance" onClick={() => setActiveTab('performance')} color="brand" />
          <QuickActionButton icon={Monitor} label="GPU Info" onClick={() => setActiveTab('gpu')} color="indigo" />
        </div>
      </Card>
    </div>
  );
}
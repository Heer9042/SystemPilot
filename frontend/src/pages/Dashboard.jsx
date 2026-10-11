import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { GaugeMeter } from '../components/charts/GaugeMeter';
import { AreaChartLive } from '../components/charts/AreaChartLive';
import { formatBytes, formatSpeed, formatFrequency, formatUptime } from '../utils/formatters';
import { api } from '../services/tauriApi';
import { SystemCompatibilityModal } from '../components/modals/SystemCompatibilityModal';
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
  Info,
  Wind,
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
    cyan: 'hover:bg-cyan-50 dark:hover:bg-cyan-950/30 hover:border-cyan-300 dark:hover:border-cyan-500/40 hover:text-cyan-700 dark:hover:text-cyan-300',
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

function DashboardHeroBanner({ stats, onCleanMemory, setActiveTab }) {
  return (
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
            {stats.cpu_name || 'Processor'} • <span className="font-mono">{Array.isArray(stats.cpu_cores) ? stats.cpu_cores.length : (stats.cpu_cores || 0)} Logical Cores</span>
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
  );
}

function WindowsCardsRow({
  windowsInfo,
  stats,
  setShowWinDetailsModal,
  activationInfo,
  setShowActivationModal,
  compatReport,
  setShowCompatModal,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Windows Information Card */}
      <Card className="p-4 flex flex-col justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Windows System & Environment
            </span>
            <div className="flex items-center gap-1.5">
              {compatReport?.overall_compatibility_rating && (
                <Badge variant="brand" size="xs">
                  {compatReport.overall_compatibility_rating.replace('Profile', '').trim()}
                </Badge>
              )}
              <Badge variant="neutral" size="xs">
                {windowsInfo?.architecture || 'x64'}
              </Badge>
            </div>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {windowsInfo?.product_name || stats.os_name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Edition: {windowsInfo?.edition || 'Professional'} • Version: {windowsInfo?.display_version || 'Current'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-slate-400 text-[11px]">OS Build</span>
              <p className="font-mono font-medium text-slate-700 dark:text-slate-200">
                {windowsInfo?.full_build || stats.os_version}
              </p>
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">Device Form Factor</span>
              <p className="font-medium text-slate-700 dark:text-slate-200 truncate">
                {compatReport?.environment?.form_factor || 'Desktop / Portable'}
              </p>
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">Manufacturer</span>
              <p className="font-medium text-slate-700 dark:text-slate-200 truncate">
                {windowsInfo?.manufacturer || 'System Manufacturer'}
              </p>
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">System Type</span>
              <p className="font-medium text-slate-700 dark:text-slate-200">
                {windowsInfo?.system_type || 'x64-based PC'}
              </p>
            </div>
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="xs"
            icon={ShieldCheck}
            onClick={() => setShowCompatModal(true)}
          >
            Hardware Compatibility
          </Button>
          <Button
            variant="secondary"
            size="xs"
            icon={Info}
            onClick={() => setShowWinDetailsModal(true)}
          >
            Windows Details
          </Button>
        </div>
      </Card>

      {/* Windows Activation Card */}
      <Card className="p-4 flex flex-col justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Windows Activation
            </span>
            <Badge
              variant={activationInfo?.is_activated ? 'success' : 'neutral'}
              size="xs"
            >
              {activationInfo?.status || 'Verified State'}
            </Badge>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {activationInfo?.status || 'Checking activation...'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              License Channel: <span className="font-semibold text-slate-700 dark:text-slate-200">{activationInfo?.license_channel || 'Genuine Windows'}</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-slate-400 text-[11px]">Licensing Status</span>
              <p className="font-medium text-emerald-600 dark:text-emerald-400">
                {activationInfo?.is_activated ? 'Genuine License Active' : 'Unlicensed / Grace'}
              </p>
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">Last Checked</span>
              <p className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                {activationInfo?.last_checked || 'Current session'}
              </p>
            </div>
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button
            variant="secondary"
            size="xs"
            icon={ShieldCheck}
            onClick={() => setShowActivationModal(true)}
          >
            View Details
          </Button>
        </div>
      </Card>
    </div>
  );
}

function FanCoolingDashboardCard({ setActiveTab }) {
  const [coolingData, setCoolingData] = useState(null);

  useEffect(() => {
    let mounted = true;
    const loadFanData = () => {
      api.getFanCoolingDetails()
        .then((res) => {
          if (mounted && res) {
            setCoolingData(res);
          }
        })
        .catch(() => {});
    };

    loadFanData();
    const interval = setInterval(loadFanData, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const rawCpuTemp = coolingData?.cpu_temp_celsius ?? coolingData?.cpu_temperature_c;
  const cpuTemp = rawCpuTemp !== null && rawCpuTemp !== undefined
    ? `${Number(rawCpuTemp).toFixed(1)} °C`
    : 'Unavailable';

  const rawGpuTemp = coolingData?.gpu_temp_celsius ?? coolingData?.gpu_temperature_c;
  const gpuTemp = rawGpuTemp !== null && rawGpuTemp !== undefined
    ? `${Number(rawGpuTemp).toFixed(1)} °C`
    : 'Unavailable';

  const cpuFanRpm = coolingData?.cpu_fan_rpm !== null && coolingData?.cpu_fan_rpm !== undefined
    ? `${coolingData.cpu_fan_rpm} RPM`
    : 'Firmware Managed';

  const gpuFanRpm = coolingData?.gpu_fan_rpm !== null && coolingData?.gpu_fan_rpm !== undefined
    ? `${coolingData.gpu_fan_rpm} RPM`
    : (coolingData?.gpu_fan_percent !== null && coolingData?.gpu_fan_percent !== undefined
        ? `${Math.round(coolingData.gpu_fan_percent)}%`
        : 'Firmware Managed');

  const capabilityLabel = coolingData?.control_capability || coolingData?.fan_control_capability || 'Read-only';
  const capabilityBadgeVariant = capabilityLabel === 'Controllable'
    ? 'success'
    : 'neutral';

  const warnings = coolingData?.warnings || (coolingData?.thermal_warning ? [coolingData.thermal_warning] : []);

  return (
    <Card className="p-4 flex flex-col justify-between gap-3">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/40">
              <Wind className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Fan & Cooling Management
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Hardware tachometers & thermal dissipation status
              </p>
            </div>
          </div>
          <Badge variant={capabilityBadgeVariant} size="xs">
            {capabilityLabel}
          </Badge>
        </div>

        {/* Thermal Warnings Banner */}
        {warnings.length > 0 && (
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{warnings[0]}</span>
          </div>
        )}

        {/* Sensor readings grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-surface-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">CPU Temp</span>
            <p className="font-mono font-bold text-slate-700 dark:text-slate-200 mt-0.5">
              {cpuTemp}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-surface-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">GPU Temp</span>
            <p className="font-mono font-bold text-slate-700 dark:text-slate-200 mt-0.5">
              {gpuTemp}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-surface-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">CPU Fan</span>
            <p className="font-mono font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">
              {cpuFanRpm}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-surface-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">GPU Fan</span>
            <p className="font-mono font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">
              {gpuFanRpm}
            </p>
          </div>
        </div>

        {/* Extra fans if detected */}
        {coolingData?.fans && coolingData.fans.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Detected Tachometers:</span>
            <div className="flex flex-wrap gap-1.5">
              {coolingData.fans.map((fan) => (
                <span
                  key={fan.id}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-surface-800 text-[11px] font-mono text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                >
                  {fan.name}: {fan.current_rpm !== null && fan.current_rpm !== undefined ? `${fan.current_rpm} RPM` : (fan.status || 'Unavailable')}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span>
            {coolingData?.active_sensors_count || 0} active thermal sensor(s)
          </span>
          <span className="font-mono">
            {coolingData?.last_updated ? `Updated ${coolingData.last_updated}` : 'Awaiting telemetry'}
          </span>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
        <Button
          variant="secondary"
          size="xs"
          icon={Wind}
          onClick={() => setActiveTab('fans')}
        >
          Fan Management
        </Button>
      </div>
    </Card>
  );
}

function PrimaryGaugesRow({ stats, setActiveTab, gpuList = [] }) {
  const gpusToRender = gpuList && gpuList.length > 0 ? gpuList : null;
  const totalCards = 3 + (gpusToRender ? gpusToRender.length : 1);

  const gridColsClass =
    totalCards === 4
      ? 'grid-cols-2 md:grid-cols-4'
      : totalCards === 5
      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
      : totalCards >= 6
      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
      : 'grid-cols-2 md:grid-cols-4';

  return (
    <div className={`grid ${gridColsClass} gap-4`}>
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
          value={stats.disk_total_bytes > 0 ? Math.max(0, Math.min(100, (((stats.disk_total_bytes - stats.disk_free_bytes) / stats.disk_total_bytes) * 100))) : 0}
          label="Storage Used"
          sublabel={`${formatBytes(Math.max(0, (stats.disk_total_bytes || 0) - (stats.disk_free_bytes || 0)))} / ${formatBytes(stats.disk_total_bytes || 0)}`}
          icon={HardDrive}
        />
      </Card>

      {/* GPU Circle Gauges — Render every detected GPU */}
      {gpusToRender ? (
        gpusToRender.map((gpu, index) => {
          const rawVal =
            gpu.utilization_percent !== null && gpu.utilization_percent !== undefined
              ? gpu.utilization_percent
              : gpu.memory_utilization_percent !== null && gpu.memory_utilization_percent !== undefined
              ? gpu.memory_utilization_percent
              : 0;
          const value = Math.max(0, Math.min(100, Number(rawVal) || 0));

          const sameVendorCount = gpusToRender.filter((g) => g.vendor && g.vendor === gpu.vendor).length;
          const label =
            gpusToRender.length > 1
              ? sameVendorCount > 1
                ? `${gpu.vendor || 'GPU'} ${index + 1} Load`
                : `${gpu.vendor || 'GPU'} Load`
              : 'GPU Load';

          const sublabel = gpu.dedicated_memory_bytes > 0
            ? `${gpu.name || 'GPU'} • ${formatBytes(gpu.dedicated_memory_bytes)}`
            : (gpu.name ? `${gpu.name} • Shared` : 'DirectX Graphics');

          return (
            <Card
              key={gpu.name ? `${gpu.name}-${index}` : index}
              hover
              onClick={() => setActiveTab('gpu')}
              className="flex flex-col items-center cursor-pointer"
            >
              <GaugeMeter
                value={value}
                label={label}
                sublabel={sublabel}
                icon={Monitor}
              />
            </Card>
          );
        })
      ) : (
        <Card
          hover
          onClick={() => setActiveTab('gpu')}
          className="flex flex-col items-center cursor-pointer"
        >
          <GaugeMeter
            value={0}
            label="GPU Load"
            sublabel="Tap to view details"
            icon={Monitor}
          />
        </Card>
      )}
    </div>
  );
}

function WindowsDetailsModal({ isOpen, onClose, windowsInfo, stats }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Windows System Specifications"
    >
      <div className="space-y-4 text-xs">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{windowsInfo?.product_name || stats.os_name}</h4>
            <p className="text-slate-500 dark:text-slate-400">{windowsInfo?.edition} Edition • Display Version {windowsInfo?.display_version}</p>
          </div>
          <Badge variant="brand" size="sm">{windowsInfo?.architecture || 'x64'}</Badge>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <div className="py-2 flex justify-between">
            <span className="text-slate-500">Full OS Build</span>
            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{windowsInfo?.full_build || stats.os_version}</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500">Computer Name</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{windowsInfo?.computer_name || stats.host_name}</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500">Manufacturer</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{windowsInfo?.manufacturer || 'Unavailable'}</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500">Product Model</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{windowsInfo?.model || 'Unavailable'}</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500">System Architecture</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{windowsInfo?.system_type || 'x64-based PC'}</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500">Current User</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{windowsInfo?.current_user || 'Signed In'}</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500">Domain / Workgroup</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{windowsInfo?.domain_or_workgroup || 'WORKGROUP'}</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500">Last System Boot</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{windowsInfo?.last_boot_time || 'Recorded boot time'}</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500">Continuous Uptime</span>
            <span className="font-mono font-semibold text-brand-600 dark:text-brand-400">{formatUptime(stats.uptime_seconds)}</span>
          </div>
          {windowsInfo?.install_date && (
            <div className="py-2 flex justify-between">
              <span className="text-slate-500">OS Installation Date</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{windowsInfo.install_date}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="secondary" size="xs" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function WindowsActivationModal({ isOpen, onClose, activationInfo }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Windows Genuine Licensing Details"
    >
      <div className="space-y-4 text-xs">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-slate-400 text-[11px]">Activation State</span>
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{activationInfo?.status || 'Active'}</h4>
          </div>
          <Badge variant={activationInfo?.is_activated ? 'success' : 'neutral'} size="sm">
            {activationInfo?.is_activated ? 'Genuine License' : 'Unlicensed'}
          </Badge>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <div className="py-2 flex justify-between">
            <span className="text-slate-500">License Channel</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{activationInfo?.license_channel || 'Genuine Windows Licensing'}</span>
          </div>
          {activationInfo?.license_description && (
            <div className="py-2 flex justify-between">
              <span className="text-slate-500">Description</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{activationInfo.license_description}</span>
            </div>
          )}
          {activationInfo?.partial_product_key && (
            <div className="py-2 flex justify-between">
              <span className="text-slate-500">Product Key</span>
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{activationInfo.partial_product_key}</span>
            </div>
          )}
          <div className="py-2 flex justify-between">
            <span className="text-slate-500">Last Telemetry Check</span>
            <span className="font-mono text-slate-600 dark:text-slate-400">{activationInfo?.last_checked || 'Current session'}</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 leading-relaxed">
          SystemPilot directly queries the official Windows Software Licensing interface. Full product keys are never stored, transmitted, or collected.
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="secondary" size="xs" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function DashboardModals({
  showWinDetailsModal,
  setShowWinDetailsModal,
  windowsInfo,
  stats,
  showActivationModal,
  setShowActivationModal,
  activationInfo,
  showCompatModal,
  setShowCompatModal,
  compatReport,
  fetchCompat,
  compatLoading,
}) {
  return (
    <>
      <WindowsDetailsModal
        isOpen={showWinDetailsModal}
        onClose={() => setShowWinDetailsModal(false)}
        windowsInfo={windowsInfo}
        stats={stats}
      />
      <WindowsActivationModal
        isOpen={showActivationModal}
        onClose={() => setShowActivationModal(false)}
        activationInfo={activationInfo}
      />
      <SystemCompatibilityModal
        isOpen={showCompatModal}
        onClose={() => setShowCompatModal(false)}
        report={compatReport}
        onRefresh={fetchCompat}
        loading={compatLoading}
      />
    </>
  );
}

export function Dashboard({ stats, history, onCleanMemory, setActiveTab }) {
  const [gpuList, setGpuList] = useState([]);
  const [windowsInfo, setWindowsInfo] = useState(null);
  const [activationInfo, setActivationInfo] = useState(null);
  const [showWinDetailsModal, setShowWinDetailsModal] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [compatReport, setCompatReport] = useState(null);
  const [showCompatModal, setShowCompatModal] = useState(false);
  const [compatLoading, setCompatLoading] = useState(false);

  const fetchCompat = () => {
    setCompatLoading(true);
    api.getSystemCapabilities()
      .then((rep) => {
        if (rep) setCompatReport(rep);
      })
      .catch(() => {})
      .finally(() => {
        setCompatLoading(false);
      });
  };

  // Fetch Windows Info, Activation & live GPU info
  useEffect(() => {
    let mounted = true;

    const fetchGpus = () => {
      api.getGpuInfo().then((list) => {
        if (!mounted) return;
        if (list && Array.isArray(list)) {
          setGpuList(list);
        }
      }).catch(() => {});
    };

    fetchGpus();
    const gpuInterval = setInterval(fetchGpus, 2500);

    api.getWindowsSystemInfo().then((info) => {
      if (mounted && info) setWindowsInfo(info);
    }).catch(() => {});

    api.getWindowsActivationStatus().then((act) => {
      if (mounted && act) setActivationInfo(act);
    }).catch(() => {});

    api.getSystemCapabilities().then((rep) => {
      if (mounted && rep) setCompatReport(rep);
    }).catch(() => {});

    return () => {
      mounted = false;
      clearInterval(gpuInterval);
    };
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
      <DashboardHeroBanner
        stats={stats}
        onCleanMemory={onCleanMemory}
        setActiveTab={setActiveTab}
      />

      {/* Real Windows System Information & Activation Status Cards */}
      <WindowsCardsRow
        windowsInfo={windowsInfo}
        stats={stats}
        setShowWinDetailsModal={setShowWinDetailsModal}
        activationInfo={activationInfo}
        setShowActivationModal={setShowActivationModal}
        compatReport={compatReport}
        setShowCompatModal={setShowCompatModal}
      />

      {/* Dedicated Fan & Smart Cooling Status Card */}
      <FanCoolingDashboardCard setActiveTab={setActiveTab} />

      {/* Primary Metric Gauges */}
      <PrimaryGaugesRow
        stats={stats}
        setActiveTab={setActiveTab}
        gpuList={gpuList}
      />

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
          <AreaChartLive data={history?.cpu || []} color="#6366f1" unit="%" height={110} />
        </Card>

        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Memory Usage</h3>
            </div>
            <span className="font-mono text-xs text-cyan-600 dark:text-cyan-400 font-bold">{Math.round(stats.ram_usage_percent || 0)}%</span>
          </div>
          <AreaChartLive data={history?.ram || []} color="#06b6d4" unit="%" height={110} />
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          <QuickActionButton icon={Activity} label="View Processes" onClick={() => setActiveTab('processes')} color="brand" />
          <QuickActionButton icon={Wind} label="Fan & Cooling" onClick={() => setActiveTab('fans')} color="cyan" />
          <QuickActionButton icon={ShieldCheck} label="Compatibility" onClick={() => setShowCompatModal(true)} color="emerald" />
          <QuickActionButton icon={Trash2} label="Clean Storage" onClick={() => setActiveTab('cleanup')} color="emerald" />
          <QuickActionButton icon={BarChart2} label="Run Benchmark" onClick={() => setActiveTab('benchmark')} color="indigo" />
          <QuickActionButton icon={ShieldCheck} label="Security Check" onClick={() => setActiveTab('security')} color="brand" />
          <QuickActionButton icon={Rocket} label="Manage Startup" onClick={() => setActiveTab('startup')} color="amber" />
          <QuickActionButton icon={HardDrive} label="View Hardware" onClick={() => setActiveTab('hardware')} color="indigo" />
          <QuickActionButton icon={Gauge} label="Performance" onClick={() => setActiveTab('performance')} color="brand" />
          <QuickActionButton icon={Monitor} label="GPU Info" onClick={() => setActiveTab('gpu')} color="indigo" />
        </div>
      </Card>

      {/* Modals */}
      <DashboardModals
        showWinDetailsModal={showWinDetailsModal}
        setShowWinDetailsModal={setShowWinDetailsModal}
        windowsInfo={windowsInfo}
        stats={stats}
        showActivationModal={showActivationModal}
        setShowActivationModal={setShowActivationModal}
        activationInfo={activationInfo}
        showCompatModal={showCompatModal}
        setShowCompatModal={setShowCompatModal}
        compatReport={compatReport}
        fetchCompat={fetchCompat}
        compatLoading={compatLoading}
      />
    </div>
  );
}
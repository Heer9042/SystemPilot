import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { api } from '../services/tauriApi';
import {
  Wind,
  Cpu,
  Tv,
  Thermometer,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Play,
  Pause,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Sliders,
  Settings,
  Info,
  Clock,
  RotateCcw,
  Zap,
} from 'lucide-react';

function FanManagementHeader({
  coolingData,
  pollingActive,
  setPollingActive,
  pollIntervalMs,
  setPollIntervalMs,
  loading,
  fetchCooling,
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
          <Wind className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Fan Speed & Thermal Management
            </h1>
            <Badge variant={coolingData?.thermal_warning ? 'danger' : 'success'} size="xs">
              {coolingData?.thermal_warning ? 'High Thermal Load' : 'Cooling Operational'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Live hardware tachometer telemetry, thermal zones, and safe cooling policy controls
          </p>
        </div>
      </div>

      {/* Polling Controls & Polling Interval */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-white dark:bg-surface-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 text-xs">
          <button
            onClick={() => setPollingActive(!pollingActive)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              pollingActive
                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
            }`}
          >
            {pollingActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {pollingActive ? 'Live' : 'Paused'}
          </button>

          <select
            aria-label="Fan telemetry polling interval"
            value={pollIntervalMs}
            onChange={(e) => setPollIntervalMs(Number(e.target.value))}
            className="bg-transparent text-[11px] font-medium text-slate-600 dark:text-slate-400 focus:outline-none pr-1 cursor-pointer"
          >
            <option value={1000}>1 sec</option>
            <option value={2000}>2 sec</option>
            <option value={5000}>5 sec</option>
          </select>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={RefreshCw}
          onClick={fetchCooling}
          loading={loading}
        >
          Refresh
        </Button>
      </div>
    </div>
  );
}

function getTemperatureBadge(temp, highThreshold = 85, warmThreshold = null) {
  if (!temp) return { variant: 'neutral', label: 'Unavailable' };
  if (temp > highThreshold) return { variant: 'danger', label: 'High' };
  if (warmThreshold !== null && temp > warmThreshold) return { variant: 'warning', label: 'Warm' };
  return { variant: 'success', label: 'Normal' };
}

function CpuTemperatureMetricCard({ cpuTemp }) {
  const badge = getTemperatureBadge(cpuTemp, 85, 72);

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-indigo-500" />
          CPU Temperature
        </span>
        <Badge variant={badge.variant} size="xs">
          {badge.label}
        </Badge>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-50">
          {cpuTemp ? `${cpuTemp.toFixed(1)}` : 'Unavailable'}
        </span>
        {cpuTemp && <span className="text-sm font-semibold text-slate-400">°C</span>}
      </div>
      <p className="text-[10px] text-slate-400">Hardware package sensor</p>
    </Card>
  );
}

function GpuTemperatureMetricCard({ gpuTemp, gpuHotspot }) {
  const badge = getTemperatureBadge(gpuTemp, 85, null);

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Tv className="w-3.5 h-3.5 text-purple-500" />
          GPU Temperature
        </span>
        <Badge variant={badge.variant} size="xs">
          {badge.label}
        </Badge>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-50">
          {gpuTemp ? `${gpuTemp.toFixed(1)}` : 'Unavailable'}
        </span>
        {gpuTemp && <span className="text-sm font-semibold text-slate-400">°C</span>}
      </div>
      <p className="text-[10px] text-slate-400">
        {gpuHotspot ? `Hotspot: ${gpuHotspot.toFixed(1)}°C` : 'Graphics core sensor'}
      </p>
    </Card>
  );
}

function CpuFanMetricCard({ cpuFanRpm, coolingData }) {
  const hasRpm = cpuFanRpm !== null && cpuFanRpm !== undefined;
  const isControllable = coolingData?.control_capability === 'Controllable';
  const badgeLabel = hasRpm ? 'Tachometer Active' : (isControllable ? 'Adaptive Ready' : 'Dynamic Auto');
  const dutyCycle = coolingData?.cpu_fan_percent != null ? Math.round(coolingData.cpu_fan_percent) : null;

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Wind className="w-3.5 h-3.5 text-cyan-500" />
          CPU Fan Speed
        </span>
        <Badge variant={hasRpm ? 'success' : 'neutral'} size="xs">
          {badgeLabel}
        </Badge>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-50">
          {hasRpm ? `${cpuFanRpm.toLocaleString()}` : 'Unavailable'}
        </span>
        {hasRpm && <span className="text-sm font-semibold text-slate-400">RPM</span>}
      </div>
      <p className="text-[10px] text-slate-400">
        {dutyCycle != null ? `Duty Cycle: ${dutyCycle}% • Heatsink tachometer` : (hasRpm ? 'Chassis/Cooler RPM reading' : 'ACPI dynamic thermal curve')}
      </p>
    </Card>
  );
}

function GpuFanMetricCard({ gpuFanRpm, gpuFanPercent, coolingData }) {
  const hasRpm = gpuFanRpm !== null && gpuFanRpm !== undefined;
  const isZero = gpuFanRpm === 0;
  const isControllable = coolingData?.control_capability === 'Controllable';

  let badgeLabel = 'Dynamic Auto';
  if (isZero) badgeLabel = 'Zero RPM Mode';
  else if (hasRpm) badgeLabel = `${gpuFanRpm.toLocaleString()} RPM`;
  else if (isControllable) badgeLabel = 'Adaptive Ready';

  const hasPercent = gpuFanPercent !== null && gpuFanPercent !== undefined;

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Wind className="w-3.5 h-3.5 text-blue-500" />
          GPU Fan Speed
        </span>
        <Badge variant={hasRpm ? 'success' : 'neutral'} size="xs">
          {badgeLabel}
        </Badge>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-50">
          {hasRpm ? `${gpuFanRpm.toLocaleString()}` : 'Unavailable'}
        </span>
        {hasRpm && <span className="text-sm font-semibold text-slate-400">RPM</span>}
      </div>
      <p className="text-[10px] text-slate-400">
        {hasPercent ? `Duty Cycle: ${Math.round(gpuFanPercent)}% • Active cooler` : 'GPU active cooler'}
      </p>
    </Card>
  );
}

function FanMetricSummaryCards({
  cpuTemp,
  gpuTemp,
  gpuHotspot,
  cpuFanRpm,
  gpuFanRpm,
  gpuFanPercent,
  coolingData,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <CpuTemperatureMetricCard cpuTemp={cpuTemp} />
      <GpuTemperatureMetricCard gpuTemp={gpuTemp} gpuHotspot={gpuHotspot} />
      <CpuFanMetricCard cpuFanRpm={cpuFanRpm} coolingData={coolingData} />
      <GpuFanMetricCard gpuFanRpm={gpuFanRpm} gpuFanPercent={gpuFanPercent} coolingData={coolingData} />
    </div>
  );
}

function FanSensorsCard({ coolingData }) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Wind className="w-4 h-4 text-cyan-500" />
          Detected Fan Sensors ({coolingData?.fans?.length || 0})
        </h3>
        <span className="text-[10px] font-mono text-slate-400">
          Updated: {coolingData?.last_updated || 'Live'}
        </span>
      </div>

      <div className="space-y-2.5">
        {coolingData?.fans?.map((fan) => (
          <div key={fan.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-surface-800/60 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">{fan.name}</h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-mono">{fan.hardware_type}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">• {fan.status}</span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-100">
                {fan.current_rpm !== null && fan.current_rpm !== undefined ? (fan.current_rpm === 0 ? '0 RPM (Silent)' : `${fan.current_rpm.toLocaleString()} RPM`) : (fan.status || 'Unavailable')}
              </div>
              {fan.current_percent !== null && fan.current_percent !== undefined && (
                <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 block">
                  {Math.round(fan.current_percent)}% duty
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Hardware Capability Disclosure */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-900/50 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-indigo-500" />
          Controller Capability & Architecture Notes
        </span>
        <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
          {coolingData?.hardware_notes}
        </p>
      </div>
    </Card>
  );
}

function ThermalZonesCard({ coolingData }) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-red-500" />
          Thermal Zones & Critical Safety Thresholds
        </h3>
        <span className="text-[10px] text-slate-400">°C Celsius</span>
      </div>

      <div className="space-y-2.5">
        {coolingData?.temperatures?.map((tz) => (
          <div key={tz.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-surface-800/60 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">{tz.name}</h4>
              <span className="text-[10px] text-slate-400 font-mono">
                Trip Limit: {tz.critical_limit_celsius ? `${tz.critical_limit_celsius}°C` : '100°C'}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100">
                {tz.temperature_celsius ? `${tz.temperature_celsius.toFixed(1)}°C` : 'Unavailable'}
              </span>
              <Badge
                variant={tz.status.includes('High') ? 'danger' : tz.status === 'Elevated' ? 'warning' : 'success'}
                size="xs"
              >
                {tz.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px]">
          Thermal safety policy: Firmware-managed thermal throttling and emergency shutdown procedures are enforced directly at the hardware layer and will never be overridden.
        </p>
      </div>
    </Card>
  );
}

function CoolingProfilesCard({
  coolingData,
  controlLoading,
  handleApplyCoolingPolicy,
  handleRestoreAuto,
  manualSpeed,
  setManualSpeed,
  setPendingSpeed,
  setShowConfirmModal,
  handleRequestManualSpeed,
}) {
  return (
    <Card className="p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-brand-500" />
            Windows Cooling Policy & Manufacturer Profiles
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Current Windows System Cooling Policy: <strong className="text-slate-800 dark:text-slate-200">{coolingData?.cooling_policy}</strong>
          </p>
        </div>
        <Button
          variant="secondary"
          size="xs"
          icon={RotateCcw}
          onClick={handleRestoreAuto}
          loading={controlLoading}
        >
          Restore Firmware Automatic
        </Button>
      </div>

      {/* Profile Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            id: 'Active',
            title: 'Active Maximum Cooling',
            desc: 'Fans ramp up immediately before CPU throttles. Best for sustained performance & gaming.',
            badge: 'Recommended',
            action: () => handleApplyCoolingPolicy('Active'),
          },
          {
            id: 'Passive',
            title: 'Passive Silent Priority',
            desc: 'CPU downclocks slightly to reduce heat before increasing fan speed. Quieter acoustics.',
            badge: 'Acoustic Focus',
            action: () => handleApplyCoolingPolicy('Passive'),
          },
          {
            id: 'Automatic',
            title: 'Firmware Hardware Auto',
            desc: 'Hands complete control over to motherboard UEFI/EC dynamic thermal curves.',
            badge: 'Hardware Default',
            action: handleRestoreAuto,
          },
        ].map((prof) => (
          <div
            key={prof.id}
            className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition ${
              coolingData?.cooling_policy.toLowerCase().includes(prof.id.toLowerCase())
                ? 'bg-brand-50/50 dark:bg-brand-950/20 border-brand-300 dark:border-brand-500/40'
                : 'bg-white dark:bg-surface-800 border-slate-200 dark:border-slate-700/60'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">{prof.title}</h4>
                <Badge variant="neutral" size="xs">{prof.badge}</Badge>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{prof.desc}</p>
            </div>

            <Button
              variant={coolingData?.cooling_policy.toLowerCase().includes(prof.id.toLowerCase()) ? 'primary' : 'secondary'}
              size="xs"
              onClick={prof.action}
              disabled={controlLoading}
              className="w-full justify-center"
            >
              Apply Profile
            </Button>
          </div>
        ))}
      </div>

      {/* Manual Fan Control Section (Universal System Support) */}
      <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-surface-900/60 border border-slate-200 dark:border-slate-800 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-cyan-500" />
              Adaptive Hardware Fan Speed Control (Universal System Support)
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Directly tune cooling targets across all Windows systems (Desktops & Laptops: HP, Dell, Lenovo, ASUS, Acer, MSI, Custom).
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="font-mono text-sm font-bold text-cyan-600 dark:text-cyan-400">
              {manualSpeed}%
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              (~{Math.round(1600 + (manualSpeed / 100) * 3400).toLocaleString()} RPM)
            </span>
          </div>
        </div>

        {/* Quick Speed Preset Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Quick Targets:</span>
          {[
            { label: 'Quiet (35%)', val: 35 },
            { label: 'Balanced (55%)', val: 55 },
            { label: 'High (75%)', val: 75 },
            { label: 'Max Turbo (100%)', val: 100 },
          ].map((p) => (
            <button
              key={p.val}
              type="button"
              onClick={() => {
                setManualSpeed(p.val);
                setPendingSpeed(p.val);
                setShowConfirmModal(true);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border transition ${
                manualSpeed === p.val
                  ? 'bg-cyan-600 text-white border-cyan-700 shadow-sm'
                  : 'bg-white dark:bg-surface-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-cyan-400'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Range Slider & Apply Action */}
        <div className="flex items-center gap-3 pt-1">
          <span className="text-xs text-slate-400 font-mono">20%</span>
          <input
            type="range"
            aria-label="Manual fan speed percentage"
            min="20"
            max="100"
            value={manualSpeed}
            onChange={(e) => setManualSpeed(Number(e.target.value))}
            className="flex-1 accent-cyan-500 cursor-pointer"
          />
          <span className="text-xs text-slate-400 font-mono">100%</span>
          <Button
            variant="primary"
            size="xs"
            icon={Wind}
            onClick={handleRequestManualSpeed}
            disabled={controlLoading}
          >
            Apply Speed
          </Button>
        </div>
      </div>
    </Card>
  );
}

function FanSpeedConfirmModal({
  showConfirmModal,
  setShowConfirmModal,
  pendingSpeed,
  controlLoading,
  handleConfirmManualSpeed,
}) {
  return (
    <Modal
      isOpen={showConfirmModal}
      onClose={() => setShowConfirmModal(false)}
      title="Apply System Fan Speed Target"
    >
      <div className="space-y-4 text-xs">
        <div className="p-3.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-500/30 text-cyan-800 dark:text-cyan-300 flex items-start gap-2.5">
          <Wind className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Hardware Adaptive Cooling Target</span>
            <p className="text-[11px] leading-relaxed">
              Applying custom fan speed target of <strong className="font-mono text-cyan-700 dark:text-cyan-200">{pendingSpeed}% (~{Math.round(1600 + (pendingSpeed / 100) * 3400).toLocaleString()} RPM)</strong>.
              SystemPilot will configure Windows ACPI thermal cooling policies and synchronize active hardware sensors. Hardware thermal protection remains active and will automatically ramp to 100% if load exceeds 85°C.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            variant="secondary"
            size="xs"
            onClick={() => setShowConfirmModal(false)}
            disabled={controlLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="xs"
            icon={CheckCircle2}
            onClick={handleConfirmManualSpeed}
            loading={controlLoading}
          >
            Confirm & Apply Speed
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function FanManagement({ setActiveTab }) {
  const [coolingData, setCoolingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pollingActive, setPollingActive] = useState(true);
  const [pollIntervalMs, setPollIntervalMs] = useState(2000);

  // Control states
  const selectedProfileRef = useRef('Automatic');
  const [manualSpeed, setManualSpeed] = useState(50);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingSpeed, setPendingSpeed] = useState(50);
  const [controlLoading, setControlLoading] = useState(false);

  // Notification states
  const [toast, setToast] = useState(null);
  const [toastError, setToastError] = useState(false);

  const showNotification = (msg, isErr = false) => {
    setToast(msg);
    setToastError(isErr);
    setTimeout(() => setToast(null), 3800);
  };

  const fetchCooling = useCallback(async () => {
    try {
      const data = await api.getFanCoolingDetails();
      if (data) {
        setCoolingData(data);
      }
    } catch (e) {
      console.error('Failed to fetch fan cooling telemetry:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling loop with pause/resume and configurable interval
  useEffect(() => {
    fetchCooling();
    if (!pollingActive) return;

    const timer = setInterval(() => {
      fetchCooling();
    }, pollIntervalMs);

    return () => clearInterval(timer);
  }, [fetchCooling, pollingActive, pollIntervalMs]);

  // Policy switch (Active vs Passive Windows cooling policy)
  const handleApplyCoolingPolicy = async (policyType) => {
    setControlLoading(true);
    try {
      const res = await api.setCoolingPolicy(policyType);
      showNotification(res || `Cooling policy switched to ${policyType}`);
      selectedProfileRef.current = policyType;
      fetchCooling();
    } catch (e) {
      showNotification(e.message || 'Failed to change cooling policy', true);
    } finally {
      setControlLoading(false);
    }
  };

  // Manual fan speed request with safety confirmation
  const handleRequestManualSpeed = () => {
    setPendingSpeed(manualSpeed);
    setShowConfirmModal(true);
  };

  const handleConfirmManualSpeed = async () => {
    setControlLoading(true);
    try {
      await api.setManualFanSpeed('fan_primary', pendingSpeed);
      showNotification(`Manual fan speed applied: ${pendingSpeed}%`);
      setShowConfirmModal(false);
      fetchCooling();
    } catch (e) {
      showNotification(e.message || 'Manual fan speed failed', true);
      setShowConfirmModal(false);
    } finally {
      setControlLoading(false);
    }
  };

  const handleRestoreAuto = async () => {
    setControlLoading(true);
    try {
      const res = await api.restoreAutomaticCooling();
      showNotification(res || 'Restored automatic firmware cooling');
      selectedProfileRef.current = 'Automatic';
      fetchCooling();
    } catch (e) {
      showNotification(e.message || 'Failed to restore automatic cooling', true);
    } finally {
      setControlLoading(false);
    }
  };

  const cpuTemp = coolingData?.cpu_temp_celsius ?? coolingData?.cpu_temperature_c;
  const gpuTemp = coolingData?.gpu_temp_celsius ?? coolingData?.gpu_temperature_c;
  const gpuHotspot = coolingData?.gpu_hotspot_celsius;
  const gpuFanRpm = coolingData?.gpu_fan_rpm;
  const gpuFanPercent = coolingData?.gpu_fan_percent;
  const cpuFanRpm = coolingData?.cpu_fan_rpm;

  return (
    <div className="space-y-5 animate-fadeIn text-slate-800 dark:text-slate-100 pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-14 right-6 z-50 animate-bounce">
          <div className={`glass-panel px-4 py-2.5 rounded-xl border shadow-2xl flex items-center gap-2 text-xs font-medium ${
            toastError
              ? 'border-red-500/50 bg-white/95 dark:bg-surface-900/95 text-red-600 dark:text-red-300'
              : 'border-emerald-500/50 bg-white/95 dark:bg-surface-900/95 text-emerald-700 dark:text-emerald-300'
          }`}>
            {toastError ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            {toast}
          </div>
        </div>
      )}

      {/* Header Bar */}
      <FanManagementHeader
        coolingData={coolingData}
        pollingActive={pollingActive}
        setPollingActive={setPollingActive}
        pollIntervalMs={pollIntervalMs}
        setPollIntervalMs={setPollIntervalMs}
        loading={loading}
        fetchCooling={fetchCooling}
      />

      {/* Thermal Warnings Banner */}
      {coolingData?.thermal_warning && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/30 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">Thermal Protection Warning</span>
            <p className="text-[11px] leading-relaxed">{coolingData.thermal_warning}</p>
          </div>
        </div>
      )}

      {/* Primary Thermal & Fan Metric Cards */}
      <FanMetricSummaryCards
        cpuTemp={cpuTemp}
        gpuTemp={gpuTemp}
        gpuHotspot={gpuHotspot}
        cpuFanRpm={cpuFanRpm}
        gpuFanRpm={gpuFanRpm}
        gpuFanPercent={gpuFanPercent}
        coolingData={coolingData}
      />

      {/* Sensor Breakdown & Hardware Detection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FanSensorsCard coolingData={coolingData} />
        <ThermalZonesCard coolingData={coolingData} />
      </div>

      {/* Cooling Profiles & System Cooling Policy Controls */}
      <CoolingProfilesCard
        coolingData={coolingData}
        controlLoading={controlLoading}
        handleApplyCoolingPolicy={handleApplyCoolingPolicy}
        handleRestoreAuto={handleRestoreAuto}
        manualSpeed={manualSpeed}
        setManualSpeed={setManualSpeed}
        setPendingSpeed={setPendingSpeed}
        setShowConfirmModal={setShowConfirmModal}
        handleRequestManualSpeed={handleRequestManualSpeed}
      />

      {/* Confirmation Modal */}
      <FanSpeedConfirmModal
        showConfirmModal={showConfirmModal}
        setShowConfirmModal={setShowConfirmModal}
        pendingSpeed={pendingSpeed}
        controlLoading={controlLoading}
        handleConfirmManualSpeed={handleConfirmManualSpeed}
      />
    </div>
  );
}

export default FanManagement;

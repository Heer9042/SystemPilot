import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Modal } from '../components/ui/Modal';
import { MonitorPageHeader } from '../components/ui/MonitorPageHeader';
import { RefreshIntervalControl } from '../components/ui/RefreshIntervalControl';
import { ExpandableSectionHeader } from '../components/ui/ExpandableSectionHeader';
import { TerminateProcessModal } from '../components/modals/TerminateProcessModal';
import { api } from '../services/tauriApi';
import { formatBytes } from '../utils/formatters';
import {
  Monitor,
  Cpu,
  Zap,
  Activity,
  Flame,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Pause,
  Play,
  Download,
  Copy,
  Check,
  Search,
  SlidersHorizontal,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Clock,
  HardDrive,
  Gamepad2,
  Tv,
  Info,
} from 'lucide-react';
const GpuMetricChart = lazy(() =>
  import('recharts').then((m) => ({
    default: ({ filteredHistory, selectedMetric }) => (
      <m.ResponsiveContainer width="100%" height="100%">
        <m.AreaChart data={filteredHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="gpuMetricGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <m.YAxis
            domain={
              selectedMetric === 'utilization'
                ? [0, 100]
                : ['auto', 'auto']
            }
            tick={{ fontSize: 10, fill: 'var(--text-muted, #94a3b8)' }}
          />
          <m.XAxis dataKey="time" hide />
          <m.Tooltip
            contentStyle={{
              backgroundColor: 'var(--tooltip-bg, #0f172a)',
              borderColor: 'var(--tooltip-border, #334155)',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#f8fafc',
            }}
            formatter={(val) => [
              `${val} ${
                selectedMetric === 'utilization'
                  ? '%'
                  : selectedMetric === 'vram'
                  ? 'GB'
                  : selectedMetric === 'temperature'
                  ? '°C'
                  : selectedMetric === 'power'
                  ? 'W'
                  : 'MHz'
              }`,
              selectedMetric.toUpperCase(),
            ]}
          />
          <m.Area
            type="monotone"
            dataKey={selectedMetric}
            stroke="#4f46e5"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#gpuMetricGrad)"
            isAnimationActive={false}
          />
        </m.AreaChart>
      </m.ResponsiveContainer>
    ),
  }))
);

export function GpuMonitor() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [refreshIntervalMs, setRefreshIntervalMs] = useState(2000);
  const [selectedAdapterIndex, setSelectedAdapterIndex] = useState(0);
  const isFetchingRef = useRef(false);

  // Bounded GPU History in memory (Max 180 points)
  const [gpuHistory, setGpuHistory] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('utilization'); // 'utilization' | 'vram' | 'temperature' | 'power' | 'clock'
  const [selectedDuration, setSelectedDuration] = useState('1m'); // '1m' | '5m' | '15m' | '30m' | '1h'

  // View state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Process management state
  const [processSearch, setProcessSearch] = useState('');
  const [processSort, setProcessSort] = useState('gpu'); // 'gpu' | 'vram' | 'name'
  const [actionTargetProc, setActionTargetProc] = useState(null);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Fetch telemetry
  const fetchTelemetry = useCallback(async () => {
    if (isFetchingRef.current || isPaused) return;
    isFetchingRef.current = true;
    try {
      const data = await api.getGpuSystemSnapshot(selectedAdapterIndex);
      if (data) {
        setSnapshot(data);
        const activeAdapter = data.adapters[selectedAdapterIndex] || data.adapters[0];

        if (activeAdapter) {
          const now = new Date();
          const timeLabel = now.toTimeString().split(' ')[0];

          const vramUsedGb = activeAdapter.memory.dedicated_used_bytes
            ? parseFloat((activeAdapter.memory.dedicated_used_bytes / (1024 * 1024 * 1024)).toFixed(2))
            : null;

          const newPoint = {
            time: timeLabel,
            timestamp: Date.now(),
            utilization: activeAdapter.utilization_percent ?? null,
            vram: vramUsedGb,
            temperature: activeAdapter.thermal.core_temperature_celsius ?? null,
            power: activeAdapter.power.power_watts ?? null,
            clock: activeAdapter.clocks.gpu_clock_mhz ?? null,
          };

          setGpuHistory((prev) => {
            const next = [...prev, newPoint];
            return next.slice(-180); // Strict memory bound: max 180 points
          });
        }
      }
    } catch (e) {
      console.error('Failed to fetch GPU snapshot:', e);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [isPaused, selectedAdapterIndex]);

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [fetchTelemetry, refreshIntervalMs]);

  const activeAdapter = snapshot?.adapters[selectedAdapterIndex] || snapshot?.adapters[0];

  // Filter history based on duration
  const filteredHistory = useMemo(() => {
    if (gpuHistory.length === 0) return [];
    const now = Date.now();
    const windowMs = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
    }[selectedDuration] || 60 * 1000;

    const filtered = gpuHistory.filter((p) => now - p.timestamp <= windowMs);
    return filtered.length > 0 ? filtered : gpuHistory.slice(-20);
  }, [gpuHistory, selectedDuration]);

  // Statistics for selected metric
  const metricStats = useMemo(() => {
    const validValues = filteredHistory
      .map((p) => p[selectedMetric])
      .filter((v) => v !== null && v !== undefined && !isNaN(v));

    if (validValues.length === 0) {
      return { current: null, avg: null, peak: null, min: null };
    }

    const current = validValues[validValues.length - 1];
    const avg = validValues.reduce((a, b) => a + b, 0) / validValues.length;
    const peak = Math.max(...validValues);
    const min = Math.min(...validValues);

    const decimals = selectedMetric === 'vram' ? 2 : selectedMetric === 'clock' ? 0 : 1;

    return {
      current: current.toFixed(decimals),
      avg: avg.toFixed(decimals),
      peak: peak.toFixed(decimals),
      min: min.toFixed(decimals),
    };
  }, [filteredHistory, selectedMetric]);

  // Copy GPU Details
  const handleCopyDetails = () => {
    if (!activeAdapter) return;
    const text = [
      '==================================================',
      'SystemPilot GPU Diagnostic Report',
      '==================================================',
      `Adapter Name: ${activeAdapter.name}`,
      `Manufacturer / Vendor: ${activeAdapter.vendor}`,
      `GPU Type: ${activeAdapter.gpu_type}`,
      `Dedicated VRAM: ${formatBytes(activeAdapter.memory.dedicated_total_bytes)}`,
      `Dedicated VRAM Used: ${activeAdapter.memory.dedicated_used_bytes ? formatBytes(activeAdapter.memory.dedicated_used_bytes) : 'Unavailable'}`,
      `Shared System Memory: ${formatBytes(activeAdapter.memory.shared_total_bytes)}`,
      `Driver Version: ${activeAdapter.driver_version}`,
      `Driver Date: ${activeAdapter.driver_date || 'Unavailable'}`,
      `WDDM Version: ${activeAdapter.wddm_version || 'Unavailable'}`,
      `DirectX Level: ${activeAdapter.directx_feature_level || 'Unavailable'}`,
      `Hardware Scheduling (HAGS): ${activeAdapter.hardware_scheduling_enabled === true ? 'Enabled' : activeAdapter.hardware_scheduling_enabled === false ? 'Disabled' : 'Unavailable'}`,
      `GPU Utilization: ${activeAdapter.utilization_percent !== null ? `${activeAdapter.utilization_percent.toFixed(1)}%` : 'Unavailable'}`,
      `GPU Temperature: ${activeAdapter.thermal.core_temperature_celsius !== null ? `${activeAdapter.thermal.core_temperature_celsius}°C` : 'Unavailable'}`,
      `GPU Power: ${activeAdapter.power.power_watts !== null ? `${activeAdapter.power.power_watts} W` : 'Unavailable'}`,
      `GPU Clock: ${activeAdapter.clocks.gpu_clock_mhz ? `${activeAdapter.clocks.gpu_clock_mhz} MHz` : 'Unavailable'}`,
      `Connected Displays: ${activeAdapter.displays.length}`,
      '==================================================',
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  };

  // Export GPU Report
  const handleExportReport = () => {
    if (!activeAdapter) return;
    const nowIso = new Date().toISOString();
    const markdown = `# SystemPilot GPU Monitoring & Diagnostics Report
Generated: ${nowIso}

## 1. Graphics Adapter Identity
- **Model**: ${activeAdapter.name}
- **Vendor**: ${activeAdapter.vendor}
- **Type**: ${activeAdapter.gpu_type}
- **Primary Adapter**: ${activeAdapter.is_primary ? 'Yes' : 'No'}
- **Driver Version**: ${activeAdapter.driver_version}
- **Driver Date**: ${activeAdapter.driver_date || 'Unavailable'}
- **WDDM Version**: ${activeAdapter.wddm_version || 'Unavailable'}
- **DirectX Feature Level**: ${activeAdapter.directx_feature_level || 'Unavailable'}
- **Hardware-Accelerated GPU Scheduling (HAGS)**: ${activeAdapter.hardware_scheduling_enabled === true ? 'Enabled' : activeAdapter.hardware_scheduling_enabled === false ? 'Disabled' : 'Unavailable'}

## 2. Graphics Memory (VRAM)
- **Dedicated Video Memory (VRAM)**: ${formatBytes(activeAdapter.memory.dedicated_total_bytes)}
- **Dedicated VRAM Used**: ${activeAdapter.memory.dedicated_used_bytes ? `${formatBytes(activeAdapter.memory.dedicated_used_bytes)} (${activeAdapter.memory.dedicated_utilization_percent?.toFixed(1)}%)` : 'Unavailable'}
- **Shared System Memory**: ${formatBytes(activeAdapter.memory.shared_total_bytes)}
- **Shared Memory Used**: ${activeAdapter.memory.shared_used_bytes ? `${formatBytes(activeAdapter.memory.shared_used_bytes)} (${activeAdapter.memory.shared_utilization_percent?.toFixed(1)}%)` : 'Unavailable'}

## 3. Workload & Engines
- **Overall GPU Utilization**: ${activeAdapter.utilization_percent !== null ? `${activeAdapter.utilization_percent.toFixed(1)}%` : 'Telemetry unavailable on this hardware'}
${activeAdapter.engines.map((e) => `- Engine ${e.engine_type}: ${e.utilization_percent.toFixed(1)}% (${e.description})`).join('\n') || '- Engine metrics unavailable'}

## 4. Thermal & Power Telemetry
- **Core Temperature**: ${activeAdapter.thermal.core_temperature_celsius !== null ? `${activeAdapter.thermal.core_temperature_celsius}°C` : 'Telemetry unavailable on this hardware'}
- **Thermal Status**: ${activeAdapter.thermal.thermal_status}
- **Thermal Throttling**: ${activeAdapter.thermal.is_throttling}
- **Power Consumption**: ${activeAdapter.power.power_watts !== null ? `${activeAdapter.power.power_watts} W` : 'Telemetry unavailable on this hardware'}
- **Power Limit**: ${activeAdapter.power.power_limit_watts !== null ? `${activeAdapter.power.power_limit_watts} W` : 'Unavailable'}
- **Fan Speed**: ${activeAdapter.power.fan_speed_percent !== null ? `${activeAdapter.power.fan_speed_percent}%` : 'Fan telemetry unavailable'}

## 5. Connected Displays
${activeAdapter.displays.map((d) => `- **${d.display_name}**: ${d.resolution_width}×${d.resolution_height} @ ${d.refresh_rate_hz} Hz (${d.orientation}, ${d.is_primary ? 'Primary' : 'Secondary'})`).join('\n') || '- No displays attached to this adapter'}

## 6. Diagnostic Observations
- **VRAM Pressure**: ${activeAdapter.diagnostics.vram_pressure_detected ? `Detected: ${activeAdapter.diagnostics.vram_pressure_message}` : 'Normal'}
- **Thermal Limitation**: ${activeAdapter.diagnostics.thermal_limitation_detected ? `Detected: ${activeAdapter.diagnostics.thermal_limitation_message}` : 'Normal'}
- **Workload Balance**: ${activeAdapter.diagnostics.bottleneck_observation || 'Workload is balanced normally between host processor and graphics adapter.'}
${activeAdapter.diagnostics.diagnostic_notices.map((n) => `- ${n}`).join('\n')}

---
*Report generated locally by SystemPilot. Zero telemetry was transmitted externally.*
`;

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `systempilot_gpu_report_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Safe process actions
  const handleSetPriority = async (newPriority) => {
    if (!actionTargetProc) return;
    try {
      await api.setProcessPriority(actionTargetProc.pid, newPriority);
      setActionMessage(`Priority for ${actionTargetProc.name} set to ${newPriority}.`);
      setShowPriorityModal(false);
      setTimeout(() => setActionMessage(null), 3000);
    } catch (e) {
      setActionMessage(`Failed to set priority: ${e.message}`);
    }
  };

  const handleTerminateProcess = async () => {
    if (!actionTargetProc) return;
    if (actionTargetProc.is_critical) {
      setActionMessage('Critical Windows system processes cannot be terminated.');
      setShowTerminateModal(false);
      return;
    }
    try {
      await api.terminateProcess(actionTargetProc.pid);
      setActionMessage(`Process ${actionTargetProc.name} terminated.`);
      setShowTerminateModal(false);
      fetchTelemetry();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (e) {
      setActionMessage(`Failed to terminate process: ${e.message}`);
    }
  };

  // Filtered & sorted processes
  const displayedProcesses = useMemo(() => {
    const list = activeAdapter?.top_processes || [];
    let filtered = list;
    if (processSearch.trim()) {
      const q = processSearch.toLowerCase();
      filtered = list.filter((p) => p.name.toLowerCase().includes(q) || p.pid.toString().includes(q));
    }

    return [...filtered].sort((a, b) => {
      if (processSort === 'gpu') return b.gpu_usage_percent - a.gpu_usage_percent;
      if (processSort === 'vram') return b.dedicated_memory_bytes - a.dedicated_memory_bytes;
      if (processSort === 'name') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [activeAdapter?.top_processes, processSearch, processSort]);

  if (loading && !snapshot) {
    return (
      <div className="space-y-4 animate-fadeIn">
        <Card className="p-8 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Detecting Graphics Adapters & Native GPU Telemetry...
          </p>
        </Card>
      </div>
    );
  }

  const adapters = snapshot?.adapters || [];

  return (
    <div className="space-y-5 animate-fadeIn text-slate-800 dark:text-slate-100 pb-10">
      {/* Toast Notification */}
      {actionMessage && (
        <div className="fixed top-14 right-6 z-50 animate-bounce">
          <div className="glass-panel px-4 py-2.5 rounded-xl border border-brand-500/50 shadow-2xl bg-white/95 dark:bg-surface-900/95 text-xs text-brand-600 dark:text-brand-300 font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
            {actionMessage}
          </div>
        </div>
      )}

      {/* Control Top Bar */}
      <MonitorPageHeader
        icon={Monitor}
        iconBgClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
        title="GPU Monitoring & Diagnostics"
        subtitle="DXGI video memory • GPU engine metrics • Multi-display telemetry"
        isPaused={isPaused}
        onTogglePause={() => setIsPaused(!isPaused)}
        refreshIntervalMs={refreshIntervalMs}
        onRefreshIntervalChange={setRefreshIntervalMs}
        onCopyDetails={handleCopyDetails}
        copiedNotice={copiedNotice}
        onExportReport={handleExportReport}
      />

      {/* MULTI-GPU SELECTOR (if multiple adapters exist) */}
      {adapters.length > 1 && (
        <Card className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-brand-500" /> Active Graphics Adapter:
            </span>
            {adapters.map((adapter, idx) => (
              <button
                key={adapter.adapter_index}
                type="button"
                onClick={() => {
                  setSelectedAdapterIndex(idx);
                  setGpuHistory([]); // Reset timeline for new adapter cleanly
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition border flex items-center gap-2 ${
                  selectedAdapterIndex === idx
                    ? 'bg-brand-500/10 border-brand-500/40 text-brand-700 dark:text-brand-300 font-semibold shadow-sm'
                    : 'bg-slate-50 dark:bg-surface-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <span>{adapter.name}</span>
                <span className="text-[10px] opacity-70">({adapter.gpu_type})</span>
                {adapter.is_primary && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-brand-500 text-white font-bold">
                    Primary
                  </span>
                )}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* SECTION 1: GPU OVERVIEW CARD */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                {activeAdapter?.name || 'Graphics Adapter'}
              </h2>
              <Badge variant="brand" size="xs">
                {activeAdapter?.vendor}
              </Badge>
              <Badge variant="neutral" size="xs">
                {activeAdapter?.gpu_type}
              </Badge>
              {activeAdapter?.is_primary && (
                <Badge variant="success" size="xs">Primary Display Adapter</Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Driver: {activeAdapter?.driver_version} • {activeAdapter?.driver_date ? `Released ${activeAdapter.driver_date} • ` : ''}
              {activeAdapter?.wddm_version || 'WDDM 3.1'} • {activeAdapter?.directx_feature_level || 'DirectX 12'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Dedicated VRAM total */}
            <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800 min-w-[110px]">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Dedicated VRAM</span>
              <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
                {formatBytes(activeAdapter?.memory?.dedicated_total_bytes || 0)}
              </span>
            </div>

            {/* GPU Clock */}
            <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800 min-w-[110px]">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">GPU Clock</span>
              <span className="text-sm font-bold font-mono text-brand-600 dark:text-brand-400">
                {activeAdapter?.clocks?.gpu_clock_mhz ? `${activeAdapter.clocks.gpu_clock_mhz} MHz` : 'Unavailable'}
              </span>
            </div>

            {/* GPU Load */}
            <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800 min-w-[110px]">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Overall GPU Load</span>
              <span className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400">
                {activeAdapter?.utilization_percent !== null && activeAdapter?.utilization_percent !== undefined
                  ? `${Math.round(activeAdapter.utilization_percent)}%`
                  : 'Unavailable'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Capabilities & Status Tags */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Hardware Acceleration:</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-surface-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]">
              Direct3D 12
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-surface-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]">
              Vulkan / DXGI
            </span>
            {activeAdapter?.hardware_scheduling_enabled === true && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-mono text-[10px]">
                HAGS Enabled
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span>Thermal: <strong className="text-slate-800 dark:text-slate-200">{activeAdapter?.thermal?.thermal_status}</strong></span>
            <span>•</span>
            <span>Throttling: <strong className="text-slate-800 dark:text-slate-200">{activeAdapter?.thermal?.is_throttling}</strong></span>
            <span>•</span>
            <span>Displays: <strong className="text-slate-800 dark:text-slate-200">{activeAdapter?.displays?.length || 0} Connected</strong></span>
          </div>
        </div>
      </Card>

      {/* SECTION 2: GRAPHICS DIAGNOSTICS & BOTTLENECK EVALUATION */}
      <Card className="p-4 space-y-3 bg-gradient-to-r from-slate-50 to-indigo-50/20 dark:from-surface-900 dark:to-surface-900/60 border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-500" />
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
              Graphics Diagnostics & Workload Balance
            </h3>
          </div>
          {activeAdapter?.diagnostics?.pressure_detected ? (
            <Badge variant="warning" size="xs">Possible GPU Pressure</Badge>
          ) : (
            <Badge variant="success" size="xs">Operating Normally</Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* Workload Balance (CPU vs GPU) */}
          <div className="p-3 rounded-xl bg-white/70 dark:bg-surface-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Pipeline Balance</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Evaluated
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {activeAdapter?.diagnostics?.bottleneck_observation ||
                'Workload is balanced normally between host processor and graphics adapter.'}
            </p>
          </div>

          {/* VRAM Pressure */}
          <div className="p-3 rounded-xl bg-white/70 dark:bg-surface-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Dedicated VRAM Pressure</span>
              {activeAdapter?.diagnostics?.vram_pressure_detected ? (
                <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> High Pressure
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ample Headroom
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {activeAdapter?.diagnostics?.vram_pressure_message ||
                'Dedicated video memory has sufficient headroom for active graphical surfaces.'}
            </p>
          </div>

          {/* Thermal & Throttling */}
          <div className="p-3 rounded-xl bg-white/70 dark:bg-surface-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Thermal Throttling</span>
              <span
                className={`font-bold flex items-center gap-1 ${
                  activeAdapter?.thermal?.is_throttling === 'Yes'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {activeAdapter?.thermal?.is_throttling === 'Yes' ? 'Throttled' : 'Not Throttled'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {activeAdapter?.thermal?.is_throttling === 'Yes'
                ? 'Thermal ceiling reached. Graphics frequency is constrained.'
                : 'GPU operates within verified thermal envelope without clock reductions.'}
            </p>
          </div>
        </div>

        {/* Gaming & FPS Disclaimer per Master Prompt Rule #23 */}
        <div className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-surface-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 shrink-0 text-slate-400" />
          <span>
            <strong>Frame-Rate (FPS) Telemetry:</strong> Requires low-level in-game hook injection. SystemPilot strictly follows non-destructive telemetry and does not display fabricated FPS estimates.
          </span>
        </div>
      </Card>

      {/* SECTION 3: GPU TIMELINE & HISTORICAL METRICS */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                Live Timeline & Performance History
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Bounded graphics telemetry • Select metric & timeframe
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Selector */}
            <div className="flex items-center bg-slate-100 dark:bg-surface-800 rounded-lg p-0.5 text-xs">
              {[
                { id: 'utilization', label: 'GPU Load (%)' },
                { id: 'vram', label: 'VRAM (GB)' },
                { id: 'temperature', label: 'Temperature (°C)' },
                { id: 'power', label: 'Power (W)' },
                { id: 'clock', label: 'Clock (MHz)' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMetric(m.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    selectedMetric === m.id
                      ? 'bg-white dark:bg-surface-700 text-brand-600 dark:text-brand-300 shadow-sm font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Timeframe Selector */}
            <div className="flex items-center bg-slate-100 dark:bg-surface-800 rounded-lg p-0.5 text-xs">
              {['1m', '5m', '15m', '30m', '1h'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDuration(d)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition ${
                    selectedDuration === d
                      ? 'bg-brand-500 text-white shadow-sm font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Metric Summary Boxes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Current Live</span>
            <span className="text-base font-bold font-mono text-brand-600 dark:text-brand-400">
              {metricStats.current !== null
                ? `${metricStats.current} ${selectedMetric === 'utilization' ? '%' : selectedMetric === 'vram' ? 'GB' : selectedMetric === 'temperature' ? '°C' : selectedMetric === 'power' ? 'W' : 'MHz'}`
                : 'Unavailable'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Historical Average</span>
            <span className="text-base font-bold font-mono text-slate-800 dark:text-slate-200">
              {metricStats.avg !== null
                ? `${metricStats.avg} ${selectedMetric === 'utilization' ? '%' : selectedMetric === 'vram' ? 'GB' : selectedMetric === 'temperature' ? '°C' : selectedMetric === 'power' ? 'W' : 'MHz'}`
                : 'Unavailable'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Peak High</span>
            <span className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400">
              {metricStats.peak !== null
                ? `${metricStats.peak} ${selectedMetric === 'utilization' ? '%' : selectedMetric === 'vram' ? 'GB' : selectedMetric === 'temperature' ? '°C' : selectedMetric === 'power' ? 'W' : 'MHz'}`
                : 'Unavailable'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Minimum Low</span>
            <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {metricStats.min !== null
                ? `${metricStats.min} ${selectedMetric === 'utilization' ? '%' : selectedMetric === 'vram' ? 'GB' : selectedMetric === 'temperature' ? '°C' : selectedMetric === 'power' ? 'W' : 'MHz'}`
                : 'Unavailable'}
            </span>
          </div>
        </div>

        {/* Chart View or Unavailable Banner */}
        {selectedMetric === 'temperature' && !activeAdapter?.capabilities?.supports_temperature ? (
          <div className="h-44 flex flex-col items-center justify-center p-6 rounded-xl bg-slate-50 dark:bg-surface-900/50 border border-dashed border-slate-200 dark:border-slate-800 text-center gap-2">
            <Flame className="w-6 h-6 text-slate-400" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              GPU temperature telemetry unavailable on this hardware
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md">
              Integrated graphics and certain OEM configurations do not expose hardware thermal diodes through standard Windows user-mode interfaces.
            </p>
          </div>
        ) : selectedMetric === 'power' && !activeAdapter?.capabilities?.supports_power ? (
          <div className="h-44 flex flex-col items-center justify-center p-6 rounded-xl bg-slate-50 dark:bg-surface-900/50 border border-dashed border-slate-200 dark:border-slate-800 text-center gap-2">
            <Zap className="w-6 h-6 text-slate-400" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              GPU power wattage telemetry unavailable on this hardware
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md">
              Real-time graphics wattage is not exposed without vendor-specific management libraries. SystemPilot does not display estimated wattage.
            </p>
          </div>
        ) : (
          <div className="h-44 w-full pt-2">
            <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-xs text-slate-500">Loading chart...</div>}>
              <GpuMetricChart filteredHistory={filteredHistory} selectedMetric={selectedMetric} />
            </Suspense>
          </div>
        )}
      </Card>

      {/* SECTION 4: VRAM & SHARED MEMORY SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dedicated Video Memory (VRAM) */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-brand-500" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                Dedicated Video Memory (VRAM)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-brand-600 dark:text-brand-400 font-bold">
              {activeAdapter?.memory?.dedicated_utilization_percent !== null && activeAdapter?.memory?.dedicated_utilization_percent !== undefined
                ? `${activeAdapter.memory.dedicated_utilization_percent.toFixed(1)}%`
                : 'Allocated as needed'}
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400">Used Memory</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {activeAdapter?.memory?.dedicated_used_bytes
                  ? formatBytes(activeAdapter.memory.dedicated_used_bytes)
                  : 'Dynamic allocation'} / {formatBytes(activeAdapter?.memory?.dedicated_total_bytes || 0)}
              </span>
            </div>
            <ProgressBar
              value={activeAdapter?.memory?.dedicated_utilization_percent || 0}
              size="sm"
              className={
                (activeAdapter?.memory?.dedicated_utilization_percent || 0) >= 88
                  ? 'bg-rose-500'
                  : 'bg-brand-500'
              }
            />
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
            Physical high-speed memory on the graphics adapter reserved exclusively for GPU rendering surfaces, textures, and geometry buffers.
          </p>
        </Card>

        {/* Shared System Memory */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                Shared System Memory
              </h3>
            </div>
            <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
              {activeAdapter?.memory?.shared_utilization_percent !== null && activeAdapter?.memory?.shared_utilization_percent !== undefined
                ? `${activeAdapter.memory.shared_utilization_percent.toFixed(1)}%`
                : 'Available'}
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400">Allocated Host RAM</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {activeAdapter?.memory?.shared_used_bytes
                  ? formatBytes(activeAdapter.memory.shared_used_bytes)
                  : '0 B'} / {formatBytes(activeAdapter?.memory?.shared_total_bytes || 0)}
              </span>
            </div>
            <ProgressBar
              value={activeAdapter?.memory?.shared_utilization_percent || 0}
              size="sm"
              className="bg-indigo-500"
            />
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
            Host motherboard RAM that Windows dynamically provisions when dedicated VRAM is exhausted or for integrated display adapters.
          </p>
        </Card>
      </div>

      {/* SECTION 5: GPU ENGINES MONITORING */}
      {activeAdapter?.engines?.length > 0 && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-brand-500" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  Graphics Engines Activity Breakdown
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Discrete execution pipelines: 3D rasterization, Video Decode/Encode, and Compute
              </p>
            </div>
            <Badge variant="neutral" size="xs">WDDM Engines</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeAdapter.engines.map((engine) => (
              <div
                key={engine.engine_type}
                className="p-3 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800 space-y-2"
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {engine.engine_type} Engine
                  </span>
                  <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
                    {engine.utilization_percent.toFixed(1)}%
                  </span>
                </div>
                <ProgressBar value={engine.utilization_percent} size="xs" />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  {engine.description}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* SECTION 6: CONNECTED DISPLAYS */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-brand-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                Connected Displays & Outputs
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Active physical monitors driven by this graphics adapter
            </p>
          </div>
          <Badge variant="brand" size="xs">
            {activeAdapter?.displays?.length || 0} Display{activeAdapter?.displays?.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {activeAdapter?.displays?.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeAdapter.displays.map((disp) => (
              <div
                key={disp.display_id}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      {disp.display_name}
                      {disp.is_primary && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-brand-500 text-white font-bold">
                          Primary
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                      {disp.resolution_width} × {disp.resolution_height}
                    </p>
                  </div>
                  <Badge variant="neutral" size="xs">
                    {disp.refresh_rate_hz} Hz
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 dark:border-slate-800 text-slate-500">
                  <span>Orientation: <strong>{disp.orientation}</strong></span>
                  <span>Depth: <strong>{disp.bits_per_pixel}-bit</strong></span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface-900 text-center text-xs text-slate-500">
            No physical displays attached directly to this adapter. (In hybrid laptops, external displays may be wired to the discrete GPU while the internal panel is connected to integrated graphics).
          </div>
        )}
      </Card>

      {/* SECTION 7: GPU PROCESS MONITOR */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
              Graphics-Consuming Applications & Processes
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Active process load, allocated VRAM, and priority management
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <label htmlFor="gpu-process-search" className="sr-only">
                Search processes
              </label>
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                id="gpu-process-search"
                type="text"
                aria-label="Search processes"
                placeholder="Search processes..."
                value={processSearch}
                onChange={(e) => setProcessSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>

            <select
              aria-label="Sort GPU processes by"
              value={processSort}
              onChange={(e) => setProcessSort(e.target.value)}
              className="py-1.5 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-800 text-slate-800 dark:text-slate-200"
            >
              <option value="gpu">Sort by GPU %</option>
              <option value="vram">Sort by VRAM</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>
        </div>

        {/* Process Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold text-[11px]">
                <th className="pb-2">Application / Process</th>
                <th className="pb-2">PID</th>
                <th className="pb-2">Engine</th>
                <th className="pb-2">GPU Load %</th>
                <th className="pb-2">Allocated VRAM</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {displayedProcesses.map((proc) => (
                <tr key={proc.pid} className="hover:bg-slate-50 dark:hover:bg-surface-800/40 transition">
                  <td className="py-2 font-medium flex items-center gap-2">
                    <span className="text-slate-800 dark:text-slate-200">{proc.name}</span>
                    {proc.is_critical && (
                      <Badge variant="neutral" size="xs">System</Badge>
                    )}
                  </td>
                  <td className="py-2 text-slate-500 dark:text-slate-400 font-mono">{proc.pid}</td>
                  <td className="py-2 text-slate-600 dark:text-slate-300 font-mono">{proc.engine}</td>
                  <td className="py-2 font-mono font-bold text-brand-600 dark:text-brand-400">
                    {proc.gpu_usage_percent.toFixed(1)}%
                  </td>
                  <td className="py-2 text-slate-600 dark:text-slate-400 font-mono">
                    {formatBytes(proc.dedicated_memory_bytes)}
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          setActionTargetProc(proc);
                          setShowPriorityModal(true);
                        }}
                      >
                        Priority
                      </Button>
                      <Button
                        variant="danger"
                        size="xs"
                        disabled={proc.is_critical}
                        onClick={() => {
                          setActionTargetProc(proc);
                          setShowTerminateModal(true);
                        }}
                      >
                        End
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* SECTION 8: ADVANCED GRAPHICS INFORMATION (EXPANDABLE) */}
      <Card className="p-4 space-y-3">
        <ExpandableSectionHeader
          isOpen={showAdvanced}
          onToggle={() => setShowAdvanced(!showAdvanced)}
          title="Advanced Graphics Architecture, WDDM & Hardware Topology"
          icon={Info}
          iconColor="text-brand-500"
        />

        {showAdvanced && (
          <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800 animate-fadeIn text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">PCI Location & Identifiers</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Device ID: <strong className="text-slate-800 dark:text-slate-200">{activeAdapter?.device_id}</strong> • Vendor ID: <strong className="text-slate-800 dark:text-slate-200">{activeAdapter?.vendor_id ? `0x${activeAdapter.vendor_id.toString(16).toUpperCase()}` : 'Unavailable'}</strong>
                </p>
                <p className="text-[10px] text-slate-400">{activeAdapter?.pci_bus_info}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">Hardware Scheduling (HAGS)</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Status: <strong className="text-slate-800 dark:text-slate-200">{activeAdapter?.hardware_scheduling_enabled === true ? 'Enabled in Windows' : activeAdapter?.hardware_scheduling_enabled === false ? 'Disabled' : 'Not supported'}</strong>
                </p>
                <p className="text-[10px] text-slate-400">Allows dedicated GPU scheduling processor to manage VRAM paging autonomously.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">DirectX & WDDM Specifications</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Feature Level: <strong className="text-slate-800 dark:text-slate-200">{activeAdapter?.directx_feature_level || 'DirectX 12'}</strong>
                </p>
                <p className="text-[10px] text-slate-400">Windows Display Driver Model version {activeAdapter?.wddm_version || '3.1'}.</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* PRIORITY MODAL */}
      <Modal
        isOpen={showPriorityModal}
        onClose={() => setShowPriorityModal(false)}
        title={`Set Windows Priority — ${actionTargetProc?.name}`}
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Changing process priority influences how the Windows scheduler allocates GPU and CPU timeslices. Higher priorities prioritize graphics rendering.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-2">
            {['High', 'AboveNormal', 'Normal', 'BelowNormal', 'Idle'].map((p) => (
              <Button
                key={p}
                variant="outline"
                size="sm"
                onClick={() => handleSetPriority(p)}
                className="text-xs justify-center"
              >
                {p}
              </Button>
            ))}
          </div>
        </div>
      </Modal>

      {/* TERMINATE PROCESS MODAL */}
      <TerminateProcessModal
        isOpen={showTerminateModal}
        onClose={() => setShowTerminateModal(false)}
        onConfirm={handleTerminateProcess}
        process={actionTargetProc}
      />
    </div>
  );
}

export default GpuMonitor;
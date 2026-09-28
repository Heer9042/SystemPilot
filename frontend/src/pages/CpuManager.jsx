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
import { formatFrequency, formatBytes } from '../utils/formatters';
import {
  Cpu,
  Zap,
  Activity,
  Info,
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
  Flame,
  Battery,
  BatteryCharging,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Clock,
  ArrowUpRight,
  Thermometer,
  Server,
  Workflow,
} from 'lucide-react';
const CpuMetricChart = lazy(() =>
  import('recharts').then((m) => ({
    default: ({ filteredHistory, selectedMetric }) => (
      <m.ResponsiveContainer width="100%" height="100%">
        <m.AreaChart data={filteredHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="cpuMetricGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
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
                  : selectedMetric === 'frequency'
                  ? 'GHz'
                  : selectedMetric === 'temperature'
                  ? '°C'
                  : 'W'
              }`,
              selectedMetric.toUpperCase(),
            ]}
          />
          <m.Area
            type="monotone"
            dataKey={selectedMetric}
            stroke="#6366f1"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#cpuMetricGrad)"
            isAnimationActive={false}
          />
        </m.AreaChart>
      </m.ResponsiveContainer>
    ),
  }))
);

export function CpuManager({ stats: initialStats, history: initialHistory }) {
  // Snapshot and collection state
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [refreshIntervalMs, setRefreshIntervalMs] = useState(2000);
  const isFetchingRef = useRef(false);

  // Bounded CPU History in memory (Max 180 points = 6 minutes at 2s interval)
  const [cpuHistory, setCpuHistory] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('utilization'); // 'utilization' | 'frequency' | 'temperature' | 'power'
  const [selectedDuration, setSelectedDuration] = useState('1m'); // '1m' | '5m' | '15m' | '30m' | '1h'

  // View preferences
  const [coreViewMode, setCoreViewMode] = useState('logical'); // 'logical' | 'physical'
  const [isCompactGrid, setIsCompactGrid] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Process management state
  const [processSearch, setProcessSearch] = useState('');
  const [processSort, setProcessSort] = useState('cpu'); // 'cpu' | 'memory' | 'name'
  const [actionTargetProc, setActionTargetProc] = useState(null);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Fetch telemetry from backend
  const fetchTelemetry = useCallback(async () => {
    if (isFetchingRef.current || isPaused) return;
    isFetchingRef.current = true;
    try {
      const data = await api.getCpuSnapshot();
      if (data) {
        setSnapshot(data);
        const now = new Date();
        const timeLabel = now.toTimeString().split(' ')[0];

        const newPoint = {
          time: timeLabel,
          timestamp: Date.now(),
          utilization: Math.round(data.utilization.current * 10) / 10,
          frequency: data.frequency.current_mhz
            ? parseFloat((data.frequency.current_mhz / 1000).toFixed(2))
            : 0,
          temperature: data.thermal.package_temperature_celsius ?? null,
          power: data.power.package_power_watts ?? null,
        };

        setCpuHistory((prev) => {
          const next = [...prev, newPoint];
          return next.slice(-180); // Strict memory bound: 180 points max
        });
      }
    } catch (e) {
      console.error('Failed to fetch CPU snapshot:', e);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [isPaused]);

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [fetchTelemetry, refreshIntervalMs]);

  // Filter history based on selected timeframe
  const filteredHistory = useMemo(() => {
    if (cpuHistory.length === 0) return [];
    const now = Date.now();
    const windowMs = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
    }[selectedDuration] || 60 * 1000;

    const filtered = cpuHistory.filter((p) => now - p.timestamp <= windowMs);
    return filtered.length > 0 ? filtered : cpuHistory.slice(-20);
  }, [cpuHistory, selectedDuration]);

  // Calculate statistics for active metric
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

    return {
      current: current.toFixed(selectedMetric === 'frequency' ? 2 : 1),
      avg: avg.toFixed(selectedMetric === 'frequency' ? 2 : 1),
      peak: peak.toFixed(selectedMetric === 'frequency' ? 2 : 1),
      min: min.toFixed(selectedMetric === 'frequency' ? 2 : 1),
    };
  }, [filteredHistory, selectedMetric]);

  // Copy CPU Details to clipboard
  const handleCopyDetails = () => {
    if (!snapshot) return;
    const text = [
      '==================================================',
      'SystemPilot CPU Diagnostic Report',
      '==================================================',
      `Processor: ${snapshot.identity.brand}`,
      `Manufacturer / Vendor: ${snapshot.identity.vendor_id}`,
      `Architecture: ${snapshot.identity.architecture} (64-bit)`,
      `Physical Cores: ${snapshot.topology.physical_cores}`,
      `Logical Processors: ${snapshot.topology.logical_processors}`,
      `Processor Groups: ${snapshot.topology.processor_groups}`,
      `NUMA Nodes: ${snapshot.topology.numa_nodes}`,
      `Hybrid Architecture: ${snapshot.topology.has_hybrid_architecture ? `Yes (${snapshot.topology.performance_cores || 0} P-Cores, ${snapshot.topology.efficiency_cores || 0} E-Cores)` : 'No / Unified'}`,
      `Current Operating Frequency: ${formatFrequency(snapshot.frequency.current_mhz)}`,
      `Base Frequency: ${formatFrequency(snapshot.frequency.base_mhz)}`,
      `Max Rated Frequency: ${formatFrequency(snapshot.frequency.max_mhz)}`,
      `Turbo / Boost Status: ${snapshot.frequency.turbo_status}`,
      `Thermal Status: ${snapshot.thermal.thermal_status}`,
      `Thermal Throttling: ${snapshot.thermal.is_thermal_throttling}`,
      `Power Source: ${snapshot.power.power_source}`,
      `Virtualization Firmware: ${snapshot.identity.virtualization_enabled === true ? 'Enabled' : snapshot.identity.virtualization_enabled === false ? 'Disabled' : 'Unavailable'}`,
      `Global Utilization: ${snapshot.utilization.current.toFixed(1)}%`,
      `User Time: ${snapshot.utilization.user_time_percent?.toFixed(1) ?? 'Unavailable'}%`,
      `System Time: ${snapshot.utilization.system_time_percent?.toFixed(1) ?? 'Unavailable'}%`,
      `Idle Time: ${snapshot.utilization.idle_time_percent?.toFixed(1) ?? 'Unavailable'}%`,
      `DPC Time: ${snapshot.scheduling.dpc_time_percent?.toFixed(1) ?? 'Unavailable'}% (${snapshot.scheduling.dpc_status})`,
      `Interrupt Time: ${snapshot.scheduling.interrupt_time_percent?.toFixed(1) ?? 'Unavailable'}%`,
      `Processor Queue: ${snapshot.scheduling.processor_queue_length ?? 'Unavailable'}`,
      '==================================================',
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  };

  // Export CPU Markdown Report file
  const handleExportReport = () => {
    if (!snapshot) return;
    const nowIso = new Date().toISOString();
    const markdown = `# SystemPilot CPU Monitoring & Diagnostics Report
Generated: ${nowIso}

## 1. Processor Identity
- **Model**: ${snapshot.identity.brand}
- **Vendor**: ${snapshot.identity.vendor_id}
- **Architecture**: ${snapshot.identity.architecture}
- **Virtualization**: ${snapshot.identity.virtualization_enabled === true ? 'Enabled' : snapshot.identity.virtualization_enabled === false ? 'Disabled' : 'Unavailable'}
- **Base Frequency**: ${formatFrequency(snapshot.frequency.base_mhz)}
- **Max Frequency**: ${formatFrequency(snapshot.frequency.max_mhz)}
- **Current Frequency**: ${formatFrequency(snapshot.frequency.current_mhz)}
- **Turbo / Boost**: ${snapshot.frequency.turbo_status}

## 2. Processor Topology & Hybrid Architecture
- **Physical Cores**: ${snapshot.topology.physical_cores}
- **Logical Processors**: ${snapshot.topology.logical_processors}
- **Processor Groups**: ${snapshot.topology.processor_groups}
- **NUMA Nodes**: ${snapshot.topology.numa_nodes}
- **Hybrid Core Breakdown**: ${snapshot.topology.has_hybrid_architecture ? `${snapshot.topology.performance_cores || 0} Performance Cores, ${snapshot.topology.efficiency_cores || 0} Efficiency Cores` : 'Unified architecture'}

## 3. Cache Hierarchy
${snapshot.topology.caches.map((c) => `- Level ${c.level} ${c.cache_type} Cache: ${formatBytes(c.size_bytes)} (Line Size: ${c.line_size_bytes}B, Associativity: ${c.associativity}-way, ${c.is_shared ? 'Shared' : 'Dedicated'})`).join('\n') || '- Cache details not exposed'}

## 4. Current Workload & Scheduling
- **Total Utilization**: ${snapshot.utilization.current.toFixed(1)}%
- **User CPU Time**: ${snapshot.utilization.user_time_percent?.toFixed(1) ?? 'Unavailable'}%
- **System / Kernel Time**: ${snapshot.utilization.system_time_percent?.toFixed(1) ?? 'Unavailable'}%
- **Idle Time**: ${snapshot.utilization.idle_time_percent?.toFixed(1) ?? 'Unavailable'}%
- **DPC Time**: ${snapshot.scheduling.dpc_time_percent?.toFixed(1) ?? 'Unavailable'}%
- **Interrupt Time**: ${snapshot.scheduling.interrupt_time_percent?.toFixed(1) ?? 'Unavailable'}%
- **Processor Queue Length**: ${snapshot.scheduling.processor_queue_length ?? 'Unavailable'}

## 5. Thermal & Power Telemetry
- **Thermal Status**: ${snapshot.thermal.thermal_status}
- **Thermal Throttling**: ${snapshot.thermal.is_thermal_throttling}
- **Throttle Events During Session**: ${snapshot.thermal.throttling_event_count}
- **Package Temperature**: ${snapshot.thermal.package_temperature_celsius !== null ? `${snapshot.thermal.package_temperature_celsius}°C` : 'Telemetry unavailable on this hardware'}
- **Power Source**: ${snapshot.power.power_source} ${snapshot.power.battery_percent !== null ? `(${snapshot.power.battery_percent}%)` : ''}
- **Package Power**: ${snapshot.power.package_power_watts !== null ? `${snapshot.power.package_power_watts} W` : 'Telemetry unavailable on this hardware'}

## 6. Diagnostic Evaluation
- **CPU Pressure Detected**: ${snapshot.diagnostics.pressure_detected ? 'Yes' : 'No'}
- **Single-Core Bottleneck**: ${snapshot.diagnostics.single_core_bottleneck ? `Detected: ${snapshot.diagnostics.single_core_message}` : 'None detected'}
- **Sustained Load**: ${snapshot.diagnostics.sustained_load_detected ? `Detected: ${snapshot.diagnostics.sustained_load_message}` : 'None detected'}
- **Spike Alert**: ${snapshot.diagnostics.spike_detected ? `Detected: ${snapshot.diagnostics.spike_message}` : 'None detected'}
${snapshot.diagnostics.diagnostic_notices.map((n) => `- ${n}`).join('\n')}

## 7. Active Top CPU Processes
| PID | Process Name | CPU % | Memory | Critical Process |
|---|---|---|---|---|
${snapshot.top_processes.map((p) => `| ${p.pid} | ${p.name} | ${p.cpu_usage.toFixed(1)}% | ${formatBytes(p.memory_bytes)} | ${p.is_critical ? 'Yes' : 'No'} |`).join('\n')}

---
*Report generated locally by SystemPilot. No telemetry was transmitted externally.*
`;

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `systempilot_cpu_report_${Date.now()}.md`;
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

  // Filtered and sorted processes
  const displayedProcesses = useMemo(() => {
    const list = snapshot?.top_processes || [];
    let filtered = list;
    if (processSearch.trim()) {
      const q = processSearch.toLowerCase();
      filtered = list.filter((p) => p.name.toLowerCase().includes(q) || p.pid.toString().includes(q));
    }

    return [...filtered].sort((a, b) => {
      if (processSort === 'cpu') return b.cpu_usage - a.cpu_usage;
      if (processSort === 'memory') return b.memory_bytes - a.memory_bytes;
      if (processSort === 'name') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [snapshot?.top_processes, processSearch, processSort]);

  if (loading && !snapshot) {
    return (
      <div className="space-y-4 animate-fadeIn">
        <Card className="p-8 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Initializing SystemPilot Native CPU Telemetry...
          </p>
        </Card>
      </div>
    );
  }

  const identity = snapshot?.identity;
  const topology = snapshot?.topology;
  const utilization = snapshot?.utilization;
  const frequency = snapshot?.frequency;
  const thermal = snapshot?.thermal;
  const power = snapshot?.power;
  const scheduling = snapshot?.scheduling;
  const diagnostics = snapshot?.diagnostics;
  const capabilities = snapshot?.capabilities;

  return (
    <div className="space-y-5 animate-fadeIn text-slate-800 dark:text-slate-100 pb-10">
      {/* Action toast message */}
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
        icon={Cpu}
        iconBgClass="bg-brand-500/10 text-brand-600 dark:text-brand-400"
        title="CPU Monitoring & Diagnostics"
        subtitle="Zero-process native telemetry • Non-destructive monitoring"
        isPaused={isPaused}
        onTogglePause={() => setIsPaused(!isPaused)}
        refreshIntervalMs={refreshIntervalMs}
        onRefreshIntervalChange={setRefreshIntervalMs}
        onCopyDetails={handleCopyDetails}
        copiedNotice={copiedNotice}
        onExportReport={handleExportReport}
      />

      {/* SECTION 1: CPU OVERVIEW CARD */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                {identity?.brand || 'Detected Processor'}
              </h2>
              <Badge variant="brand" size="xs">
                {identity?.vendor_id || 'x86_64'}
              </Badge>
              <Badge variant="neutral" size="xs">
                {identity?.architecture || '64-bit'}
              </Badge>
              {identity?.virtualization_enabled === true && (
                <Badge variant="success" size="xs">Virtualization Enabled</Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {topology?.physical_cores} Physical Cores • {topology?.logical_processors} Logical Processors •{' '}
              {topology?.has_hybrid_architecture
                ? `${topology?.performance_cores || 0} P-Cores + ${topology?.efficiency_cores || 0} E-Cores`
                : 'Unified Core Topology'}
              {topology?.processor_groups > 1 ? ` • ${topology?.processor_groups} Processor Groups` : ''}
              {topology?.numa_nodes > 1 ? ` • ${topology?.numa_nodes} NUMA Nodes` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Base Frequency */}
            <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800 min-w-[110px]">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Base Clock</span>
              <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
                {formatFrequency(frequency?.base_mhz)}
              </span>
            </div>

            {/* Current Operating Clock */}
            <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800 min-w-[110px]">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Current Clock</span>
              <span className="text-sm font-bold font-mono text-brand-600 dark:text-brand-400">
                {formatFrequency(frequency?.current_mhz)}
              </span>
            </div>

            {/* Total Load */}
            <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800 min-w-[110px]">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Overall Load</span>
              <span className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400">
                {Math.round(utilization?.current || 0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Quick Identity Tags & Features */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Features:</span>
            {identity?.instruction_features?.length > 0 ? (
              identity.instruction_features.map((feat) => (
                <span
                  key={feat}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-surface-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]"
                >
                  {feat}
                </span>
              ))
            ) : (
              <span className="text-slate-400 text-[11px]">Standard x86_64</span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span>Turbo / Boost: <strong className="text-slate-800 dark:text-slate-200">{frequency?.turbo_status}</strong></span>
            <span>•</span>
            <span>Power Source: <strong className="text-slate-800 dark:text-slate-200">{power?.power_source}</strong></span>
          </div>
        </div>
      </Card>

      {/* SECTION 2: CPU DIAGNOSTICS & BOTTLENECK EVALUATION */}
      <Card className="p-4 space-y-3 bg-gradient-to-r from-slate-50 to-indigo-50/20 dark:from-surface-900 dark:to-surface-900/60 border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-500 dark:text-brand-400" />
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
              Live CPU Diagnostics & Bottleneck Evaluation
            </h3>
          </div>
          {diagnostics?.pressure_detected ? (
            <Badge variant="warning" size="xs">Possible CPU Pressure</Badge>
          ) : (
            <Badge variant="success" size="xs">Optimal Workload Balance</Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* Single Core Saturation Check */}
          <div className="p-3 rounded-xl bg-white/70 dark:bg-surface-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Single-Core Saturation</span>
              {diagnostics?.single_core_bottleneck ? (
                <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Concentrated
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Balanced
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {diagnostics?.single_core_message ||
                'Workload is distributed normally across processors without single-core saturation.'}
            </p>
          </div>

          {/* Sustained Load & Spikes */}
          <div className="p-3 rounded-xl bg-white/70 dark:bg-surface-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Sustained High Load</span>
              {diagnostics?.sustained_load_detected ? (
                <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Sustained
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Normal
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {diagnostics?.sustained_load_message ||
                'No prolonged continuous saturation detected across recent telemetry samples.'}
            </p>
          </div>

          {/* Thermal & Throttling Status */}
          <div className="p-3 rounded-xl bg-white/70 dark:bg-surface-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Frequency Throttling</span>
              <span
                className={`font-bold flex items-center gap-1 ${
                  thermal?.is_thermal_throttling === 'Yes'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {thermal?.is_thermal_throttling === 'Yes' ? 'Throttled' : 'Not Throttled'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {thermal?.is_thermal_throttling === 'Yes'
                ? `Active power or thermal limitation reported. (${thermal.throttling_event_count} session events)`
                : 'Operating frequency is not artificially capped by power limits or thermal limits.'}
            </p>
          </div>
        </div>

        {diagnostics?.spike_detected && (
          <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>{diagnostics.spike_message}</span>
          </div>
        )}
      </Card>

      {/* SECTION 3: CPU TIMELINE & HISTORICAL METRICS */}
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
              Bounded telemetry history • Select metric & timeframe
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Selector */}
            <div className="flex items-center bg-slate-100 dark:bg-surface-800 rounded-lg p-0.5 text-xs">
              {[
                { id: 'utilization', label: 'Utilization (%)' },
                { id: 'frequency', label: 'Clock (GHz)' },
                { id: 'temperature', label: 'Temperature (°C)' },
                { id: 'power', label: 'Power (W)' },
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

        {/* Live / Historical Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Current Live</span>
            <span className="text-base font-bold font-mono text-brand-600 dark:text-brand-400">
              {metricStats.current !== null
                ? `${metricStats.current} ${selectedMetric === 'utilization' ? '%' : selectedMetric === 'frequency' ? 'GHz' : selectedMetric === 'temperature' ? '°C' : 'W'}`
                : 'Unavailable'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Historical Average</span>
            <span className="text-base font-bold font-mono text-slate-800 dark:text-slate-200">
              {metricStats.avg !== null
                ? `${metricStats.avg} ${selectedMetric === 'utilization' ? '%' : selectedMetric === 'frequency' ? 'GHz' : selectedMetric === 'temperature' ? '°C' : 'W'}`
                : 'Unavailable'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Peak High</span>
            <span className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400">
              {metricStats.peak !== null
                ? `${metricStats.peak} ${selectedMetric === 'utilization' ? '%' : selectedMetric === 'frequency' ? 'GHz' : selectedMetric === 'temperature' ? '°C' : 'W'}`
                : 'Unavailable'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Minimum Low</span>
            <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {metricStats.min !== null
                ? `${metricStats.min} ${selectedMetric === 'utilization' ? '%' : selectedMetric === 'frequency' ? 'GHz' : selectedMetric === 'temperature' ? '°C' : 'W'}`
                : 'Unavailable'}
            </span>
          </div>
        </div>

        {/* Chart View or Unavailable Banner */}
        {selectedMetric === 'temperature' && !capabilities?.supports_temperature ? (
          <div className="h-44 flex flex-col items-center justify-center p-6 rounded-xl bg-slate-50 dark:bg-surface-900/50 border border-dashed border-slate-200 dark:border-slate-800 text-center gap-2">
            <Thermometer className="w-6 h-6 text-slate-400" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              CPU temperature telemetry unavailable on this hardware
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md">
              Windows does not expose hardware thermal sensors through ACPI thermal zones to unprivileged user-mode applications on this motherboard. SystemPilot does not display fabricated estimates.
            </p>
          </div>
        ) : selectedMetric === 'power' && !capabilities?.supports_power ? (
          <div className="h-44 flex flex-col items-center justify-center p-6 rounded-xl bg-slate-50 dark:bg-surface-900/50 border border-dashed border-slate-200 dark:border-slate-800 text-center gap-2">
            <Zap className="w-6 h-6 text-slate-400" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              CPU package power telemetry unavailable on this hardware
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md">
              Real-time wattage telemetry is not exposed without vendor-proprietary kernel drivers. SystemPilot adheres strictly to verified system telemetry and does not guess wattage.
            </p>
          </div>
        ) : (
          <div className="h-44 w-full pt-2">
            <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-xs text-slate-500">Loading chart...</div>}>
              <CpuMetricChart filteredHistory={filteredHistory} selectedMetric={selectedMetric} />
            </Suspense>
          </div>
        )}
      </Card>

      {/* SECTION 4: PER-CORE / PROCESSOR MONITORING */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                Per-Core & Processor Monitoring
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Individual processor utilization, core types & operating states
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-surface-800 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setCoreViewMode('logical')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                  coreViewMode === 'logical'
                    ? 'bg-white dark:bg-surface-700 text-brand-600 dark:text-brand-300 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Logical Processors ({snapshot?.per_processor?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setCoreViewMode('physical')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                  coreViewMode === 'physical'
                    ? 'bg-white dark:bg-surface-700 text-brand-600 dark:text-brand-300 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Physical Cores ({snapshot?.per_physical_core?.length || 0})
              </button>
            </div>

            {/* Density Toggle */}
            <button
              type="button"
              onClick={() => setIsCompactGrid(!isCompactGrid)}
              title="Toggle Compact Grid View"
              className={`p-1.5 rounded-lg border text-xs transition ${
                isCompactGrid
                  ? 'bg-brand-50 dark:bg-surface-700 border-brand-500 text-brand-600 dark:text-brand-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Cores Grid */}
        <div
          className={`grid gap-2.5 max-h-[440px] overflow-y-auto pr-1 ${
            isCompactGrid
              ? 'grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8'
              : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
          }`}
        >
          {coreViewMode === 'logical'
            ? snapshot?.per_processor?.map((proc) => {
                const usage = proc.usage_percent || 0;
                return (
                  <div
                    key={`proc-${proc.processor_id}`}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-1.5 transition hover:border-brand-500/40"
                  >
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        CPU #{proc.processor_id}
                      </span>
                      {proc.core_type && (
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                            proc.core_type === 'Performance'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          }`}
                        >
                          {proc.core_type === 'Performance' ? 'P-Core' : 'E-Core'}
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                        {Math.round(usage)}%
                      </span>
                      {proc.frequency_mhz && (
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {formatFrequency(proc.frequency_mhz)}
                        </span>
                      )}
                    </div>

                    <ProgressBar
                      value={usage}
                      size="xs"
                      className={
                        usage >= 90
                          ? 'bg-rose-500'
                          : usage >= 75
                          ? 'bg-amber-500'
                          : 'bg-brand-500'
                      }
                    />
                  </div>
                );
              })
            : snapshot?.per_physical_core?.map((core) => {
                const usage = core.average_usage_percent || 0;
                return (
                  <div
                    key={`physical-${core.core_id}`}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-1.5 transition hover:border-brand-500/40"
                  >
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Core #{core.core_id}
                      </span>
                      {core.core_type && (
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                            core.core_type === 'Performance'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          }`}
                        >
                          {core.core_type === 'Performance' ? 'P-Core' : 'E-Core'}
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                        {Math.round(usage)}%
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Threads: {core.logical_processor_ids.join(', ')}
                      </span>
                    </div>

                    <ProgressBar
                      value={usage}
                      size="xs"
                      className={
                        usage >= 90
                          ? 'bg-rose-500'
                          : usage >= 75
                          ? 'bg-amber-500'
                          : 'bg-brand-500'
                      }
                    />
                  </div>
                );
              })}
        </div>
      </Card>

      {/* SECTION 5: SCHEDULING, QUEUE, DPC & CPU TIMES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Scheduling & System Activity */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Workflow className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                Windows Scheduling & Activity
              </h3>
            </div>
            <Badge variant="neutral" size="xs">Kernel Telemetry</Badge>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {/* Processor Queue */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Processor Queue</span>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
                  {scheduling?.processor_queue_length !== null && scheduling?.processor_queue_length !== undefined
                    ? `${scheduling.processor_queue_length} threads`
                    : 'Unavailable'}
                </span>
                <span className="text-[10px] font-medium text-slate-500">{scheduling?.queue_status}</span>
              </div>
            </div>

            {/* DPC Activity */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">DPC Activity</span>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
                  {scheduling?.dpc_time_percent !== null && scheduling?.dpc_time_percent !== undefined
                    ? `${scheduling.dpc_time_percent.toFixed(1)}%`
                    : 'Unavailable'}
                </span>
                <span className="text-[10px] font-medium text-slate-500">{scheduling?.dpc_status}</span>
              </div>
            </div>
          </div>

          {/* Interrupt Activity */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Interrupt Activity:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {scheduling?.interrupt_time_percent !== null && scheduling?.interrupt_time_percent !== undefined
                ? `${scheduling.interrupt_time_percent.toFixed(1)}% of CPU time`
                : 'Unavailable'}
            </span>
          </div>
        </Card>

        {/* CPU Time Distribution Breakdown */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-brand-500" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                CPU Time Distribution
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Total: 100%</span>
          </div>

          <div className="space-y-2 pt-1 text-xs">
            <div>
              <div className="flex justify-between items-center text-[11px] mb-1">
                <span className="text-slate-600 dark:text-slate-400 font-medium">User Applications</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {utilization?.user_time_percent !== null && utilization?.user_time_percent !== undefined
                    ? `${utilization.user_time_percent.toFixed(1)}%`
                    : 'Unavailable'}
                </span>
              </div>
              <ProgressBar value={utilization?.user_time_percent || 0} size="xs" className="bg-indigo-500" />
            </div>

            <div>
              <div className="flex justify-between items-center text-[11px] mb-1">
                <span className="text-slate-600 dark:text-slate-400 font-medium">System & Kernel</span>
                <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
                  {utilization?.system_time_percent !== null && utilization?.system_time_percent !== undefined
                    ? `${utilization.system_time_percent.toFixed(1)}%`
                    : 'Unavailable'}
                </span>
              </div>
              <ProgressBar value={utilization?.system_time_percent || 0} size="xs" className="bg-brand-500" />
            </div>

            <div>
              <div className="flex justify-between items-center text-[11px] mb-1">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Idle Capacity</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {utilization?.idle_time_percent !== null && utilization?.idle_time_percent !== undefined
                    ? `${utilization.idle_time_percent.toFixed(1)}%`
                    : 'Unavailable'}
                </span>
              </div>
              <ProgressBar value={utilization?.idle_time_percent || 0} size="xs" className="bg-emerald-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* SECTION 6: INTEGRATED PROCESS CPU MONITOR */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
              Top CPU Consumer Processes
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Live per-process load • Safe Windows priority & affinity controls
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <label htmlFor="cpu-process-search" className="sr-only">
                Search processes
              </label>
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                id="cpu-process-search"
                type="text"
                aria-label="Search processes"
                placeholder="Search processes..."
                value={processSearch}
                onChange={(e) => setProcessSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>

            <select
              aria-label="Sort processes by"
              value={processSort}
              onChange={(e) => setProcessSort(e.target.value)}
              className="py-1.5 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-800 text-slate-800 dark:text-slate-200"
            >
              <option value="cpu">Sort by CPU %</option>
              <option value="memory">Sort by RAM</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>
        </div>

        {/* Process Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold text-[11px]">
                <th className="pb-2">Process Name</th>
                <th className="pb-2">PID</th>
                <th className="pb-2">CPU %</th>
                <th className="pb-2">Memory</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {displayedProcesses.map((proc) => {
                const isHighCpu = proc.cpu_usage >= 20.0;
                return (
                  <tr key={proc.pid} className="hover:bg-slate-50 dark:hover:bg-surface-800/40 transition">
                    <td className="py-2 font-medium flex items-center gap-2">
                      <span className="text-slate-800 dark:text-slate-200">{proc.name}</span>
                      {proc.is_critical && (
                        <Badge variant="neutral" size="xs">System</Badge>
                      )}
                    </td>
                    <td className="py-2 text-slate-500 dark:text-slate-400 font-mono">{proc.pid}</td>
                    <td className="py-2 font-mono font-bold">
                      <span className={isHighCpu ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}>
                        {proc.cpu_usage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 text-slate-600 dark:text-slate-400 font-mono">
                      {formatBytes(proc.memory_bytes)}
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
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* SECTION 7: ADVANCED CPU INFORMATION (EXPANDABLE) */}
      <Card className="p-4 space-y-3">
        <ExpandableSectionHeader
          isOpen={showAdvanced}
          onToggle={() => setShowAdvanced(!showAdvanced)}
          title="Advanced CPU Details, Cache Hierarchy & Topology"
          icon={Info}
          iconColor="text-brand-500"
        />

        {showAdvanced && (
          <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800 animate-fadeIn text-xs">
            {/* Cache Hierarchy */}
            <div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Hardware Cache Hierarchy</h4>
              {topology?.caches?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {topology.caches.map((cache) => (
                    <div
                      key={`cache-L${cache.level}-${cache.cache_type}-${cache.size_bytes}`}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800 space-y-1"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          Level {cache.level} {cache.cache_type} Cache
                        </span>
                        <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
                          {formatBytes(cache.size_bytes)}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Line Size: {cache.line_size_bytes}B • {cache.associativity}-way Associativity •{' '}
                        {cache.is_shared ? 'Shared' : 'Dedicated'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-[11px]">Hardware cache details not exposed by host firmware.</p>
              )}
            </div>

            {/* Processor Groups & NUMA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">Windows Processor Groups</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Total Groups: <strong className="text-slate-800 dark:text-slate-200">{topology?.processor_groups}</strong>.
                  Windows assigns up to 64 logical processors per group for high-core count and workstation compatibility.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">NUMA Topology</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  NUMA Nodes: <strong className="text-slate-800 dark:text-slate-200">{topology?.numa_nodes}</strong>.
                  Memory node affinity optimizes memory access latency across physical processor packages.
                </p>
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
            Changing process priority influences how the Windows scheduler allocates CPU timeslices. Higher priorities give preferential execution slices without hardware overclocking.
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

export default CpuManager;

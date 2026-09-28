import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { ExpandableSectionHeader } from '../components/ui/ExpandableSectionHeader';
import { Modal } from '../components/ui/Modal';
import { api } from '../services/tauriApi';
import { formatBytes, formatSpeed, formatUptime } from '../utils/formatters';
import {
  Gauge,
  Activity,
  Cpu,
  Layers,
  HardDrive,
  Network,
  Zap,
  Leaf,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Pause,
  Play,
  Download,
  Copy,
  Check,
  Search,
  RefreshCw,
  Clock,
  Info,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Battery,
  BatteryCharging,
  Sliders,
  Flame,
} from 'lucide-react';
const PerformanceTimelineChart = lazy(() =>
  import('recharts').then((m) => ({
    default: ({ filteredHistory, selectedChartMode, diskActiveAvailable }) => (
      <m.ResponsiveContainer width="100%" height="100%">
        <m.AreaChart data={filteredHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="diskGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <m.XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} minTickGap={30} />
          <m.YAxis tick={{ fontSize: 10, fill: '#64748b' }} domain={[0, 'auto']} />
          <m.Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
            }}
          />

          {selectedChartMode === 'utilization' ? (
            <>
              <m.Area
                type="monotone"
                dataKey="cpu"
                name="CPU %"
                stroke="#8b5cf6"
                fill="url(#cpuGrad)"
                strokeWidth={2}
                isAnimationActive={false}
              />
              <m.Area
                type="monotone"
                dataKey="mem"
                name="RAM %"
                stroke="#3b82f6"
                fill="url(#memGrad)"
                strokeWidth={2}
                isAnimationActive={false}
              />
              {diskActiveAvailable && (
                <m.Area
                  type="monotone"
                  dataKey="diskActive"
                  name="Disk Active %"
                  stroke="#10b981"
                  fill="url(#diskGrad)"
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
              )}
            </>
          ) : (
            <>
              <m.Area
                type="monotone"
                dataKey="diskThroughputMb"
                name="Disk I/O (MB/s)"
                stroke="#10b981"
                fill="url(#diskGrad)"
                strokeWidth={2}
                isAnimationActive={false}
              />
              <m.Area
                type="monotone"
                dataKey="netThroughputMb"
                name="Network (MB/s)"
                stroke="#f59e0b"
                fill="url(#netGrad)"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </>
          )}
        </m.AreaChart>
      </m.ResponsiveContainer>
    ),
  }))
);

function ResponsivenessAndBottlenecks({ resp, bnecks }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      {/* Responsiveness Card */}
      <Card
        className={`p-4 border transition-all ${
          resp?.responsiveness_state === 'Constrained'
            ? 'border-red-500/40 bg-red-500/5'
            : resp?.responsiveness_state === 'Reduced'
            ? 'border-amber-500/40 bg-amber-500/5'
            : 'border-emerald-500/30 bg-emerald-500/5'
        }`}
      >
        <div className="flex items-start gap-3">
          {resp?.responsiveness_state === 'Constrained' ? (
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          ) : resp?.responsiveness_state === 'Reduced' ? (
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          )}
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-slate-100">
                System Responsiveness: {resp?.responsiveness_state || 'Normal'}
              </span>
              <Badge
                variant={
                  resp?.responsiveness_state === 'Optimal'
                    ? 'success'
                    : resp?.responsiveness_state === 'Normal'
                    ? 'brand'
                    : 'warning'
                }
                size="xs"
              >
                {resp?.responsiveness_state}
              </Badge>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {resp?.explanation}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono text-slate-400">
              <span>CPU: {resp?.cpu_saturation_percent.toFixed(0)}%</span>
              <span>RAM: {resp?.memory_pressure_percent.toFixed(0)}%</span>
              <span>Disk Active: {resp?.disk_active_percent.toFixed(0)}%</span>
              {resp?.disk_latency_ms !== null && resp?.disk_latency_ms !== undefined && (
                <span>Latency: {resp.disk_latency_ms.toFixed(1)} ms</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Bottleneck Analysis Card */}
      <Card className="p-4 border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-500" />
            <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
              Subsystem Bottleneck Analysis
            </span>
          </div>
          <Badge
            variant={bnecks?.primary_bottleneck ? 'warning' : 'success'}
            size="xs"
          >
            {bnecks?.primary_bottleneck ? `Limiter: ${bnecks.primary_bottleneck}` : 'Balanced Headroom'}
          </Badge>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {bnecks?.summary_verdict}
        </p>

        {/* Subsystem status pills */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
          {[
            { label: 'CPU', data: bnecks?.cpu },
            { label: 'Memory', data: bnecks?.memory },
            { label: 'GPU', data: bnecks?.gpu },
            { label: 'Storage', data: bnecks?.storage },
            { label: 'Network', data: bnecks?.network },
            { label: 'Thermal', data: bnecks?.thermal },
          ].map((item) => (
            <div
              key={item.label}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-surface-800 text-center font-mono"
            >
              <span className="text-[10px] text-slate-400 block">{item.label}</span>
              <span
                className={`text-[11px] font-bold ${
                  item.data?.status === 'Potential Bottleneck'
                    ? 'text-red-500'
                    : item.data?.status === 'Elevated'
                    ? 'text-amber-500'
                    : item.data?.status === 'Normal'
                    ? 'text-emerald-500'
                    : 'text-slate-400'
                }`}
              >
                {item.data?.status === 'Potential Bottleneck' ? 'Bottleneck' : item.data?.status || 'N/A'}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function PrimaryResourceCards({ snapshot }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* CPU Load */}
      <Card className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-brand-500" />
            Processor Utilization
          </span>
          <Badge variant={snapshot?.cpu_load_percent > 85 ? 'danger' : 'neutral'} size="xs">
            CPU
          </Badge>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {snapshot?.cpu_load_percent.toFixed(1)}%
          </span>
        </div>
        <ProgressBar
          value={snapshot?.cpu_load_percent || 0}
          size="sm"
          color={snapshot?.cpu_load_percent > 85 ? 'bg-red-500' : 'bg-brand-500'}
        />
        <div className="flex justify-between text-[11px] text-slate-500 font-mono pt-0.5">
          <span>Global Load</span>
          <span>All Cores Active</span>
        </div>
      </Card>

      {/* Memory Pressure */}
      <Card className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            Memory Allocation
          </span>
          <Badge variant={snapshot?.memory_used_percent > 85 ? 'warning' : 'neutral'} size="xs">
            RAM
          </Badge>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {snapshot?.memory_used_percent.toFixed(1)}%
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {formatBytes(snapshot?.memory_used_bytes || 0)}
          </span>
        </div>
        <ProgressBar
          value={snapshot?.memory_used_percent || 0}
          size="sm"
          color={snapshot?.memory_used_percent > 85 ? 'bg-amber-500' : 'bg-blue-500'}
        />
        <div className="flex justify-between text-[11px] text-slate-500 font-mono pt-0.5">
          <span>Free: {formatBytes(snapshot?.memory_available_bytes || 0)}</span>
          <span>Total: {formatBytes(snapshot?.memory_total_bytes || 0)}</span>
        </div>
      </Card>

      {/* GPU Load */}
      <Card className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-indigo-500" />
            GPU Render Load
          </span>
          <Badge variant="neutral" size="xs">
            3D Core
          </Badge>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {snapshot?.gpu_load_percent !== null && snapshot?.gpu_load_percent !== undefined
              ? `${snapshot.gpu_load_percent}%`
              : 'Unavailable'}
          </span>
        </div>
        <ProgressBar
          value={snapshot?.gpu_load_percent || 0}
          size="sm"
          color="bg-indigo-500"
        />
        <div className="flex justify-between text-[11px] text-slate-500 font-mono pt-0.5">
          <span>VRAM: {snapshot?.gpu_memory_used_bytes ? formatBytes(snapshot.gpu_memory_used_bytes) : 'N/A'}</span>
          <span>Temp: {snapshot?.thermal?.gpu_temp_celsius ? `${snapshot.thermal.gpu_temp_celsius}°C` : 'N/A'}</span>
        </div>
      </Card>

      {/* Storage Active Time */}
      <Card className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
            Storage Controller
          </span>
          <Badge variant="neutral" size="xs">
            Disk I/O
          </Badge>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {snapshot?.disk_active_percent !== null && snapshot?.disk_active_percent !== undefined
              ? `${snapshot.disk_active_percent}%`
              : 'Unavailable'}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            Active Time
          </span>
        </div>
        <ProgressBar
          value={snapshot?.disk_active_percent || 0}
          size="sm"
          color="bg-emerald-500"
        />
        <div className="flex justify-between text-[11px] text-slate-500 font-mono pt-0.5">
          <span>Read: {formatSpeed(snapshot?.disk_read_bytes_sec || 0)}</span>
          <span>Write: {formatSpeed(snapshot?.disk_write_bytes_sec || 0)}</span>
        </div>
      </Card>
    </div>
  );
}

function ProcessImpactTable({
  filteredProcesses,
  processSearch,
  setProcessSearch,
  processSort,
  setProcessSort,
  onOpenPriorityModal,
}) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Cross-Resource Process Impact
          </h3>
          <span className="text-xs text-slate-400">
            (Live correlation across CPU, RAM & Disk I/O)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <label htmlFor="perf-process-search" className="sr-only">
              Search process
            </label>
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              id="perf-process-search"
              type="text"
              aria-label="Search process"
              value={processSearch}
              onChange={(e) => setProcessSearch(e.target.value)}
              placeholder="Search process..."
              className="pl-8 pr-3 py-1 text-xs rounded-lg bg-slate-100 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-surface-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setProcessSort('cpu')}
              className={`px-2 py-1 rounded font-medium ${
                processSort === 'cpu' ? 'bg-brand-500 text-white' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              CPU
            </button>
            <button
              onClick={() => setProcessSort('memory')}
              className={`px-2 py-1 rounded font-medium ${
                processSort === 'memory' ? 'bg-brand-500 text-white' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              RAM
            </button>
            <button
              onClick={() => setProcessSort('disk')}
              className={`px-2 py-1 rounded font-medium ${
                processSort === 'disk' ? 'bg-brand-500 text-white' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Disk
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
              <th className="py-1.5 font-medium">Process Name</th>
              <th className="py-1.5 font-medium">PID</th>
              <th className="py-1.5 font-medium text-right">CPU %</th>
              <th className="py-1.5 font-medium text-right">Memory</th>
              <th className="py-1.5 font-medium text-right">Disk I/O</th>
              <th className="py-1.5 font-medium text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredProcesses.length > 0 ? (
              filteredProcesses.map((proc) => (
                <tr key={proc.pid} className="hover:bg-slate-50 dark:hover:bg-surface-800/50 transition-colors">
                  <td className="py-2 flex items-center gap-2">
                    <span className="font-sans font-medium text-slate-800 dark:text-slate-200">
                      {proc.name}
                    </span>
                    {proc.is_critical && (
                      <Badge variant="neutral" size="xs">
                        System
                      </Badge>
                    )}
                  </td>
                  <td className="py-2 text-slate-500">{proc.pid}</td>
                  <td className="py-2 text-right font-bold text-slate-900 dark:text-slate-100">
                    {proc.cpu_percent.toFixed(1)}%
                  </td>
                  <td className="py-2 text-right text-blue-600 dark:text-blue-400">
                    {formatBytes(proc.memory_bytes)}
                  </td>
                  <td className="py-2 text-right text-emerald-600 dark:text-emerald-400">
                    {formatSpeed(proc.disk_total_bytes_sec)}
                  </td>
                  <td className="py-2 text-center">
                    <button
                      onClick={() => onOpenPriorityModal(proc)}
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-surface-800 hover:bg-slate-200 dark:hover:bg-surface-700 text-slate-600 dark:text-slate-300 transition-colors font-sans text-[11px]"
                    >
                      Adjust
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400 italic font-sans">
                  No active processes matching filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function PowerSchemesSection({ powerPlans, powerPlanNotice, onApplyPowerPlan }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Windows Power Schemes & Energy Management
          </h2>
        </div>
        {powerPlanNotice && (
          <span className="text-xs text-brand-600 dark:text-brand-400 font-medium">
            {powerPlanNotice}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {powerPlans.map((plan) => {
          const isHigh = plan.name.toLowerCase().includes('high') || plan.name.toLowerCase().includes('ultimate');
          const isSaver = plan.name.toLowerCase().includes('saver');
          return (
            <Card
              key={plan.guid}
              className={`p-4 space-y-3 border transition-all ${
                plan.is_active
                  ? 'border-brand-500/60 ring-1 ring-brand-500/40 bg-brand-500/5'
                  : 'hover:border-slate-400 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-surface-800">
                    {isHigh ? (
                      <Zap className="w-4 h-4 text-amber-500" />
                    ) : isSaver ? (
                      <Leaf className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Gauge className="w-4 h-4 text-brand-500" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                      {plan.name}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {plan.is_active ? 'Active Windows Profile' : 'Configured Scheme'}
                    </span>
                  </div>
                </div>
                {plan.is_active && (
                  <Badge variant="success" size="xs">
                    Active
                  </Badge>
                )}
              </div>

              {!plan.is_active && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => onApplyPowerPlan(plan.guid)}
                >
                  Activate Scheme
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function AdjustPriorityModal({
  isOpen,
  onClose,
  target,
  selectedPriority,
  onSelectPriority,
  onConfirmPriority,
  actionMsg,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Adjust Scheduling Priority: ${target?.name}`}
    >
      <div className="space-y-4 text-xs">
        <p className="text-slate-600 dark:text-slate-300">
          Modifying a process's scheduling priority affects how the Windows CPU scheduler allocates thread execution time. Only safe, standard priority levels are permitted.
        </p>

        <div className="space-y-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
            Target Priority Level:
          </span>
          <div className="grid grid-cols-3 gap-2">
            {['BELOW_NORMAL', 'NORMAL', 'ABOVE_NORMAL'].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => onSelectPriority(lvl)}
                className={`p-2 rounded-xl border text-center font-semibold transition-all ${
                  selectedPriority === lvl
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {lvl.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {actionMsg && (
          <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-surface-800 text-brand-600 dark:text-brand-400 font-mono text-[11px]">
            {actionMsg}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={onConfirmPriority}>
            Apply Priority
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AdvancedDiagnosticsSection({ showAdvanced, onToggleAdvanced, snapshot }) {
  return (
    <Card className="p-3.5">
      <ExpandableSectionHeader
        isOpen={showAdvanced}
        onToggle={onToggleAdvanced}
        title="Advanced Performance Diagnostics & Evidence Methodology"
        icon={SlidersHorizontal}
        iconColor="text-slate-500"
      />

      {showAdvanced && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                Evidence-Based Observations
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                {snapshot?.diagnostics?.map((diag) => (
                  <li key={diag}>{diag}</li>
                ))}
              </ul>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                Actionable Recommendations
              </span>
              {snapshot?.recommendations?.length > 0 ? (
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                  {snapshot.recommendations.map((rec) => (
                    <li key={rec}>{rec}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 italic">
                  No immediate optimization actions required. System is operating with balanced headroom.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export function Performance() {
  const [snapshot, setSnapshot] = useState(null);
  const [powerPlans, setPowerPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [refreshIntervalMs, setRefreshIntervalMs] = useState(2000);
  const isFetchingRef = useRef(false);

  // Bounded timeline history in memory (Max 180 points)
  const [perfHistory, setPerfHistory] = useState([]);
  const [selectedChartMode, setSelectedChartMode] = useState('utilization'); // 'utilization' | 'throughput'
  const [selectedDuration, setSelectedDuration] = useState('1m'); // '1m' | '5m' | '15m' | '30m' | '1h'

  // Process filter & sort
  const [processSearch, setProcessSearch] = useState('');
  const [processSort, setProcessSort] = useState('cpu'); // 'cpu' | 'memory' | 'disk' | 'name'

  // Safe process priority modal
  const [priorityTarget, setPriorityTarget] = useState(null);
  const [selectedPriority, setSelectedPriority] = useState('NORMAL');
  const [priorityModalOpen, setPriorityModalOpen] = useState(false);
  const [priorityActionMsg, setPriorityActionMsg] = useState(null);

  // Advanced section & clipboard states
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [powerPlanNotice, setPowerPlanNotice] = useState(null);

  // Fetch telemetry
  const fetchTelemetry = useCallback(async () => {
    if (isFetchingRef.current || isPaused) return;
    isFetchingRef.current = true;
    try {
      const data = await api.getPerformanceSnapshot();
      if (data) {
        setSnapshot(data);
        setError(null);

        const now = new Date();
        const timeLabel = now.toTimeString().split(' ')[0];

        const diskMb = data.disk_read_bytes_sec + data.disk_write_bytes_sec
          ? parseFloat(((data.disk_read_bytes_sec + data.disk_write_bytes_sec) / (1024 * 1024)).toFixed(2))
          : 0;

        const netMb = data.network_rx_bytes_sec + data.network_tx_bytes_sec
          ? parseFloat(((data.network_rx_bytes_sec + data.network_tx_bytes_sec) / (1024 * 1024)).toFixed(2))
          : 0;

        const newPoint = {
          time: timeLabel,
          timestamp: Date.now(),
          cpu: parseFloat(data.cpu_load_percent.toFixed(1)),
          mem: parseFloat(data.memory_used_percent.toFixed(1)),
          gpu: data.gpu_load_percent !== null ? parseFloat(data.gpu_load_percent.toFixed(1)) : null,
          diskActive: data.disk_active_percent !== null ? parseFloat(data.disk_active_percent.toFixed(1)) : null,
          diskThroughputMb: diskMb,
          netThroughputMb: netMb,
        };

        setPerfHistory((prev) => {
          const next = [...prev, newPoint];
          return next.slice(-180); // Strict memory bound: 180 points
        });
      }
    } catch (err) {
      console.error('Failed to fetch performance snapshot:', err);
      setError('Performance telemetry is temporarily unavailable.');
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [isPaused]);

  const fetchPowerPlans = useCallback(async () => {
    try {
      const plans = await api.getPowerPlans();
      setPowerPlans(plans || []);
    } catch (e) {
      console.error('Power plans fetch failed:', e);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
    fetchPowerPlans();
    const interval = setInterval(fetchTelemetry, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [fetchTelemetry, fetchPowerPlans, refreshIntervalMs]);

  // Apply power scheme safely
  const handleApplyPowerPlan = async (guid) => {
    try {
      await api.setPowerPlan(guid);
      setPowerPlanNotice('Windows power scheme successfully applied.');
      fetchPowerPlans();
      setTimeout(() => setPowerPlanNotice(null), 3000);
    } catch (e) {
      setPowerPlanNotice('Failed to apply power scheme. Administrator rights may be required.');
      setTimeout(() => setPowerPlanNotice(null), 4000);
    }
  };

  // Safe process priority adjustment
  const handleOpenPriorityModal = (proc) => {
    setPriorityTarget(proc);
    setSelectedPriority('NORMAL');
    setPriorityActionMsg(null);
    setPriorityModalOpen(true);
  };

  const handleConfirmPriority = async () => {
    if (!priorityTarget) return;
    try {
      await api.setProcessPriority(priorityTarget.pid, selectedPriority);
      setPriorityActionMsg(`Priority for ${priorityTarget.name} updated to ${selectedPriority}.`);
      setTimeout(() => {
        setPriorityModalOpen(false);
        setPriorityTarget(null);
      }, 1000);
    } catch (e) {
      setPriorityActionMsg(e?.message || 'Failed to update process priority.');
    }
  };

  // Filtered timeline history
  const filteredHistory = useMemo(() => {
    if (!perfHistory.length) return [];
    const now = Date.now();
    const durationMap = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
    };
    const windowMs = durationMap[selectedDuration] || durationMap['1m'];
    return perfHistory.filter((pt) => now - pt.timestamp <= windowMs);
  }, [perfHistory, selectedDuration]);

  // Filtered and sorted processes
  const filteredProcesses = useMemo(() => {
    if (!snapshot?.top_processes) return [];
    let list = snapshot.top_processes.filter((p) =>
      p.name.toLowerCase().includes(processSearch.toLowerCase())
    );

    list.sort((a, b) => {
      if (processSort === 'memory') return b.memory_bytes - a.memory_bytes;
      if (processSort === 'disk') return b.disk_total_bytes_sec - a.disk_total_bytes_sec;
      if (processSort === 'name') return a.name.localeCompare(b.name);
      return b.cpu_percent - a.cpu_percent;
    });

    return list;
  }, [snapshot, processSearch, processSort]);

  // Copy snapshot details
  const handleCopySnapshot = async () => {
    if (!snapshot) return;
    try {
      const summary = {
        timestamp: new Date().toISOString(),
        system_uptime: formatUptime(snapshot.uptime_seconds),
        cpu_load: `${snapshot.cpu_load_percent.toFixed(1)}%`,
        memory_used: `${snapshot.memory_used_percent.toFixed(1)}% (${formatBytes(snapshot.memory_used_bytes)} / ${formatBytes(snapshot.memory_total_bytes)})`,
        gpu_load: snapshot.gpu_load_percent !== null ? `${snapshot.gpu_load_percent}%` : 'Unavailable',
        disk_active: snapshot.disk_active_percent !== null ? `${snapshot.disk_active_percent}%` : 'Unavailable',
        responsiveness: snapshot.responsiveness,
        bottlenecks: snapshot.bottlenecks,
        power: snapshot.power,
        diagnostics: snapshot.diagnostics,
        recommendations: snapshot.recommendations,
      };
      await navigator.clipboard.writeText(JSON.stringify(summary, null, 2));
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2000);
    } catch (e) {
      console.error('Failed to copy snapshot:', e);
    }
  };

  // Export JSON report
  const handleExportReport = () => {
    if (!snapshot) return;
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `systempilot-performance-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !snapshot) {
    return (
      <div className="space-y-4 animate-fadeIn">
        <Card className="p-8 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-brand-500" />
          <span>Synthesizing cross-system performance analysis and bottleneck metrics...</span>
        </Card>
      </div>
    );
  }

  const resp = snapshot?.responsiveness;
  const bnecks = snapshot?.bottlenecks;

  return (
    <div className="space-y-5 animate-fadeIn text-slate-900 dark:text-slate-100">
      {/* 1. HEADER & TOP CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                System Performance & Resource Center
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cross-system resource correlation, responsiveness analysis, bottleneck detection & power states
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Uptime Badge */}
          {snapshot && (
            <Badge variant="neutral" size="sm" className="font-mono">
              Uptime: {formatUptime(snapshot.uptime_seconds)}
            </Badge>
          )}

          {/* Refresh Intervals */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-surface-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
            <Clock className="w-3.5 h-3.5 text-slate-400 ml-1" />
            <button
              onClick={() => setRefreshIntervalMs(1000)}
              className={`px-2 py-0.5 rounded-lg font-medium transition-all ${
                refreshIntervalMs === 1000
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              1s
            </button>
            <button
              onClick={() => setRefreshIntervalMs(2000)}
              className={`px-2 py-0.5 rounded-lg font-medium transition-all ${
                refreshIntervalMs === 2000
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              2s
            </button>
            <button
              onClick={() => setRefreshIntervalMs(5000)}
              className={`px-2 py-0.5 rounded-lg font-medium transition-all ${
                refreshIntervalMs === 5000
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              5s
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
            icon={isPaused ? Play : Pause}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopySnapshot}
            icon={copiedNotice ? Check : Copy}
          >
            {copiedNotice ? 'Copied' : 'Copy'}
          </Button>

          <Button variant="secondary" size="sm" onClick={handleExportReport} icon={Download}>
            Export
          </Button>

          <Button variant="secondary" size="sm" onClick={fetchTelemetry} disabled={loading} icon={RefreshCw} />
        </div>
      </div>

      {/* 2. SYSTEM RESPONSIVENESS & BOTTLENECK DIAGNOSTICS */}
      <ResponsivenessAndBottlenecks resp={resp} bnecks={bnecks} />

      {/* 3. PRIMARY RESOURCE OVERVIEW CARDS */}
      <PrimaryResourceCards snapshot={snapshot} />

      {/* 4. UNIFIED CROSS-RESOURCE TIMELINE CHART */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Unified Performance Timeline
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              (Live cross-resource correlation)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 dark:bg-surface-800 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setSelectedChartMode('utilization')}
                className={`px-2 py-1 rounded font-medium transition-all ${
                  selectedChartMode === 'utilization'
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Resource %
              </button>
              <button
                onClick={() => setSelectedChartMode('throughput')}
                className={`px-2 py-1 rounded font-medium transition-all ${
                  selectedChartMode === 'throughput'
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                I/O & Network (MB/s)
              </button>
            </div>

            <div className="flex items-center bg-slate-100 dark:bg-surface-800 p-0.5 rounded-lg text-xs">
              {['1m', '5m', '15m', '30m', '1h'].map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDuration(d)}
                  className={`px-1.5 py-0.5 rounded font-mono transition-all ${
                    selectedDuration === d
                      ? 'bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-900 font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="h-48 w-full">
          <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-xs text-slate-500">Loading chart...</div>}>
            <PerformanceTimelineChart
              filteredHistory={filteredHistory}
              selectedChartMode={selectedChartMode}
              diskActiveAvailable={snapshot?.disk_active_percent !== null}
            />
          </Suspense>
        </div>

        <div className="flex items-center justify-center gap-6 text-xs font-mono text-slate-500 pt-1">
          {selectedChartMode === 'utilization' ? (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                CPU Load %
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                RAM Allocation %
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Disk Active %
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Disk Throughput (MB/s)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Network Throughput (MB/s)
              </span>
            </>
          )}
        </div>
      </Card>

      {/* 5. TOP RESOURCE CONSUMERS TABLE */}
      <ProcessImpactTable
        filteredProcesses={filteredProcesses}
        processSearch={processSearch}
        setProcessSearch={setProcessSearch}
        processSort={processSort}
        setProcessSort={setProcessSort}
        onOpenPriorityModal={handleOpenPriorityModal}
      />

      {/* 6. POWER & PERFORMANCE PROFILES */}
      <PowerSchemesSection
        powerPlans={powerPlans}
        powerPlanNotice={powerPlanNotice}
        onApplyPowerPlan={handleApplyPowerPlan}
      />

      {/* 7. SAFE PRIORITY CONTROL MODAL */}
      <AdjustPriorityModal
        isOpen={priorityModalOpen}
        onClose={() => setPriorityModalOpen(false)}
        target={priorityTarget}
        selectedPriority={selectedPriority}
        onSelectPriority={setSelectedPriority}
        onConfirmPriority={handleConfirmPriority}
        actionMsg={priorityActionMsg}
      />

      {/* 8. ADVANCED DIAGNOSTICS & HARDWARE DRAWER */}
      <AdvancedDiagnosticsSection
        showAdvanced={showAdvanced}
        onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
        snapshot={snapshot}
      />
    </div>
  );
}

import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { ExpandableSectionHeader } from '../components/ui/ExpandableSectionHeader';
import { ProcessTableHead } from '../components/ui/ProcessTableHead';
import { api } from '../services/tauriApi';
import { formatBytes, formatSpeed } from '../utils/formatters';
import {
  HardDrive,
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Layers,
  Thermometer,
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
  Server,
  Database,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
const DiskMetricChart = lazy(() =>
  import('recharts').then((m) => ({
    default: ({ filteredHistory, selectedMetric }) => (
      <m.ResponsiveContainer width="100%" height="100%">
        <m.AreaChart data={filteredHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="readGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="writeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="iopsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
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

          {selectedMetric === 'throughput' && (
            <>
              <m.Area
                type="monotone"
                dataKey="readMb"
                name="Read (MB/s)"
                stroke="#10b981"
                fill="url(#readGrad)"
                strokeWidth={2}
                isAnimationActive={false}
              />
              <m.Area
                type="monotone"
                dataKey="writeMb"
                name="Write (MB/s)"
                stroke="#6366f1"
                fill="url(#writeGrad)"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </>
          )}

          {selectedMetric === 'active_time' && (
            <m.Area
              type="monotone"
              dataKey="activeTime"
              name="Active Time %"
              stroke="#f59e0b"
              fill="url(#activeGrad)"
              strokeWidth={2}
              isAnimationActive={false}
            />
          )}

          {selectedMetric === 'iops' && (
            <m.Area
              type="monotone"
              dataKey="iops"
              name="Total IOPS"
              stroke="#8b5cf6"
              fill="url(#iopsGrad)"
              strokeWidth={2}
              isAnimationActive={false}
            />
          )}

          {selectedMetric === 'latency' && (
            <m.Area
              type="monotone"
              dataKey="latency"
              name="Avg Latency (ms)"
              stroke="#06b6d4"
              fill="url(#latGrad)"
              strokeWidth={2}
              isAnimationActive={false}
            />
          )}
        </m.AreaChart>
      </m.ResponsiveContainer>
    ),
  }))
);

export function DiskMonitor() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const errorRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [refreshIntervalMs, setRefreshIntervalMs] = useState(2000);
  const [selectedDiskIndex, setSelectedDiskIndex] = useState(0);
  const isFetchingRef = useRef(false);

  // Bounded timeline history in memory (Max 180 points)
  const [diskHistory, setDiskHistory] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('throughput'); // 'throughput' | 'active_time' | 'iops' | 'latency' | 'queue'
  const [selectedDuration, setSelectedDuration] = useState('1m'); // '1m' | '5m' | '15m' | '30m' | '1h'

  // Nested navigation tab
  const [activeDiskTab, setActiveDiskTab] = useState('overview'); // 'overview' | 'physical' | 'volumes' | 'partitions' | 'health' | 'activity' | 'settings'
  const [partitionSearch, setPartitionSearch] = useState('');
  const [partitions, setPartitions] = useState([]);
  const [loadingPartitions, setLoadingPartitions] = useState(false);

  // Process filter & sort
  const [processSearch, setProcessSearch] = useState('');
  const [processSort, setProcessSort] = useState('total'); // 'total' | 'read' | 'write' | 'name'

  // Advanced section toggle & clipboard feedback
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  const fetchPartitions = useCallback(async () => {
    setLoadingPartitions(true);
    try {
      const parts = await api.getDiskPartitions();
      if (Array.isArray(parts)) {
        setPartitions(parts);
      }
    } catch (e) {
      console.warn('Failed to load disk partitions:', e);
    } finally {
      setLoadingPartitions(false);
    }
  }, []);

  useEffect(() => {
    if (activeDiskTab === 'partitions' && partitions.length === 0) {
      fetchPartitions();
    }
  }, [activeDiskTab, partitions.length, fetchPartitions]);

  const filteredPartitions = useMemo(() => {
    if (!partitions) return [];
    return partitions.filter((p) => {
      if (!partitionSearch) return true;
      const term = partitionSearch.toLowerCase();
      return (
        String(p.disk_number).includes(term) ||
        String(p.partition_number).includes(term) ||
        (p.drive_letter && p.drive_letter.toLowerCase().includes(term)) ||
        (p.partition_type && p.partition_type.toLowerCase().includes(term)) ||
        (p.partition_style && p.partition_style.toLowerCase().includes(term))
      );
    });
  }, [partitions, partitionSearch]);


  // Fetch telemetry from backend
  const fetchTelemetry = useCallback(async () => {
    if (isFetchingRef.current || isPaused) return;
    isFetchingRef.current = true;
    try {
      const data = await api.getDiskSystemSnapshot(selectedDiskIndex);
      if (data) {
        setSnapshot(data);
        errorRef.current = null;

        const currentDisk =
          data.physical_disks.find((d) => d.disk_index === selectedDiskIndex) ||
          data.physical_disks[0];

        if (currentDisk) {
          const now = new Date();
          const timeLabel = now.toTimeString().split(' ')[0];

          const readMb = currentDisk.read_bytes_sec
            ? parseFloat((currentDisk.read_bytes_sec / (1024 * 1024)).toFixed(2))
            : 0;
          const writeMb = currentDisk.write_bytes_sec
            ? parseFloat((currentDisk.write_bytes_sec / (1024 * 1024)).toFixed(2))
            : 0;

          const newPoint = {
            time: timeLabel,
            timestamp: Date.now(),
            readMb,
            writeMb,
            totalMb: parseFloat((readMb + writeMb).toFixed(2)),
            activeTime: currentDisk.active_time_percent ?? null,
            iops: currentDisk.total_iops ?? null,
            latency: currentDisk.avg_latency_ms ?? null,
            queueDepth: currentDisk.queue_depth ?? null,
          };

          setDiskHistory((prev) => {
            const next = [...prev, newPoint];
            return next.slice(-180); // Strict memory bound: 180 samples
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch disk snapshot:', err);
      errorRef.current = 'Storage telemetry is temporarily unavailable.';
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [isPaused, selectedDiskIndex]);

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [fetchTelemetry, refreshIntervalMs]);

  // Active physical drive reference
  const activeDisk = useMemo(() => {
    if (!snapshot || !snapshot.physical_disks.length) return null;
    return (
      snapshot.physical_disks.find((d) => d.disk_index === selectedDiskIndex) ||
      snapshot.physical_disks[0]
    );
  }, [snapshot, selectedDiskIndex]);

  // History filtering by selected duration
  const filteredHistory = useMemo(() => {
    if (!diskHistory.length) return [];
    const now = Date.now();
    const durationMap = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
    };
    const windowMs = durationMap[selectedDuration] || durationMap['1m'];
    return diskHistory.filter((pt) => now - pt.timestamp <= windowMs);
  }, [diskHistory, selectedDuration]);

  // History aggregations (avg, peak)
  const historyStats = useMemo(() => {
    if (!filteredHistory.length) return { avgRead: 0, peakRead: 0, avgWrite: 0, peakWrite: 0 };
    let sumRead = 0;
    let peakRead = 0;
    let sumWrite = 0;
    let peakWrite = 0;

    for (const pt of filteredHistory) {
      sumRead += pt.readMb;
      if (pt.readMb > peakRead) peakRead = pt.readMb;
      sumWrite += pt.writeMb;
      if (pt.writeMb > peakWrite) peakWrite = pt.writeMb;
    }

    return {
      avgRead: (sumRead / filteredHistory.length).toFixed(1),
      peakRead: peakRead.toFixed(1),
      avgWrite: (sumWrite / filteredHistory.length).toFixed(1),
      peakWrite: peakWrite.toFixed(1),
    };
  }, [filteredHistory]);

  // Filtered & sorted process list
  const filteredProcesses = useMemo(() => {
    if (!snapshot?.top_processes) return [];
    let list = snapshot.top_processes.filter((p) =>
      p.name.toLowerCase().includes(processSearch.toLowerCase())
    );

    list.sort((a, b) => {
      if (processSort === 'read') return b.read_bytes_sec - a.read_bytes_sec;
      if (processSort === 'write') return b.write_bytes_sec - a.write_bytes_sec;
      if (processSort === 'name') return a.name.localeCompare(b.name);
      return b.total_bytes_sec - a.total_bytes_sec;
    });

    return list;
  }, [snapshot, processSearch, processSort]);

  // Copy details to clipboard
  const handleCopyDetails = async () => {
    if (!snapshot) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(buildDiskSummary(snapshot), null, 2));
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2000);
    } catch (e) {
      console.error('Failed to copy storage summary:', e);
    }
  };

  // Export JSON report
  const handleExportReport = () => {
    if (!snapshot) return;
    exportDiskReport(snapshot);
  };

  if (loading && !snapshot) {
    return (
      <div className="space-y-4 animate-fadeIn">
        <Card className="p-8 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-brand-500" />
          <span>Collecting physical drive telemetry and storage metrics...</span>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fadeIn text-slate-900 dark:text-slate-100">
      <DiskHeader
        snapshot={snapshot}
        selectedDiskIndex={selectedDiskIndex}
        setSelectedDiskIndex={setSelectedDiskIndex}
        refreshIntervalMs={refreshIntervalMs}
        setRefreshIntervalMs={setRefreshIntervalMs}
        isPaused={isPaused}
        setIsPaused={setIsPaused}
        handleCopyDetails={handleCopyDetails}
        copiedNotice={copiedNotice}
        handleExportReport={handleExportReport}
        fetchTelemetry={fetchTelemetry}
        loading={loading}
      />

      <DiskTabBar activeDiskTab={activeDiskTab} setActiveDiskTab={setActiveDiskTab} />

      <DiskTabContent
        activeDiskTab={activeDiskTab}
        snapshot={snapshot}
        activeDisk={activeDisk}
        selectedDiskIndex={selectedDiskIndex}
        historyStats={historyStats}
        selectedMetric={selectedMetric}
        setSelectedMetric={setSelectedMetric}
        selectedDuration={selectedDuration}
        setSelectedDuration={setSelectedDuration}
        filteredHistory={filteredHistory}
        setSelectedDiskIndex={setSelectedDiskIndex}
        filteredPartitions={filteredPartitions}
        partitionSearch={partitionSearch}
        setPartitionSearch={setPartitionSearch}
        fetchPartitions={fetchPartitions}
        loadingPartitions={loadingPartitions}
        processSearch={processSearch}
        setProcessSearch={setProcessSearch}
        processSort={processSort}
        setProcessSort={setProcessSort}
        filteredProcesses={filteredProcesses}
      />
    </div>
  );
}

function buildDiskSummary(snapshot) {
  return {
    timestamp: new Date().toISOString(),
    total_storage: formatBytes(snapshot.total_storage_bytes),
    total_used: formatBytes(snapshot.total_used_bytes),
    total_free: formatBytes(snapshot.total_free_bytes),
    physical_disks: snapshot.physical_disks.map((d) => ({
      index: d.disk_index,
      model: d.model,
      type: d.media_type,
      bus: d.bus_type,
      capacity: formatBytes(d.size_bytes),
      read_speed: formatSpeed(d.read_bytes_sec),
      write_speed: formatSpeed(d.write_bytes_sec),
      active_time: d.active_time_percent !== null ? `${d.active_time_percent}%` : 'Unavailable',
      iops: d.total_iops ?? 'Unavailable',
      latency_ms: d.avg_latency_ms ?? 'Unavailable',
      temperature: d.temperature_celsius ? `${d.temperature_celsius}°C` : 'Unavailable',
      health: d.health_status,
    })),
    volumes: snapshot.volumes.map((v) => ({
      letter: v.drive_letter,
      filesystem: v.file_system,
      total: formatBytes(v.total_bytes),
      free: formatBytes(v.free_bytes),
      used_pct: `${v.usage_percent.toFixed(1)}%`,
    })),
    diagnostics: snapshot.diagnostics,
  };
}

function exportDiskReport(snapshot) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `systempilot-storage-report-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function DiskTabContent({
  activeDiskTab,
  snapshot,
  activeDisk,
  selectedDiskIndex,
  historyStats,
  selectedMetric,
  setSelectedMetric,
  selectedDuration,
  setSelectedDuration,
  filteredHistory,
  setSelectedDiskIndex,
  filteredPartitions,
  partitionSearch,
  setPartitionSearch,
  fetchPartitions,
  loadingPartitions,
  processSearch,
  setProcessSearch,
  processSort,
  setProcessSort,
  filteredProcesses,
}) {
  switch (activeDiskTab) {
    case 'overview':
      return (
        <DiskOverviewTab
          snapshot={snapshot}
          activeDisk={activeDisk}
          selectedDiskIndex={selectedDiskIndex}
          historyStats={historyStats}
          selectedMetric={selectedMetric}
          setSelectedMetric={setSelectedMetric}
          selectedDuration={selectedDuration}
          setSelectedDuration={setSelectedDuration}
          filteredHistory={filteredHistory}
          setSelectedDiskIndex={setSelectedDiskIndex}
        />
      );
    case 'physical':
      return <DiskPhysicalTab snapshot={snapshot} />;
    case 'volumes':
      return <DiskVolumesTab snapshot={snapshot} />;
    case 'partitions':
      return (
        <DiskPartitionsTab
          filteredPartitions={filteredPartitions}
          partitionSearch={partitionSearch}
          setPartitionSearch={setPartitionSearch}
          fetchPartitions={fetchPartitions}
          loadingPartitions={loadingPartitions}
        />
      );
    case 'health':
      return <DiskHealthTab snapshot={snapshot} />;
    case 'activity':
      return (
        <DiskActivityTab
          selectedDiskIndex={selectedDiskIndex}
          selectedMetric={selectedMetric}
          setSelectedMetric={setSelectedMetric}
          selectedDuration={selectedDuration}
          setSelectedDuration={setSelectedDuration}
          filteredHistory={filteredHistory}
          processSearch={processSearch}
          setProcessSearch={setProcessSearch}
          processSort={processSort}
          setProcessSort={setProcessSort}
          filteredProcesses={filteredProcesses}
        />
      );
    case 'settings':
      return <DiskSettingsTab />;
    default:
      return null;
  }
}

function DiskActiveTimeCard({ activeDisk, selectedDiskIndex }) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-indigo-500" />
          Disk Active Time
        </span>
        <span className="text-[11px] font-mono text-slate-400" title="Disk active time is the percentage of time the storage device is processing read/write requests.">
          Busy Time
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
          {activeDisk?.active_time_percent !== null && activeDisk?.active_time_percent !== undefined
            ? `${activeDisk.active_time_percent}%`
            : 'Unavailable'}
        </span>
        <span className="text-xs text-slate-400 font-mono">
          Queue: {activeDisk?.queue_depth ?? 'N/A'}
        </span>
      </div>
      <ProgressBar
        value={activeDisk?.active_time_percent ?? 0}
        size="sm"
        color={
          (activeDisk?.active_time_percent ?? 0) > 90
            ? 'bg-red-500'
            : (activeDisk?.active_time_percent ?? 0) > 70
            ? 'bg-amber-500'
            : 'bg-indigo-500'
        }
      />
      <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
        <span>Physical Disk {selectedDiskIndex}</span>
        <span>{activeDisk?.media_type || 'Drive'}</span>
      </div>
    </Card>
  );
}

function DiskReadThroughputCard({ activeDisk, historyStats }) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <ArrowDownRight className="w-3.5 h-3.5 text-emerald-500" />
          Read Throughput
        </span>
        <span className="text-[11px] font-mono text-slate-400">
          Peak: {historyStats.peakRead} MB/s
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
          {formatSpeed(activeDisk?.read_bytes_sec || 0)}
        </span>
      </div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
        <span>Avg: {historyStats.avgRead} MB/s</span>
        <span>IOPS: {activeDisk?.read_iops !== null && activeDisk?.read_iops !== undefined ? activeDisk.read_iops.toLocaleString() : 'N/A'}</span>
      </div>
    </Card>
  );
}

function DiskWriteThroughputCard({ activeDisk, historyStats }) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500" />
          Write Throughput
        </span>
        <span className="text-[11px] font-mono text-slate-400">
          Peak: {historyStats.peakWrite} MB/s
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
          {formatSpeed(activeDisk?.write_bytes_sec || 0)}
        </span>
      </div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
        <span>Avg: {historyStats.avgWrite} MB/s</span>
        <span>IOPS: {activeDisk?.write_iops !== null && activeDisk?.write_iops !== undefined ? activeDisk.write_iops.toLocaleString() : 'N/A'}</span>
      </div>
    </Card>
  );
}

function DiskLatencyHealthCard({ activeDisk }) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
          Drive Latency & Health
        </span>
        <Badge
          variant={
            activeDisk?.health_status === 'Operating normally'
              ? 'success'
              : activeDisk?.health_status === 'Warning'
              ? 'danger'
              : 'neutral'
          }
          size="xs"
        >
          {activeDisk?.health_status || 'Unavailable'}
        </Badge>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
          {activeDisk?.avg_latency_ms !== null && activeDisk?.avg_latency_ms !== undefined
            ? `${activeDisk.avg_latency_ms.toFixed(2)} ms`
            : 'Unavailable'}
        </span>
      </div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
        <span>
          Temp:{' '}
          {activeDisk?.temperature_celsius !== null && activeDisk?.temperature_celsius !== undefined
            ? `${activeDisk.temperature_celsius}°C`
            : 'Not exposed'}
        </span>
        <span>Bus: {activeDisk?.bus_type || 'Unknown'}</span>
      </div>
    </Card>
  );
}

function DiskOverviewMetricsCards({ activeDisk, selectedDiskIndex, historyStats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <DiskActiveTimeCard activeDisk={activeDisk} selectedDiskIndex={selectedDiskIndex} />
      <DiskReadThroughputCard activeDisk={activeDisk} historyStats={historyStats} />
      <DiskWriteThroughputCard activeDisk={activeDisk} historyStats={historyStats} />
      <DiskLatencyHealthCard activeDisk={activeDisk} />
    </div>
  );
}

function DiskTimelineChartCard({
  selectedDiskIndex,
  selectedMetric,
  setSelectedMetric,
  selectedDuration,
  setSelectedDuration,
  filteredHistory,
}) {
  return (
    <Card className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Live Storage Activity History
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  (Disk {selectedDiskIndex})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Metric Switcher */}
                <div className="flex items-center bg-slate-100 dark:bg-surface-800 p-0.5 rounded-lg text-xs">
                  <button
                    onClick={() => setSelectedMetric('throughput')}
                    className={`px-2 py-1 rounded-md font-medium transition-all ${
                      selectedMetric === 'throughput'
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Throughput
                  </button>
                  <button
                    onClick={() => setSelectedMetric('active_time')}
                    className={`px-2 py-1 rounded-md font-medium transition-all ${
                      selectedMetric === 'active_time'
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Active Time %
                  </button>
                  <button
                    onClick={() => setSelectedMetric('iops')}
                    className={`px-2 py-1 rounded-md font-medium transition-all ${
                      selectedMetric === 'iops'
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    IOPS
                  </button>
                  <button
                    onClick={() => setSelectedMetric('latency')}
                    className={`px-2 py-1 rounded-md font-medium transition-all ${
                      selectedMetric === 'latency'
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Latency
                  </button>
                </div>

                {/* Duration Filters */}
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

            {/* Chart View */}
            <div className="h-48 w-full">
              <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-xs text-slate-500">Loading chart...</div>}>
                <DiskMetricChart filteredHistory={filteredHistory} selectedMetric={selectedMetric} />
              </Suspense>
            </div>

            {selectedMetric === 'throughput' && (
              <div className="flex items-center justify-center gap-6 text-xs font-mono text-slate-500 pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Read Rate (MB/s)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  Write Rate (MB/s)
                </span>
              </div>
            )}
          </Card>
  );
}

function DiskDiagnosticsNoticeBanner({ diagnostics }) {
  if (!diagnostics) return null;
  const hasIssue =
    diagnostics.low_space_detected ||
    diagnostics.high_queue_detected ||
    diagnostics.elevated_latency_detected;

  return (
    <Card
      className={`p-3.5 border transition-all ${
        hasIssue
          ? 'border-amber-500/40 bg-amber-500/5'
          : 'border-emerald-500/30 bg-emerald-500/5'
      }`}
    >
      <div className="flex items-start gap-3">
        {hasIssue ? (
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
        )}
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {hasIssue
                ? 'Storage Diagnostics Notice'
                : 'Storage Subsystem Operating Normally'}
            </span>
            <Badge
              variant={hasIssue ? 'warning' : 'success'}
              size="xs"
            >
              {hasIssue ? 'Attention Required' : 'Healthy'}
            </Badge>
          </div>

          {diagnostics.diagnostic_notices.length > 0 ? (
            <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-300">
              {diagnostics.diagnostic_notices.map((notice) => (
                <li key={notice}>{notice}</li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 dark:text-slate-400">
              All drive active times, queues, latencies, and storage allocations are within normal Windows operational boundaries.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function DiskPhysicalDrivesSummaryList({ physicalDisks, selectedDiskIndex, setSelectedDiskIndex }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Detected Physical Drives
          </h2>
          <Badge variant="neutral" size="xs">
            {physicalDisks?.length || 0} Total
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {physicalDisks?.map((disk) => {
          const isSelected = disk.disk_index === selectedDiskIndex;
          return (
            <Card
              key={disk.disk_index}
              className={`p-4 space-y-3 transition-all cursor-pointer border ${
                isSelected
                  ? 'border-brand-500/60 ring-1 ring-brand-500/40 bg-brand-500/5'
                  : 'hover:border-slate-400 dark:hover:border-slate-600'
              }`}
              onClick={() => setSelectedDiskIndex(disk.disk_index)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      Physical Disk {disk.disk_index}: {disk.model}
                    </span>
                    {disk.is_system_disk && (
                      <Badge variant="brand" size="xs">
                        System Disk
                      </Badge>
                    )}
                    {disk.is_removable && (
                      <Badge variant="warning" size="xs">
                        Removable
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    {disk.manufacturer} • {disk.media_type} • {disk.bus_type} Bus
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="neutral" size="sm" className="font-mono">
                    {formatBytes(disk.size_bytes)}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block">Read Rate</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatSpeed(disk.read_bytes_sec)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Write Rate</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {formatSpeed(disk.write_bytes_sec)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Active Time</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {disk.active_time_percent !== null ? `${disk.active_time_percent}%` : 'N/A'}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function DiskOverviewTab({
  snapshot,
  activeDisk,
  selectedDiskIndex,
  historyStats,
  selectedMetric,
  setSelectedMetric,
  selectedDuration,
  setSelectedDuration,
  filteredHistory,
  setSelectedDiskIndex,
}) {
  return (
    <>
      <DiskDiagnosticsNoticeBanner diagnostics={snapshot?.diagnostics} />

      <DiskOverviewMetricsCards
        activeDisk={activeDisk}
        selectedDiskIndex={selectedDiskIndex}
        historyStats={historyStats}
      />

      <DiskTimelineChartCard
        selectedDiskIndex={selectedDiskIndex}
        selectedMetric={selectedMetric}
        setSelectedMetric={setSelectedMetric}
        selectedDuration={selectedDuration}
        setSelectedDuration={setSelectedDuration}
        filteredHistory={filteredHistory}
      />

      <DiskPhysicalDrivesSummaryList
        physicalDisks={snapshot?.physical_disks}
        selectedDiskIndex={selectedDiskIndex}
        setSelectedDiskIndex={setSelectedDiskIndex}
      />
    </>
  );
}

function DiskPhysicalTab({ snapshot }) {
  return (
    <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Physical Storage Adapters & Hardware Inspection
              </h2>
              <p className="text-xs text-slate-500">
                Direct hardware handles, bus controllers, and individual physical device telemetry
              </p>
            </div>
            <Badge variant="neutral" size="sm">
              {snapshot?.physical_disks?.length || 0} Physical Units
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {snapshot?.physical_disks?.map((disk) => (
              <Card key={disk.disk_index} className="p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                          Physical Disk {disk.disk_index}: {disk.model}
                        </h3>
                        {disk.is_system_disk && <Badge variant="brand" size="xs">System Disk</Badge>}
                        {disk.is_removable && <Badge variant="warning" size="xs">Removable</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 font-mono">
                        Manufacturer: {disk.manufacturer} | Device Handle: \\.\PhysicalDrive{disk.disk_index}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral" size="sm" className="font-mono">
                      {formatBytes(disk.size_bytes)}
                    </Badge>
                    <Badge
                      variant={disk.health_status === 'Operating normally' ? 'success' : 'warning'}
                      size="sm"
                    >
                      {disk.health_status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Bus Interface</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{disk.bus_type}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Media Type</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{disk.media_type}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Firmware Revision</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{disk.firmware_revision || 'Unavailable'}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Serial Number</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{disk.serial_number || 'Protected / Hidden'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Live Read Speed</span>
                    <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatSpeed(disk.read_bytes_sec)}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Live Write Speed</span>
                    <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">{formatSpeed(disk.write_bytes_sec)}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Active Time</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{disk.active_time_percent !== null ? `${disk.active_time_percent}%` : 'N/A'}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Temperature</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{disk.temperature_celsius ? `${disk.temperature_celsius}°C` : 'Not exposed'}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
  );
}

function DiskVolumesTab({ snapshot }) {
  return (
    <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Mounted Logical Volumes & File Systems
              </h2>
              <p className="text-xs text-slate-500">
                Volume mount points, drive letters, NTFS/FAT allocations, and storage utilization
              </p>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Total Storage: {formatBytes(snapshot?.total_storage_bytes || 0)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {snapshot?.volumes?.map((vol) => {
              const isCritical = vol.usage_percent > 90;
              const isWarning = vol.usage_percent > 75;
              return (
                <Card key={vol.drive_letter} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                          {vol.drive_letter}
                        </span>
                        {vol.volume_label && (
                          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                            ({vol.volume_label})
                          </span>
                        )}
                        {vol.is_system_volume && (
                          <Badge variant="brand" size="xs">
                            System
                          </Badge>
                        )}
                        {vol.is_removable && (
                          <Badge variant="warning" size="xs">
                            Removable
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {vol.file_system} Filesystem
                      </span>
                    </div>
                    <Badge
                      variant={isCritical ? 'danger' : isWarning ? 'warning' : 'neutral'}
                      size="xs"
                      className="font-mono"
                    >
                      {Math.round(vol.usage_percent)}% Used
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <ProgressBar
                      value={vol.usage_percent}
                      size="sm"
                      color={isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}
                    />
                    <div className="flex justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      <span>Used: {formatBytes(vol.used_bytes)}</span>
                      <span>Free: {formatBytes(vol.free_bytes)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex justify-between">
                    <span>Total Capacity:</span>
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{formatBytes(vol.total_bytes)}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
  );
}

function DiskPartitionsTab({
  filteredPartitions,
  partitionSearch,
  setPartitionSearch,
  fetchPartitions,
  loadingPartitions,
}) {
  return (
    <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Partition Architecture & Layout
                </h2>
                <Badge variant="neutral" size="xs">
                  {filteredPartitions.length} Detected
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                GPT / MBR partition tables, EFI system partitions, recovery sectors, and data allocations
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  aria-label="Filter partitions"
                  value={partitionSearch}
                  onChange={(e) => setPartitionSearch(e.target.value)}
                  placeholder="Filter partitions..."
                  className="pl-8 pr-3 py-1 text-xs rounded-lg bg-slate-100 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={fetchPartitions}
                disabled={loadingPartitions}
                icon={RefreshCw}
              >
                Refresh
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => api.launchWindowsTool('diskmgmt.msc')}
                icon={ExternalLink}
              >
                Disk Management
              </Button>
            </div>
          </div>

          {/* Safety Policy Alert Banner */}
          <Card className="p-3.5 border border-indigo-500/30 bg-indigo-500/5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                  Safe Read-Only Partition Inspection Mode
                </span>
                <p>
                  SystemPilot provides verified read-only inspection of low-level partition structures, GUID partition tables (GPT), master boot records (MBR), EFI system flags, and recovery partitions. To prevent unintended data loss or broken boot records, write operations (format, delete, shrink, extend) are executed exclusively through native Windows Disk Management (<span className="font-mono text-indigo-400">diskmgmt.msc</span>).
                </p>
              </div>
            </div>
          </Card>

          {/* Partitions Table */}
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-surface-900 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3">Disk</th>
                    <th className="py-2.5 px-3">Part #</th>
                    <th className="py-2.5 px-3">Drive Letter</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Partition Style</th>
                    <th className="py-2.5 px-3">Capacity</th>
                    <th className="py-2.5 px-3">Flags / Attributes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {loadingPartitions ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-500" />
                        Querying Windows partition tables...
                      </td>
                    </tr>
                  ) : filteredPartitions.length > 0 ? (
                    filteredPartitions.map((part) => (
                      <tr key={`${part.disk_number}-${part.partition_number}`} className="hover:bg-slate-50 dark:hover:bg-surface-800/50">
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                          Disk {part.disk_number}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                          #{part.partition_number}
                        </td>
                        <td className="py-2.5 px-3">
                          {part.drive_letter ? (
                            <Badge variant="brand" size="xs" className="font-mono font-bold">
                              {part.drive_letter}:
                            </Badge>
                          ) : (
                            <span className="text-slate-400 italic font-sans text-[11px]">Unassigned</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-sans font-medium text-slate-800 dark:text-slate-200">
                          {part.partition_type}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant="neutral" size="xs">
                            {part.partition_style}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                          {formatBytes(part.size_bytes)}
                        </td>
                        <td className="py-2.5 px-3 flex flex-wrap gap-1">
                          {part.is_boot && (
                            <Badge variant="success" size="xs">
                              Boot (Windows)
                            </Badge>
                          )}
                          {part.is_system && (
                            <Badge variant="brand" size="xs">
                              EFI System
                            </Badge>
                          )}
                          {part.is_hidden && (
                            <Badge variant="neutral" size="xs">
                              Hidden
                            </Badge>
                          )}
                          {!part.is_boot && !part.is_system && !part.is_hidden && (
                            <span className="text-slate-400 font-sans text-[11px]">Standard Data</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400 italic font-sans">
                        No partitions match the search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
  );
}

function DiskHealthTab({ snapshot }) {
  return (
    <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Storage Subsystem Health & Hardware Integrity
              </h2>
              <p className="text-xs text-slate-500">
                S.M.A.R.T. subsystem access, IOCTL storage capabilities, and drive health indicators
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {snapshot?.physical_disks?.map((disk) => (
              <Card key={disk.disk_index} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      Physical Disk {disk.disk_index} ({disk.media_type})
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">{disk.model}</p>
                  </div>
                  <Badge variant={disk.health_status === 'Operating normally' ? 'success' : 'warning'} size="sm">
                    {disk.health_status}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs font-mono pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between text-slate-500">
                    <span>Average Latency:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {disk.avg_latency_ms ? `${disk.avg_latency_ms.toFixed(2)} ms` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Operational Temperature:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {disk.temperature_celsius ? `${disk.temperature_celsius}°C` : 'Not exposed by bus driver'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Active Queue Depth:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {disk.queue_depth ?? 0}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* S.M.A.R.T. Information Card */}
          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-500" />
              Windows Storage Telemetry & IOCTL Capabilities
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 space-y-1.5 font-mono">
                <span className="font-sans font-bold text-slate-800 dark:text-slate-200 block">
                  Storage Device IOCTL Support
                </span>
                <div className="flex justify-between text-slate-500">
                  <span>IOCTL_DISK_PERFORMANCE:</span>
                  <span className="text-emerald-500">Supported</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Seek Penalty Detection:</span>
                  <span className="text-emerald-500">Enabled (SSD vs HDD)</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Queue Depth Telemetry:</span>
                  <span className="text-emerald-500">Supported</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 space-y-1.5 text-slate-600 dark:text-slate-400">
                <span className="font-sans font-bold text-slate-800 dark:text-slate-200 block">
                  Integrity & Administrator Guidance
                </span>
                <p className="leading-relaxed">
                  SystemPilot reports authentic hardware telemetry without fabricating wear percentages. Vendor-specific NVMe health log pages (NVMe 0x02) and raw ATA SMART attributes require specialized storage controller drivers or elevated administrative access.
                </p>
              </div>
            </div>
          </Card>
        </div>
  );
}

function DiskActivityTab({
  selectedDiskIndex,
  selectedMetric,
  setSelectedMetric,
  selectedDuration,
  setSelectedDuration,
  filteredHistory,
  processSearch,
  setProcessSearch,
  processSort,
  setProcessSort,
  filteredProcesses,
}) {
  return (
    <div className="space-y-4">
          {/* Timeline Chart */}
          <Card className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Live Storage Activity History (Disk {selectedDiskIndex})
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-slate-100 dark:bg-surface-800 p-0.5 rounded-lg text-xs">
                  <button
                    onClick={() => setSelectedMetric('throughput')}
                    className={`px-2 py-1 rounded-md font-medium transition-all ${
                      selectedMetric === 'throughput' ? 'bg-brand-500 text-white' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Throughput
                  </button>
                  <button
                    onClick={() => setSelectedMetric('active_time')}
                    className={`px-2 py-1 rounded-md font-medium transition-all ${
                      selectedMetric === 'active_time' ? 'bg-brand-500 text-white' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Active Time %
                  </button>
                  <button
                    onClick={() => setSelectedMetric('iops')}
                    className={`px-2 py-1 rounded-md font-medium transition-all ${
                      selectedMetric === 'iops' ? 'bg-brand-500 text-white' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    IOPS
                  </button>
                  <button
                    onClick={() => setSelectedMetric('latency')}
                    className={`px-2 py-1 rounded-md font-medium transition-all ${
                      selectedMetric === 'latency' ? 'bg-brand-500 text-white' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Latency
                  </button>
                </div>
              </div>
            </div>

            <div className="h-56 w-full">
              <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-xs text-slate-500">Loading chart...</div>}>
                <DiskMetricChart filteredHistory={filteredHistory} selectedMetric={selectedMetric} />
              </Suspense>
            </div>
          </Card>

          {/* Active Disk Processes Table */}
          <Card className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Active Storage Processes
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    aria-label="Filter processes"
                    value={processSearch}
                    onChange={(e) => setProcessSearch(e.target.value)}
                    placeholder="Filter processes..."
                    className="pl-8 pr-3 py-1 text-xs rounded-lg bg-slate-100 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div className="flex items-center bg-slate-100 dark:bg-surface-800 p-0.5 rounded-lg text-xs">
                  <button
                    onClick={() => setProcessSort('total')}
                    className={`px-2 py-1 rounded font-medium ${
                      processSort === 'total' ? 'bg-brand-500 text-white' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Total
                  </button>
                  <button
                    onClick={() => setProcessSort('read')}
                    className={`px-2 py-1 rounded font-medium ${
                      processSort === 'read' ? 'bg-brand-500 text-white' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Read
                  </button>
                  <button
                    onClick={() => setProcessSort('write')}
                    className={`px-2 py-1 rounded font-medium ${
                      processSort === 'write' ? 'bg-brand-500 text-white' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Write
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <ProcessTableHead
                  columns={[
                    { label: 'Process Name' },
                    { label: 'PID' },
                    { label: 'Read Rate', align: 'right' },
                    { label: 'Write Rate', align: 'right' },
                    { label: 'Total I/O', align: 'right' },
                  ]}
                />
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredProcesses.length > 0 ? (
                    filteredProcesses.map((proc) => (
                      <tr key={proc.pid} className="hover:bg-slate-50 dark:hover:bg-surface-800/50">
                        <td className="py-2 flex items-center gap-2">
                          <span className="font-sans font-medium text-slate-800 dark:text-slate-200">
                            {proc.name}
                          </span>
                          {proc.is_critical && <Badge variant="neutral" size="xs">System</Badge>}
                        </td>
                        <td className="py-2 text-slate-500">{proc.pid}</td>
                        <td className="py-2 text-right text-emerald-600 dark:text-emerald-400">
                          {formatSpeed(proc.read_bytes_sec)}
                        </td>
                        <td className="py-2 text-right text-indigo-600 dark:text-indigo-400">
                          {formatSpeed(proc.write_bytes_sec)}
                        </td>
                        <td className="py-2 text-right font-bold text-slate-900 dark:text-slate-100">
                          {formatSpeed(proc.total_bytes_sec)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 italic font-sans">
                        No active processes performing disk I/O above threshold.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
  );
}

function DiskSettingsTab() {
  return (
    <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Storage Utilities & Windows Configuration
              </h2>
              <p className="text-xs text-slate-500">
                Direct access to native Windows disk management, defragmentation, and storage policies
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Windows Disk Management
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">diskmgmt.msc</p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => api.launchWindowsTool('diskmgmt.msc')}
                  icon={ExternalLink}
                >
                  Open
                </Button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Create and format hard disk partitions, initialize new drives, assign drive letters, and convert dynamic disks.
              </p>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Drive Optimizer & TRIM
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">dfrgui.exe</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => api.launchWindowsTool('control')}
                  icon={ExternalLink}
                >
                  Control Panel
                </Button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Perform SSD TRIM re-trim commands and hard drive defragmentation through Windows built-in storage engine.
              </p>
            </Card>
          </div>

          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Storage Policies & Architecture Notes
            </h3>
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <p>
                • <strong>Write Caching:</strong> High-performance NVMe drives leverage volatile write cache buffers to accelerate burst I/O throughput.
              </p>
              <p>
                • <strong>TRIM Support:</strong> Windows sends TRIM commands during idle maintenance to clear blocks no longer in use by deleted files.
              </p>
              <p>
                • <strong>Read-Only Safety Guarantee:</strong> SystemPilot will never alter partition layouts or formatting without native Windows authorization.
              </p>
            </div>
          </Card>
        </div>
  );
}

function DiskHeader({
  snapshot,
  selectedDiskIndex,
  setSelectedDiskIndex,
  refreshIntervalMs,
  setRefreshIntervalMs,
  isPaused,
  setIsPaused,
  handleCopyDetails,
  copiedNotice,
  handleExportReport,
  fetchTelemetry,
  loading,
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
      <div>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Storage & Disk Diagnostics
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Physical drives, NVMe/SSD telemetry, real-time I/O, partition breakdown & diagnostics
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {snapshot?.physical_disks && snapshot.physical_disks.length > 0 && (
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-surface-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <Layers className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <select
              aria-label="Select physical drive"
              value={selectedDiskIndex}
              onChange={(e) => setSelectedDiskIndex(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none pr-2 py-0.5 cursor-pointer"
            >
              {snapshot.physical_disks.map((d) => (
                <option key={d.disk_index} value={d.disk_index} className="bg-slate-900 text-white">
                  Disk {d.disk_index}: {d.model.length > 22 ? d.model.slice(0, 22) + '...' : d.model} ({d.media_type})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-surface-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
          <Clock className="w-3.5 h-3.5 text-slate-400 ml-1" />
          <button
            onClick={() => setRefreshIntervalMs(1000)}
            className={`px-2 py-0.5 rounded-lg font-medium transition-all ${
              refreshIntervalMs === 1000
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            1s
          </button>
          <button
            onClick={() => setRefreshIntervalMs(2000)}
            className={`px-2 py-0.5 rounded-lg font-medium transition-all ${
              refreshIntervalMs === 2000
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            2s
          </button>
          <button
            onClick={() => setRefreshIntervalMs(5000)}
            className={`px-2 py-0.5 rounded-lg font-medium transition-all ${
              refreshIntervalMs === 5000
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
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
          className={isPaused ? 'text-amber-500 border-amber-500/30' : ''}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopyDetails}
          icon={copiedNotice ? Check : Copy}
        >
          {copiedNotice ? 'Copied' : 'Copy'}
        </Button>

        <Button variant="secondary" size="sm" onClick={handleExportReport} icon={Download}>
          Export
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchTelemetry}
          disabled={loading}
          icon={RefreshCw}
        />
      </div>
    </div>
  );
}

function DiskTabBar({ activeDiskTab, setActiveDiskTab }) {
  const tabs = [
    { id: 'overview', label: 'Disk Overview', icon: HardDrive },
    { id: 'physical', label: 'Physical Disks', icon: Server },
    { id: 'volumes', label: 'Volumes', icon: Database },
    { id: 'partitions', label: 'Partitions', icon: Layers },
    { id: 'health', label: 'Disk Health', icon: ShieldCheck },
    { id: 'activity', label: 'Disk Activity', icon: Activity },
    { id: 'settings', label: 'Disk Settings', icon: SlidersHorizontal },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800 text-xs">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeDiskTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveDiskTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
              isActive
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-800'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

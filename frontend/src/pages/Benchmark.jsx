import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api } from '../services/tauriApi';
import {
  Timer,
  Cpu,
  Layers,
  HardDrive,
  Play,
  Square,
  Activity,
  History,
  AlertTriangle,
  Tv,
  CheckCircle2,
  Zap,
  Download,
  Info,
  Battery,
  BatteryCharging,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

// Subcomponents to keep main component under 300 lines
function BenchmarkHeader({ runningTest, stressActive, onExport, onRunCombined }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Timer className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          Performance Benchmark & Diagnostics Suite
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Deterministic local hardware benchmarks measuring CPU arithmetic throughput, RAM bandwidth, disk I/O, and GPU compute
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" icon={Download} onClick={onExport}>
          Export Benchmark Report
        </Button>
        <Button
          variant="primary"
          size="sm"
          icon={Zap}
          disabled={runningTest !== null || stressActive}
          onClick={onRunCombined}
          className="shadow-lg shadow-brand-600/20"
        >
          {runningTest === 'combined' ? 'Running Suite...' : 'Run Full System Suite'}
        </Button>
      </div>
    </div>
  );
}

function SafetyPowerAdvisory({ hw }) {
  return (
    <Card className="p-3.5 bg-slate-50/80 dark:bg-surface-900 border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
        <Info className="w-4 h-4 text-brand-500 flex-shrink-0" />
        <span>
          Benchmarking temporarily increases CPU/GPU power consumption and heat. Isolated temporary files are deleted immediately upon completion.
        </span>
      </div>

      {hw?.has_battery && (
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-mono text-[11px] flex-shrink-0">
          {hw.is_ac_connected ? (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <BatteryCharging className="w-3.5 h-3.5" /> AC Power Connected (Optimal)
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
              <Battery className="w-3.5 h-3.5" /> On Battery ({Math.round(hw.battery_percent || 0)}%) — Scores may be constrained by power policy
            </span>
          )}
        </div>
      )}
    </Card>
  );
}

function BenchmarkSuiteGrid({
  cpuResult,
  memResult,
  diskResult,
  gpuResult,
  runningTest,
  stressActive,
  onRunCpu,
  onRunMem,
  onRunDisk,
  onRunGpu,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* CPU Benchmark */}
      <Card className="space-y-4 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">CPU Compute</h3>
            </div>
            {cpuResult && <Badge variant="brand" size="xs">{Math.round(cpuResult.score)} pts</Badge>}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
            Multi-threaded integer and floating-point arithmetic stress across all logical CPU processors.
          </p>
          {cpuResult && (
            <div className="p-2.5 rounded bg-slate-50 dark:bg-surface-800/40 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300">
              {cpuResult.details}
            </div>
          )}
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={Play}
          disabled={runningTest !== null || stressActive}
          onClick={onRunCpu}
          fullWidth
        >
          {runningTest === 'cpu' ? 'Computing CPU...' : 'Test CPU'}
        </Button>
      </Card>

      {/* Memory Benchmark */}
      <Card className="space-y-4 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">RAM Bandwidth</h3>
            </div>
            {memResult && <Badge variant="brand" size="xs">{Math.round(memResult.score)} pts</Badge>}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
            Sequential 128 MB write-read verification measuring continuous memory transfer rate.
          </p>
          {memResult && (
            <div className="p-2.5 rounded bg-slate-50 dark:bg-surface-800/40 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300">
              {memResult.details}
            </div>
          )}
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={Play}
          disabled={runningTest !== null || stressActive}
          onClick={onRunMem}
          fullWidth
        >
          {runningTest === 'mem' ? 'Testing RAM...' : 'Test Memory'}
        </Button>
      </Card>

      {/* Storage Benchmark */}
      <Card className="space-y-4 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Storage I/O</h3>
            </div>
            {diskResult && <Badge variant="brand" size="xs">{Math.round(diskResult.score)} pts</Badge>}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
            Direct 64 MB sequential block write and sync in system temporary folder. Auto-cleaned.
          </p>
          {diskResult && (
            <div className="p-2.5 rounded bg-slate-50 dark:bg-surface-800/40 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300">
              {diskResult.details}
            </div>
          )}
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={Play}
          disabled={runningTest !== null || stressActive}
          onClick={onRunDisk}
          fullWidth
        >
          {runningTest === 'disk' ? 'Writing I/O...' : 'Test Storage'}
        </Button>
      </Card>

      {/* GPU Benchmark */}
      <Card className="space-y-4 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-purple-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">GPU Compute</h3>
            </div>
            {gpuResult && <Badge variant="brand" size="xs">{Math.round(gpuResult.score)} pts</Badge>}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
            Matrix tensor transformation and graphics pipeline simulation measuring GFLOPS.
          </p>
          {gpuResult && (
            <div className="p-2.5 rounded bg-slate-50 dark:bg-surface-800/40 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300">
              {gpuResult.details}
            </div>
          )}
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={Play}
          disabled={runningTest !== null || stressActive}
          onClick={onRunGpu}
          fullWidth
        >
          {runningTest === 'gpu' ? 'Running Compute...' : 'Test GPU'}
        </Button>
      </Card>
    </div>
  );
}

function ControlledStressSection({
  stressActive,
  stressRemaining,
  stressSeconds,
  setStressSeconds,
  runningTest,
  onStartStress,
  onStopStress,
}) {
  return (
    <Card className="p-4 border-amber-200 dark:border-amber-500/20 bg-amber-50/20 dark:bg-surface-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Controlled CPU Thermal Stress Test</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Stresses all CPU logical cores to test system cooling and thermal limits. Includes immediate manual stop.
          </p>
        </div>
      </div>

      {stressActive ? (
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400 animate-pulse">
            Stress Active: {stressRemaining}s remaining
          </span>
          <Button
            variant="danger"
            size="sm"
            icon={Square}
            onClick={onStopStress}
            className="animate-pulse shadow-lg shadow-red-500/30"
          >
            Stop Stress Test
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <select
            aria-label="Stress test duration"
            value={stressSeconds}
            onChange={(e) => setStressSeconds(Number(e.target.value))}
            disabled={runningTest !== null}
            className="bg-white dark:bg-surface-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200"
          >
            <option value={10}>10 Seconds</option>
            <option value={15}>15 Seconds</option>
            <option value={30}>30 Seconds</option>
            <option value={60}>60 Seconds</option>
          </select>
          <Button
            variant="primary"
            size="sm"
            icon={Play}
            disabled={runningTest !== null}
            onClick={onStartStress}
          >
            Start Stress
          </Button>
        </div>
      )}
    </Card>
  );
}

function BenchmarkHistoryList({ history, comparisons, onRefresh }) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Benchmark History & Comparisons</h3>
        </div>
        <Button variant="ghost" size="xs" icon={History} onClick={onRefresh}>
          Refresh Runs
        </Button>
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-64 overflow-y-auto">
        {history.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No benchmark runs recorded in SQLite yet.</p>
        ) : (
          history.map((h, idx) => {
            const diff = idx === 0 && comparisons[h.test_type] !== undefined ? comparisons[h.test_type] : null;

            return (
              <div
                key={h.id ?? `${h.timestamp}-${h.test_type}`}
                className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-surface-800/40 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{h.test_type}</span>
                    {diff !== null && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                          diff > 1
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : diff < -1
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                            : 'bg-slate-100 dark:bg-surface-800 text-slate-400'
                        }`}
                      >
                        {diff > 1 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : diff < -1 ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : (
                          <Minus className="w-3 h-3" />
                        )}
                        {diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`} vs prev
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-mono">
                    {h.details}
                  </span>
                </div>

                <div className="flex items-center gap-3 font-mono flex-shrink-0 pl-3">
                  <span className="text-slate-400 text-[11px]">
                    {h.timestamp ? new Date(h.timestamp).toLocaleTimeString() : 'N/A'}
                  </span>
                  <Badge variant="brand" size="xs">
                    {Math.round(h.score)} pts
                  </Badge>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}

export function Benchmark({ stats }) {
  const [runningTest, setRunningTest] = useState(null);
  const [cpuResult, setCpuResult] = useState(null);
  const [memResult, setMemResult] = useState(null);
  const [diskResult, setDiskResult] = useState(null);
  const [gpuResult, setGpuResult] = useState(null);
  const [combinedResult, setCombinedResult] = useState(null);
  const [stressActive, setStressActive] = useState(false);
  const [stressSeconds, setStressSeconds] = useState(15);
  const [stressRemaining, setStressRemaining] = useState(0);
  const [history, setHistory] = useState([]);
  const [hw, setHw] = useState(null);

  const fetchHistory = async () => {
    try {
      const logs = await api.getBenchmarkHistory();
      setHistory(logs || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHw = async () => {
    try {
      const data = await api.getHardwareSummary();
      setHw(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchHw();
  }, []);

  // CPU Benchmark
  const handleCpuBench = async () => {
    setRunningTest('cpu');
    try {
      const res = await api.runCpuBenchmark();
      setCpuResult(res);
      await fetchHistory();
    } catch (e) {
      console.error(e);
    } finally {
      setRunningTest(null);
    }
  };

  // Memory Benchmark
  const handleMemBench = async () => {
    setRunningTest('mem');
    try {
      const res = await api.runMemoryBenchmark();
      setMemResult(res);
      await fetchHistory();
    } catch (e) {
      console.error(e);
    } finally {
      setRunningTest(null);
    }
  };

  // Disk Benchmark
  const handleDiskBench = async () => {
    setRunningTest('disk');
    try {
      const res = await api.runDiskBenchmark();
      setDiskResult(res);
      await fetchHistory();
    } catch (e) {
      console.error(e);
    } finally {
      setRunningTest(null);
    }
  };

  // GPU Benchmark
  const handleGpuBench = async () => {
    setRunningTest('gpu');
    try {
      const res = await api.runGpuBenchmark();
      setGpuResult(res);
      await fetchHistory();
    } catch (e) {
      console.error(e);
    } finally {
      setRunningTest(null);
    }
  };

  // Combined Suite
  const handleCombinedBench = async () => {
    setRunningTest('combined');
    try {
      const res = await api.runCombinedBenchmark();
      setCombinedResult(res);
      if (res?.cpu_result) setCpuResult(res.cpu_result);
      if (res?.memory_result) setMemResult(res.memory_result);
      if (res?.disk_result) setDiskResult(res.disk_result);
      if (res?.gpu_result) setGpuResult(res.gpu_result);
      await fetchHistory();
    } catch (e) {
      console.error(e);
    } finally {
      setRunningTest(null);
    }
  };

  // CPU Stress Test with live countdown
  useEffect(() => {
    if (!stressActive) return;

    if (stressRemaining <= 0) {
      setStressActive(false);
      return;
    }

    const timer = setInterval(() => {
      setStressRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [stressActive, stressRemaining]);

  const handleStartStress = async () => {
    setStressActive(true);
    setStressRemaining(stressSeconds);
    try {
      await api.startCpuStress(stressSeconds);
    } catch (e) {
      console.error('Failed to start stress test:', e);
      setStressActive(false);
      setStressRemaining(0);
    }
  };

  const handleStopStress = async () => {
    try {
      await api.stopCpuStress();
    } catch (e) {
      console.error(e);
    } finally {
      setStressActive(false);
      setStressRemaining(0);
    }
  };

  // Comparison logic for latest run vs previous run
  const comparisons = useMemo(() => {
    const map = {};
    if (!history || history.length < 2) return map;

    // Group runs by test_type in chronological order
    const groups = {};
    history.forEach((h) => {
      if (!groups[h.test_type]) groups[h.test_type] = [];
      groups[h.test_type].push(h);
    });

    Object.keys(groups).forEach((type) => {
      const list = groups[type];
      if (list.length >= 2) {
        const latest = list[0].score;
        const prev = list[1].score;
        if (prev > 0) {
          const diffPct = ((latest - prev) / prev) * 100;
          map[type] = diffPct;
        }
      }
    });
    return map;
  }, [history]);

  const handleExportReport = () => {
    const report = {
      app: 'SystemPilot Benchmark System',
      version: '0.0.6',
      date: new Date().toISOString(),
      system: {
        cpu: hw?.cpu_brand || stats?.cpu_name || 'Generic CPU',
        cores: `${hw?.cpu_physical_cores || 8}C / ${hw?.cpu_logical_cores || 16}T`,
        memory_bytes: hw?.total_memory_bytes || stats?.ram_total_bytes || 0,
        os: `${hw?.os_name || 'Windows'} ${hw?.os_edition || ''} (${hw?.os_build || ''})`,
        power_mode: hw?.has_battery ? (hw?.is_ac_connected ? 'AC Connected' : 'Battery Mode') : 'AC Main Power',
      },
      latest_results: {
        cpu: cpuResult,
        memory: memResult,
        disk: diskResult,
        gpu: gpuResult,
        combined: combinedResult,
      },
      history: history.slice(0, 10),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `systempilot_benchmark_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Benchmark Header & Actions */}
      <BenchmarkHeader
        runningTest={runningTest}
        stressActive={stressActive}
        onExport={handleExportReport}
        onRunCombined={handleCombinedBench}
      />

      {/* Safety & Power State Advisory */}
      <SafetyPowerAdvisory hw={hw} />

      {/* 4 Core Benchmark Cards */}
      <BenchmarkSuiteGrid
        cpuResult={cpuResult}
        memResult={memResult}
        diskResult={diskResult}
        gpuResult={gpuResult}
        runningTest={runningTest}
        stressActive={stressActive}
        onRunCpu={handleCpuBench}
        onRunMem={handleMemBench}
        onRunDisk={handleDiskBench}
        onRunGpu={handleGpuBench}
      />

      {/* Controlled Thermal Stress Test */}
      <ControlledStressSection
        stressActive={stressActive}
        stressRemaining={stressRemaining}
        stressSeconds={stressSeconds}
        setStressSeconds={setStressSeconds}
        runningTest={runningTest}
        onStartStress={handleStartStress}
        onStopStress={handleStopStress}
      />

      {/* Benchmark History & Run Comparison */}
      <BenchmarkHistoryList
        history={history}
        comparisons={comparisons}
        onRefresh={fetchHistory}
      />
    </div>
  );
}

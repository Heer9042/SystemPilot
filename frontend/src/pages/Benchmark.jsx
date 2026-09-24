import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api } from '../services/tauriApi';
import { Timer, Cpu, Layers, HardDrive, Play, Square, Activity, History, AlertTriangle } from 'lucide-react';

export function Benchmark() {
  const [runningTest, setRunningTest] = useState(null);
  const [cpuResult, setCpuResult] = useState(null);
  const [memResult, setMemResult] = useState(null);
  const [diskResult, setDiskResult] = useState(null);
  const [stressActive, setStressActive] = useState(false);
  const [stressSeconds, setStressSeconds] = useState(15);
  const [history, setHistory] = useState([]);

  const fetchHistory = async () => {
    try {
      const logs = await api.getBenchmarkHistory();
      setHistory(logs || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleCpuBench = async () => {
    setRunningTest('cpu');
    try {
      const res = await api.runCpuBenchmark();
      setCpuResult(res);
      fetchHistory();
    } catch (e) {
      console.error(e);
    } finally {
      setRunningTest(null);
    }
  };

  const handleMemBench = async () => {
    setRunningTest('mem');
    try {
      const res = await api.runMemoryBenchmark();
      setMemResult(res);
      fetchHistory();
    } catch (e) {
      console.error(e);
    } finally {
      setRunningTest(null);
    }
  };

  const handleDiskBench = async () => {
    setRunningTest('disk');
    try {
      const res = await api.runDiskBenchmark();
      setDiskResult(res);
      fetchHistory();
    } catch (e) {
      console.error(e);
    } finally {
      setRunningTest(null);
    }
  };

  const handleStartStress = async () => {
    setStressActive(true);
    try {
      await api.startCpuStress(stressSeconds);
      setTimeout(() => {
        setStressActive(false);
      }, stressSeconds * 1000 + 500);
    } catch (e) {
      console.error(e);
      setStressActive(false);
    }
  };

  const handleStopStress = async () => {
    try {
      await api.stopCpuStress();
      setStressActive(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Benchmark Suite Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Timer className="w-5 h-5 text-indigo-400" /> System Hardware Benchmark Suite
          </h2>
          <p className="text-xs text-slate-400">
            Real multi-threaded mathematical, memory throughput, and disk IO measurements
          </p>
        </div>
      </div>

      {/* 3 Benchmark Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CPU Benchmark */}
        <Card className="space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-200">CPU Multi-Core</h3>
              </div>
              {cpuResult && <Badge variant="brand" size="sm">{Math.round(cpuResult.score)} pts</Badge>}
            </div>
            <p className="text-xs text-slate-400">
              Evaluates parallel arithmetic calculation throughput across all logical cores.
            </p>
            {cpuResult && (
              <div className="p-2.5 rounded-lg bg-surface-900 border border-slate-800 text-xs font-mono text-slate-300">
                {cpuResult.details}
              </div>
            )}
          </div>

          <Button
            variant="primary"
            size="md"
            icon={Play}
            disabled={runningTest !== null}
            onClick={handleCpuBench}
            fullWidth
          >
            {runningTest === 'cpu' ? 'Computing...' : 'Run CPU Test'}
          </Button>
        </Card>

        {/* Memory Benchmark */}
        <Card className="space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-200">Memory Bandwidth</h3>
              </div>
              {memResult && <Badge variant="brand" size="sm">{Math.round(memResult.score)} pts</Badge>}
            </div>
            <p className="text-xs text-slate-400">
              Measures sequential buffer read/write transfer throughput (MB/s).
            </p>
            {memResult && (
              <div className="p-2.5 rounded-lg bg-surface-900 border border-slate-800 text-xs font-mono text-slate-300">
                {memResult.details}
              </div>
            )}
          </div>

          <Button
            variant="primary"
            size="md"
            icon={Play}
            disabled={runningTest !== null}
            onClick={handleMemBench}
            fullWidth
          >
            {runningTest === 'mem' ? 'Benchmarking...' : 'Run Memory Test'}
          </Button>
        </Card>

        {/* Disk Benchmark */}
        <Card className="space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-200">Disk Sequential IO</h3>
              </div>
              {diskResult && <Badge variant="brand" size="sm">{Math.round(diskResult.score)} pts</Badge>}
            </div>
            <p className="text-xs text-slate-400">
              Tests direct block write and sync speeds on system temporary storage.
            </p>
            {diskResult && (
              <div className="p-2.5 rounded-lg bg-surface-900 border border-slate-800 text-xs font-mono text-slate-300">
                {diskResult.details}
              </div>
            )}
          </div>

          <Button
            variant="primary"
            size="md"
            icon={Play}
            disabled={runningTest !== null}
            onClick={handleDiskBench}
            fullWidth
          >
            {runningTest === 'disk' ? 'Writing IO...' : 'Run Disk Test'}
          </Button>
        </Card>
      </div>

      {/* Controlled CPU Stress Testing */}
      <Card className="p-5 space-y-4 border-amber-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-100">Controlled CPU Stress Test</h3>
              <p className="text-xs text-slate-400">
                Safely stresses all CPU logical cores to verify thermal stability. Includes immediate manual stop.
              </p>
            </div>
          </div>

          {stressActive ? (
            <Button
              variant="danger"
              size="md"
              icon={Square}
              onClick={handleStopStress}
              className="animate-pulse shadow-lg shadow-red-500/30"
            >
              STOP STRESS TEST
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <select
                value={stressSeconds}
                onChange={(e) => setStressSeconds(Number(e.target.value))}
                className="bg-surface-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              >
                <option value={10}>10 Seconds</option>
                <option value={20}>20 Seconds</option>
                <option value={30}>30 Seconds</option>
                <option value={60}>60 Seconds</option>
              </select>
              <Button variant="primary" size="md" icon={Play} onClick={handleStartStress}>
                Start Stress Test
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Benchmark History from SQLite */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <History className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-bold text-slate-100">Benchmark History (SQLite Records)</h3>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No benchmark runs recorded yet.</p>
          ) : (
            history.map((h, i) => (
              <div
                key={i}
                className="p-2.5 rounded-lg bg-surface-900 border border-slate-800 flex items-center justify-between text-xs font-mono"
              >
                <div>
                  <span className="font-bold text-slate-200 mr-2">{h.test_type}</span>
                  <span className="text-slate-400 font-sans text-[11px]">{h.details}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 text-[11px]">
                    {new Date(h.timestamp).toLocaleTimeString()}
                  </span>
                  <Badge variant="brand" size="xs">
                    {Math.round(h.score)} pts
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

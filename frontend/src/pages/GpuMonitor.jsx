import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { AlertNotice } from '../components/ui/AlertNotice';
import { api } from '../services/tauriApi';
import { formatBytes } from '../utils/formatters';
import { Tv, RefreshCw, AlertCircle, ChevronDown, Monitor, Cpu } from 'lucide-react';

function UnavailableField({ label }) {
  return (
    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800">
      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{label}</span>
      <span className="text-xs text-slate-400 dark:text-slate-500 italic">Unavailable</span>
    </div>
  );
}

function GpuCard({ gpu }) {
  const hasUtilization = gpu.utilization_percent !== null && gpu.utilization_percent !== undefined;
  const hasTemperature = gpu.temperature_celsius !== null && gpu.temperature_celsius !== undefined;
  const hasMemUtil = gpu.memory_utilization_percent !== null && gpu.memory_utilization_percent !== undefined;

  const isIntegrated = gpu.dedicated_memory_bytes === 0;

  return (
    <Card className="space-y-4">
      {/* GPU Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{gpu.name}</h3>
            {gpu.is_primary && <Badge variant="brand" size="xs">Primary</Badge>}
            {isIntegrated && <Badge variant="neutral" size="xs">Integrated</Badge>}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
            {gpu.vendor} • Driver: {gpu.driver_version || 'Unknown'}
          </p>
        </div>
        <Badge variant="neutral" size="sm">{gpu.vendor}</Badge>
      </div>

      {/* Memory Information */}
      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              {isIntegrated ? 'Shared System Memory' : 'Dedicated Video Memory (VRAM)'}
            </span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {isIntegrated
                ? (gpu.shared_memory_bytes > 0 ? formatBytes(gpu.shared_memory_bytes) : 'Shared (dynamic)')
                : formatBytes(gpu.dedicated_memory_bytes)}
            </span>
          </div>
          {hasMemUtil ? (
            <ProgressBar value={gpu.memory_utilization_percent} size="sm" color="bg-indigo-500" />
          ) : (
            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-surface-800 w-full" />
          )}
        </div>

        {/* Telemetry Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* GPU Utilization */}
          {hasUtilization ? (
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">GPU Engine Load</span>
              <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {Math.round(gpu.utilization_percent)}%
              </span>
            </div>
          ) : (
            <UnavailableField label="GPU Engine Load" />
          )}

          {/* Temperature */}
          {hasTemperature ? (
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Temperature</span>
              <span className="text-sm font-bold font-mono text-orange-500 dark:text-orange-400">
                {gpu.temperature_celsius}°C
              </span>
            </div>
          ) : (
            <UnavailableField label="Temperature" />
          )}
        </div>

        {/* Telemetry unavailability notice */}
        {!hasUtilization && !hasTemperature && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-surface-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-400" />
            <span>
              GPU utilization and temperature sensors are not available through standard Windows interfaces.
              Vendor-specific drivers ({gpu.vendor} performance SDK) would be required.
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

export function GpuMonitor() {
  const [gpus, setGpus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const isFetchingRef = React.useRef(false);

  const fetchGpu = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setError(null);
    try {
      const list = await api.getGpuInfo();
      setGpus(list || []);
      if (list && list.length > 0) {
        setSelectedIndex((curr) => (curr >= list.length ? 0 : curr));
      }
    } catch (e) {
      console.error('GPU info fetch failed:', e);
      setError('Unable to retrieve graphics adapter information.');
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGpu();
    // Refresh GPU list every 30 seconds (registry changes rarely)
    const interval = setInterval(fetchGpu, 30000);
    return () => clearInterval(interval);
  }, [fetchGpu]);

  const displayGpus = showAll ? gpus : (gpus.length > 0 ? [gpus[selectedIndex] || gpus[0]] : []);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            Graphics Adapters
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Discrete and integrated graphics hardware detected on this system
          </p>
        </div>
        <div className="flex items-center gap-2">
          {gpus.length > 0 && (
            <Badge variant="brand" size="md">
              {gpus.length} Adapter{gpus.length !== 1 ? 's' : ''} Detected
            </Badge>
          )}
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={fetchGpu} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Content */}
      <GpuContent
        loading={loading}
        error={error}
        gpus={gpus}
        displayGpus={displayGpus}
        selectedIndex={selectedIndex}
        showAll={showAll}
        onSelect={(idx) => {
          setSelectedIndex(idx);
          setShowAll(false);
        }}
        onShowAll={() => setShowAll(true)}
      />
    </div>
  );
}

function GpuSelector({ gpus, selectedIndex, showAll, onSelect, onShowAll }) {
  if (gpus.length <= 1) return null;
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Select adapter:</span>
        {gpus.map((gpu, gpuIndex) => (
          <button
            key={gpu.device_id || `${gpu.name}-${gpu.vendor || ''}`}
            onClick={() => onSelect(gpuIndex)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              !showAll && selectedIndex === gpuIndex
                ? 'bg-brand-500/10 border-brand-500/40 text-brand-700 dark:text-brand-300'
                : 'bg-slate-50 dark:bg-surface-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            {gpu.name.length > 30 ? gpu.name.slice(0, 30) + '…' : gpu.name}
            {gpu.is_primary && <span className="ml-1.5 opacity-60">(Primary)</span>}
          </button>
        ))}
        <button
          onClick={onShowAll}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
            showAll
              ? 'bg-brand-500/10 border-brand-500/40 text-brand-700 dark:text-brand-300'
              : 'bg-slate-50 dark:bg-surface-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
          }`}
        >
          Show All
        </button>
      </div>
    </Card>
  );
}

function GpuContent({ loading, error, gpus, displayGpus, selectedIndex, showAll, onSelect, onShowAll }) {
  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Detecting graphics adapters...
      </Card>
    );
  }

  if (error) {
    return <AlertNotice title="Graphics adapter information unavailable" message={error} />;
  }

  if (gpus.length === 0) {
    return (
      <Card className="p-8 text-center space-y-2">
        <Monitor className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No graphics adapters detected</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          No compatible display adapters were found in the Windows device registry.
          Remote Desktop and virtual display adapters are intentionally excluded.
        </p>
      </Card>
    );
  }

  return (
    <>
      <GpuSelector
        gpus={gpus}
        selectedIndex={selectedIndex}
        showAll={showAll}
        onSelect={onSelect}
        onShowAll={onShowAll}
      />
      {displayGpus.length > 0 && (
        <div className={`grid gap-4 ${displayGpus.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
          {displayGpus.map((gpu) => (
            <GpuCard key={gpu.device_id || `${gpu.name}-${gpu.vendor || ''}`} gpu={gpu} />
          ))}
        </div>
      )}
    </>
  );
}
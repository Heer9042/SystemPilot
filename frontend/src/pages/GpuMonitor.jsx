import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { api } from '../services/tauriApi';
import { formatBytes } from '../utils/formatters';
import { Tv, Activity, Thermometer, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function GpuMonitor() {
  const [gpus, setGpus] = useState([]);
  const [loading, setLoading] = useState(true);
  const isFetchingRef = React.useRef(false);

  const fetchGpu = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const list = await api.getGpuInfo();
      setGpus(list || []);
    } catch (e) {
      console.error(e);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGpu();
  }, []);

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Tv className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> GPU Monitoring & Adapters
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Discrete and Integrated graphics hardware detection</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="brand" size="md">
            {gpus.length} Detected Adapter{gpus.length > 1 ? 's' : ''}
          </Badge>
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={fetchGpu} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {gpus.map((gpu, idx) => (
          <Card key={idx} className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{gpu.name}</h3>
                  {gpu.is_primary && <Badge variant="brand" size="xs">Primary</Badge>}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  Vendor: {gpu.vendor} • Driver: {gpu.driver_version || 'WDDM Driver'}
                </p>
              </div>
              <Badge variant="neutral" size="sm">
                {gpu.vendor}
              </Badge>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800/80">
              {/* Dedicated Video Memory */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Dedicated Video Memory (VRAM)</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {gpu.dedicated_memory_bytes > 0 ? formatBytes(gpu.dedicated_memory_bytes) : 'Dynamic Shared'}
                  </span>
                </div>
                {gpu.dedicated_memory_bytes > 0 && (
                  <ProgressBar
                    value={gpu.memory_utilization_percent || 25}
                    size="sm"
                    color="bg-indigo-500"
                  />
                )}
              </div>

              {/* Hardware Sensors */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">GPU Engine Load</span>
                  <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {gpu.utilization_percent !== null && gpu.utilization_percent !== undefined
                      ? `${Math.round(gpu.utilization_percent)}%`
                      : 'Active (DirectX)'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Thermal Sensor</span>
                  <span className="text-sm font-bold font-mono text-slate-700 dark:text-slate-300">
                    {gpu.temperature_celsius ? `${gpu.temperature_celsius}°C` : 'Standard Sensor'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

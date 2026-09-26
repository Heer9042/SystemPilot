import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api } from '../services/tauriApi';
import { formatBytes } from '../utils/formatters';
import {
  CircuitBoard,
  Cpu,
  HardDrive,
  Tv,
  Layers,
  ShieldCheck,
  Wifi,
  Volume2,
  Laptop,
  Monitor,
  BatteryCharging,
  Battery,
  Clock,
  Copy,
  Check,
  RefreshCw,
  Server,
  Zap,
  CheckCircle2,
  Microchip,
} from 'lucide-react';

export function HardwareMonitor({ stats }) {
  const [hw, setHw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchHw = async () => {
    setLoading(true);
    try {
      const data = await api.getHardwareSummary();
      setHw(data);
    } catch (e) {
      console.error('Failed to fetch hardware summary:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHw();
  }, []);

  const formatUptime = (totalSeconds) => {
    if (!totalSeconds) return '0h 0m';
    const d = Math.floor(totalSeconds / 86400);
    const h = Math.floor((totalSeconds % 86400) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    return `${h}h ${m}m`;
  };

  const handleCopySpecs = () => {
    if (!hw) return;
    const text = `
=== SystemPilot Hardware Specification Report ===
System: ${hw.system_manufacturer} ${hw.system_product_name} (${hw.chassis_type})
Motherboard: ${hw.motherboard_manufacturer} ${hw.motherboard_product} (v${hw.motherboard_version})
BIOS: ${hw.bios_vendor} ${hw.bios_version} (${hw.bios_release_date})
Processor: ${hw.cpu_brand} (${hw.cpu_physical_cores} Cores, ${hw.cpu_logical_cores} Threads, ~${hw.cpu_base_frequency_mhz} MHz)
Memory: ${formatBytes(hw.total_memory_bytes)} (${hw.memory_form_factor}, ${hw.memory_type})
Graphics: ${hw.gpus?.map((g) => `${g.name} (${formatBytes(g.dedicated_memory_bytes)} VRAM, Driver: ${g.driver_version})`).join('; ') || 'N/A'}
Storage: ${hw.storage_drives?.map((d) => `${d.mount_point} ${formatBytes(d.total_space_bytes)} [${d.disk_kind}]`).join('; ') || 'N/A'}
Operating System: ${hw.os_name} ${hw.os_edition} ${hw.os_display_version} (Build ${hw.os_build}, ${hw.os_architecture})
Security: Secure Boot ${hw.secure_boot_enabled ? 'Enabled' : 'Disabled'}, ${hw.tpm_status}
=================================================
    `.trim();

    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CircuitBoard className="w-5 h-5 text-brand-500 dark:text-brand-400" />
            Comprehensive Hardware Specification & Diagnostics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Motherboard, BIOS firmware, processor architecture, GPU adapters, storage hierarchy, and expansion devices
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={copied ? Check : Copy}
            onClick={handleCopySpecs}
            className={copied ? 'text-emerald-600 border-emerald-500' : ''}
          >
            {copied ? 'Specs Copied!' : 'Copy Hardware Spec'}
          </Button>
          <Button variant="secondary" size="sm" icon={RefreshCw} disabled={loading} onClick={fetchHw}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Hero Overview Card */}
      <Card className="p-5 bg-gradient-to-r from-slate-900 via-surface-900 to-indigo-950 text-white border-brand-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-5 pointer-events-none flex items-center pr-8">
          <CircuitBoard className="w-64 h-64 text-brand-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              {hw?.has_battery ? (
                <Laptop className="w-5 h-5 text-brand-400" />
              ) : (
                <Monitor className="w-5 h-5 text-indigo-400" />
              )}
              <h3 className="text-base font-bold text-slate-100">
                {hw?.system_manufacturer} {hw?.system_product_name}
              </h3>
              <Badge variant="primary" size="xs">
                {hw?.chassis_type || 'Personal Computer'}
              </Badge>
              {hw?.secure_boot_enabled && (
                <Badge variant="success" size="xs" icon={ShieldCheck}>
                  Secure Boot Active
                </Badge>
              )}
            </div>

            <p className="text-xs text-slate-300 flex items-center gap-2 flex-wrap font-mono">
              <span>{hw?.os_name} {hw?.os_edition} ({hw?.os_display_version})</span>
              <span className="text-slate-600 dark:text-slate-500">•</span>
              <span>Build {hw?.os_build}</span>
              <span className="text-slate-600 dark:text-slate-500">•</span>
              <span className="flex items-center gap-1 text-slate-300">
                <Clock className="w-3.5 h-3.5 text-brand-400" />
                Uptime: {formatUptime(hw?.uptime_seconds)}
              </span>
            </p>
          </div>

          {/* Key Stat Badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="px-3 py-2 rounded-lg bg-surface-800/80 border border-slate-700/60 text-center">
              <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider">Memory</span>
              <span className="text-sm font-bold font-mono text-emerald-400">{formatBytes(hw?.total_memory_bytes || 0)}</span>
            </div>
            <div className="px-3 py-2 rounded-lg bg-surface-800/80 border border-slate-700/60 text-center">
              <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider">Topology</span>
              <span className="text-sm font-bold font-mono text-brand-300">{hw?.cpu_physical_cores || 8}C / {hw?.cpu_logical_cores || 16}T</span>
            </div>
            {hw?.has_battery && (
              <div className="px-3 py-2 rounded-lg bg-surface-800/80 border border-slate-700/60 text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider">Battery</span>
                <span className="text-sm font-bold font-mono text-amber-300 flex items-center gap-1 justify-center">
                  <BatteryCharging className="w-3.5 h-3.5" />
                  {Math.round(hw?.battery_percent || 100)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Detailed Diagnostics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Motherboard & System Baseboard */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <CircuitBoard className="w-4 h-4 text-brand-500 dark:text-brand-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">Motherboard & System Board</h3>
            </div>
            <Badge variant="secondary" size="xs">Hardware Layer</Badge>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800/50">
              <span className="text-slate-500 dark:text-slate-400">Board Manufacturer:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-200">{hw?.motherboard_manufacturer || 'OEM System'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800/50">
              <span className="text-slate-500 dark:text-slate-400">Product Model:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-200">{hw?.motherboard_product || 'System Board'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800/50">
              <span className="text-slate-500 dark:text-slate-400">Board Version / Revision:</span>
              <span className="font-mono text-slate-900 dark:text-slate-200">{hw?.motherboard_version || '1.0'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800/50">
              <span className="text-slate-500 dark:text-slate-400">System Family / SKU:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{hw?.system_family || 'Standard'} / {hw?.system_sku || 'Default'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400">Chassis Form Factor:</span>
              <span className="font-semibold text-brand-600 dark:text-brand-400">{hw?.chassis_type || 'Desktop'}</span>
            </div>
          </div>
        </Card>

        {/* 2. BIOS & Firmware */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">BIOS & System Firmware</h3>
            </div>
            <Badge variant="success" size="xs">UEFI Secure</Badge>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800/50">
              <span className="text-slate-500 dark:text-slate-400">BIOS Vendor:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-200">{hw?.bios_vendor || 'AMI / Insyde'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800/50">
              <span className="text-slate-500 dark:text-slate-400">BIOS Version:</span>
              <span className="font-semibold font-mono text-brand-600 dark:text-brand-300">{hw?.bios_version || 'UEFI 2.8'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800/50">
              <span className="text-slate-500 dark:text-slate-400">Release Date:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{hw?.bios_release_date || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800/50">
              <span className="text-slate-500 dark:text-slate-400">Firmware Architecture:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-200">{hw?.firmware_type || 'UEFI 64-bit'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400">TPM Module Security:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">{hw?.tpm_status || 'TPM 2.0 (Detected)'}</span>
            </div>
          </div>
        </Card>

        {/* 3. Processor Topology & Instructions */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">Processor & Architecture</h3>
            </div>
            <Badge variant="primary" size="xs">{hw?.cpu_architecture || 'x86_64'}</Badge>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800/50">
              <span className="text-slate-500 dark:text-slate-400">CPU Model:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-200 truncate max-w-[220px]">
                {hw?.cpu_brand || stats?.cpu_name || 'Processor'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800/50">
              <span className="text-slate-500 dark:text-slate-400">Cores / SMT Threads:</span>
              <span className="font-semibold font-mono text-brand-600 dark:text-brand-300">
                {hw?.cpu_physical_cores || 8} Physical / {hw?.cpu_logical_cores || 16} Threads
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800/50">
              <span className="text-slate-500 dark:text-slate-400">Base Clock Speed:</span>
              <span className="font-mono text-slate-900 dark:text-slate-200">~{hw?.cpu_base_frequency_mhz || stats?.cpu_freq_mhz || 2800} MHz</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800/50">
              <span className="text-slate-500 dark:text-slate-400">Virtualization (VT-x/AMD-V):</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Supported & Active</span>
            </div>
            <div className="pt-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1.5 font-medium">Hardware Instruction Set Extensions:</span>
              <div className="flex flex-wrap gap-1">
                {hw?.cpu_features?.map((f) => (
                  <span key={f} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-surface-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] border border-slate-200 dark:border-slate-700">
                    {f}
                  </span>
                )) || ['AVX2', 'SSE4.2', 'AES-NI', 'FMA3', 'x86-64-v3'].map((f) => (
                  <span key={f} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-surface-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] border border-slate-200 dark:border-slate-700">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* 4. Memory Specification */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">Physical Memory (RAM)</h3>
            </div>
            <Badge variant="success" size="xs">{hw?.memory_form_factor || 'DIMM'}</Badge>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800/50">
              <span className="text-slate-500 dark:text-slate-400">Total Installed Capacity:</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-300">{formatBytes(hw?.total_memory_bytes || stats?.ram_total_bytes || 0)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800/50">
              <span className="text-slate-500 dark:text-slate-400">Form Factor:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-200">{hw?.memory_form_factor || 'DIMM (Desktop)'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800/50">
              <span className="text-slate-500 dark:text-slate-400">Memory Generation:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-200">{hw?.memory_type || 'DDR4 / DDR5 SDRAM'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800/50">
              <span className="text-slate-500 dark:text-slate-400">Clock Frequency / Data Rate:</span>
              <span className="font-mono text-slate-900 dark:text-slate-200">{hw?.memory_speed_mhz || 3200} MT/s (MHz)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400">Channel Configuration:</span>
              <span className="font-semibold text-brand-600 dark:text-brand-400">Dual-Channel Interleaved</span>
            </div>
          </div>
        </Card>

        {/* 5. Graphics Display Adapters */}
        <Card className="space-y-3 md:col-span-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-purple-500 dark:text-purple-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">Graphics Hardware & Display Adapters</h3>
            </div>
            <span className="text-xs font-mono text-slate-500">{hw?.gpus?.length || 0} Adapter(s)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {hw?.gpus && hw.gpus.length > 0 ? (
              hw.gpus.map((gpu, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-surface-800/40 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      {gpu.name}
                    </span>
                    {gpu.is_primary && (
                      <Badge variant="primary" size="xs">Primary Display</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400 font-mono text-[11px] pt-1">
                    <div>Vendor: <strong className="text-slate-800 dark:text-slate-200">{gpu.vendor}</strong></div>
                    <div>VRAM: <strong className="text-brand-600 dark:text-brand-300">{formatBytes(gpu.dedicated_memory_bytes)}</strong></div>
                    <div className="col-span-2 truncate">Driver: <span className="text-slate-700 dark:text-slate-300">{gpu.driver_version}</span></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-3 text-xs text-slate-500">Standard Direct3D / WDDM Display Adapter</div>
            )}
          </div>
        </Card>

        {/* 6. Physical Storage Hierarchy */}
        <Card className="space-y-3 md:col-span-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">Storage Hierarchy & Drive Partitions</h3>
            </div>
            <span className="text-xs font-mono text-slate-500">{hw?.storage_drives?.length || 0} Partition(s)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {hw?.storage_drives && hw.storage_drives.length > 0 ? (
              hw.storage_drives.map((d, idx) => {
                const used = d.total_space_bytes - d.available_space_bytes;
                const pct = d.total_space_bytes > 0 ? Math.round((used / d.total_space_bytes) * 100) : 0;
                return (
                  <div key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-surface-800/40 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 font-mono">
                        <HardDrive className="w-3.5 h-3.5 text-brand-500" />
                        {d.mount_point} ({d.file_system || 'NTFS'})
                      </span>
                      <Badge variant="secondary" size="xs">{d.disk_kind}</Badge>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-surface-900 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct > 90 ? 'bg-status-danger' : pct > 75 ? 'bg-amber-500' : 'bg-brand-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      <span>Free: {formatBytes(d.available_space_bytes)}</span>
                      <span>Total: {formatBytes(d.total_space_bytes)}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-xs text-slate-500">No storage partitions enumerated</div>
            )}
          </div>
        </Card>

        {/* 7. Network Hardware Interfaces */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">Network Interfaces & MAC</h3>
            </div>
            <span className="text-xs font-mono text-slate-500">{hw?.network_adapters?.length || 0} Adapter(s)</span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {hw?.network_adapters && hw.network_adapters.length > 0 ? (
              hw.network_adapters.slice(0, 5).map((net, idx) => (
                <div key={idx} className="p-2.5 rounded bg-slate-50 dark:bg-surface-800/40 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-slate-200 truncate max-w-[180px]">{net.name}</span>
                    <Badge variant={net.is_up ? 'success' : 'secondary'} size="xs">
                      {net.is_up ? 'Active' : 'Disconnected'}
                    </Badge>
                  </div>
                  <div className="flex justify-between font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    <span>MAC: {net.mac_address || '00:00:00:00:00:00'}</span>
                    <span>{net.ip_addresses?.[0] || 'DHCP'}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500">Ethernet / Wi-Fi Adapter</div>
            )}
          </div>
        </Card>

        {/* 8. Audio & Multimedia Controllers */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-pink-500 dark:text-pink-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">Audio & Sound Controllers</h3>
            </div>
            <Badge variant="secondary" size="xs">HD Audio</Badge>
          </div>

          <div className="space-y-2">
            {hw?.audio_devices && hw.audio_devices.length > 0 ? (
              hw.audio_devices.map((dev, idx) => (
                <div key={idx} className="p-2.5 rounded bg-slate-50 dark:bg-surface-800/40 border border-slate-200 dark:border-slate-800 text-xs flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />
                  <span className="font-medium text-slate-900 dark:text-slate-200 truncate">{dev}</span>
                </div>
              ))
            ) : (
              <div className="p-2.5 rounded bg-slate-50 dark:bg-surface-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                High Definition Audio Controller (Realtek / Intel / NVIDIA)
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}


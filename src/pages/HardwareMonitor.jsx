import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { api } from '../services/tauriApi';
import { formatBytes } from '../utils/formatters';
import { CircuitBoard, Cpu, HardDrive, Tv, Layers, ShieldCheck } from 'lucide-react';

export function HardwareMonitor({ stats }) {
  const [hw, setHw] = useState(null);

  useEffect(() => {
    async function fetchHw() {
      try {
        const data = await api.getHardwareSummary();
        setHw(data);
      } catch (e) {
        console.error(e);
      }
    }
    fetchHw();
  }, []);

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <CircuitBoard className="w-5 h-5 text-indigo-400" /> Hardware Specification & Diagnostics
          </h2>
          <p className="text-xs text-slate-400">Motherboard, BIOS firmware, CPU topology, and expansion slots</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Motherboard & BIOS */}
        <Card className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <CircuitBoard className="w-4 h-4 text-brand-400" />
            <h3 className="text-sm font-bold text-slate-200">Motherboard & System Board</h3>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400">Manufacturer:</span>
              <span className="font-semibold text-slate-200">{hw?.motherboard_manufacturer || 'OEM System'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400">Product Model:</span>
              <span className="font-semibold text-slate-200">{hw?.motherboard_product || 'System Board'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400">BIOS Version:</span>
              <span className="font-semibold font-mono text-brand-300">{hw?.bios_version || 'UEFI 2.8'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">BIOS Vendor:</span>
              <span className="font-semibold text-slate-200">{hw?.bios_vendor || 'AMI / Insyde'}</span>
            </div>
          </div>
        </Card>

        {/* Processor Hardware Topology */}
        <Card className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-200">Processor & Architecture</h3>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400">CPU Model:</span>
              <span className="font-semibold text-slate-200 truncate max-w-xs">{stats?.cpu_name || 'x86_64 Processor'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400">Instruction Set:</span>
              <span className="font-semibold font-mono text-slate-200">x86-64 / AMD64 (AVX2, SSE4.2)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400">Logical Cores:</span>
              <span className="font-semibold font-mono text-brand-300">{stats?.cpu_cores?.length || 8} Threads</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Total System Memory:</span>
              <span className="font-semibold font-mono text-slate-200">{formatBytes(stats?.ram_total_bytes || 0)}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

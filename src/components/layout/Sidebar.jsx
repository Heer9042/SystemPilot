import React from 'react';
import {
  LayoutDashboard,
  Activity,
  Cpu,
  Tv,
  HardDrive,
  Wifi,
  Gamepad2,
  Gauge,
  Rocket,
  Sparkles,
  CircuitBoard,
  ShieldCheck,
  Timer,
  Settings as SettingsIcon,
  Layers,
} from 'lucide-react';

export const NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'processes', label: 'Processes', icon: Activity },
  { id: 'memory', label: 'Memory', icon: Layers, badge: 'Crucial' },
  { id: 'cpu', label: 'CPU', icon: Cpu },
  { id: 'gpu', label: 'GPU', icon: Tv },
  { id: 'disk', label: 'Disk', icon: HardDrive },
  { id: 'network', label: 'Network', icon: Wifi },
  { id: 'gaming', label: 'Gaming Mode', icon: Gamepad2 },
  { id: 'performance', label: 'Performance', icon: Gauge },
  { id: 'startup', label: 'Startup', icon: Rocket },
  { id: 'cleanup', label: 'Cleanup', icon: Sparkles },
  { id: 'hardware', label: 'Hardware', icon: CircuitBoard },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'benchmark', label: 'Benchmark', icon: Timer },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export function Sidebar({ activeTab, setActiveTab, onQuickClean, ramUsagePercent }) {
  return (
    <aside className="w-64 h-full bg-surface-950/90 border-r border-slate-800/80 flex flex-col justify-between select-none z-20 backdrop-blur-xl">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/60 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-brand-600/30 flex items-center justify-center">
          <div className="w-full h-full bg-surface-950 rounded-[10px] flex items-center justify-center">
            <Gauge className="w-5 h-5 text-brand-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-bold text-slate-100 text-base tracking-tight">SystemPilot</h1>
            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded">v1.0</span>
          </div>
          <p className="text-[11px] text-slate-400">Windows System Suite</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5">
        {NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30 shadow-sm shadow-brand-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-brand-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-brand-500/30 text-brand-300">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick RAM Footer Widget */}
      <div className="p-3 border-t border-slate-800/60 bg-surface-900/40">
        <div className="glass-panel p-2.5 rounded-lg border-slate-800/80 flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">RAM Status</span>
            <span className="font-mono font-bold text-brand-300">
              {ramUsagePercent ? `${Math.round(ramUsagePercent)}%` : '--'}
            </span>
          </div>
          <button
            onClick={onQuickClean}
            className="w-full bg-brand-600 hover:bg-brand-500 active:scale-[0.98] text-white text-xs font-bold py-1.5 px-3 rounded-md shadow-md shadow-brand-600/20 transition flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Quick Clean RAM
          </button>
        </div>
      </div>
    </aside>
  );
}

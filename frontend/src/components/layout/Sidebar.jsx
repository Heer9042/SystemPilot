import React, { useState } from 'react';
import {
  LayoutDashboard,
  Activity,
  Cpu,
  Tv,
  HardDrive,
  Wifi,
  Gauge,
  Rocket,
  Sparkles,
  CircuitBoard,
  ShieldCheck,
  Timer,
  Settings as SettingsIcon,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'processes', label: 'Processes', icon: Activity },
  { id: 'memory', label: 'Memory', icon: Layers, badge: 'Crucial' },
  { id: 'cpu', label: 'CPU', icon: Cpu },
  { id: 'gpu', label: 'GPU', icon: Tv },
  { id: 'disk', label: 'Disk', icon: HardDrive },
  { id: 'network', label: 'Network', icon: Wifi },
  { id: 'performance', label: 'Performance', icon: Gauge },
  { id: 'startup', label: 'Startup', icon: Rocket },
  { id: 'cleanup', label: 'Cleanup', icon: Sparkles },
  { id: 'hardware', label: 'Hardware', icon: CircuitBoard },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'benchmark', label: 'Benchmark', icon: Timer },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export function Sidebar({ activeTab, setActiveTab, onQuickClean, ramUsagePercent }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-60'
      } h-full bg-white/95 dark:bg-surface-950/95 border-r border-slate-200 dark:border-slate-800/80 flex flex-col justify-between select-none z-20 backdrop-blur-xl transition-all duration-200 shrink-0`}
    >
      {/* Brand Header */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 shrink-0 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-cyan-400 p-0.5 shadow-md shadow-brand-600/30 flex items-center justify-center">
            <div className="w-full h-full bg-white dark:bg-surface-950 rounded-[10px] flex items-center justify-center">
              <Gauge className="w-4 h-4 text-brand-500 dark:text-brand-400" />
            </div>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-slate-800 dark:text-slate-100 text-sm tracking-tight truncate">SystemPilot</h1>
                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30 rounded">
                  v0.0.3
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">System Suite</p>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-800 transition shrink-0"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-2 py-2.5 space-y-0.5">
        {NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center ${
                collapsed ? 'justify-center px-2' : 'justify-between px-2.5'
              } py-2 rounded-lg text-xs font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-sm dark:bg-brand-600/20 dark:text-brand-300 dark:border-brand-500/30 dark:shadow-brand-500/10 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-surface-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                  }`}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>
              {!collapsed && item.badge && (
                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-brand-100 text-brand-700 dark:bg-brand-500/30 dark:text-brand-300 shrink-0">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick RAM Footer Widget */}
      <div className="p-2 border-t border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-surface-900/40">
        {!collapsed ? (
          <div className="glass-panel p-2 rounded-lg border-slate-200 dark:border-slate-800/80 flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">RAM Load</span>
              <span className="font-mono font-bold text-brand-600 dark:text-brand-300 text-[11px]">
                {ramUsagePercent ? `${Math.round(ramUsagePercent)}%` : '--'}
              </span>
            </div>
            <button
              onClick={onQuickClean}
              className="w-full bg-brand-600 hover:bg-brand-500 active:scale-[0.98] text-white text-[11px] font-bold py-1 px-2.5 rounded shadow-sm shadow-brand-600/20 transition flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3 h-3" />
              Clean RAM
            </button>
          </div>
        ) : (
          <button
            onClick={onQuickClean}
            title={`Clean RAM (${ramUsagePercent ? Math.round(ramUsagePercent) : 0}%)`}
            className="w-full p-2 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-600/20 dark:hover:bg-brand-600/40 dark:text-brand-400 flex items-center justify-center transition"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}

import React from 'react';
import { Sun, Moon, Minus, Square, X, RefreshCw, Cpu, Layers } from 'lucide-react';
import { formatUptime } from '../../utils/formatters';

export function TopBar({
  theme,
  toggleTheme,
  stats,
  onRefresh,
  activeTabTitle = 'Dashboard',
}) {
  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      getCurrentWindow().minimize();
    } catch (e) {
      console.log('Window minimize requested');
    }
  };

  const handleMaximize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      getCurrentWindow().toggleMaximize();
    } catch (e) {
      console.log('Window maximize requested');
    }
  };

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      getCurrentWindow().close();
    } catch (e) {
      console.log('Window close requested');
    }
  };

  return (
    <header
      data-tauri-drag-region
      className="h-12 w-full bg-surface-950/80 border-b border-slate-800/80 flex items-center justify-between px-4 select-none z-30 backdrop-blur-xl"
    >
      {/* Active Section Breadcrumb */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-slate-400">SystemPilot</span>
        <span className="text-slate-600">/</span>
        <h2 className="text-xs font-bold text-slate-100 tracking-wide">{activeTabTitle}</h2>
      </div>

      {/* Center Live Pill Stats */}
      {stats && (
        <div className="hidden md:flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-900 border border-slate-800 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>CPU:</span>
            <span className="font-bold text-slate-100">{Math.round(stats.cpu_usage)}%</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-900 border border-slate-800 text-slate-300">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>RAM:</span>
            <span className="font-bold text-slate-100">{Math.round(stats.ram_usage_percent)}%</span>
          </div>

          <div className="text-[11px] text-slate-400 hidden lg:block font-sans">
            Uptime: <span className="text-slate-200">{formatUptime(stats.uptime_seconds)}</span>
          </div>
        </div>
      )}

      {/* Right Controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onRefresh}
          title="Refresh Data"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-surface-800 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={toggleTheme}
          title="Toggle Dark/Light Mode"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-surface-800 transition"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        {/* Window controls */}
        <button
          onClick={handleMinimize}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-surface-800 transition"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-surface-800 transition"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={handleClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-red-600 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}

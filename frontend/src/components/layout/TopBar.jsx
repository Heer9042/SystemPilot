import React, { useState, useEffect } from 'react';
import { Sun, Moon, Minus, Square, X, RefreshCw, Cpu, Layers, ShieldCheck, Shield } from 'lucide-react';
import { formatUptime } from '../../utils/formatters';
import { api } from '../../services/tauriApi';

export function TopBar({
  theme,
  toggleTheme,
  stats,
  onRefresh,
  activeTabTitle = 'Dashboard',
}) {
  const [privilegeInfo, setPrivilegeInfo] = useState(null);

  useEffect(() => {
    let mounted = true;
    api.getPrivilegeStatus()
      .then((info) => {
        if (mounted && info) setPrivilegeInfo(info);
      })
      .catch(() => { });
    return () => {
      mounted = false;
    };
  }, []);

  const handleMinimize = async () => {
    await api.minimizeWindow();
  };

  const handleMaximize = async () => {
    await api.toggleMaximizeWindow();
  };

  const handleClose = async () => {
    await api.closeWindow();
  };

  const handleElevate = async () => {
    try {
      await api.requestAdminElevation();
    } catch (err) {
      console.warn('Elevation request not completed:', err);
    }
  };

  return (
    <header
      data-tauri-drag-region
      className="h-12 w-full bg-white/80 dark:bg-surface-950/80 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between px-4 select-none z-30 backdrop-blur-xl"
    >
      {/* Active Section Breadcrumb */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">SystemPilot</span>
        <span className="text-slate-400 dark:text-slate-600">/</span>
        <h2 className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-wide">{activeTabTitle}</h2>
      </div>

      {/* Center Live Pill Stats */}
      {stats && (
        <div className="hidden md:flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-sm">
            <Cpu className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            <span>CPU:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{Math.round(stats.cpu_usage)}%</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-sm">
            <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>RAM:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{Math.round(stats.ram_usage_percent)}%</span>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 hidden lg:block font-sans">
            Uptime: <span className="text-slate-700 dark:text-slate-200 font-medium">{formatUptime(stats.uptime_seconds)}</span>
          </div>

          {privilegeInfo?.is_elevated ? (
            <span
              className="hidden xl:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold tracking-wide font-sans cursor-default"
              title="Running with elevated Administrator privileges"
            >
              <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Admin
            </span>
          ) : privilegeInfo ? (
            <button
              onClick={handleElevate}
              className="hidden xl:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 hover:bg-brand-50 dark:bg-surface-900 dark:hover:bg-brand-950/40 border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-500/30 text-slate-600 hover:text-brand-700 dark:text-slate-300 dark:hover:text-brand-300 text-[10px] font-semibold tracking-wide font-sans transition-colors"
              title="Running as Standard User. Click to Elevate with Administrator privileges"
            >
              <Shield className="w-3 h-3 text-slate-400" /> Elevate
            </button>
          ) : null}
        </div>
      )}

      {/* Right Controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onRefresh}
          title="Refresh Data"
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-800 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={toggleTheme}
          title="Toggle Dark/Light Mode"
          aria-label="Toggle Dark/Light Mode"
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-800 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Window controls */}
        <button
          onClick={handleMinimize}
          aria-label="Minimize window"
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-800 transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          aria-label="Maximize window"
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-800 transition-colors"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={handleClose}
          aria-label="Close window"
          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-white hover:bg-red-600 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}

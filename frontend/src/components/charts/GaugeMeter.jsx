import React from 'react';
import { getStatusColor } from '../../utils/formatters';

export function GaugeMeter({ value = 0, max = 100, label, sublabel, icon: Icon, unit = '%' }) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * (circumference * 0.75); // 270 degree gauge

  return (
    <div className="flex flex-col items-center justify-center p-3 relative">
      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-225" viewBox="0 0 96 96">
          {/* Background Track */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            className="text-slate-200 dark:text-surface-800/80"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * 0.25}
            strokeLinecap="round"
          />
          {/* Progress Arc */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            className={`transition-all duration-500 ease-out ${getStatusColor(percent)}`}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          {Icon && <Icon className="w-4 h-4 text-slate-400 dark:text-slate-400 mb-0.5" />}
          <span className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 font-mono">
            {Math.round(value)}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-0.5">{unit}</span>
          </span>
        </div>
      </div>
      {label && <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">{label}</span>}
      {sublabel && <span className="text-[11px] text-slate-500 dark:text-slate-400">{sublabel}</span>}
    </div>
  );
}

export function MemoryBreakdownBar({
  used = 0,
  standby = 0,
  free = 0,
  total = 1,
  formatBytesFn,
}) {
  const usedPct = (used / total) * 100;
  const standbyPct = (standby / total) * 100;
  const freePct = Math.max(0, 100 - usedPct - standbyPct);

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="h-6 w-full rounded-xl overflow-hidden flex bg-slate-100 dark:bg-surface-900 border border-slate-300/80 dark:border-slate-700/40 p-0.5">
        <div
          className="bg-brand-500 h-full rounded-l-lg transition-all duration-300 relative group"
          style={{ width: `${usedPct}%` }}
        />
        <div
          className="bg-amber-500/80 h-full transition-all duration-300 relative group"
          style={{ width: `${standbyPct}%` }}
        />
        <div
          className="bg-emerald-500/80 h-full rounded-r-lg transition-all duration-300 relative group"
          style={{ width: `${freePct}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between text-xs pt-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
          <span className="text-slate-500 dark:text-slate-400">In Use:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{formatBytesFn ? formatBytesFn(used) : `${usedPct.toFixed(1)}%`}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-slate-500 dark:text-slate-400">Standby / Cached:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{formatBytesFn ? formatBytesFn(standby) : `${standbyPct.toFixed(1)}%`}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-slate-500 dark:text-slate-400">Free:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{formatBytesFn ? formatBytesFn(free) : `${freePct.toFixed(1)}%`}</span>
        </div>
      </div>
    </div>
  );
}

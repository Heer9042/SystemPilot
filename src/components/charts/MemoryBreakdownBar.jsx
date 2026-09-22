import React from 'react';

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
      <div className="h-5 w-full rounded-xl overflow-hidden flex bg-surface-900 border border-slate-700/40 p-0.5">
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

      <div className="flex flex-wrap items-center justify-between text-xs pt-1 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
          <span className="text-slate-400 font-sans">In Use:</span>
          <span className="font-semibold text-slate-200">
            {formatBytesFn ? formatBytesFn(used) : `${usedPct.toFixed(1)}%`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-slate-400 font-sans">Standby / Cached:</span>
          <span className="font-semibold text-slate-200">
            {formatBytesFn ? formatBytesFn(standby) : `${standbyPct.toFixed(1)}%`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-slate-400 font-sans">Free:</span>
          <span className="font-semibold text-slate-200">
            {formatBytesFn ? formatBytesFn(free) : `${freePct.toFixed(1)}%`}
          </span>
        </div>
      </div>
    </div>
  );
}
export default MemoryBreakdownBar;

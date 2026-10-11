import React from 'react';

/**
 * TimelineMetricStats renders the 4-column summary statistics row
 * (Current Live, Historical Average, Peak High, Minimum Low)
 * for timeline performance charts across CPU and GPU monitors.
 */
export function TimelineMetricStats({ metricStats, metricUnit }) {
  if (!metricStats) return null;

  const formatValue = (val) => {
    if (val === null || val === undefined) return 'Unavailable';
    return `${val} ${metricUnit}`;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800">
        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Current Live</span>
        <span className="text-base font-bold font-mono text-brand-600 dark:text-brand-400">
          {formatValue(metricStats.current)}
        </span>
      </div>

      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800">
        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Historical Average</span>
        <span className="text-base font-bold font-mono text-slate-800 dark:text-slate-200">
          {formatValue(metricStats.avg)}
        </span>
      </div>

      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800">
        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Peak High</span>
        <span className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400">
          {formatValue(metricStats.peak)}
        </span>
      </div>

      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800">
        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Minimum Low</span>
        <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
          {formatValue(metricStats.min)}
        </span>
      </div>
    </div>
  );
}

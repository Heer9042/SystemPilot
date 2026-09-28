import React from 'react';
import { Clock } from 'lucide-react';

const DEFAULT_OPTIONS = [
  { label: 'Fast (1s)', val: 1000 },
  { label: 'Balanced (2s)', val: 2000 },
  { label: 'Low Power (4s)', val: 4000 },
];

export function RefreshIntervalControl({ value, onChange, options = DEFAULT_OPTIONS }) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 dark:bg-surface-800 rounded-lg p-0.5 text-xs">
      <span className="text-[10px] text-slate-400 px-1.5 font-medium flex items-center gap-1">
        <Clock className="w-3 h-3" /> Interval:
      </span>
      {options.map((opt) => (
        <button
          key={opt.val}
          type="button"
          onClick={() => onChange(opt.val)}
          className={`px-2 py-1 rounded text-[11px] font-medium transition ${
            value === opt.val
              ? 'bg-white dark:bg-surface-700 text-brand-600 dark:text-brand-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

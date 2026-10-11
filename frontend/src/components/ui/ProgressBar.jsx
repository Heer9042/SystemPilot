import React from 'react';
import { getProgressColor } from '../../utils/formatters';

export function ProgressBar({
  value = 0,
  max = 100,
  color,
  size = 'md',
  showLabel = false,
  className = '',
  colorClass = '',
}) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  const barColor = colorClass || color || getProgressColor(percent);

  const heights = {
    xs: 'h-1.5',
    sm: 'h-2',
    md: 'h-2.5',
    lg: 'h-3.5',
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
          <span>Progress</span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.round(percent)}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-200 dark:bg-surface-800/80 rounded-full overflow-hidden border border-slate-300/60 dark:border-slate-700/30 ${heights[size]}`}>
        <div
          className={`${barColor} h-full rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
export default ProgressBar;

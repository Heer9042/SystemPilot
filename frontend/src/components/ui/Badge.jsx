import React from 'react';

export function Badge({ children, variant = 'neutral', size = 'sm', className = '' }) {
  const variants = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-surface-800 dark:text-slate-300 dark:border-slate-700/50',
    brand: 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-500/15 dark:text-brand-300 dark:border-brand-500/30',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-status-success/15 dark:text-emerald-400 dark:border-status-success/30',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-status-warning/15 dark:text-amber-400 dark:border-status-warning/30',
    danger: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-status-danger/15 dark:text-rose-400 dark:border-status-danger/30',
    info: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-status-info/15 dark:text-sky-400 dark:border-status-info/30',
  };

  const sizes = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-sm px-3 py-1',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
}

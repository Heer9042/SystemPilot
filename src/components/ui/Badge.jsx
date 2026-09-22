import React from 'react';

export function Badge({ children, variant = 'neutral', size = 'sm', className = '' }) {
  const variants = {
    neutral: 'bg-surface-800 text-slate-300 border-slate-700/50',
    brand: 'bg-brand-500/15 text-brand-300 border-brand-500/30',
    success: 'bg-status-success/15 text-emerald-400 border-status-success/30',
    warning: 'bg-status-warning/15 text-amber-400 border-status-warning/30',
    danger: 'bg-status-danger/15 text-rose-400 border-status-danger/30',
    info: 'bg-status-info/15 text-sky-400 border-status-info/30',
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

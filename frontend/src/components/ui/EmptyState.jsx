import React from 'react';

/**
 * EmptyState renders a consistent, accessible placeholder when a list,
 * search result, or monitoring panel has no data to display.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <div
      className={`py-8 px-4 text-center flex flex-col items-center justify-center space-y-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-surface-950/30 ${className}`}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-surface-800 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center text-slate-400 dark:text-slate-500">
          {React.isValidElement(Icon) ? Icon : <Icon className="w-6 h-6" />}
        </div>
      )}
      <div className="space-y-1 max-w-sm">
        {title && (
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {title}
          </h4>
        )}
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

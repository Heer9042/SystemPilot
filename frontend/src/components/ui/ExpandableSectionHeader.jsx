import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function ExpandableSectionHeader({
  isOpen,
  onToggle,
  title,
  icon: Icon,
  iconColor = 'text-brand-500',
  className = '',
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors ${className}`}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className={`w-4 h-4 ${iconColor}`} />}
        <span>{title}</span>
      </div>
      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
    </button>
  );
}

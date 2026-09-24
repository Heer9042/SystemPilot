import React from 'react';

export function Toggle({ enabled, onChange, label, description, disabled = false }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      {(label || description) && (
        <div className="flex flex-col pr-3">
          {label && <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{label}</span>}
          {description && <span className="text-[11px] text-slate-500 dark:text-slate-400">{description}</span>}
        </div>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          enabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-surface-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
export default Toggle;

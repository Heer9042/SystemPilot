import React from 'react';
import { getProgressColor } from '../../utils/formatters';

export function ProgressBar({
  value = 0,
  max = 100,
  color,
  size = 'md',
  showLabel = false,
  className = '',
}) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  const barColor = color || getProgressColor(percent);

  const heights = {
    xs: 'h-1.5',
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1 text-xs text-slate-400">
          <span>{Math.round(percent)}%</span>
        </div>
      )}
      <div className={`w-full bg-surface-800/80 rounded-full overflow-hidden border border-slate-700/30 ${heights[size]}`}>
        <div
          className={`${barColor} h-full rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function Toggle({ enabled, onChange, label, description, disabled = false }) {
  return (
    <div className="flex items-center justify-between py-2">
      {(label || description) && (
        <div className="flex flex-col pr-4">
          {label && <span className="text-sm font-medium text-slate-200">{label}</span>}
          {description && <span className="text-xs text-slate-400">{description}</span>}
        </div>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          enabled ? 'bg-brand-600' : 'bg-surface-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children, footer }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-slate-700/60 animate-scaleUp">
        {title && (
          <div className="flex items-center justify-between pb-4 border-b border-slate-700/40 mb-4">
            <h3 className="text-lg font-bold text-slate-100">{title}</h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-surface-800 transition"
            >
              ✕
            </button>
          </div>
        )}
        <div className="text-slate-300 text-sm">{children}</div>
        {footer && <div className="mt-6 pt-4 border-t border-slate-700/40 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

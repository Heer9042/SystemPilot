import React from 'react';

export function Modal({ isOpen, onClose, title, children, footer }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl p-6 shadow-2xl border border-slate-700/60 animate-scaleUp overflow-hidden">
        {title && (
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4 shrink-0">
            <h3 className="text-sm font-bold text-slate-100">{title}</h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-surface-800 transition text-xs"
            >
              ✕
            </button>
          </div>
        )}
        <div className="text-slate-300 text-xs overflow-y-auto pr-1 flex-1">{children}</div>
        {footer && <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end gap-2.5 shrink-0">{footer}</div>}
      </div>
    </div>
  );
}
export default Modal;

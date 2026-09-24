import React from 'react';

export default function TitleBar({ title = 'SystemPilot', isElevated = false }) {
  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      getCurrentWindow().minimize();
    } catch {
      // Ignored outside native window context
    }
  };

  const handleMaximize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      getCurrentWindow().toggleMaximize();
    } catch {
      // Ignored outside native window context
    }
  };

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      getCurrentWindow().close();
    } catch {
      // Ignored outside native window context
    }
  };

  return (
    <div
      data-tauri-drag-region
      className="h-8 bg-[#0d1117] border-b border-[#21262d] flex items-center justify-between px-3 select-none z-50 text-xs text-slate-400"
    >
      <div className="flex items-center space-x-2 pointer-events-none">
        <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
        <span className="font-semibold text-slate-200">{title}</span>
        {isElevated && (
          <span className="bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0.5 rounded font-mono font-medium">
            ADMIN
          </span>
        )}
      </div>

      <div className="flex items-center space-x-1 no-drag">
        <button
          onClick={handleMinimize}
          className="w-6 h-6 flex items-center justify-center hover:bg-slate-800 rounded text-slate-400 hover:text-slate-100 transition"
          title="Minimize"
        >
          ─
        </button>
        <button
          onClick={handleMaximize}
          className="w-6 h-6 flex items-center justify-center hover:bg-slate-800 rounded text-slate-400 hover:text-slate-100 transition"
          title="Maximize"
        >
          □
        </button>
        <button
          onClick={handleClose}
          className="w-6 h-6 flex items-center justify-center hover:bg-red-600 rounded text-slate-400 hover:text-white transition"
          title="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

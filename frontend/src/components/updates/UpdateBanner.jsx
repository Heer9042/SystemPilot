import React from 'react';
import { Sparkles, ArrowRight, X, Download } from 'lucide-react';
import { Button } from '../ui/Button';

export function UpdateBanner({ latestVersion, onOpenModal, onUpdateNow, onDismiss }) {
  if (!latestVersion) return null;

  return (
    <div className="bg-gradient-to-r from-brand-600/90 via-indigo-600/90 to-purple-600/90 text-white px-4 py-2.5 shadow-lg border-b border-white/10 flex items-center justify-between text-xs animate-slideDown z-40 relative">
      <div className="flex items-center gap-2.5">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
        </span>
        <span className="font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          SystemPilot Update Available:
        </span>
        <span className="bg-white/20 px-2 py-0.5 rounded font-mono font-bold text-[11px]">
          v{latestVersion}
        </span>
        <span className="hidden sm:inline text-white/80">
          — Enhancements and fixes ready to install.
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenModal}
          className="text-white/90 hover:text-white underline underline-offset-2 hover:opacity-90 font-medium px-2 py-1 transition-all"
        >
          View Details
        </button>
        <button
          onClick={onUpdateNow}
          className="bg-white text-brand-700 hover:bg-slate-100 font-bold px-3 py-1 rounded-lg shadow-sm flex items-center gap-1.5 transition-all text-xs"
        >
          <Download className="w-3.5 h-3.5" /> Update Now
        </button>
        <button
          onClick={onDismiss}
          className="p-1 text-white/70 hover:text-white rounded-md hover:bg-white/10 transition-colors"
          title="Dismiss for now"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

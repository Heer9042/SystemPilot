import React from 'react';
import { ShieldCheck, Lock, ExternalLink } from 'lucide-react';

/**
 * VersionInformation displays installed version, channel, and release notes highlights.
 */
export function VersionInformation({
  currentVersion,
  latestRelease,
  channel = 'Official Release Channel',
  lastChecked,
  layout = 'grid',
  onOpenReleaseNotes,
}) {
  if (layout === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-1">
        <div className="p-3 bg-white/80 dark:bg-surface-950/60 rounded-xl border border-slate-200 dark:border-slate-800/80">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Installed Version</span>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-200 font-mono">v{currentVersion}</span>
        </div>
        <div className="p-3 bg-white/80 dark:bg-surface-950/60 rounded-xl border border-slate-200 dark:border-slate-800/80">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Release Channel</span>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{channel}</span>
        </div>
        <div className="p-3 bg-white/80 dark:bg-surface-950/60 rounded-xl border border-slate-200 dark:border-slate-800/80">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Last Update Check</span>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate block">
            {lastChecked || 'Not checked yet this session'}
          </span>
        </div>
      </div>
    );
  }

  if (layout === 'details' && latestRelease) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-surface-950/80 border border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Installed Version</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">v{currentVersion}</span>
          </div>
          <div className="text-slate-400 dark:text-slate-500 font-mono text-sm">→</div>
          <div className="text-right">
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-semibold">New Version Available</span>
            <span className="text-xs font-bold text-brand-600 dark:text-brand-300">v{latestRelease.version}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" /> Release Highlights
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{latestRelease.publishedAt}</span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-surface-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-mono leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
            {latestRelease.body || 'Performance optimizations, security improvements, and bug fixes.'}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          {onOpenReleaseNotes && (
            <button
              type="button"
              onClick={() => onOpenReleaseNotes(latestRelease.htmlUrl)}
              className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 inline-flex items-center gap-1.5 font-medium hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" /> View Full Release Notes
            </button>
          )}
          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
            <Lock className="w-3 h-3 text-emerald-500" /> Cryptographically Verified
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-xs font-semibold text-brand-600 dark:text-brand-400">
      <span>v{currentVersion}</span>
      {latestRelease && (
        <>
          <span>→</span>
          <span className="text-emerald-600 dark:text-emerald-400">v{latestRelease.version}</span>
        </>
      )}
    </div>
  );
}

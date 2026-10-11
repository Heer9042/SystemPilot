import React from 'react';
import {
  Loader2,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  WifiOff,
  Info,
} from 'lucide-react';
import { UpdateStatus as StatusEnum } from '../../services/updates/updateTypes';

function UpdateStatusBadge({ status, currentVersion, latestRelease, error, progress }) {
  switch (status) {
    case StatusEnum.CHECKING:
      return (
        <span className="text-xs text-brand-600 dark:text-brand-400 flex items-center gap-1.5 font-medium">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking for updates...
        </span>
      );
    case StatusEnum.UP_TO_DATE:
      return (
        <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" /> SystemPilot is up to date — v{currentVersion}
        </span>
      );
    case StatusEnum.AVAILABLE:
      return latestRelease ? (
        <span className="text-xs text-brand-600 dark:text-brand-300 flex items-center gap-1.5 font-bold">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" /> New version available — v{latestRelease.version}
        </span>
      ) : null;
    case StatusEnum.DOWNLOADING:
      return (
        <span className="text-xs text-brand-600 dark:text-brand-400 flex items-center gap-1.5 font-medium">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Downloading update... {progress?.percentage || 0}%
        </span>
      );
    case StatusEnum.VERIFYING:
      return (
        <span className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 font-medium">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying update package...
        </span>
      );
    case StatusEnum.INSTALLING:
      return (
        <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-bold">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Applying update & restarting SystemPilot...
        </span>
      );
    case StatusEnum.RESTART_REQUIRED:
      return (
        <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" /> Update verified — ready to apply
        </span>
      );
    case StatusEnum.OFFLINE:
      return (
        <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
          <Info className="w-3.5 h-3.5" /> Offline mode: Update check unavailable
        </span>
      );
    case StatusEnum.ERROR:
      return (
        <span className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-medium">
          <AlertCircle className="w-3.5 h-3.5" /> {error || 'Update check failed'}
        </span>
      );
    default:
      return null;
  }
}

function UpdateStatusCard({ status, currentVersion, latestRelease, error }) {
  switch (status) {
    case StatusEnum.CHECKING:
      return (
        <div className="py-8 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-brand-600 dark:text-brand-400 animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Checking for updates...</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Comparing with installed version v{currentVersion}</p>
        </div>
      );
    case StatusEnum.UP_TO_DATE:
      return (
        <div className="py-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">You're completely up to date!</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            SystemPilot is running the latest official version (<strong className="text-slate-800 dark:text-slate-200 font-semibold">v{currentVersion}</strong>). No action is needed.
          </p>
        </div>
      );
    case StatusEnum.RESTART_REQUIRED:
      return (
        <div className="py-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <span>v{currentVersion}</span>
            <span>→</span>
            <span>v{latestRelease?.version || 'latest'}</span>
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Update Verified & Ready</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            The cryptographic integrity check passed. Install the update to silently apply changes in-place and restart.
          </p>
        </div>
      );
    case StatusEnum.INSTALLING:
      return (
        <div className="py-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-brand-500/10 border border-brand-500/30 flex items-center justify-center mx-auto text-brand-600 dark:text-brand-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-xs font-semibold text-brand-600 dark:text-brand-400">
              <span>v{currentVersion}</span>
              <span>→</span>
              <span className="text-emerald-600 dark:text-emerald-400">v{latestRelease?.version || 'latest'}</span>
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Applying update in-place…
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Restarting SystemPilot into v{latestRelease?.version || 'new version'}…
            </p>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto bg-slate-50 dark:bg-surface-950/70 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            SystemPilot is updating smoothly in the background without opening the setup installer wizard. Your settings and database are preserved.
          </p>
        </div>
      );
    case StatusEnum.OFFLINE:
      return (
        <div className="py-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
            <WifiOff className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Offline Mode</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Unable to reach the update service. All system monitoring and performance features continue working normally offline.
          </p>
        </div>
      );
    case StatusEnum.ERROR:
      return (
        <div className="py-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Update Failed</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
            SystemPilot could not securely download or verify the update. No changes were made to your installation.
          </p>
          {error && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-mono bg-rose-50 dark:bg-rose-950/30 p-2 rounded-lg border border-rose-200 dark:border-rose-900/40">
              {error}
            </p>
          )}
        </div>
      );
    default:
      return null;
  }
}

/**
 * UpdateStatus renders update state indicators across SystemPilot.
 * Supports both compact inline badge presentation and prominent card presentation.
 */
export function UpdateStatus({
  status,
  currentVersion,
  latestRelease,
  error,
  progress,
  variant = 'badge',
}) {
  if (variant === 'badge') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <UpdateStatusBadge
          status={status}
          currentVersion={currentVersion}
          latestRelease={latestRelease}
          error={error}
          progress={progress}
        />
      </div>
    );
  }

  return (
    <UpdateStatusCard
      status={status}
      currentVersion={currentVersion}
      latestRelease={latestRelease}
      error={error}
    />
  );
}

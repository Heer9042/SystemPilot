import React from 'react';
import { ProgressBar } from '../ui/ProgressBar';
import { Loader2, CheckCircle2, Clock } from 'lucide-react';
import { UpdateStatus } from '../../services/updates/updateTypes';

function ProgressStepItem({ isDone, isActive, isPending, label }) {
  let icon = <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
  let textClass = 'text-slate-400';

  if (isDone) {
    icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
    textClass = 'text-slate-500 line-through';
  } else if (isActive) {
    icon = <Loader2 className="w-3.5 h-3.5 text-brand-500 animate-spin shrink-0" />;
    textClass = 'font-medium text-slate-700 dark:text-slate-200';
  }

  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className={textClass}>{label}</span>
    </div>
  );
}

function CompactProgressView({ progress }) {
  const pct = progress?.percentage || 0;
  const downloadedMb = progress?.downloadedMb;
  const totalMb = progress?.totalMb;

  return (
    <div className="space-y-1.5 w-full">
      <ProgressBar
        value={pct}
        className="h-2"
        colorClass="bg-gradient-to-r from-brand-500 to-indigo-500"
      />
      <div className="flex justify-between items-center text-[11px] font-mono text-slate-600 dark:text-slate-300">
        <span className="font-semibold">{pct}% downloaded</span>
        {downloadedMb && totalMb && parseFloat(totalMb) > 0 && (
          <span className="text-slate-500 dark:text-slate-400">
            {downloadedMb} MB / {totalMb} MB
          </span>
        )}
      </div>
    </div>
  );
}

function FullProgressView({ status, progress, currentVersion, latestRelease }) {
  const isVerifying = status === UpdateStatus.VERIFYING;
  const isInstalling = status === UpdateStatus.INSTALLING;
  const isDownloading = status === UpdateStatus.DOWNLOADING;

  const pct = progress?.percentage || 0;
  const downloadedMb = progress?.downloadedMb;
  const totalMb = progress?.totalMb;

  return (
    <div className="py-4 space-y-4">
      {/* Header and Version comparison */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-xs font-semibold text-brand-600 dark:text-brand-400">
          <span>Version v{currentVersion}</span>
          <span>→</span>
          <span className="text-emerald-600 dark:text-emerald-400">v{latestRelease?.version || 'latest'}</span>
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
          {isInstalling ? 'Applying update in-place…' : isVerifying ? 'Verifying update…' : 'Downloading update…'}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {progress?.text || 'Transferring verified update package securely...'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <ProgressBar
          value={pct}
          className="h-2.5"
          colorClass="bg-gradient-to-r from-brand-500 to-indigo-500"
        />
        <div className="flex justify-between items-center text-xs font-mono text-slate-600 dark:text-slate-300">
          <span className="font-semibold">{pct}% downloaded</span>
          {downloadedMb && totalMb && parseFloat(totalMb) > 0 && (
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              {downloadedMb} MB / {totalMb} MB
            </span>
          )}
        </div>
      </div>

      {/* Lifecycle Progress Steps */}
      <div className="p-3 bg-slate-50 dark:bg-surface-950/70 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
        <ProgressStepItem
          isDone={isVerifying || isInstalling}
          isActive={isDownloading}
          label="Downloading update…"
        />
        <ProgressStepItem
          isDone={isInstalling}
          isActive={isVerifying}
          label="Verifying update…"
        />
        <ProgressStepItem
          isDone={false}
          isActive={isInstalling}
          label="Applying update…"
        />
        <ProgressStepItem
          isDone={false}
          isActive={false}
          label="Restarting SystemPilot…"
        />
      </div>

      <p className="text-[11px] text-amber-600 dark:text-amber-400/90 text-center font-medium bg-amber-50 dark:bg-amber-950/20 py-1.5 px-2 rounded-lg border border-amber-200/50 dark:border-amber-900/30">
        Do not close SystemPilot while the update is being prepared.
      </p>
    </div>
  );
}

/**
 * UpdateProgress renders real-time update download, verification, and stage progress.
 */
export function UpdateProgress({
  status,
  progress,
  currentVersion,
  latestRelease,
  compact = false,
}) {
  if (compact) {
    return <CompactProgressView progress={progress} />;
  }

  return (
    <FullProgressView
      status={status}
      progress={progress}
      currentVersion={currentVersion}
      latestRelease={latestRelease}
    />
  );
}

import React from 'react';
import { Button } from '../ui/Button';
import {
  Sparkles,
  Download,
  X,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { UpdateStatus as StatusEnum } from '../../services/updates/updateTypes';
import { UpdateStatus } from './UpdateStatus';
import { UpdateProgress } from './UpdateProgress';
import { VersionInformation } from './VersionInformation';

export function UpdateModal({
  isOpen,
  onClose,
  status,
  currentVersion,
  latestRelease,
  error,
  progress,
  onUpdateNow,
  onRestartNow,
  onLater,
  onSkipVersion,
  onCheckAgain,
  onOpenReleaseNotes,
}) {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <button
        type="button"
        aria-label="Close update dialog backdrop"
        tabIndex={-1}
        className="fixed inset-0 w-full h-full bg-transparent border-0 cursor-default"
        onClick={onClose}
      />
      <dialog
        open
        aria-labelledby="update-modal-title"
        className="w-full max-w-lg bg-white dark:bg-surface-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-800 dark:text-slate-100 animate-scaleUp p-0 m-auto relative z-10 backdrop:bg-transparent"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-surface-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h2 id="update-modal-title" className="text-sm font-bold text-slate-800 dark:text-slate-100">
                SystemPilot Updates
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Official Update Channel</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close updates dialog"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-surface-800 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {status === StatusEnum.AVAILABLE && latestRelease ? (
            <VersionInformation
              currentVersion={currentVersion}
              latestRelease={latestRelease}
              layout="details"
              onOpenReleaseNotes={onOpenReleaseNotes}
            />
          ) : status === StatusEnum.DOWNLOADING || status === StatusEnum.VERIFYING ? (
            <UpdateProgress
              status={status}
              currentVersion={currentVersion}
              latestRelease={latestRelease}
              progress={progress}
            />
          ) : (
            <UpdateStatus
              status={status}
              currentVersion={currentVersion}
              latestRelease={latestRelease}
              error={error}
              variant="card"
            />
          )}
        </div>

        {/* Footer Actions */}
        <UpdateModalFooter
          status={status}
          latestRelease={latestRelease}
          onSkipVersion={onSkipVersion}
          onLater={onLater}
          onUpdateNow={onUpdateNow}
          onRestartNow={onRestartNow}
          onCheckAgain={onCheckAgain}
          onClose={onClose}
        />
      </dialog>
    </div>
  );
}

function UpdateModalFooter({
  status,
  latestRelease,
  onSkipVersion,
  onLater,
  onUpdateNow,
  onRestartNow,
  onCheckAgain,
  onClose,
}) {
  if (status === StatusEnum.AVAILABLE) {
    return (
      <div className="px-6 py-4 bg-slate-50 dark:bg-surface-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onSkipVersion(latestRelease?.version)}
          className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          Skip this version
        </button>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onLater}>
            Later
          </Button>
          <Button variant="primary" size="sm" onClick={onUpdateNow} className="flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> Update Now
          </Button>
        </div>
      </div>
    );
  }

  if (status === StatusEnum.DOWNLOADING || status === StatusEnum.VERIFYING) {
    return (
      <div className="px-6 py-4 bg-slate-50 dark:bg-surface-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
        <Button variant="primary" size="sm" disabled className="opacity-70 cursor-not-allowed flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {status === StatusEnum.VERIFYING ? 'Verifying update…' : 'Downloading update…'}
        </Button>
      </div>
    );
  }

  if (status === StatusEnum.INSTALLING) {
    return (
      <div className="px-6 py-4 bg-slate-50 dark:bg-surface-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
        <Button variant="primary" size="sm" disabled className="opacity-75 cursor-not-allowed flex items-center gap-1.5 bg-emerald-600 text-white">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Restarting SystemPilot…
        </Button>
      </div>
    );
  }

  if (status === StatusEnum.RESTART_REQUIRED) {
    return (
      <div className="px-6 py-4 bg-slate-50 dark:bg-surface-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onLater}>
          Later
        </Button>
        <Button variant="primary" size="sm" onClick={onRestartNow} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
          <RotateCcw className="w-3.5 h-3.5" /> Install Update
        </Button>
      </div>
    );
  }

  if (status === StatusEnum.ERROR) {
    return (
      <div className="px-6 py-4 bg-slate-50 dark:bg-surface-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={onCheckAgain}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 bg-slate-50 dark:bg-surface-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
      <Button variant="secondary" size="sm" onClick={onClose}>
        Done
      </Button>
    </div>
  );
}

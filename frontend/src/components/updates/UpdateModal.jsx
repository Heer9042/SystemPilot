import React from 'react';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import {
  Sparkles,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  WifiOff,
  X,
  Loader2,
  ShieldCheck,
  RotateCcw,
  Lock,
} from 'lucide-react';
import { UpdateStatus } from '../../services/updates/updateTypes';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-lg bg-white dark:bg-surface-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-800 dark:text-slate-100 animate-scaleUp"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-modal-title"
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
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-surface-800 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Status: Checking */}
          {status === UpdateStatus.CHECKING && (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-brand-600 dark:text-brand-400 animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Checking for updates...</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Comparing with installed version v{currentVersion}</p>
            </div>
          )}

          {/* Status: Up to Date */}
          {status === UpdateStatus.UP_TO_DATE && (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">You're completely up to date!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                SystemPilot is running the latest official version (<strong className="text-slate-800 dark:text-slate-200 font-semibold">v{currentVersion}</strong>). No action is needed.
              </p>
            </div>
          )}

          {/* Status: Update Available */}
          {status === UpdateStatus.AVAILABLE && latestRelease && (
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

              {/* Release Highlights */}
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
                <button
                  type="button"
                  onClick={() => onOpenReleaseNotes(latestRelease.htmlUrl)}
                  className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 inline-flex items-center gap-1.5 font-medium hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View Full Release Notes
                </button>
                <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                  <Lock className="w-3 h-3 text-emerald-500" /> Cryptographically Verified
                </span>
              </div>
            </div>
          )}

          {/* Status: Downloading / Verifying */}
          {(status === UpdateStatus.DOWNLOADING || status === UpdateStatus.VERIFYING) && (
            <div className="py-6 space-y-4">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-full bg-brand-500/10 border border-brand-500/30 flex items-center justify-center mx-auto text-brand-600 dark:text-brand-400 animate-pulse">
                  {status === UpdateStatus.VERIFYING ? <ShieldCheck className="w-5 h-5 text-indigo-500" /> : <Download className="w-5 h-5" />}
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {status === UpdateStatus.VERIFYING ? 'Verifying Integrity...' : `Downloading SystemPilot ${latestRelease?.version ? `v${latestRelease.version}` : ''}`}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {progress?.text || 'Transferring verified update package securely...'}
                </p>
              </div>

              <div className="space-y-1.5">
                <ProgressBar
                  value={progress?.percentage || 0}
                  className="h-2.5"
                  colorClass="bg-gradient-to-r from-brand-500 to-indigo-500"
                />
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{status === UpdateStatus.VERIFYING ? 'Verifying cryptographic signature & hash...' : 'Downloading package directly'}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{progress?.percentage || 0}%</span>
                </div>
              </div>

              <p className="text-[11px] text-amber-600 dark:text-amber-400/90 text-center font-medium bg-amber-50 dark:bg-amber-950/20 py-1.5 px-2 rounded-lg border border-amber-200/50 dark:border-amber-900/30">
                Do not close SystemPilot while the update is being prepared.
              </p>
            </div>
          )}

          {/* Status: Restart Required / Update Ready */}
          {status === UpdateStatus.RESTART_REQUIRED && (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Update Ready</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                The installer has been verified successfully. Install the update now to complete the upgrade.
              </p>
            </div>
          )}

          {/* Status: Installing */}
          {status === UpdateStatus.INSTALLING && (
            <div className="py-6 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-brand-600 dark:text-brand-400 animate-spin mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Installing SystemPilot Update...</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                SystemPilot is restarting to finish applying the upgrade.
              </p>
            </div>
          )}

          {/* Status: Offline */}
          {status === UpdateStatus.OFFLINE && (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
                <WifiOff className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Offline Mode</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Unable to reach the update service. All system monitoring and performance features continue working normally offline.
              </p>
            </div>
          )}

          {/* Status: Error */}
          {status === UpdateStatus.ERROR && (
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
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-surface-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          {status === UpdateStatus.AVAILABLE ? (
            <>
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
            </>
          ) : status === UpdateStatus.RESTART_REQUIRED ? (
            <>
              <Button variant="secondary" size="sm" onClick={onLater}>
                Later
              </Button>
              <Button variant="primary" size="sm" onClick={onRestartNow} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                <RotateCcw className="w-3.5 h-3.5" /> Install Update
              </Button>
            </>
          ) : status === UpdateStatus.ERROR ? (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={onCheckAgain}>
                Retry
              </Button>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

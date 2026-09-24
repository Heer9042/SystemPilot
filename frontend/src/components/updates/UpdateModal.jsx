import React from 'react';
import { Card } from '../ui/Card';
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
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Official GitHub Release Channel</p>
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
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Checking GitHub for updates...</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Comparing with current version v{currentVersion}</p>
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
                SystemPilot is running the latest official build (<strong className="text-slate-800 dark:text-slate-200 font-semibold">v{currentVersion}</strong>). No action is needed.
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
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-semibold">New Release Available</span>
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
                  <ExternalLink className="w-3.5 h-3.5" /> View Full Release Notes on GitHub
                </button>
              </div>
            </div>
          )}

          {/* Status: Downloading / Installing */}
          {(status === UpdateStatus.DOWNLOADING || status === UpdateStatus.INSTALLING) && (
            <div className="py-6 space-y-4">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-full bg-brand-500/10 border border-brand-500/30 flex items-center justify-center mx-auto text-brand-600 dark:text-brand-400 animate-pulse">
                  <Download className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {status === UpdateStatus.DOWNLOADING ? 'Downloading Update...' : 'Installing SystemPilot Update...'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {progress?.text || 'Connecting to official release repository...'}
                </p>
              </div>

              <div className="space-y-1.5">
                <ProgressBar
                  value={progress?.percentage || 0}
                  className="h-2.5"
                  colorClass="bg-gradient-to-r from-brand-500 to-indigo-500"
                />
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Progress</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{progress?.percentage || 0}%</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                Please do not close SystemPilot while updates are being prepared.
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
                Unable to reach GitHub update servers. All system monitoring and performance features continue working normally offline.
              </p>
            </div>
          )}

          {/* Status: Error */}
          {status === UpdateStatus.ERROR && (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Unable to Check for Updates</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {error || 'Could not connect to GitHub. Your current installation remains unchanged.'}
              </p>
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
          ) : status === UpdateStatus.ERROR ? (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button variant="primary" size="sm" onClick={onCheckAgain}>
                Try Again
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

import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Toggle } from '../ui/Toggle';
import { Sparkles, RefreshCw, Download, ExternalLink, RotateCcw, Loader2 } from 'lucide-react';
import { UpdateStatus as StatusEnum } from '../../services/updates/updateTypes';
import { UpdateStatus } from './UpdateStatus';
import { UpdateProgress } from './UpdateProgress';
import { VersionInformation } from './VersionInformation';

/**
 * UpdatePanel provides a self-contained card for application update control,
 * version diagnostics, and channel configuration within Settings.
 */
export function UpdatePanel({
  currentVersion,
  formattedLastChecked,
  status,
  latestRelease,
  progress,
  error,
  autoCheckEnabled,
  setAutoCheck,
  checkForUpdates,
  downloadAndInstallUpdate,
  restartAndApplyUpdate,
  openReleaseNotes,
  openModal,
}) {
  const isDownloadingOrVerifying =
    status === StatusEnum.DOWNLOADING || status === StatusEnum.VERIFYING;

  return (
    <Card className="space-y-3 lg:col-span-2 border-brand-500/20 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-indigo-100/40 dark:from-surface-900 dark:via-surface-900 dark:to-surface-950">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-500 dark:text-brand-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">SystemPilot Updates</h3>
        </div>
        <span className="text-[11px] font-mono font-bold bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/30 text-brand-700 dark:text-brand-300 px-2.5 py-0.5 rounded-full">
          v{currentVersion}
        </span>
      </div>

      {/* Version Diagnostic Tiles */}
      <VersionInformation
        currentVersion={currentVersion}
        lastChecked={formattedLastChecked}
        layout="grid"
      />

      {/* In-flight Compact Progress Bar */}
      {isDownloadingOrVerifying && (
        <div className="p-3 bg-white/60 dark:bg-surface-950/40 rounded-xl border border-slate-200 dark:border-slate-800">
          <UpdateProgress status={status} progress={progress} compact />
        </div>
      )}

      {/* Status Badge & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800/60">
        <div className="space-y-1 w-full sm:w-auto">
          <UpdateStatus
            status={status}
            currentVersion={currentVersion}
            latestRelease={latestRelease}
            progress={progress}
            error={error}
            variant="badge"
          />
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            SystemPilot downloads verified, secure updates directly from the official release service.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {status === StatusEnum.RESTART_REQUIRED && (
            <Button
              variant="primary"
              size="sm"
              onClick={restartAndApplyUpdate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restart & Install Now
            </Button>
          )}

          {isDownloadingOrVerifying && (
            <Button variant="secondary" size="sm" onClick={openModal} className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> View Progress
            </Button>
          )}

          {status === StatusEnum.AVAILABLE && latestRelease && (
            <>
              <Button variant="secondary" size="sm" onClick={() => openReleaseNotes(latestRelease.htmlUrl)}>
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> Notes
              </Button>
              <Button variant="primary" size="sm" onClick={() => {
                openModal();
                downloadAndInstallUpdate();
              }}>
                <Download className="w-3.5 h-3.5 mr-1" /> Update Now
              </Button>
            </>
          )}

          {!isDownloadingOrVerifying && status !== StatusEnum.RESTART_REQUIRED && status !== StatusEnum.AVAILABLE && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                openModal();
                checkForUpdates({ isManual: true });
              }}
              disabled={status === StatusEnum.CHECKING}
              className="flex items-center gap-1.5 w-full sm:w-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${status === StatusEnum.CHECKING ? 'animate-spin' : ''}`} />
              Check for Updates
            </Button>
          )}
        </div>
      </div>

      {/* Auto-check Toggle */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800/60">
        <Toggle
          enabled={autoCheckEnabled}
          onChange={(val) => setAutoCheck(val)}
          label="Automatically check for updates on startup"
          description="Performs a lightweight, non-blocking check for new releases in the background"
        />
      </div>
    </Card>
  );
}

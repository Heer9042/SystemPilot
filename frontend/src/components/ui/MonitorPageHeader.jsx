import React from 'react';
import { Badge } from './Badge';
import { Button } from './Button';
import { RefreshIntervalControl } from './RefreshIntervalControl';
import { Play, Pause, Copy, Check, Download } from 'lucide-react';

export function MonitorPageHeader({
  icon: Icon,
  iconBgClass = 'bg-brand-500/10 text-brand-600 dark:text-brand-400',
  title,
  subtitle,
  isPaused,
  onTogglePause,
  refreshIntervalMs,
  onRefreshIntervalChange,
  onCopyDetails,
  copiedNotice,
  onExportReport,
  actions,
}) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white/80 dark:bg-surface-900/80 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 backdrop-blur-md shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className={`p-2 rounded-xl ${iconBgClass}`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            {title}
            {isPaused ? (
              <Badge variant="warning" size="xs">Paused</Badge>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-normal">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            )}
          </h1>
          {subtitle && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        {onRefreshIntervalChange && (
          <RefreshIntervalControl
            value={refreshIntervalMs}
            onChange={onRefreshIntervalChange}
          />
        )}

        {onTogglePause && (
          <Button
            variant="outline"
            size="sm"
            onClick={onTogglePause}
            className="flex items-center gap-1.5 text-xs"
          >
            {isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-500" /> Resume
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-500" /> Pause
              </>
            )}
          </Button>
        )}

        {onCopyDetails && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCopyDetails}
            className="flex items-center gap-1.5 text-xs"
          >
            {copiedNotice ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" /> Copy Details
              </>
            )}
          </Button>
        )}

        {onExportReport && (
          <Button
            variant="primary"
            size="sm"
            onClick={onExportReport}
            className="flex items-center gap-1.5 text-xs"
          >
            <Download className="w-3.5 h-3.5" /> Export Report
          </Button>
        )}

        {actions}
      </div>
    </div>
  );
}

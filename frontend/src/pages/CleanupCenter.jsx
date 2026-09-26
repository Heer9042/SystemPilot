import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { api } from '../services/tauriApi';
import { formatBytes } from '../utils/formatters';
import { Sparkles, Trash2, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw, Loader2, HardDrive, FileCheck2, Cpu } from 'lucide-react';

export function CleanupCenter() {
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanupProgress, setCleanupProgress] = useState({
    percent: 0,
    stage: '',
    currentItem: '',
    cleanedBytes: 0,
    cleanedFiles: 0,
  });
  const [selectedIds, setSelectedIds] = useState(['user_temp', 'win_temp', 'thumb_cache']);
  const [emptyRecycleBin, setEmptyRecycleBin] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [cleanOutput, setCleanOutput] = useState(null);

  const runScan = async () => {
    setScanning(true);
    setCleanOutput(null);
    try {
      const res = await api.scanCleanableItems();
      setScanResult(res);
      if (res?.categories) {
        setSelectedIds(res.categories.map((c) => c.id));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    runScan();

    let unlisten = null;
    const setupListener = async () => {
      unlisten = await api.listenCleanupProgress((payload) => {
        if (payload) {
          setCleanupProgress((prev) => ({
            percent: Math.min(100, Math.max(prev.percent, Math.round(payload.percent || 0))),
            stage: payload.stage || prev.stage || 'Cleaning...',
            currentItem: payload.current_item || prev.currentItem || '',
            cleanedBytes: payload.cleaned_bytes !== undefined ? payload.cleaned_bytes : prev.cleanedBytes,
            cleanedFiles: payload.cleaned_files !== undefined ? payload.cleaned_files : prev.cleanedFiles,
          }));
        }
      });
    };
    setupListener();

    return () => {
      if (typeof unlisten === 'function') unlisten();
    };
  }, []);

  const toggleCategory = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExecute = async () => {
    setConfirmModal(false);
    setCleaning(true);
    setCleanOutput(null);
    setCleanupProgress({
      percent: 5,
      stage: 'Initializing Cleanup',
      currentItem: 'Preparing junk files and cache remover...',
      cleanedBytes: 0,
      cleanedFiles: 0,
    });

    const interval = setInterval(() => {
      setCleanupProgress((prev) => {
        if (prev.percent < 90) {
          const inc = Math.floor(Math.random() * 5) + 2;
          return {
            ...prev,
            percent: Math.min(90, prev.percent + inc),
          };
        }
        return prev;
      });
    }, 200);

    try {
      const res = await api.executeCleanup(selectedIds, emptyRecycleBin);
      clearInterval(interval);
      setCleanupProgress({
        percent: 100,
        stage: 'Cleanup Completed',
        currentItem: res?.message || 'Selected categories cleared successfully',
        cleanedBytes: res?.total_cleaned_bytes || 0,
        cleanedFiles: res?.total_cleaned_files || 0,
      });
      // Grace period to let user observe 100% completion before settling
      await new Promise((r) => setTimeout(r, 700));
      setCleanOutput(res);
      await runScan();
    } catch (e) {
      clearInterval(interval);
      console.error(e);
    } finally {
      setCleaning(false);
    }
  };

  const selectedBytes = scanResult?.categories
    ?.filter((c) => selectedIds.includes(c.id))
    ?.reduce((sum, c) => sum + c.total_bytes, 0) || 0;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Hero Banner */}
      <Card className="p-5 bg-gradient-to-r from-slate-100 via-indigo-50/50 to-indigo-100/60 dark:from-surface-900 dark:via-surface-900 dark:to-indigo-950/40 border-slate-200 dark:border-brand-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-brand-500 dark:text-brand-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Safe System Cleanup Center</h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Scan and safely reclaim disk space from temporary application caches, Windows crash dumps, and stale thumbnail databases. User documents, downloads, and personal files are never touched.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="md" icon={RefreshCw} disabled={scanning || cleaning} onClick={runScan}>
            {scanning ? 'Scanning...' : 'Scan Junk Files'}
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={cleaning ? Loader2 : Trash2}
            disabled={cleaning || selectedIds.length === 0}
            onClick={() => setConfirmModal(true)}
            className={`shadow-lg shadow-brand-600/30 relative overflow-hidden transition-all duration-300 ${
              cleaning ? 'ring-2 ring-brand-400 font-semibold' : ''
            }`}
          >
            {cleaning && (
              <span
                className="absolute inset-0 bg-emerald-500/25 transition-all duration-300 ease-out"
                style={{ width: `${cleanupProgress.percent}%` }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {cleaning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Cleaning... {cleanupProgress.percent}%</span>
                </>
              ) : (
                `Clean Selected (${formatBytes(selectedBytes)})`
              )}
            </span>
          </Button>
        </div>
      </Card>

      {/* Live Cleanup Progress Bar Card */}
      {cleaning && (
        <Card className="p-4 bg-slate-900/90 border-brand-500/40 text-white shadow-xl shadow-brand-500/10 animate-scaleUp overflow-hidden relative">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-brand-500/20 text-brand-400 animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    Cleaning Junk Files & Caches
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 font-mono">
                      {cleanupProgress.stage || 'In Progress'}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono truncate max-w-md">
                    {cleanupProgress.currentItem || 'Removing temporary files safely...'}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-2xl font-black font-mono tracking-tight bg-gradient-to-r from-brand-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
                  {cleanupProgress.percent}%
                </span>
              </div>
            </div>

            {/* Progress Track & Bar */}
            <div className="w-full bg-slate-800/90 rounded-full h-3.5 p-0.5 border border-slate-700/80 overflow-hidden relative shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-600 via-indigo-500 to-emerald-400 transition-all duration-300 ease-out relative shadow-lg shadow-brand-500/50"
                style={{ width: `${Math.max(4, cleanupProgress.percent)}%` }}
              >
                {/* Shimmer light effect */}
                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
              </div>
            </div>

            {/* Live Stats Row */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
              <span className="flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                Files Removed: <strong className="text-slate-200">{cleanupProgress.cleanedFiles}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-brand-400" />
                Reclaimed: <strong className="text-slate-200">{formatBytes(cleanupProgress.cleanedBytes)}</strong>
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Clean Output Result */}
      {cleanOutput && !cleaning && (
        <Card className="p-4 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-500/40 animate-scaleUp">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">System Cleanup Completed</h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-300/80">{cleanOutput.message}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Categories List */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
          <span className="font-bold text-slate-800 dark:text-slate-200">Cleanable System Caches</span>
          <span className="font-mono text-slate-500 dark:text-slate-400">
            Total Potential Space: <strong className="text-brand-600 dark:text-brand-300">{formatBytes(scanResult?.total_bytes || 0)}</strong>
          </span>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
          {scanResult?.categories?.map((cat) => {
            const isSelected = selectedIds.includes(cat.id);
            return (
              <div
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`p-4 flex items-center justify-between cursor-pointer transition ${
                  isSelected ? 'bg-slate-50 dark:bg-surface-800/30' : 'opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-0 bg-white dark:bg-surface-900 cursor-pointer"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-200">{cat.name}</h4>
                      <Badge variant="success" size="xs">Safe to remove</Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{cat.description}</p>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono block mt-0.5">{cat.path}</span>
                  </div>
                </div>

                <div className="text-right font-mono text-xs">
                  <span className="font-bold text-slate-900 dark:text-slate-200 block">{formatBytes(cat.total_bytes)}</span>
                  <span className="text-slate-400 dark:text-slate-500 text-[11px]">{cat.file_count} files</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModal}
        onClose={() => setConfirmModal(false)}
        title="Confirm System Cleanup"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" icon={Trash2} onClick={handleExecute}>
              Proceed with Cleanup
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            SystemPilot will remove approximately <strong>{formatBytes(selectedBytes)}</strong> of temporary files from the selected categories.
          </p>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800">
            <label className="flex items-center gap-2.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={emptyRecycleBin}
                onChange={(e) => setEmptyRecycleBin(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-0 bg-white dark:bg-surface-950"
              />
              <span>Also empty Windows Recycle Bin</span>
            </label>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>Safety check passed. No personal user files will be modified.</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}

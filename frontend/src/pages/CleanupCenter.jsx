import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { api } from '../services/tauriApi';
import { formatBytes } from '../utils/formatters';
import { Sparkles, Trash2, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';

export function CleanupCenter() {
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
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
  }, []);

  const toggleCategory = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExecute = async () => {
    setConfirmModal(false);
    setCleaning(true);
    try {
      const res = await api.executeCleanup(selectedIds, emptyRecycleBin);
      setCleanOutput(res);
      await runScan();
    } catch (e) {
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
          <Button variant="secondary" size="md" icon={RefreshCw} disabled={scanning} onClick={runScan}>
            {scanning ? 'Scanning...' : 'Scan Junk Files'}
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={Trash2}
            disabled={cleaning || selectedIds.length === 0}
            onClick={() => setConfirmModal(true)}
            className="shadow-lg shadow-brand-600/30"
          >
            Clean Selected ({formatBytes(selectedBytes)})
          </Button>
        </div>
      </Card>

      {/* Clean Output Result */}
      {cleanOutput && (
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

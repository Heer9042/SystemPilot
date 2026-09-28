import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { api } from '../services/tauriApi';
import { formatBytes } from '../utils/formatters';
import {
  Sparkles,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Loader2,
  HardDrive,
  FileCheck2,
  Search,
  FileText,
  Clock,
  Download,
  AlertTriangle,
  FolderOpen,
  Copy,
  Check,
  Calendar,
} from 'lucide-react';

function CleanupHeroBanner({
  scanning,
  cleaning,
  selectedIds,
  selectedBytes,
  cleanupProgress,
  onScan,
  onOpenConfirm,
  activeTab,
  setActiveTab,
}) {
  return (
    <Card className="p-5 bg-gradient-to-r from-slate-100 via-indigo-50/50 to-indigo-100/60 dark:from-surface-900 dark:via-surface-900 dark:to-indigo-950/40 border-slate-200 dark:border-brand-500/30 flex flex-col gap-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-brand-500 dark:text-brand-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Storage Cleanup & Maintenance</h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Safe Windows storage-cleanup center. Detects temporary caches, error reports, and delivery files. In-use and active files are automatically skipped to prevent application disruption. Personal documents are never modified.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button variant="secondary" size="md" icon={RefreshCw} disabled={scanning || cleaning} onClick={onScan}>
            {scanning ? 'Scanning...' : 'Scan Storage'}
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={cleaning ? Loader2 : Trash2}
            disabled={cleaning || selectedIds.length === 0}
            onClick={onOpenConfirm}
            className={`shadow-lg shadow-brand-600/30 relative overflow-hidden transition-colors duration-300 ${
              cleaning ? 'ring-2 ring-brand-400 font-semibold' : ''
            }`}
          >
            {cleaning && (
              <span
                className="absolute inset-0 bg-emerald-500/25 transition-[width] duration-300 ease-out"
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
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'categories'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-surface-800'
          }`}
        >
          Cleanup Categories
        </button>
        <button
          onClick={() => setActiveTab('large_files')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'large_files'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-surface-800'
          }`}
        >
          Large Files Analyzer
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'history'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-surface-800'
          }`}
        >
          Cleanup History
        </button>
      </div>
    </Card>
  );
}

function CleanupProgressTracker({ cleanupProgress }) {
  return (
    <Card className="p-4 bg-slate-900/90 border-brand-500/40 text-white shadow-xl shadow-brand-500/10 animate-scaleUp overflow-hidden relative">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-500/20 text-brand-400 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Cleaning System Storage
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

        <div className="w-full bg-slate-800/90 rounded-full h-3.5 p-0.5 border border-slate-700/80 overflow-hidden relative shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-600 via-indigo-500 to-emerald-400 transition-[width] duration-300 ease-out relative shadow-lg shadow-brand-500/50"
            style={{ width: `${Math.max(4, cleanupProgress.percent)}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
          <span className="flex items-center gap-1.5">
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
            Files Cleaned: <strong className="text-slate-200">{cleanupProgress.cleanedFiles}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-brand-400" />
            Reclaimed: <strong className="text-slate-200">{formatBytes(cleanupProgress.cleanedBytes)}</strong>
          </span>
        </div>
      </div>
    </Card>
  );
}

function CleanupCategoriesPanel({
  scanResult,
  selectedSet,
  onToggleCategory,
  onSelectAll,
  onDeselectAll,
  onOpenRecycleBinModal,
}) {
  return (
    <div className="space-y-4">
      {/* Windows Recycle Bin Dedicated Section */}
      <Card className="p-4 bg-slate-50/70 dark:bg-surface-900 border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Windows Recycle Bin</h4>
              <Badge variant="neutral" size="xs">
                {scanResult?.recycle_bin?.is_available ? 'SHQueryRecycleBin' : 'Status Ready'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Contains items deleted by user applications. Emptying is permanently destructive.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 justify-between sm:justify-end">
          <div className="text-right font-mono text-xs">
            <span className="font-bold text-slate-900 dark:text-slate-100 block">
              {formatBytes(scanResult?.recycle_bin?.total_bytes || 0)}
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              {scanResult?.recycle_bin?.item_count || 0} items
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={Trash2}
            disabled={!scanResult?.recycle_bin?.item_count}
            onClick={onOpenRecycleBinModal}
            className="text-red-600 dark:text-red-400 hover:border-red-500"
          >
            Empty Bin
          </Button>
        </div>
      </Card>

      {/* Main Categories Panel */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">Storage Locations & Caches</span>
            <span className="text-slate-400">•</span>
            <button onClick={onSelectAll} className="text-brand-600 dark:text-brand-400 hover:underline font-semibold">
              Select All
            </button>
            <span className="text-slate-400">•</span>
            <button onClick={onDeselectAll} className="text-slate-500 dark:text-slate-400 hover:underline">
              Deselect All
            </button>
          </div>
          <span className="font-mono text-slate-500 dark:text-slate-400">
            Total Potential Removable:{' '}
            <strong className="text-brand-600 dark:text-brand-300">
              {formatBytes(scanResult?.total_bytes || 0)}
            </strong>
          </span>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
          {scanResult?.categories?.map((cat) => {
            const isSelected = selectedSet.has(cat.id);
            const riskBadgeVariant =
              cat.risk_level === 'Safe to remove'
                ? 'success'
                : cat.risk_level === 'Review recommended'
                ? 'warning'
                : 'neutral';

            return (
              <label
                key={cat.id}
                className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                  isSelected ? 'bg-slate-50/80 dark:bg-surface-800/30' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${cat.name}`}
                    checked={isSelected}
                    onChange={() => onToggleCategory(cat.id)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-0 bg-white dark:bg-surface-900 cursor-pointer"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-200">{cat.name}</h4>
                      <Badge variant={riskBadgeVariant} size="xs">
                        {cat.risk_level}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{cat.description}</p>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono block mt-0.5 truncate max-w-md">
                      {cat.path}
                    </span>
                  </div>
                </div>

                <div className="text-right font-mono text-xs flex-shrink-0 pl-3">
                  <span className="font-bold text-slate-900 dark:text-slate-200 block">
                    {formatBytes(cat.total_bytes)}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 text-[11px]">{cat.file_count} files</span>
                </div>
              </label>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function LargeFilesPanel() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('size_desc');
  const [copiedPath, setCopiedPath] = useState(null);

  const fetchLargeFiles = async () => {
    setLoading(true);
    try {
      const res = await api.scanLargeFiles();
      setFiles(res || []);
    } catch (e) {
      console.error('Large file scan failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLargeFiles();
  }, []);

  const filteredFiles = useMemo(() => {
    let result = files.filter((f) => {
      const q = search.toLowerCase();
      return f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q);
    });

    if (sortBy === 'size_desc') {
      result.sort((a, b) => b.size_bytes - a.size_bytes);
    } else if (sortBy === 'size_asc') {
      result.sort((a, b) => a.size_bytes - b.size_bytes);
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'date') {
      result.sort((a, b) => b.last_modified_epoch_ms - a.last_modified_epoch_ms);
    }
    return result;
  }, [files, search, sortBy]);

  const copyFilePath = (p) => {
    navigator.clipboard?.writeText(p);
    setCopiedPath(p);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  return (
    <Card className="p-0 overflow-hidden space-y-0">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-brand-500" />
            Large Files Analyzer (&gt; 100 MB)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Identifies large files in user folders for review. Files are never deleted automatically.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <label htmlFor="cleanup-file-search" className="sr-only">
              Search files
            </label>
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              id="cleanup-file-search"
              type="text"
              aria-label="Search files"
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-900 text-xs text-slate-800 dark:text-slate-200 w-44"
            />
          </div>

          <select
            aria-label="Sort files by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-900 text-xs text-slate-800 dark:text-slate-200"
          >
            <option value="size_desc">Largest First</option>
            <option value="size_asc">Smallest First</option>
            <option value="date">Recently Modified</option>
            <option value="name">Name (A-Z)</option>
          </select>

          <Button variant="secondary" size="xs" icon={RefreshCw} disabled={loading} onClick={fetchLargeFiles}>
            {loading ? 'Scanning...' : 'Rescan'}
          </Button>
        </div>
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Scanning user storage for files &gt; 100 MB...
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No files larger than 100 MB found in Downloads, Videos, or Documents.
          </div>
        ) : (
          filteredFiles.map((f) => (
            <div
              key={f.path}
              className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-surface-800/40 transition-colors"
            >
              <div className="space-y-0.5 truncate max-w-lg">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-200 truncate">{f.name}</span>
                  <Badge variant="neutral" size="xs">
                    {f.extension ? `.${f.extension}` : 'File'}
                  </Badge>
                </div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono block truncate">
                  {f.path}
                </span>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0 pl-3">
                <div className="text-right font-mono">
                  <span className="font-bold text-slate-900 dark:text-slate-100 block">
                    {formatBytes(f.size_bytes)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {f.last_modified_epoch_ms > 0
                      ? new Date(f.last_modified_epoch_ms).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
                <button
                  onClick={() => copyFilePath(f.path)}
                  title="Copy path to clipboard"
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-surface-700 text-slate-500 dark:text-slate-400 transition-colors"
                >
                  {copiedPath === f.path ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function CleanupHistoryPanel() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.getCleanupHistory();
      setHistory(res || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Cleanup Audit History</h3>
        </div>
        <Button variant="ghost" size="xs" icon={RefreshCw} disabled={loading} onClick={fetchHistory}>
          Refresh
        </Button>
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-80 overflow-y-auto">
        {history.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">No cleanup actions logged yet.</div>
        ) : (
          history.map((h) => (
            <div key={h.id ?? `${h.timestamp}-${h.bytes_cleaned}`} className="p-3.5 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="font-semibold text-slate-900 dark:text-slate-200 block">
                  {h.details || 'Storage Cleanup'}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                  {h.timestamp ? new Date(h.timestamp).toLocaleString() : 'N/A'}
                </span>
              </div>
              <div className="text-right font-mono">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 block">
                  +{formatBytes(h.bytes_cleaned)}
                </span>
                <Badge variant={h.success ? 'success' : 'danger'} size="xs">
                  {h.success ? 'Success' : 'Partial'}
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function CleanupPreviewModal({
  isOpen,
  onClose,
  selectedCategories,
  selectedBytes,
  emptyRecycleBin,
  recycleBinBytes,
  onExecute,
}) {
  const totalReclaimable = selectedBytes + (emptyRecycleBin ? recycleBinBytes : 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm System Storage Cleanup"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" icon={Trash2} onClick={onExecute}>
            Execute Safe Cleanup
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Review the selected storage categories before proceeding. Files currently open or in use by running programs will be{' '}
          <strong className="text-brand-600 dark:text-brand-400">safely skipped</strong>.
        </p>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex justify-between text-xs font-semibold text-slate-900 dark:text-slate-100 pb-1.5 border-b border-slate-200 dark:border-slate-800">
            <span>Category Breakdown</span>
            <span>Estimated Size</span>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {selectedCategories.map((c) => (
              <div key={c.id} className="flex justify-between text-xs text-slate-700 dark:text-slate-300">
                <span className="truncate max-w-[200px]">{c.name}</span>
                <span className="font-mono">{formatBytes(c.total_bytes)}</span>
              </div>
            ))}
            {emptyRecycleBin && (
              <div className="flex justify-between text-xs text-red-600 dark:text-red-400 font-semibold">
                <span>Windows Recycle Bin</span>
                <span className="font-mono">{formatBytes(recycleBinBytes)}</span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-xs font-bold text-slate-900 dark:text-slate-100">
            <span>Total To Remove:</span>
            <span className="font-mono text-brand-600 dark:text-brand-400">{formatBytes(totalReclaimable)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>Active file protection enabled: No personal documents, boot files, or system libraries are modified.</span>
        </div>
      </div>
    </Modal>
  );
}

function RecycleBinConfirmModal({ isOpen, onClose, onConfirm, rbInfo }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Empty Windows Recycle Bin?"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" icon={Trash2} onClick={onConfirm}>
            Empty Recycle Bin
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-600 dark:text-slate-300">
          This permanently removes approximately <strong>{formatBytes(rbInfo?.total_bytes || 0)}</strong> ({rbInfo?.item_count || 0} items) currently stored in the Windows Recycle Bin.
        </p>
        <p className="text-xs font-semibold text-red-600 dark:text-red-400">
          This action cannot be undone.
        </p>
      </div>
    </Modal>
  );
}

export function CleanupCenter() {
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [activeTab, setActiveTab] = useState('categories');
  const [cleanupProgress, setCleanupProgress] = useState({
    percent: 0,
    stage: '',
    currentItem: '',
    cleanedBytes: 0,
    cleanedFiles: 0,
  });
  const [selectedIds, setSelectedIds] = useState(['user_temp', 'win_temp', 'thumb_cache', 'edge_cache']);
  const [confirmModal, setConfirmModal] = useState(false);
  const [rbModal, setRbModal] = useState(false);
  const [cleanOutput, setCleanOutput] = useState(null);

  const runScan = async () => {
    setScanning(true);
    setCleanOutput(null);
    try {
      const res = await api.scanCleanableItems();
      setScanResult(res);
      if (res?.categories) {
        setSelectedIds(res.categories.filter((c) => c.safe_to_clean).map((c) => c.id));
      }
    } catch (e) {
      console.error('Cleanup scan error:', e);
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
          setCleanupProgress({
            percent: Math.min(100, Math.round(payload.percent || 0)),
            stage: payload.stage || 'Cleaning...',
            currentItem: payload.current_item || '',
            cleanedBytes: payload.cleaned_bytes || 0,
            cleanedFiles: payload.cleaned_files || 0,
          });
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

  const handleSelectAll = () => {
    if (scanResult?.categories) {
      setSelectedIds(scanResult.categories.map((c) => c.id));
    }
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleExecute = async () => {
    setConfirmModal(false);
    setCleaning(true);
    setCleanOutput(null);
    setCleanupProgress({
      percent: 5,
      stage: 'Preparing',
      currentItem: 'Validating approved cleanup locations...',
      cleanedBytes: 0,
      cleanedFiles: 0,
    });

    try {
      const res = await api.executeCleanup(selectedIds, false);
      setCleanOutput(res);
      await runScan();
    } catch (e) {
      console.error('Cleanup execution error:', e);
    } finally {
      setCleaning(false);
    }
  };

  const handleEmptyRecycleBinDirect = async () => {
    setRbModal(false);
    setCleaning(true);
    try {
      const res = await api.executeCleanup([], true);
      setCleanOutput(res);
      await runScan();
    } catch (e) {
      console.error('Empty recycle bin error:', e);
    } finally {
      setCleaning(false);
    }
  };

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedCategories = useMemo(
    () => scanResult?.categories?.filter((c) => selectedSet.has(c.id)) || [],
    [scanResult, selectedSet]
  );

  const selectedBytes = useMemo(
    () => selectedCategories.reduce((sum, c) => sum + c.total_bytes, 0),
    [selectedCategories]
  );

  return (
    <div className="space-y-4 animate-fadeIn">
      <CleanupHeroBanner
        scanning={scanning}
        cleaning={cleaning}
        selectedIds={selectedIds}
        selectedBytes={selectedBytes}
        cleanupProgress={cleanupProgress}
        onScan={runScan}
        onOpenConfirm={() => setConfirmModal(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {cleaning && <CleanupProgressTracker cleanupProgress={cleanupProgress} />}

      {cleanOutput && !cleaning && (
        <Card className="p-4 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-500/40 animate-scaleUp">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                Cleanup Execution Completed
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-300/80">{cleanOutput.message}</p>
              {cleanOutput.total_skipped_files > 0 && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {cleanOutput.total_skipped_files} files were safely preserved because they are currently open or locked by active Windows applications.
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'categories' && (
        <CleanupCategoriesPanel
          scanResult={scanResult}
          selectedSet={selectedSet}
          onToggleCategory={toggleCategory}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onOpenRecycleBinModal={() => setRbModal(true)}
        />
      )}

      {activeTab === 'large_files' && <LargeFilesPanel />}

      {activeTab === 'history' && <CleanupHistoryPanel />}

      <CleanupPreviewModal
        isOpen={confirmModal}
        onClose={() => setConfirmModal(false)}
        selectedCategories={selectedCategories}
        selectedBytes={selectedBytes}
        emptyRecycleBin={false}
        recycleBinBytes={scanResult?.recycle_bin?.total_bytes || 0}
        onExecute={handleExecute}
      />

      <RecycleBinConfirmModal
        isOpen={rbModal}
        onClose={() => setRbModal(false)}
        onConfirm={handleEmptyRecycleBinDirect}
        rbInfo={scanResult?.recycle_bin}
      />
    </div>
  );
}

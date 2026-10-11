import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { api } from '../services/tauriApi';
import { formatBytes, formatUptime } from '../utils/formatters';
import { getUserErrorMessage, handleApplicationError } from '../services/errorHandler';
import {
  Search,
  RefreshCw,
  XCircle,
  PauseCircle,
  PlayCircle,
  ShieldAlert,
  Sliders,
  ChevronDown,
  ChevronUp,
  AppWindow,
  Layers,
  ShieldCheck,
  FolderOpen,
  Info,
  Copy,
  Check,
  GitFork,
  Activity,
  Terminal,
  Cpu,
  Database,
  Clock,
  User,
  AlertTriangle,
} from 'lucide-react';

export function Processes() {
  const [processes, setProcesses] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all'); // 'all' | 'apps' | 'background' | 'windows'
  const [sortField, setSortField] = useState('memory_bytes'); // 'name' | 'pid' | 'cpu_usage' | 'memory_bytes'
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedPid, setSelectedPid] = useState(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [statusNotification, setStatusNotification] = useState(null);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Modals state
  const [endTaskModal, setEndTaskModal] = useState(false);
  const [endTreeModal, setEndTreeModal] = useState(false);
  const [propertiesModal, setPropertiesModal] = useState(false);
  const [propertiesData, setPropertiesData] = useState(null);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [priorityModal, setPriorityModal] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState('Normal');

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null); // { x, y, process }

  const isFetchingRef = useRef(false);
  const tableRef = useRef(null);

  // Fetch process list from native Rust backend
  const fetchProcesses = useCallback(async (manual = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (manual) setIsLoading(true);

    try {
      const list = await api.getProcesses();
      setProcesses(list || []);
      setLoadError(null);
    } catch (err) {
      console.error('Failed to enumerate processes:', err);
      const handled = handleApplicationError(err, 'general');
      const isPermission =
        String(err).toLowerCase().includes('access denied') ||
        String(err).toLowerCase().includes('permission');
      setLoadError({
        message: handled.message,
        referenceId: handled.referenceId,
        isPermission,
      });
      setStatusNotification({
        type: 'error',
        message: handled.message || 'Failed to enumerate system processes',
      });
    } finally {
      isFetchingRef.current = false;
      if (manual) setIsLoading(false);
    }
  }, []);

  // Currently selected process object
  const selectedProcess = useMemo(() => {
    if (selectedPid == null) return null;
    return (processes || []).find((p) => p && p.pid === selectedPid) || null;
  }, [processes, selectedPid]);

  // Sort handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // Default descending for metrics (highest first)
    }
  };

  // Filter & sort logic
  const filteredAndSortedProcesses = useMemo(() => {
    const q = (search || '').trim().toLowerCase();

    return (processes || [])
      .filter((p) => {
        if (!p) return false;
        // Category filtering
        if (filterCategory !== 'all') {
          if (p.category !== filterCategory) return false;
        }

        // Search matching
        if (q) {
          const matchesName = (p.name || '').toLowerCase().includes(q);
          const matchesPid = (p.pid != null ? p.pid.toString() : '').includes(q);
          const matchesPath = (p.exe_path || '').toLowerCase().includes(q);
          if (!matchesName && !matchesPid && !matchesPath) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA = a?.[sortField];
        let valB = b?.[sortField];

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA == null) return 1;
        if (valB == null) return -1;

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [processes, search, filterCategory, sortField, sortAsc]);

  // Aggregate stats
  const stats = useMemo(() => {
    let appsCount = 0;
    let bgCount = 0;
    let winCount = 0;
    let totalCpu = 0;
    let totalMemory = 0;

    for (const p of processes || []) {
      if (!p) continue;
      if (p.category === 'apps') appsCount++;
      else if (p.category === 'windows') winCount++;
      else bgCount++;

      totalCpu += Number(p.cpu_usage) || 0;
      totalMemory += Number(p.memory_bytes) || 0;
    }

    return {
      total: (processes || []).length,
      apps: appsCount,
      background: bgCount,
      windows: winCount,
      totalCpu,
      totalMemory,
    };
  }, [processes]);

  // Action: End Task (with PID reuse validation & error handling)
  const handleConfirmEndTask = async () => {
    if (!selectedProcess) return;
    const targetPid = selectedProcess.pid;
    const targetName = selectedProcess.name;

    try {
      await api.terminateProcess(targetPid, targetName);
      setStatusNotification({
        type: 'success',
        message: `Successfully terminated ${targetName} (PID: ${targetPid})`,
      });
      setEndTaskModal(false);
      setSelectedPid(null);
      await fetchProcesses(false);
    } catch (err) {
      console.error('Termination error:', err);
      setStatusNotification({
        type: 'error',
        message: getUserErrorMessage(err, 'authorization') || String(err),
      });
      setEndTaskModal(false);
    }
  };

  // Action: End Process Tree
  const handleConfirmEndTree = async () => {
    if (!selectedProcess) return;
    const targetPid = selectedProcess.pid;
    const targetName = selectedProcess.name;

    try {
      const count = await api.terminateProcessTree(targetPid, targetName);
      setStatusNotification({
        type: 'success',
        message: `Terminated process tree for ${targetName} (${count} process${count !== 1 ? 'es' : ''} ended)`,
      });
      setEndTreeModal(false);
      setSelectedPid(null);
      await fetchProcesses(false);
    } catch (err) {
      console.error('Tree termination error:', err);
      setStatusNotification({
        type: 'error',
        message: getUserErrorMessage(err, 'authorization') || String(err),
      });
      setEndTreeModal(false);
    }
  };

  // Action: Open File Location
  const handleOpenFileLocation = async (proc = selectedProcess) => {
    if (!proc || !proc.exe_path) {
      setStatusNotification({
        type: 'warning',
        message: 'Executable path is not accessible for this system process.',
      });
      return;
    }

    try {
      await api.openProcessLocation(proc.exe_path);
      setStatusNotification({
        type: 'success',
        message: `Opened location for ${proc.name} in Windows Explorer.`,
      });
    } catch (err) {
      console.error('Open location error:', err);
      setStatusNotification({
        type: 'error',
        message: String(err) || 'Failed to open file location in Explorer.',
      });
    }
  };

  // Action: Properties Dialog
  const handleOpenProperties = async (proc = selectedProcess) => {
    if (!proc) return;
    setPropertiesModal(true);
    setPropertiesLoading(true);
    try {
      const props = await api.getProcessProperties(proc.pid);
      setPropertiesData(props);
    } catch (err) {
      console.warn('Detailed properties query failed, using list snapshot:', err);
      setPropertiesData({
        ...proc,
        command_line: null,
        user: null,
      });
    } finally {
      setPropertiesLoading(false);
    }
  };

  // Action: Copy Details to Clipboard
  const handleCopyDetails = (proc = selectedProcess) => {
    if (!proc) return;
    const details = [
      `Process Name:      ${proc.name}`,
      `Process ID (PID):  ${proc.pid}`,
      `Parent PID:        ${proc.parent_pid != null ? proc.parent_pid : 'Unavailable'}`,
      `Category:          ${proc.category === 'apps' ? 'Apps' : proc.category === 'windows' ? 'Windows Processes' : 'Background Processes'}`,
      `Status:            ${proc.status}`,
      `CPU Usage:         ${(proc.cpu_usage || 0).toFixed(1)}%`,
      `Memory (Working):  ${formatBytes(proc.memory_bytes || 0)}`,
      `Virtual Memory:    ${formatBytes(proc.virtual_memory_bytes || 0)}`,
      `Priority:          ${proc.priority}`,
      `Thread Count:      ${proc.thread_count != null ? proc.thread_count : 'Unavailable'}`,
      `Executable Path:   ${proc.exe_path || 'Unavailable'}`,
    ].join('\n');

    navigator.clipboard
      .writeText(details)
      .then(() => {
        setCopiedFeedback(true);
        setTimeout(() => setCopiedFeedback(false), 2000);
      })
      .catch((err) => {
        console.error('Clipboard write error:', err);
      });
  };

  // Action: Set Priority
  const handleApplyPriority = async () => {
    if (!selectedProcess) return;
    try {
      await api.setProcessPriority(selectedProcess.pid, selectedPriority);
      setStatusNotification({
        type: 'success',
        message: `Set priority of ${selectedProcess.name} to ${selectedPriority}`,
      });
      setPriorityModal(false);
      fetchProcesses(false);
    } catch (err) {
      setStatusNotification({
        type: 'error',
        message: getUserErrorMessage(err, 'authorization'),
      });
    }
  };

  // Action: Suspend Process
  const handleSuspendProcess = async (proc = selectedProcess) => {
    if (!proc) return;
    try {
      await api.suspendProcess(proc.pid);
      setStatusNotification({
        type: 'success',
        message: `Suspended process ${proc.name} (PID: ${proc.pid})`,
      });
      fetchProcesses(false);
    } catch (err) {
      setStatusNotification({
        type: 'error',
        message: getUserErrorMessage(err, 'authorization'),
      });
    }
  };

  // Action: Resume Process
  const handleResumeProcess = async (proc = selectedProcess) => {
    if (!proc) return;
    try {
      await api.resumeProcess(proc.pid);
      setStatusNotification({
        type: 'success',
        message: `Resumed process ${proc.name} (PID: ${proc.pid})`,
      });
      fetchProcesses(false);
    } catch (err) {
      setStatusNotification({
        type: 'error',
        message: getUserErrorMessage(err, 'authorization'),
      });
    }
  };

  // Context Menu opener
  const handleContextMenu = (e, proc) => {
    e.preventDefault();
    setSelectedPid(proc.pid);
    const menuWidth = 220;
    const menuHeight = 280;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);
    setContextMenu({ x, y, process: proc });
  };

  // Initial load
  useEffect(() => {
    fetchProcesses(true);
  }, [fetchProcesses]);

  // Polling with auto-refresh pause/resume support
  useEffect(() => {
    if (!isAutoRefresh) return;
    const interval = setInterval(() => {
      fetchProcesses(false);
    }, 2500);
    return () => clearInterval(interval);
  }, [isAutoRefresh, fetchProcesses]);

  // Close context menu on outside click or scroll
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (contextMenu && !e.target.closest('#process-context-menu')) {
        setContextMenu(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    window.addEventListener('contextmenu', handleOutsideClick);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('contextmenu', handleOutsideClick);
    };
  }, [contextMenu]);

  // Keyboard navigation across table
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'Escape') {
        setSelectedPid(null);
        setContextMenu(null);
        return;
      }

      if (filteredAndSortedProcesses.length === 0) return;

      const currentIndex = filteredAndSortedProcesses.findIndex(
        (p) => p.pid === selectedPid
      );

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex =
          currentIndex < filteredAndSortedProcesses.length - 1
            ? currentIndex + 1
            : 0;
        setSelectedPid(filteredAndSortedProcesses[nextIndex].pid);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex =
          currentIndex > 0
            ? currentIndex - 1
            : filteredAndSortedProcesses.length - 1;
        setSelectedPid(filteredAndSortedProcesses[prevIndex].pid);
      } else if (e.key === 'Delete' && selectedProcess) {
        e.preventDefault();
        setEndTaskModal(true);
      } else if (e.key === 'Enter' && selectedProcess) {
        e.preventDefault();
        handleOpenProperties(selectedProcess);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPid, selectedProcess, filteredAndSortedProcesses]);

  return (
    <div className="space-y-4 animate-fadeIn select-none font-sans pb-12">
      {/* 1. Header with Task Manager Style Telemetry Badges */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Process Manager
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time Windows process monitoring, resource usage, and lifecycle management
          </p>
        </div>

        {/* Global Resource Footprint Counters */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-sans font-medium text-[11px]">Processes:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{stats?.total ?? 0}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-sans font-medium text-[11px]">Active CPU:</span>
            <span className="font-bold text-brand-600 dark:text-brand-400">
              {(Number(stats?.totalCpu) || 0).toFixed(1)}%
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-sans font-medium text-[11px]">Memory:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {formatBytes(stats?.totalMemory || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top Toolbar: Search, Category Filters, and Refresh Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search processes, PID, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-surface-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Categories Tab Bar */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-200/60 dark:bg-surface-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filterCategory === 'all'
                ? 'bg-white dark:bg-surface-800 text-slate-900 dark:text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All <span className="opacity-70 font-mono text-[11px]">({stats.total})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterCategory('apps')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              filterCategory === 'apps'
                ? 'bg-brand-600 text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <AppWindow className="w-3.5 h-3.5" />
            Apps <span className="opacity-80 font-mono text-[11px]">({stats.apps})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterCategory('background')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              filterCategory === 'background'
                ? 'bg-brand-600 text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Background <span className="opacity-80 font-mono text-[11px]">({stats.background})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterCategory('windows')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              filterCategory === 'windows'
                ? 'bg-brand-600 text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Windows <span className="opacity-80 font-mono text-[11px]">({stats.windows})</span>
          </button>
        </div>

        {/* Refresh & Pause/Resume Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            icon={isAutoRefresh ? PauseCircle : PlayCircle}
            className={
              isAutoRefresh
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-slate-500'
            }
          >
            {isAutoRefresh ? 'Pause (2.5s)' : 'Resume'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchProcesses(true)}
            disabled={isLoading}
            icon={RefreshCw}
            className={isLoading ? 'animate-spin' : ''}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* 3. Action Toolbar (Enabled when process is selected) */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-100/80 dark:bg-surface-900/90 border border-slate-200/80 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          {selectedProcess ? (
            <div className="flex items-center gap-2 bg-white dark:bg-surface-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[200px]">
                {selectedProcess.name}
              </span>
              <span className="font-mono text-slate-500 text-[11px]">
                (PID {selectedProcess.pid})
              </span>
              <button
                type="button"
                onClick={() => setSelectedPid(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs ml-1"
                title="Deselect process (Esc)"
              >
                ✕
              </button>
            </div>
          ) : (
            <span className="text-slate-500 dark:text-slate-400 italic text-[11px] px-2">
              Select a process from the table below to manage it (↑ / ↓ keys or click)
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant="danger"
            size="sm"
            disabled={!selectedProcess}
            icon={XCircle}
            onClick={() => setEndTaskModal(true)}
            title="Terminate process safely (Del)"
          >
            End Task
          </Button>

          <Button
            variant="secondary"
            size="sm"
            disabled={!selectedProcess}
            icon={GitFork}
            onClick={() => setEndTreeModal(true)}
            title="Terminate process and all child processes"
          >
            End Process Tree
          </Button>

          <Button
            variant="secondary"
            size="sm"
            disabled={!selectedProcess || !selectedProcess.exe_path}
            icon={FolderOpen}
            onClick={() => handleOpenFileLocation(selectedProcess)}
            title={
              selectedProcess && !selectedProcess.exe_path
                ? 'Executable path is not accessible for this system process'
                : 'Show containing folder in Windows File Explorer'
            }
          >
            Open Location
          </Button>

          <Button
            variant="secondary"
            size="sm"
            disabled={!selectedProcess}
            icon={Sliders}
            onClick={() => {
              if (selectedProcess) {
                setSelectedPriority(selectedProcess.priority);
                setPriorityModal(true);
              }
            }}
            title="Adjust CPU scheduling priority"
          >
            Priority
          </Button>

          <Button
            variant="secondary"
            size="sm"
            disabled={!selectedProcess}
            icon={Info}
            onClick={() => handleOpenProperties(selectedProcess)}
            title="Inspect comprehensive process metadata (Enter)"
          >
            Properties
          </Button>

          <Button
            variant="secondary"
            size="sm"
            disabled={!selectedProcess}
            icon={copiedFeedback ? Check : Copy}
            onClick={() => handleCopyDetails(selectedProcess)}
            title="Copy process details to clipboard"
          >
            {copiedFeedback ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>

      {/* Notifications / Toast */}
      {statusNotification && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
            statusNotification.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800/40 dark:text-rose-300'
              : statusNotification.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800/40 dark:text-amber-300'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800/40 dark:text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusNotification.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            ) : statusNotification.type === 'warning' ? (
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            ) : (
              <Check className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{statusNotification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusNotification(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* 4. Process Table Card */}
      <Card className="p-0 overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
        <div
          ref={tableRef}
          className="overflow-x-auto max-h-[640px] overflow-y-auto focus:outline-none"
          tabIndex={0}
        >
          <table className="w-full text-left text-xs border-collapse">
            {/* Header */}
            <thead className="sticky top-0 bg-slate-100/95 dark:bg-surface-950/95 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 select-none z-10 font-semibold">
              <tr>
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 transition"
                >
                  <div className="flex items-center gap-1.5">
                    Process Name
                    {sortField === 'name' &&
                      (sortAsc ? (
                        <ChevronUp className="w-3.5 h-3.5 text-brand-600" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-brand-600" />
                      ))}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('pid')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 transition w-24"
                >
                  <div className="flex items-center gap-1.5">
                    PID
                    {sortField === 'pid' &&
                      (sortAsc ? (
                        <ChevronUp className="w-3.5 h-3.5 text-brand-600" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-brand-600" />
                      ))}
                  </div>
                </th>
                <th className="py-3 px-3 w-32">Type</th>
                <th className="py-3 px-3 w-28">Status</th>
                <th
                  onClick={() => handleSort('cpu_usage')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 transition w-28 text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    CPU %
                    {sortField === 'cpu_usage' &&
                      (sortAsc ? (
                        <ChevronUp className="w-3.5 h-3.5 text-brand-600" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-brand-600" />
                      ))}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('memory_bytes')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 transition w-36 text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    Memory (RAM)
                    {sortField === 'memory_bytes' &&
                      (sortAsc ? (
                        <ChevronUp className="w-3.5 h-3.5 text-brand-600" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-brand-600" />
                      ))}
                  </div>
                </th>
                <th className="py-3 px-4 min-w-[200px]">Executable Path</th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {filteredAndSortedProcesses.map((proc) => {
                const isSelected = selectedPid === proc.pid;

                return (
                  <tr
                    key={proc.pid}
                    onClick={() => setSelectedPid(proc.pid)}
                    onDoubleClick={() => handleOpenProperties(proc)}
                    onContextMenu={(e) => handleContextMenu(e, proc)}
                    className={`cursor-pointer transition-colors duration-75 text-slate-700 dark:text-slate-300 font-sans ${
                      isSelected
                        ? 'bg-brand-500/15 dark:bg-brand-500/20 text-slate-900 dark:text-white border-l-4 border-brand-500 font-medium'
                        : 'hover:bg-slate-50 dark:hover:bg-surface-800/40 border-l-4 border-transparent'
                    }`}
                  >
                    {/* Process Name & Icon */}
                    <td className="py-2.5 px-4 font-medium">
                      <div className="flex items-center gap-2">
                        {proc.category === 'apps' ? (
                          <AppWindow className="w-4 h-4 text-brand-600 dark:text-brand-400 flex-shrink-0" />
                        ) : proc.category === 'windows' ? (
                          <ShieldCheck className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                        ) : (
                          <Layers className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                        )}
                        <span className="truncate max-w-xs">{proc.name}</span>
                        {proc.is_critical && (
                          <ShieldAlert
                            className="w-3.5 h-3.5 text-amber-500 flex-shrink-0"
                            title="Protected Windows system process"
                          />
                        )}
                      </div>
                    </td>

                    {/* PID */}
                    <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400">
                      {proc.pid}
                    </td>

                    {/* Type / Category */}
                    <td className="py-2.5 px-3 font-sans">
                      <Badge
                        variant={
                          proc.category === 'apps'
                            ? 'brand'
                            : proc.category === 'windows'
                            ? 'neutral'
                            : 'neutral'
                        }
                        size="xs"
                      >
                        {proc.category === 'apps'
                          ? 'App'
                          : proc.category === 'windows'
                          ? 'Windows'
                          : 'Background'}
                      </Badge>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 font-sans text-xs">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            (proc.status || '').toLowerCase().includes('suspend')
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        <span className="capitalize text-slate-600 dark:text-slate-400">
                          {proc.status || 'Running'}
                        </span>
                      </div>
                    </td>

                    {/* CPU Usage */}
                    <td className="py-2.5 px-3 font-mono text-right">
                      <span
                        className={
                          (Number(proc.cpu_usage) || 0) > 10
                            ? 'text-rose-600 dark:text-rose-400 font-bold'
                            : (Number(proc.cpu_usage) || 0) > 3
                            ? 'text-amber-600 dark:text-amber-400 font-medium'
                            : 'text-slate-600 dark:text-slate-400'
                        }
                      >
                        {(Number(proc.cpu_usage) || 0).toFixed(1)}%
                      </span>
                    </td>

                    {/* Memory (RAM) */}
                    <td className="py-2.5 px-4 font-mono text-right text-slate-900 dark:text-slate-200">
                      {formatBytes(proc.memory_bytes || 0)}
                    </td>

                    {/* Executable Path */}
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
                      {proc.exe_path ? (
                        <span title={proc.exe_path}>{proc.exe_path}</span>
                      ) : (
                        <span className="italic text-slate-400 dark:text-slate-600 font-sans">
                          Unavailable
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Error state if enumeration failed and process list is empty */}
              {processes.length === 0 && loadError && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-14 text-center font-sans"
                  >
                    <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20">
                      <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                          Process Enumeration Unavailable
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {loadError.message}
                        </p>
                        {loadError.referenceId && (
                          <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                            Reference: {loadError.referenceId}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => fetchProcesses(true)}
                        disabled={isLoading}
                        icon={RefreshCw}
                        className={isLoading ? 'animate-spin' : ''}
                      >
                        Retry Enumeration
                      </Button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Empty state when process list is empty but loading or no search results */}
              {processes.length === 0 && !loadError && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center text-slate-400 dark:text-slate-500 font-sans"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-8 h-8 opacity-40 text-slate-400 animate-spin" />
                      <p className="font-medium text-sm">Enumerating Windows processes...</p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Empty state when search produces no matches */}
              {processes.length > 0 && filteredAndSortedProcesses.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center text-slate-400 dark:text-slate-500 font-sans"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="w-8 h-8 opacity-40 text-slate-400" />
                      <p className="font-medium text-sm">
                        No running processes matching &ldquo;{search}&rdquo;
                      </p>
                      <p className="text-xs text-slate-400">
                        Try modifying your search query or switching category filters.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 5. Custom Context Menu */}
      {contextMenu && (
        <div
          id="process-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 w-56 rounded-xl bg-white dark:bg-surface-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-1.5 text-xs text-slate-700 dark:text-slate-300 font-sans animate-scaleUp"
        >
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-500 truncate">
            {contextMenu.process.name} (PID {contextMenu.process.pid})
          </div>

          <button
            type="button"
            onClick={() => {
              setContextMenu(null);
              setEndTaskModal(true);
            }}
            className="w-full px-3 py-2 text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            End Task
          </button>

          <button
            type="button"
            onClick={() => {
              setContextMenu(null);
              setEndTreeModal(true);
            }}
            className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-surface-800 flex items-center gap-2"
          >
            <GitFork className="w-4 h-4 text-amber-500" />
            End Process Tree
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

          <button
            type="button"
            disabled={!contextMenu.process.exe_path}
            onClick={() => {
              setContextMenu(null);
              handleOpenFileLocation(contextMenu.process);
            }}
            className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-surface-800 disabled:opacity-50 flex items-center gap-2"
          >
            <FolderOpen className="w-4 h-4 text-slate-500" />
            Open File Location
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedPriority(contextMenu.process.priority);
              setContextMenu(null);
              setPriorityModal(true);
            }}
            className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-surface-800 flex items-center gap-2"
          >
            <Sliders className="w-4 h-4 text-slate-500" />
            Set Priority...
          </button>

          <button
            type="button"
            onClick={() => {
              const p = contextMenu.process;
              setContextMenu(null);
              if ((p?.status || '').toLowerCase().includes('suspend')) {
                handleResumeProcess(p);
              } else {
                handleSuspendProcess(p);
              }
            }}
            className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-surface-800 flex items-center gap-2"
          >
            {(contextMenu.process?.status || '').toLowerCase().includes('suspend') ? (
              <>
                <PlayCircle className="w-4 h-4 text-emerald-500" />
                Resume Process
              </>
            ) : (
              <>
                <PauseCircle className="w-4 h-4 text-amber-500" />
                Suspend Process
              </>
            )}
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

          <button
            type="button"
            onClick={() => {
              handleCopyDetails(contextMenu.process);
              setContextMenu(null);
            }}
            className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-surface-800 flex items-center gap-2"
          >
            <Copy className="w-4 h-4 text-slate-500" />
            Copy Details
          </button>

          <button
            type="button"
            onClick={() => {
              handleOpenProperties(contextMenu.process);
              setContextMenu(null);
            }}
            className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-surface-800 flex items-center gap-2 font-medium"
          >
            <Info className="w-4 h-4 text-brand-500" />
            Properties
          </button>
        </div>
      )}

      {/* 6. End Task Confirmation Modal */}
      <Modal
        isOpen={endTaskModal}
        onClose={() => setEndTaskModal(false)}
        title="Confirm Process Termination"
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEndTaskModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={XCircle}
              onClick={handleConfirmEndTask}
            >
              End Process
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-slate-700 dark:text-slate-300">
            Do you want to end{' '}
            <strong className="text-slate-900 dark:text-white font-mono">
              {selectedProcess?.name}
            </strong>{' '}
            (PID: <span className="font-mono">{selectedProcess?.pid}</span>)?
          </p>

          {selectedProcess?.is_critical && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-bold">Protected Windows Component</span>
                <p>
                  This is a critical Windows system process. If terminated,
                  Windows may restart or crash immediately, resulting in data loss.
                </p>
              </div>
            </div>
          )}

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Memory Working Set:</span>
              <span>{formatBytes(selectedProcess?.memory_bytes || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Current CPU:</span>
              <span>{(Number(selectedProcess?.cpu_usage) || 0).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Executable:</span>
              <span className="truncate max-w-[240px]">
                {selectedProcess?.exe_path || 'Unavailable'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Terminating a process can cause unsaved changes to be lost. The process identity will be revalidated prior to termination to guard against PID reuse.
          </p>
        </div>
      </Modal>

      {/* 7. End Process Tree Modal */}
      <Modal
        isOpen={endTreeModal}
        onClose={() => setEndTreeModal(false)}
        title="Confirm Process Tree Termination"
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEndTreeModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={GitFork}
              onClick={handleConfirmEndTree}
            >
              End Process Tree
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-slate-700 dark:text-slate-300">
            Do you want to end the process tree for{' '}
            <strong className="text-slate-900 dark:text-white font-mono">
              {selectedProcess?.name}
            </strong>{' '}
            (PID: <span className="font-mono">{selectedProcess?.pid}</span>)?
          </p>

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
            <div>
              Ending a process tree closes this application and all child processes
              spawned by it. Any child process with unsaved state will be terminated immediately.
            </div>
          </div>
        </div>
      </Modal>

      {/* 8. Properties Modal */}
      <Modal
        isOpen={propertiesModal}
        onClose={() => setPropertiesModal(false)}
        title={`Process Properties: ${propertiesData?.name || selectedProcess?.name}`}
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="secondary"
              size="sm"
              icon={FolderOpen}
              disabled={!propertiesData?.exe_path}
              onClick={() => handleOpenFileLocation(propertiesData)}
            >
              Open Location
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={Copy}
                onClick={() => handleCopyDetails(propertiesData)}
              >
                Copy Details
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setPropertiesModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        }
      >
        {propertiesLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-600" />
            <span className="text-xs text-slate-500">Querying process metadata...</span>
          </div>
        ) : propertiesData ? (
          <div className="space-y-4">
            {/* General Section */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-brand-600" />
                General Information
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500 font-sans">Name: </span>
                  <span className="text-slate-900 dark:text-slate-100 font-bold">
                    {propertiesData.name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-sans">PID: </span>
                  <span>{propertiesData.pid}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-sans">Parent PID: </span>
                  <span>
                    {propertiesData.parent_pid != null
                      ? propertiesData.parent_pid
                      : 'Unavailable'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-sans">Category: </span>
                  <span className="capitalize">{propertiesData.category}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-sans">Status: </span>
                  <span className="capitalize">{propertiesData.status}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-sans">Scheduling: </span>
                  <span>{propertiesData.priority}</span>
                </div>
              </div>
            </div>

            {/* Performance & Threads */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-brand-600" />
                Performance & Threads
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500 font-sans">CPU Usage: </span>
                  <span className="font-bold text-brand-600">
                    {(Number(propertiesData.cpu_usage) || 0).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-sans">Active Threads: </span>
                  <span>
                    {propertiesData.thread_count != null
                      ? propertiesData.thread_count
                      : 'Unavailable'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-sans">Memory (Working Set): </span>
                  <span>{formatBytes(propertiesData.memory_bytes || 0)}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-sans">Virtual Memory: </span>
                  <span>{formatBytes(propertiesData.virtual_memory_bytes || 0)}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-sans">Disk Read: </span>
                  <span>{formatBytes(propertiesData.disk_read_bytes || 0)}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-sans">Disk Written: </span>
                  <span>{formatBytes(propertiesData.disk_written_bytes || 0)}</span>
                </div>
              </div>
            </div>

            {/* Executable Path & Command Line */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-brand-600" />
                Binary Path & Arguments
              </h4>
              <div className="space-y-1.5 text-[11px]">
                <div>
                  <span className="text-slate-500">Executable Location:</span>
                  <div className="p-2 rounded bg-white dark:bg-surface-800 border border-slate-200 dark:border-slate-700/80 font-mono break-all text-slate-800 dark:text-slate-200 mt-0.5">
                    {propertiesData.exe_path || 'Unavailable (System Protected)'}
                  </div>
                </div>

                {propertiesData.command_line && (
                  <div>
                    <span className="text-slate-500">Command Line:</span>
                    <div className="p-2 rounded bg-white dark:bg-surface-800 border border-slate-200 dark:border-slate-700/80 font-mono break-all text-slate-800 dark:text-slate-200 mt-0.5 max-h-24 overflow-y-auto">
                      {propertiesData.command_line}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* 9. Priority Selector Modal */}
      <Modal
        isOpen={priorityModal}
        onClose={() => setPriorityModal(false)}
        title={`Set Priority: ${selectedProcess?.name}`}
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPriorityModal(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleApplyPriority}>
              Apply Priority
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Changing process priority allocates more or fewer CPU scheduling cycles. Setting priority to High gives precedence over background applications.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {['Low', 'Below Normal', 'Normal', 'Above Normal', 'High'].map(
              (prio) => (
                <button
                  key={prio}
                  type="button"
                  onClick={() => setSelectedPriority(prio)}
                  className={`p-2.5 rounded-lg border text-xs font-semibold transition ${
                    selectedPriority === prio
                      ? 'bg-brand-600 text-white border-brand-500 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 dark:bg-surface-900 dark:text-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                  }`}
                >
                  {prio}
                </button>
              )
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
export default Processes;

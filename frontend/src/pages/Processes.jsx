import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { api } from '../services/tauriApi';
import { formatBytes } from '../utils/formatters';
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
} from 'lucide-react';

export function Processes() {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('memory_bytes');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [priorityModal, setPriorityModal] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState('Normal');
  const [statusMessage, setStatusMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const isFetchingRef = React.useRef(false);

  const fetchProcesses = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const list = await api.getProcesses();
      setProcesses(list || []);
    } catch (err) {
      console.error(err);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
    const timer = setInterval(fetchProcesses, 2500);
    return () => clearInterval(timer);
  }, []);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
    setCurrentPage(1);
  };

  const filteredProcesses = useMemo(() => {
    return processes
      .filter((p) => {
        const query = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          p.pid.toString().includes(query) ||
          p.exe_path.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (typeof valA === 'string') {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortAsc ? valA - valB : valB - valA;
      });
  }, [processes, search, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredProcesses.length / pageSize));
  const paginatedProcesses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProcesses.slice(start, start + pageSize);
  }, [filteredProcesses, currentPage, pageSize]);

  // Reset page to 1 if search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const handleTerminate = async (pid, isCritical) => {
    if (isCritical) {
      if (!window.confirm('Warning: This is an essential Windows system application. Ending it may cause Windows to restart. Do you want to continue?')) {
        return;
      }
    }
    try {
      await api.terminateProcess(pid);
      setStatusMessage(`Ended process (ID: ${pid})`);
      fetchProcesses();
    } catch (err) {
      setStatusMessage(`Unable to end process: ${err.message || err}`);
    }
  };

  const handleSetPriority = async () => {
    if (!selectedProcess) return;
    try {
      await api.setProcessPriority(selectedProcess.pid, selectedPriority);
      setStatusMessage(`Set priority to ${selectedPriority} for ${selectedProcess.name}`);
      setPriorityModal(false);
      fetchProcesses();
    } catch (err) {
      setStatusMessage(`Unable to change priority: ${err.message || err}`);
    }
  };

  const handleSuspend = async (pid) => {
    try {
      await api.suspendProcess(pid);
      setStatusMessage(`Paused process (ID: ${pid})`);
      fetchProcesses();
    } catch (err) {
      setStatusMessage(`Unable to pause process: ${err.message || err}`);
    }
  };

  const handleResume = async (pid) => {
    try {
      await api.resumeProcess(pid);
      setStatusMessage(`Resumed process (ID: ${pid})`);
      fetchProcesses();
    } catch (err) {
      setStatusMessage(`Unable to resume process: ${err.message || err}`);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search applications, process ID, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-surface-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Badge variant="brand" size="md">
            {filteredProcesses.length} Running Applications
          </Badge>
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={fetchProcesses}>
            Refresh
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-2.5 rounded-lg bg-brand-50 dark:bg-surface-900 border border-brand-200 dark:border-brand-500/30 text-xs text-brand-700 dark:text-brand-300 flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">✕</button>
        </div>
      )}

      {/* Process Table Card */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-100/95 dark:bg-surface-950/95 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 select-none z-10">
              <tr>
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition"
                >
                  <div className="flex items-center gap-1">
                    Application Name
                    {sortField === 'name' && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('pid')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition"
                >
                  <div className="flex items-center gap-1">
                    Process ID
                    {sortField === 'pid' && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('cpu_usage')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition"
                >
                  <div className="flex items-center gap-1">
                    CPU %
                    {sortField === 'cpu_usage' && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('memory_bytes')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition"
                >
                  <div className="flex items-center gap-1">
                    Working Set (RAM)
                    {sortField === 'memory_bytes' && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  </div>
                </th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 font-mono">
              {paginatedProcesses.map((p) => (
                <tr
                  key={p.pid}
                  className="hover:bg-slate-50 dark:hover:bg-surface-800/40 transition group text-slate-700 dark:text-slate-300"
                >
                  <td className="py-2.5 px-4 font-sans font-medium text-slate-900 dark:text-slate-200">
                    <div className="flex items-center gap-2">
                      {p.is_critical && (
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0" title="System Process" />
                      )}
                      <span className="truncate max-w-xs">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">{p.pid}</td>
                  <td className="py-2.5 px-4">
                    <span className={p.cpu_usage > 5 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                      {p.cpu_usage.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-900 dark:text-slate-200">{formatBytes(p.memory_bytes)}</td>
                  <td className="py-2.5 px-4">
                    <Badge variant="neutral" size="xs">
                      {p.priority}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition">
                      <button
                        onClick={() => {
                          setSelectedProcess(p);
                          setSelectedPriority(p.priority);
                          setPriorityModal(true);
                        }}
                        title="Change Priority"
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleSuspend(p.pid)}
                        title="Suspend"
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-amber-600 dark:text-amber-400"
                      >
                        <PauseCircle className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleResume(p.pid)}
                        title="Resume"
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-emerald-600 dark:text-emerald-400"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleTerminate(p.pid, p.is_critical)}
                        title="End Task"
                        className="p-1 rounded bg-slate-100 hover:bg-red-500 hover:text-white dark:bg-surface-800 dark:hover:bg-red-600/80 text-rose-600 dark:text-rose-400 dark:hover:text-white transition"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 bg-slate-50 dark:bg-surface-900/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Showing {Math.min((currentPage - 1) * pageSize + 1, filteredProcesses.length)} to{' '}
              {Math.min(currentPage * pageSize, filteredProcesses.length)} of {filteredProcesses.length} processes
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Priority Modal */}
      <Modal
        isOpen={priorityModal}
        onClose={() => setPriorityModal(false)}
        title={`Set Priority: ${selectedProcess?.name}`}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setPriorityModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSetPriority}>
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
            {['Low', 'Below Normal', 'Normal', 'Above Normal', 'High'].map((prio) => (
              <button
                key={prio}
                onClick={() => setSelectedPriority(prio)}
                className={`p-2.5 rounded-lg border text-xs font-semibold transition ${
                  selectedPriority === prio
                    ? 'bg-brand-600 text-white border-brand-500'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 dark:bg-surface-900 dark:text-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                }`}
              >
                {prio}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}

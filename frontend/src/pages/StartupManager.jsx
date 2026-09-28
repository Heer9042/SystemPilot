import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Toggle } from '../components/ui/Toggle';
import { Modal } from '../components/ui/Modal';
import { api } from '../services/tauriApi';
import { formatBytes } from '../utils/formatters';
import {
  Rocket,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  Info,
  AlertCircle,
  Search,
  CheckCircle2,
  Folder,
  FileCode,
  SlidersHorizontal,
  RotateCcw,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  History,
  FileX,
  ExternalLink,
} from 'lucide-react';

function StartupSourceBadge({ sourceType }) {
  const labels = {
    hkcu_run: { label: 'User Registry', color: 'brand' },
    hklm_run: { label: 'System Registry', color: 'neutral' },
    wow64_run: { label: '32-bit Registry', color: 'neutral' },
    startup_folder_user: { label: 'User Folder', color: 'success' },
    startup_folder_common: { label: 'Common Folder', color: 'neutral' },
  };
  const info = labels[sourceType] || { label: sourceType || 'Unknown', color: 'neutral' };
  return <Badge variant={info.color} size="xs">{info.label}</Badge>;
}

function StartupMetricsCards({ totalCount, enabledCount, highImpactCount, missingCount }) {
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="p-4 space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Configured</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">{totalCount}</span>
            <span className="text-xs text-slate-400">Items</span>
          </div>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Enabled on Boot</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{enabledCount}</span>
            <span className="text-xs text-slate-400">Active</span>
          </div>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">High Boot Impact</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">{highImpactCount}</span>
            <span className="text-xs text-slate-400">Heavier</span>
          </div>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Missing Target</span>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono ${missingCount > 0 ? 'text-red-500' : 'text-slate-400'}`}>
              {missingCount}
            </span>
            <span className="text-xs text-slate-400">Invalid</span>
          </div>
        </Card>
      </div>

      {missingCount > 0 && (
        <Card className="p-3.5 border border-red-500/40 bg-red-500/5">
          <div className="flex items-start gap-3">
            <FileX className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <span className="font-bold text-slate-900 dark:text-slate-100">
                Invalid Startup Targets Detected ({missingCount})
              </span>
              <p className="text-slate-600 dark:text-slate-300">
                One or more configured startup entries point to executable files that no longer exist on disk. These entries prolong boot time without executing any application.
              </p>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}

function StartupFilterBar({
  searchQuery,
  setSearchQuery,
  filterMode,
  setFilterMode,
  sortBy,
  setSortBy,
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div className="relative flex-1 max-w-md">
        <label htmlFor="startup-item-search" className="sr-only">
          Search startup applications
        </label>
        <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
        <input
          id="startup-item-search"
          type="text"
          aria-label="Search by application name, publisher, or path"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by application name, publisher, or path..."
          className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center bg-slate-100 dark:bg-surface-800 p-0.5 rounded-xl text-xs">
          {['ALL', 'ENABLED', 'DISABLED', 'HIGH_IMPACT', 'USER', 'SYSTEM'].map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-2 py-1 rounded-lg font-medium transition-all ${
                filterMode === mode
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {mode === 'ALL'
                ? 'All'
                : mode === 'ENABLED'
                ? 'Enabled'
                : mode === 'DISABLED'
                ? 'Disabled'
                : mode === 'HIGH_IMPACT'
                ? 'High Impact'
                : mode === 'USER'
                ? 'User'
                : 'System'}
            </button>
          ))}
        </div>

        <select
          aria-label="Sort startup items by"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="text-xs rounded-xl bg-slate-100 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-slate-800 dark:text-slate-200 cursor-pointer"
        >
          <option value="name">Sort by Name</option>
          <option value="impact">Sort by Impact</option>
          <option value="status">Sort by Status</option>
          <option value="location">Sort by Location</option>
        </select>
      </div>
    </div>
  );
}

function StartupItemTable({ filteredItems, onSelectItem, onToggleRequest }) {
  return (
    <Card className="p-4 space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
              <th className="py-2 font-medium">Application</th>
              <th className="py-2 font-medium">Location</th>
              <th className="py-2 font-medium text-center">Impact</th>
              <th className="py-2 font-medium text-center">Target</th>
              <th className="py-2 font-medium text-right">Startup Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <tr
                  key={item.id}
                  tabIndex={0}
                  onClick={() => onSelectItem(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectItem(item);
                    }
                  }}
                  className="hover:bg-slate-50 dark:hover:bg-surface-800/50 cursor-pointer transition-colors focus:outline-none focus:bg-slate-100 dark:focus:bg-surface-800/70"
                >
                  <td className="py-2.5 max-w-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 truncate block">
                        {item.name}
                      </span>
                      {item.is_important_system_component && (
                        <Badge variant="neutral" size="xs" title="Critical driver or system component">
                          Core
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 block truncate font-mono">
                      {item.publisher}
                    </span>
                  </td>

                  <td className="py-2.5">
                    <StartupSourceBadge sourceType={item.source_type} />
                  </td>

                  <td className="py-2.5 text-center">
                    <Badge
                      variant={
                        item.startup_impact === 'High'
                          ? 'danger'
                          : item.startup_impact === 'Medium'
                          ? 'warning'
                          : 'neutral'
                      }
                      size="xs"
                    >
                      {item.startup_impact}
                    </Badge>
                  </td>

                  <td className="py-2.5 text-center">
                    {item.target_exists ? (
                      <Badge variant="success" size="xs">
                        Valid
                      </Badge>
                    ) : (
                      <Badge variant="danger" size="xs">
                        Missing
                      </Badge>
                    )}
                  </td>

                  <td className="py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <Toggle
                        checked={item.enabled}
                        onChange={() => onToggleRequest(item)}
                        disabled={!item.can_toggle}
                        size="sm"
                      />
                      <span className={`text-[11px] font-mono ${item.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {item.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                  No startup entries matching current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function StartupItemDetailsModal({ selectedItem, onClose, onToggleRequest }) {
  return (
    <Modal
      isOpen={Boolean(selectedItem)}
      onClose={onClose}
      title={`Startup Item Details: ${selectedItem?.name}`}
    >
      {selectedItem && (
        <div className="space-y-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex justify-between font-sans">
              <span className="text-slate-400">Application Name:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{selectedItem.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Configured Location:</span>
              <span className="text-slate-300">{selectedItem.location}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Publisher:</span>
              <span className="text-slate-300">{selectedItem.publisher}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Target File Exists:</span>
              <span className={selectedItem.target_exists ? 'text-emerald-400' : 'text-red-400'}>
                {selectedItem.target_exists ? 'Verified on Disk' : 'Missing File'}
              </span>
            </div>
            {selectedItem.file_size_bytes && (
              <div className="flex justify-between">
                <span className="text-slate-400">File Size:</span>
                <span className="text-slate-300">{formatBytes(selectedItem.file_size_bytes)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Boot Impact:</span>
              <span className="text-slate-300">{selectedItem.startup_impact}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Elevation Requirement:</span>
              <span className="text-slate-300">
                {selectedItem.can_toggle ? 'User Space (No Admin Required)' : 'System Wide (Admin Required)'}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="font-sans font-semibold text-slate-700 dark:text-slate-300 block">
              Command Line Argument:
            </span>
            <div className="p-2.5 rounded-lg bg-slate-900 text-slate-300 break-all select-all">
              {selectedItem.command}
            </div>
          </div>

          {selectedItem.is_important_system_component && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                This item is classified as an important hardware or system utility. Disabling it may impair drivers, audio hotkeys, or security telemetry.
              </span>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
            {selectedItem.can_toggle && (
              <Button
                variant={selectedItem.enabled ? 'danger' : 'primary'}
                size="sm"
                onClick={() => {
                  onToggleRequest(selectedItem);
                  onClose();
                }}
              >
                {selectedItem.enabled ? 'Disable Startup' : 'Enable Startup'}
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function SafeToggleModal({ pendingToggle, onClose, onConfirm }) {
  return (
    <Modal
      isOpen={Boolean(pendingToggle)}
      onClose={onClose}
      title="Confirm Startup Modification"
    >
      {pendingToggle && (
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Are you sure you want to {pendingToggle.enabled ? 'disable' : 'enable'} <strong>{pendingToggle.name}</strong> from starting automatically with Windows?
          </p>

          {pendingToggle.is_important_system_component && pendingToggle.enabled && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> {pendingToggle.name} appears to be associated with hardware drivers or security software. Disabling it may cause peripherals or protection to become inactive until launched manually.
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant={pendingToggle.enabled ? 'danger' : 'primary'}
              size="sm"
              onClick={onConfirm}
            >
              Confirm {pendingToggle.enabled ? 'Disable' : 'Enable'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function StartupAuditLogDrawer({ history, onClose, onRestoreItem }) {
  return (
    <Card className="p-4 space-y-3 border-brand-500/30">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-brand-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            SystemPilot Startup Audit Log
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-200"
        >
          ✕ Close
        </button>
      </div>

      {history.length > 0 ? (
        <div className="space-y-2 max-h-60 overflow-y-auto font-mono text-xs">
          {history.map((entry) => (
            <div
              key={entry.id ?? `${entry.item_id}-${entry.timestamp_ms}-${entry.action}`}
              className="p-2.5 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
            >
              <div className="space-y-0.5 truncate">
                <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate">
                  {entry.item_name}
                </span>
                <span className="text-[11px] text-slate-400">
                  {new Date(entry.timestamp_ms).toLocaleString()} • Action: {entry.action}
                </span>
              </div>
              {entry.action === 'Disabled' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onRestoreItem(entry.item_id)}
                  icon={RotateCcw}
                >
                  Restore
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic py-2">
          No modifications have been made to startup items yet.
        </p>
      )}
    </Card>
  );
}

export function StartupManager() {
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'ENABLED' | 'DISABLED' | 'HIGH_IMPACT' | 'USER' | 'SYSTEM'
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'impact' | 'status' | 'location'

  // Modals & Inspection
  const [selectedItem, setSelectedItem] = useState(null);
  const [pendingToggle, setPendingToggle] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  const showToast = (msg, isError = false) => {
    setToastMsg({ msg, isError });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchStartupData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, auditLog] = await Promise.all([
        api.getStartupItems(),
        api.getStartupChangeHistory(),
      ]);
      setItems(list || []);
      setHistory(auditLog || []);
    } catch (e) {
      console.error('Startup items fetch failed:', e);
      setError('Unable to retrieve startup entries. Some entries may require administrator privileges.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStartupData();
  }, [fetchStartupData]);

  // Handle toggle click
  const handleToggleRequest = (item) => {
    if (!item.can_toggle) {
      showToast(
        `"${item.name}" is a system-wide startup entry and requires administrator privileges to modify.`,
        true
      );
      return;
    }
    setPendingToggle(item);
  };

  // Confirm safe toggle
  const confirmToggle = async () => {
    if (!pendingToggle) return;
    const item = pendingToggle;
    setPendingToggle(null);
    const newEnabled = !item.enabled;

    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, enabled: newEnabled } : i))
    );

    try {
      const result = await api.toggleStartupItem(item.id, newEnabled);
      showToast(result || `"${item.name}" ${newEnabled ? 'enabled' : 'disabled'} successfully.`);
      // Refresh audit history
      const updatedLog = await api.getStartupChangeHistory();
      setHistory(updatedLog || []);
    } catch (e) {
      // Revert optimistic update
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, enabled: item.enabled } : i))
      );
      const errMsg = typeof e === 'string' ? e : (e?.message || 'Failed to modify startup entry.');
      showToast(errMsg, true);
    }
  };

  // Restore an item from history
  const handleRestoreItem = async (itemId) => {
    try {
      const res = await api.restoreStartupItem(itemId);
      showToast(res || 'Startup entry restored successfully.');
      fetchStartupData();
    } catch (e) {
      showToast(e?.message || 'Failed to restore startup item.', true);
    }
  };

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    let list = items.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.publisher.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.command.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (filterMode === 'ENABLED') return item.enabled;
      if (filterMode === 'DISABLED') return !item.enabled;
      if (filterMode === 'HIGH_IMPACT') return item.startup_impact === 'High';
      if (filterMode === 'USER') return item.source_type.includes('hkcu') || item.source_type.includes('user');
      if (filterMode === 'SYSTEM') return !item.can_toggle;

      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'impact') {
        const rank = { High: 3, Medium: 2, Low: 1, Unknown: 0 };
        return (rank[b.startup_impact] || 0) - (rank[a.startup_impact] || 0);
      }
      if (sortBy === 'status') {
        return (b.enabled ? 1 : 0) - (a.enabled ? 1 : 0);
      }
      if (sortBy === 'location') {
        return a.location.localeCompare(b.location);
      }
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [items, searchQuery, filterMode, sortBy]);

  // Metrics summary
  const totalCount = items.length;
  const enabledCount = items.filter((i) => i.enabled).length;
  const disabledCount = totalCount - enabledCount;
  const missingCount = items.filter((i) => !i.target_exists).length;
  const highImpactCount = items.filter((i) => i.startup_impact === 'High').length;

  // Export report
  const handleExportReport = () => {
    const blob = new Blob([JSON.stringify({ timestamp: new Date().toISOString(), items, history }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `systempilot-startup-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySummary = async () => {
    try {
      const summary = {
        total: totalCount,
        enabled: enabledCount,
        disabled: disabledCount,
        missing_targets: missingCount,
        items: items.map((i) => ({
          name: i.name,
          location: i.location,
          enabled: i.enabled,
          impact: i.startup_impact,
          target_exists: i.target_exists,
        })),
      };
      await navigator.clipboard.writeText(JSON.stringify(summary, null, 2));
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn text-slate-900 dark:text-slate-100">
      {/* 1. HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Windows Startup Management Center
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Inspect startup applications, verify digital signatures, audit impact & safely disable items
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleCopySummary} icon={copiedNotice ? Check : Copy}>
            {copiedNotice ? 'Copied' : 'Copy'}
          </Button>

          <Button variant="secondary" size="sm" onClick={handleExportReport} icon={Download}>
            Export
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            icon={History}
          >
            Audit History ({history.length})
          </Button>

          <Button variant="secondary" size="sm" onClick={fetchStartupData} disabled={loading} icon={RefreshCw} />
        </div>
      </div>

      {/* Toast message */}
      {toastMsg && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
            toastMsg.isError
              ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-500/30 dark:text-red-300'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-500/30 dark:text-emerald-300'
          }`}
        >
          <span>{toastMsg.msg}</span>
          <button type="button" aria-label="Dismiss notification" onClick={() => setToastMsg(null)}>✕</button>
        </div>
      )}

      {/* 2. OVERVIEW METRICS CARDS & ALERTS */}
      <StartupMetricsCards
        totalCount={totalCount}
        enabledCount={enabledCount}
        highImpactCount={highImpactCount}
        missingCount={missingCount}
      />

      {/* 3. SEARCH, FILTER & SORT BAR */}
      <StartupFilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterMode={filterMode}
        setFilterMode={setFilterMode}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      {/* 4. STARTUP ITEM TABLE */}
      <StartupItemTable
        filteredItems={filteredItems}
        onSelectItem={setSelectedItem}
        onToggleRequest={handleToggleRequest}
      />

      {/* 5. SELECTED ITEM DETAILS MODAL */}
      <StartupItemDetailsModal
        selectedItem={selectedItem}
        onClose={() => setSelectedItem(null)}
        onToggleRequest={handleToggleRequest}
      />

      {/* 6. SAFE TOGGLE CONFIRMATION MODAL */}
      <SafeToggleModal
        pendingToggle={pendingToggle}
        onClose={() => setPendingToggle(null)}
        onConfirm={confirmToggle}
      />

      {/* 7. AUDIT HISTORY & RESTORE DRAWER */}
      {showHistoryDrawer && (
        <StartupAuditLogDrawer
          history={history}
          onClose={() => setShowHistoryDrawer(false)}
          onRestoreItem={handleRestoreItem}
        />
      )}
    </div>
  );
}
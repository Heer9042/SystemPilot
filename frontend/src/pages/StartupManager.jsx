import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Toggle } from '../components/ui/Toggle';
import { Modal } from '../components/ui/Modal';
import { api } from '../services/tauriApi';
import { Rocket, RefreshCw, AlertTriangle, ShieldAlert, Info, AlertCircle } from 'lucide-react';

function StartupSourceBadge({ sourceType }) {
  const labels = {
    hkcu_run: { label: 'User Registry', color: 'brand' },
    hklm_run: { label: 'System Registry', color: 'neutral' },
    wow64_run: { label: '32-bit Registry', color: 'neutral' },
    startup_folder: { label: 'Startup Folder', color: 'success' },
  };
  const info = labels[sourceType] || { label: sourceType || 'Unknown', color: 'neutral' };
  return <Badge variant={info.color} size="xs">{info.label}</Badge>;
}

export function StartupManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingToggle, setPendingToggle] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg, isError = false) => {
    setToastMsg({ msg, isError });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.getStartupItems();
      setItems(list || []);
    } catch (e) {
      console.error('Startup items fetch failed:', e);
      setError('Unable to retrieve startup entries. Some entries may require administrator privileges to read.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleToggleRequest = (item) => {
    if (!item.can_toggle) {
      // Show informational message — never silently fail
      showToast(
        `"${item.name}" is a system-wide startup entry and requires administrator privileges to modify.`,
        true
      );
      return;
    }
    // Show confirmation before modifying
    setPendingToggle(item);
  };

  const confirmToggle = async () => {
    if (!pendingToggle) return;
    const item = pendingToggle;
    setPendingToggle(null);
    const newEnabled = !item.enabled;

    // Optimistically update UI
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, enabled: newEnabled } : i))
    );

    try {
      const result = await api.toggleStartupItem(item.id, newEnabled);
      showToast(result || `"${item.name}" ${newEnabled ? 'enabled' : 'disabled'} successfully.`);
    } catch (e) {
      // Revert optimistic update on error
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, enabled: item.enabled } : i))
      );
      const errMsg = typeof e === 'string' ? e : (e?.message || 'Failed to modify startup entry.');
      showToast(errMsg, true);
    }
  };

  const cancelToggle = () => setPendingToggle(null);

  const enabledCount = items.filter((i) => i.enabled).length;
  const systemCount = items.filter((i) => !i.can_toggle).length;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Rocket className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            Windows Startup Applications
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Applications configured to start automatically when you sign in to Windows
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && items.length > 0 && (
            <Badge variant="brand" size="md">
              {enabledCount} of {items.length} Enabled
            </Badge>
          )}
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={fetchItems} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Toast */}
      <StartupToast toastMsg={toastMsg} />

      {/* Confirmation Modal */}
      <StartupConfirmModal
        pendingToggle={pendingToggle}
        onCancel={cancelToggle}
        onConfirm={confirmToggle}
      />

      {/* Main Content */}
      <StartupContent
        loading={loading}
        error={error}
        items={items}
        systemCount={systemCount}
        onToggleRequest={handleToggleRequest}
      />
    </div>
  );
}

function StartupToast({ toastMsg }) {
  if (!toastMsg) return null;
  return (
    <div
      className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${
        toastMsg.isError
          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200'
          : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
      }`}
    >
      {toastMsg.isError ? (
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      ) : (
        <Rocket className="w-4 h-4 flex-shrink-0 mt-0.5" />
      )}
      <span>{toastMsg.msg}</span>
    </div>
  );
}

function StartupConfirmModal({ pendingToggle, onCancel, onConfirm }) {
  if (!pendingToggle) return null;
  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={pendingToggle.enabled ? 'Disable Startup Entry' : 'Enable Startup Entry'}
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{pendingToggle.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">{pendingToggle.command}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Location: {pendingToggle.location}</p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {pendingToggle.enabled
            ? `This will prevent "${pendingToggle.name}" from starting automatically when you sign in. You can re-enable it at any time.`
            : `This will allow "${pendingToggle.name}" to start automatically when you sign in.`}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={onConfirm}>
            {pendingToggle.enabled ? 'Disable Entry' : 'Enable Entry'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function StartupContent({ loading, error, items, systemCount, onToggleRequest }) {
  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Reading startup entries...
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Startup information partially unavailable</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center space-y-2">
        <Rocket className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No startup entries found</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          No applications are configured to start automatically on this system.
        </p>
      </Card>
    );
  }

  return (
    <>
      {systemCount > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-500/20 text-xs text-blue-700 dark:text-blue-300">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
          <span>
            <strong>{systemCount} system-wide</strong> startup {systemCount === 1 ? 'entry' : 'entries'} from HKLM registry
            {systemCount === 1 ? ' requires' : ' require'} administrator privileges to modify and cannot be toggled here.
          </span>
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
          {items.map((item) => (
            <div
              key={item.id}
              className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                item.enabled
                  ? 'hover:bg-slate-50 dark:hover:bg-surface-800/30'
                  : 'bg-slate-50/50 dark:bg-surface-900/30 opacity-75'
              }`}
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">{item.name}</h3>
                  <StartupSourceBadge sourceType={item.source_type} />
                  {!item.can_toggle && (
                    <Badge variant="neutral" size="xs" className="flex items-center gap-1">
                      <ShieldAlert className="w-2.5 h-2.5" />
                      Admin required
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono text-[11px] truncate max-w-xl">
                  {item.command}
                </p>
                <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
                  <span>Location: {item.location}</span>
                  <span>{item.publisher}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                <span
                  className={`text-xs font-medium ${
                    item.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {item.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <Toggle
                  enabled={item.enabled}
                  onChange={() => onToggleRequest(item)}
                  disabled={!item.can_toggle}
                  title={item.can_toggle ? undefined : 'Requires administrator privileges'}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
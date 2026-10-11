import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { api } from '../services/tauriApi';
import {
  SlidersHorizontal,
  FolderCog,
  ShieldCheck,
  ShieldAlert,
  Users,
  HardDrive,
  Cpu,
  Activity,
  Layers,
  Settings,
  RefreshCw,
  ExternalLink,
  Search,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Zap,
  RotateCcw,
  Clock,
  Terminal,
  FileText,
  HelpCircle,
  Play,
  Filter,
} from 'lucide-react';

const SYSTEM_CONTROL_TOOLS = [
  { id: 'control', title: 'Windows Control Panel', desc: 'Classic Windows configuration applet hub', tool: 'control' },
  { id: 'appwiz.cpl', title: 'Programs and Features', desc: 'Uninstall or repair installed applications', tool: 'appwiz.cpl' },
  { id: 'devmgmt.msc', title: 'Device Manager', desc: 'Inspect driver status, hardware IDs & peripherals', tool: 'devmgmt.msc' },
  { id: 'compmgmt.msc', title: 'Computer Management', desc: 'Storage volumes, event logs, services console', tool: 'compmgmt.msc' },
  { id: 'diskmgmt.msc', title: 'Disk Management', desc: 'Partition formatting, drive letters, volume sizing', tool: 'diskmgmt.msc' },
  { id: 'ncpa.cpl', title: 'Network Connections', desc: 'Manage Ethernet, Wi-Fi adapters & IP configuration', tool: 'ncpa.cpl' },
  { id: 'powercfg.cpl', title: 'Power Options', desc: 'Windows power schemes and sleep timeout rules', tool: 'powercfg.cpl' },
  { id: 'mmsys.cpl', title: 'Sound Settings', desc: 'Manage playback, recording audio devices & levels', tool: 'mmsys.cpl' },
  { id: 'sysdm.cpl', title: 'System Properties', desc: 'Computer name, workgroup, environment variables', tool: 'sysdm.cpl' },
  { id: 'services.msc', title: 'Services Console', desc: 'Start, stop, and configure Windows background services', tool: 'services.msc' },
  { id: 'eventvwr.msc', title: 'Event Viewer', desc: 'System, application, security & audit logs', tool: 'eventvwr.msc' },
  { id: 'taskschd.msc', title: 'Task Scheduler', desc: 'Manage scheduled maintenance and system automation', tool: 'taskschd.msc' },
  { id: 'ms-settings:windowsupdate', title: 'Windows Update Settings', desc: 'Search for official OS quality and security patches', tool: 'ms-settings:windowsupdate' },
  { id: 'ms-settings:recovery', title: 'Windows Recovery', desc: 'Reset this PC, advanced startup options', tool: 'ms-settings:recovery' },
  { id: 'lusrmgr.msc', title: 'Local Users and Groups', desc: 'Manage accounts (Pro/Enterprise editions only)', tool: 'lusrmgr.msc' },
];

function ControlPanelToolsTab({ onLaunchTool }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {SYSTEM_CONTROL_TOOLS.map((item) => (
          <Card key={item.id} hover className="p-4 flex flex-col justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-800 dark:text-slate-100">{item.title}</span>
                <Badge variant="neutral" size="xs">{item.tool}</Badge>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</p>
            </div>
            <Button
              variant="secondary"
              size="xs"
              icon={ExternalLink}
              onClick={() => onLaunchTool(item.tool, item.title)}
              className="w-full justify-center"
            >
              Open in Windows
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function WindowsServicesTab({
  filteredServices,
  serviceSearch,
  setServiceSearch,
  serviceFilter,
  setServiceFilter,
  loading,
  onLaunchTool,
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2 justify-between items-center">
        <div className="relative w-full sm:w-72">
          <label htmlFor="service-search-input" className="sr-only">
            Search services
          </label>
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            id="service-search-input"
            type="text"
            placeholder="Search services..."
            value={serviceSearch}
            onChange={(e) => setServiceSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-white dark:bg-surface-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-brand-500"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label htmlFor="service-filter-select" className="sr-only">
            Filter by startup type
          </label>
          <select
            id="service-filter-select"
            aria-label="Filter services by startup type"
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-surface-900 border border-slate-200 dark:border-slate-800 focus:outline-none"
          >
            <option value="all">All Startup Types</option>
            <option value="auto">Automatic Only</option>
            <option value="manual">Manual Only</option>
            <option value="disabled">Disabled Only</option>
          </select>
          <Button
            variant="secondary"
            size="xs"
            icon={ExternalLink}
            onClick={() => onLaunchTool('services.msc', 'Services Console')}
          >
            Open MMC
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {filteredServices.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              {loading ? 'Reading Windows Services...' : 'No matching services found.'}
            </div>
          ) : (
            filteredServices.slice(0, 80).map((srv) => (
              <div key={srv.name} className="p-3 hover:bg-slate-50 dark:hover:bg-surface-800/40 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">{srv.display_name}</span>
                    <span className="font-mono text-[10px] text-slate-400">({srv.name})</span>
                  </div>
                  {srv.description && (
                    <p className="text-[11px] text-slate-500 truncate max-w-xl">{srv.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant={
                      srv.startup_type === 'Automatic'
                        ? 'success'
                        : srv.startup_type === 'Manual'
                        ? 'neutral'
                        : 'warning'
                    }
                    size="xs"
                  >
                    {srv.startup_type}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
      <p className="text-[11px] text-slate-400">
        Showing {Math.min(filteredServices.length, 80)} of {filteredServices.length} Windows services. Critical security services are protected against unauthorized modification.
      </p>
    </div>
  );
}

function FirewallProfilesTab({ firewall, onLaunchTool }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-500">Domain Network</span>
            <Badge variant={firewall?.domain_enabled ? 'success' : 'danger'} size="xs">
              {firewall?.domain_enabled ? 'Protected' : 'Off'}
            </Badge>
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {firewall?.domain_enabled ? 'Firewall Active' : 'Protection Disabled'}
          </p>
          <p className="text-[11px] text-slate-400">Applies when connected to a domain controller</p>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-500">Private Network</span>
            <Badge variant={firewall?.private_enabled ? 'success' : 'danger'} size="xs">
              {firewall?.private_enabled ? 'Protected' : 'Off'}
            </Badge>
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {firewall?.private_enabled ? 'Firewall Active' : 'Protection Disabled'}
          </p>
          <p className="text-[11px] text-slate-400">Home or trusted corporate networks</p>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-500">Public Network</span>
            <Badge variant={firewall?.public_enabled ? 'success' : 'danger'} size="xs">
              {firewall?.public_enabled ? 'Protected' : 'Off'}
            </Badge>
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {firewall?.public_enabled ? 'Firewall Active' : 'Protection Disabled'}
          </p>
          <p className="text-[11px] text-slate-400">Cafes, airports, untrusted hotspots</p>
        </Card>
      </div>

      <Card className="p-4 flex items-center justify-between">
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Configure Advanced Rules</h4>
          <p className="text-[11px] text-slate-500">
            Inbound/outbound port blocking, IP filter lists, and application security profiles.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={ExternalLink}
          onClick={() => onLaunchTool('firewall.cpl', 'Windows Firewall')}
        >
          Open Windows Firewall
        </Button>
      </Card>
    </div>
  );
}

function LocalUsersTab({ users, onLaunchTool }) {
  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Local User Accounts</h3>
          <Button
            variant="secondary"
            size="xs"
            icon={ExternalLink}
            onClick={() => onLaunchTool('lusrmgr.msc', 'Local Users & Groups')}
          >
            Open User Accounts
          </Button>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {users.map((u) => (
            <div key={u.username} className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-surface-800 flex items-center justify-center font-bold text-brand-600">
                  {u.username[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{u.username}</span>
                    {u.is_current_user && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-brand-500 text-white font-bold">
                        Current Session
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">{u.account_type}</span>
                </div>
              </div>
              <Badge variant={u.status === 'Active' ? 'success' : 'neutral'} size="xs">
                {u.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function EventLogsTab({
  filteredEvents,
  eventFilter,
  setEventFilter,
  loading,
  onLaunchTool,
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Filter Severity:</span>
          {['all', 'Error', 'Warning', 'Information'].map((sev) => (
            <button
              key={sev}
              onClick={() => setEventFilter(sev)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                eventFilter === sev
                  ? 'bg-brand-500 text-white font-bold'
                  : 'bg-slate-100 dark:bg-surface-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {sev === 'all' ? 'All' : sev}
            </button>
          ))}
        </div>
        <Button
          variant="secondary"
          size="xs"
          icon={ExternalLink}
          onClick={() => onLaunchTool('eventvwr.msc', 'Event Viewer')}
        >
          Open Full Event Viewer
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="max-h-[460px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {filteredEvents.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              {loading ? 'Reading System Event Logs...' : 'No events available for this filter.'}
            </div>
          ) : (
            filteredEvents.map((evt) => (
              <div key={evt.id || `${evt.source}-${evt.event_id}-${evt.time_generated}`} className="p-3 hover:bg-slate-50 dark:hover:bg-surface-800/40 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        evt.severity === 'Error'
                          ? 'danger'
                          : evt.severity === 'Warning'
                          ? 'warning'
                          : 'neutral'
                      }
                      size="xs"
                    >
                      {evt.severity}
                    </Badge>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      ID {evt.event_id}: {evt.source}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">{evt.time_generated}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                  {evt.message || 'No description available for this event.'}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function SystemRestoreTab({
  restoreStatus,
  loading,
  onLaunchTool,
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Windows System Restore
            </h3>
            <Badge variant={restoreStatus?.is_enabled ? 'success' : 'neutral'} size="xs">
              {restoreStatus?.is_enabled ? 'Protection Active' : 'Unconfigured'}
            </Badge>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            System Restore creates snapshots of Windows system files, registry settings, and installed drivers. It allows reverting bad updates or configuration changes without touching your personal files.
          </p>
          <div className="pt-2 flex gap-2">
            <Button
              variant="primary"
              size="xs"
              icon={RotateCcw}
              onClick={() => onLaunchTool('rstrui.exe', 'System Restore Wizard')}
            >
              Launch Restore Wizard
            </Button>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Windows File & Image Backup
            </h3>
            <Badge variant="neutral" size="xs">System Tool</Badge>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Create a full machine system image or set up file history backups to an external storage drive or network location.
          </p>
          <div className="pt-2 flex gap-2">
            <Button
              variant="secondary"
              size="xs"
              icon={ExternalLink}
              onClick={() => onLaunchTool('sdclt.exe', 'Backup and Restore')}
            >
              Open Backup Settings
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-4 space-y-3">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Recent Restore Points
        </h4>
        {restoreStatus?.restore_points?.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {restoreStatus.restore_points.map((pt) => (
              <div key={pt.sequence_number} className="py-2.5 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{pt.description}</p>
                  <span className="text-[10px] text-slate-400">{pt.restore_point_type}</span>
                </div>
                <span className="font-mono text-[11px] text-slate-500">{pt.creation_time}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            {loading ? 'Checking restore points...' : 'No previous restore checkpoints recorded on this system.'}
          </p>
        )}
      </Card>
    </div>
  );
}

export function SystemControl() {
  const [activeSubTab, setActiveSubTab] = useState('control-panel'); // 'control-panel' | 'services' | 'firewall' | 'users' | 'events' | 'restore'
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Data states
  const [firewall, setFirewall] = useState(null);
  const [services, setServices] = useState([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all'); // 'all' | 'auto' | 'manual' | 'disabled'
  const [users, setUsers] = useState([]);
  const [eventLogs, setEventLogs] = useState([]);
  const [eventFilter, setEventFilter] = useState('all'); // 'all' | 'Error' | 'Warning' | 'Information'
  const [restoreStatus, setRestoreStatus] = useState(null);

  const showNotification = (msg, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    } else {
      setStatusMessage(msg);
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  const handleLaunchTool = async (toolId, label) => {
    try {
      await api.launchWindowsTool(toolId);
      showNotification(`Launched Windows tool: ${label}`);
    } catch (e) {
      showNotification(`Failed to open ${label}: ${e.message}`, true);
    }
  };

  // Fetch data depending on active tab
  useEffect(() => {
    let mounted = true;
    if (activeSubTab === 'firewall') {
      api.getFirewallStatus().then((d) => {
        if (mounted && d) setFirewall(d);
      }).catch(console.error);
    } else if (activeSubTab === 'services') {
      setLoading(true);
      api.getWindowsServices().then((d) => {
        if (mounted && d) setServices(d);
      }).catch(console.error).finally(() => {
        if (mounted) setLoading(false);
      });
    } else if (activeSubTab === 'users') {
      setLoading(true);
      api.getLocalUsers().then((d) => {
        if (mounted && d) setUsers(d);
      }).catch(console.error).finally(() => {
        if (mounted) setLoading(false);
      });
    } else if (activeSubTab === 'events') {
      setLoading(true);
      api.getSystemEventLogs('System', 30).then((d) => {
        if (mounted && d) setEventLogs(d);
      }).catch(console.error).finally(() => {
        if (mounted) setLoading(false);
      });
    } else if (activeSubTab === 'restore') {
      setLoading(true);
      api.getSystemRestoreStatus().then((d) => {
        if (mounted && d) setRestoreStatus(d);
      }).catch(console.error).finally(() => {
        if (mounted) setLoading(false);
      });
    }
    return () => { mounted = false; };
  }, [activeSubTab]);

  // Filtered services
  const filteredServices = useMemo(() => {
    let list = services;
    if (serviceSearch.trim()) {
      const q = serviceSearch.toLowerCase();
      list = list.filter((s) => s.display_name.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    }
    if (serviceFilter !== 'all') {
      if (serviceFilter === 'auto') list = list.filter((s) => s.startup_type.includes('Auto'));
      if (serviceFilter === 'manual') list = list.filter((s) => s.startup_type.includes('Manual'));
      if (serviceFilter === 'disabled') list = list.filter((s) => s.startup_type.includes('Disabled'));
    }
    return list;
  }, [services, serviceSearch, serviceFilter]);

  // Filtered event logs
  const filteredEvents = useMemo(() => {
    if (eventFilter === 'all') return eventLogs;
    return eventLogs.filter((e) => e.severity.toLowerCase() === eventFilter.toLowerCase());
  }, [eventLogs, eventFilter]);

  return (
    <div className="space-y-5 animate-fadeIn text-slate-800 dark:text-slate-100 pb-12">
      {/* Toast notifications */}
      {statusMessage && (
        <div className="fixed top-14 right-6 z-50 animate-bounce">
          <div className="glass-panel px-4 py-2.5 rounded-xl border border-brand-500/50 shadow-2xl bg-white/95 dark:bg-surface-900/95 text-xs text-brand-600 dark:text-brand-300 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            {statusMessage}
          </div>
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-14 right-6 z-50 animate-bounce">
          <div className="glass-panel px-4 py-2.5 rounded-xl border border-red-500/50 shadow-2xl bg-white/95 dark:bg-surface-900/95 text-xs text-red-600 dark:text-red-300 font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            {errorMessage}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">System Control & Administration</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Centralized Windows management console, native tools, services, firewall & recovery
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-2">
        {[
          { id: 'control-panel', label: 'Control Panel & Consoles', icon: FolderCog },
          { id: 'services', label: 'Windows Services', icon: Activity },
          { id: 'firewall', label: 'Windows Firewall', icon: ShieldCheck },
          { id: 'users', label: 'User Accounts', icon: Users },
          { id: 'events', label: 'Event Logs', icon: FileText },
          { id: 'restore', label: 'Restore & Backup', icon: RotateCcw },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
                isActive
                  ? 'bg-brand-500 text-white font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-surface-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeSubTab === 'control-panel' && (
        <ControlPanelToolsTab onLaunchTool={handleLaunchTool} />
      )}

      {activeSubTab === 'services' && (
        <WindowsServicesTab
          filteredServices={filteredServices}
          serviceSearch={serviceSearch}
          setServiceSearch={setServiceSearch}
          serviceFilter={serviceFilter}
          setServiceFilter={setServiceFilter}
          loading={loading}
          onLaunchTool={handleLaunchTool}
        />
      )}

      {activeSubTab === 'firewall' && (
        <FirewallProfilesTab
          firewall={firewall}
          onLaunchTool={handleLaunchTool}
        />
      )}

      {activeSubTab === 'users' && (
        <LocalUsersTab
          users={users}
          onLaunchTool={handleLaunchTool}
        />
      )}

      {activeSubTab === 'events' && (
        <EventLogsTab
          filteredEvents={filteredEvents}
          eventFilter={eventFilter}
          setEventFilter={setEventFilter}
          loading={loading}
          onLaunchTool={handleLaunchTool}
        />
      )}

      {activeSubTab === 'restore' && (
        <SystemRestoreTab
          restoreStatus={restoreStatus}
          loading={loading}
          onLaunchTool={handleLaunchTool}
        />
      )}
    </div>
  );
}

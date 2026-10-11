import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { api } from '../services/tauriApi';
import {
  FolderCog,
  HardDrive,
  Cpu,
  Users,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Search,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  RotateCcw,
  FileText,
  Terminal,
  SlidersHorizontal,
  Wrench,
  Layers,
  Tv,
  Wifi,
  Clock,
  Sparkles,
  Copy,
  Download,
  HelpCircle,
  Info,
  Calendar,
  Zap,
  ChevronRight,
  Filter,
} from 'lucide-react';

const CATEGORIES = [
  'All Categories',
  'Computer Management',
  'Storage and Disk Management',
  'Device and Driver Management',
  'Users and Groups',
  'Services and Scheduled Tasks',
  'Event Viewer and Logs',
  'Performance Monitoring',
  'Network Management',
  'Security and Windows Update',
  'Installed Applications',
  'System Configuration',
  'Maintenance and Repair',
  'Remote Administration',
  'SystemPilot Diagnostics',
];

export function WindowsTools() {
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'computer' | 'storage' | 'devices' | 'users' | 'services' | 'events' | 'diagnostics'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [availabilityFilter, setAvailabilityFilter] = useState('all'); // 'all' | 'available' | 'restricted'

  // Data states
  const [toolsDirectory, setToolsDirectory] = useState([]);
  const [sysInfo, setSysInfo] = useState(null);
  const [privilege, setPrivilege] = useState(null);
  const [partitions, setPartitions] = useState([]);
  const [devices, setDevices] = useState([]);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [scheduledTasks, setScheduledTasks] = useState([]);
  const [eventLogs, setEventLogs] = useState([]);
  const [selectedLogChannel, setSelectedLogChannel] = useState('System');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [restoreStatus, setRestoreStatus] = useState(null);
  const [diagnosticReport, setDiagnosticReport] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastError, setToastError] = useState(false);
  const [uefiModalOpen, setUefiModalOpen] = useState(false);
  const [uefiLoading, setUefiLoading] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const showToast = (msg, isErr = false) => {
    setToastMessage(msg);
    setToastError(isErr);
    setTimeout(() => setToastMessage(null), 3800);
  };

  // 1. Initial Load: Tools Directory & Core System Info
  const fetchTools = useCallback(async () => {
    try {
      const list = await api.getWindowsToolsDirectory();
      if (list && list.length > 0) {
        setToolsDirectory(list);
      }
    } catch (e) {
      console.error('Failed to load tools directory:', e);
    }
  }, []);

  const fetchSysInfo = useCallback(async () => {
    try {
      const [info, priv] = await Promise.all([
        api.getWindowsSystemInfo(),
        api.getPrivilegeStatus(),
      ]);
      if (info) setSysInfo(info);
      if (priv) setPrivilege(priv);
    } catch (e) {
      console.error('Failed to load system info:', e);
    }
  }, []);

  useEffect(() => {
    fetchTools();
    fetchSysInfo();
  }, [fetchTools, fetchSysInfo]);

  // 2. Tab-specific Data Fetching
  useEffect(() => {
    let mounted = true;
    if (activeTab === 'storage') {
      setLoading(true);
      api.getDiskPartitions()
        .then((res) => { if (mounted && res) setPartitions(res); })
        .catch(console.error)
        .finally(() => { if (mounted) setLoading(false); });
    } else if (activeTab === 'devices') {
      setLoading(true);
      api.getDeviceInventory()
        .then((res) => { if (mounted && res) setDevices(res); })
        .catch(console.error)
        .finally(() => { if (mounted) setLoading(false); });
    } else if (activeTab === 'users') {
      setLoading(true);
      api.getLocalUsers()
        .then((res) => { if (mounted && res) setUsers(res); })
        .catch(console.error)
        .finally(() => { if (mounted) setLoading(false); });
    } else if (activeTab === 'services') {
      setLoading(true);
      Promise.all([api.getWindowsServices(), api.getScheduledTasks()])
        .then(([srvList, taskList]) => {
          if (mounted) {
            if (srvList) setServices(srvList);
            if (taskList) setScheduledTasks(taskList);
          }
        })
        .catch(console.error)
        .finally(() => { if (mounted) setLoading(false); });
    } else if (activeTab === 'events') {
      setLoading(true);
      api.getSystemEventLogs(selectedLogChannel, 35)
        .then((res) => { if (mounted && res) setEventLogs(res); })
        .catch(console.error)
        .finally(() => { if (mounted) setLoading(false); });
    } else if (activeTab === 'diagnostics') {
      setLoading(true);
      api.getSystemRestoreStatus()
        .then((res) => { if (mounted && res) setRestoreStatus(res); })
        .catch(console.error)
        .finally(() => { if (mounted) setLoading(false); });
    }
    return () => { mounted = false; };
  }, [activeTab, selectedLogChannel]);

  // Handlers
  const handleLaunchTool = async (toolId, toolName) => {
    try {
      await api.launchWindowsTool(toolId);
      showToast(`Launched official utility: ${toolName}`);
    } catch (e) {
      showToast(`Unable to open ${toolName}: ${e.message}`, true);
    }
  };

  const handleOpenDrive = async (driveLetter) => {
    try {
      await api.openDriveLocation(driveLetter);
      showToast(`Opened drive ${driveLetter} in File Explorer`);
    } catch (e) {
      showToast(`Failed to open drive: ${e.message}`, true);
    }
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const rep = await api.exportDiagnosticReport();
      if (rep) {
        setDiagnosticReport(rep);
        setReportModalOpen(true);
        showToast('System diagnostic report compiled successfully');
      }
    } catch (e) {
      showToast(`Diagnostic report failed: ${e.message}`, true);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmUefi = async () => {
    setUefiLoading(true);
    try {
      const res = await api.restartToUefiFirmware();
      showToast(res || 'Rebooting into UEFI firmware...', false);
      setUefiModalOpen(false);
    } catch (e) {
      showToast(e.message || 'UEFI reboot cancelled or declined.', true);
    } finally {
      setUefiLoading(false);
    }
  };

  // Filtered tools directory
  const filteredTools = useMemo(() => {
    return toolsDirectory.filter((t) => {
      // Category match
      if (selectedCategory !== 'All Categories' && t.category !== selectedCategory) {
        return false;
      }
      // Availability match
      if (availabilityFilter === 'available' && !t.is_available) return false;
      if (availabilityFilter === 'restricted' && t.is_available) return false;
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = t.name.toLowerCase().includes(q);
        const matchDesc = t.description.toLowerCase().includes(q);
        const matchCmd = t.command.toLowerCase().includes(q);
        const matchCat = t.category.toLowerCase().includes(q);
        return matchName || matchDesc || matchCmd || matchCat;
      }
      return true;
    });
  }, [toolsDirectory, selectedCategory, availabilityFilter, searchQuery]);

  return (
    <div className="space-y-5 animate-fadeIn text-slate-800 dark:text-slate-100 pb-16">
      {/* Toast notifications */}
      {toastMessage && (
        <div className="fixed top-14 right-6 z-50 animate-bounce">
          <div className={`glass-panel px-4 py-2.5 rounded-xl border shadow-2xl flex items-center gap-2 text-xs font-medium ${
            toastError
              ? 'border-red-500/50 bg-white/95 dark:bg-surface-900/95 text-red-600 dark:text-red-300'
              : 'border-emerald-500/50 bg-white/95 dark:bg-surface-900/95 text-emerald-700 dark:text-emerald-300'
          }`}>
            {toastError ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            {toastMessage}
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                Windows Administration Center
              </h1>
              <Badge variant={privilege?.is_elevated ? 'success' : 'neutral'} size="xs">
                {privilege?.is_elevated ? 'UAC Elevated' : 'Standard User'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comprehensive Windows system tools, MMC consoles, storage volumes, devices, services & diagnostics
            </p>
          </div>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            icon={FileText}
            onClick={handleGenerateReport}
            loading={loading && reportModalOpen}
          >
            Diagnostic Report
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={FolderCog}
            onClick={() => handleLaunchTool('compmgmt.msc', 'Computer Management')}
          >
            Open Computer Management
          </Button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'directory', label: 'Windows Tools Directory', icon: Wrench, count: toolsDirectory.length },
          { id: 'computer', label: 'Computer Management', icon: FolderCog },
          { id: 'storage', label: 'Disk & Storage', icon: HardDrive },
          { id: 'devices', label: 'Devices & Drivers', icon: Cpu },
          { id: 'users', label: 'Users & Groups', icon: Users },
          { id: 'services', label: 'Services & Scheduler', icon: Activity },
          { id: 'events', label: 'Event Logs', icon: FileText },
          { id: 'diagnostics', label: 'Maintenance & Repair', icon: RotateCcw },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                isActive
                  ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-surface-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-surface-700 text-slate-600 dark:text-slate-400'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: WINDOWS TOOLS DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Search & Category Filter Header */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools by name, executable (e.g. compmgmt, regedit)..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="all">All Editions</option>
                <option value="available">Available on this PC</option>
                <option value="restricted">Restricted / Pro-Only</option>
              </select>
            </div>
          </div>

          {/* Results count & description */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Showing {filteredTools.length} of {toolsDirectory.length} verified Windows administration utilities</span>
            <span>All launches verified through canonical %SystemRoot%\System32 paths</span>
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredTools.map((tool) => (
              <Card
                key={tool.id}
                hover
                className={`p-4 flex flex-col justify-between gap-3 transition-all ${
                  !tool.is_available ? 'opacity-75 bg-slate-50/50 dark:bg-surface-900/40' : ''
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {tool.name}
                      </h3>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        {tool.category}
                      </span>
                    </div>
                    <Badge variant={tool.requires_admin ? 'warning' : 'neutral'} size="xs">
                      {tool.requires_admin ? 'Admin' : 'User'}
                    </Badge>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {tool.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-surface-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {tool.command}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                      {tool.integration_type}
                    </span>
                  </div>

                  {tool.edition_notes && (
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-[10px] text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>{tool.edition_notes}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  {tool.id === 'systempilot:diagnostics' ? (
                    <Button
                      variant="primary"
                      size="xs"
                      icon={FileText}
                      onClick={handleGenerateReport}
                      className="w-full justify-center"
                    >
                      Run Diagnostic Scan
                    </Button>
                  ) : tool.is_available ? (
                    <Button
                      variant="secondary"
                      size="xs"
                      icon={ExternalLink}
                      onClick={() => handleLaunchTool(tool.id, tool.name)}
                      className="w-full justify-center"
                    >
                      Open in Windows
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="xs"
                      disabled
                      className="w-full justify-center opacity-60 cursor-not-allowed"
                    >
                      Unavailable on this Edition
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: COMPUTER MANAGEMENT */}
      {activeTab === 'computer' && (
        <div className="space-y-4">
          {/* System Overview Card */}
          <Card className="p-5 space-y-4 bg-gradient-to-br from-white via-slate-50 to-indigo-50/20 dark:from-surface-900 dark:via-surface-900 dark:to-indigo-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                  {sysInfo?.product_name || 'Windows Operating System'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Version {sysInfo?.display_version} (Build {sysInfo?.full_build}) • {sysInfo?.architecture}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="xs"
                  icon={ExternalLink}
                  onClick={() => handleLaunchTool('compmgmt.msc', 'Computer Management')}
                >
                  Open Official Console
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs pt-1">
              <div className="p-3 rounded-xl bg-white dark:bg-surface-800/70 border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Computer Name</span>
                <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5 truncate">{sysInfo?.computer_name || 'LOCALHOST'}</p>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-surface-800/70 border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Manufacturer</span>
                <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5 truncate">{sysInfo?.manufacturer || 'PC Vendor'}</p>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-surface-800/70 border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">System Model</span>
                <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5 truncate">{sysInfo?.model || 'Desktop'}</p>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-surface-800/70 border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Active User</span>
                <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5 truncate">{sysInfo?.current_user || 'User'}</p>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-surface-800/70 border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Domain / Workgroup</span>
                <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5 truncate">{sysInfo?.domain_or_workgroup || 'WORKGROUP'}</p>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-surface-800/70 border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">System Uptime</span>
                <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                  {sysInfo?.uptime_seconds ? `${Math.floor(sysInfo.uptime_seconds / 3600)}h ${Math.floor((sysInfo.uptime_seconds % 3600) / 60)}m` : 'Active'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-surface-800/70 border border-slate-200/80 dark:border-slate-700/80 col-span-2">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Last Boot Timestamp</span>
                <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">{sysInfo?.last_boot_time || 'Recent'}</p>
              </div>
            </div>
          </Card>

          {/* Quick Access Snap-in Launchers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { title: 'Device Manager', desc: 'Inspect driver status & peripherals', cmd: 'devmgmt.msc', icon: Cpu },
              { title: 'Disk Management', desc: 'Partition formatting & volumes', cmd: 'diskmgmt.msc', icon: HardDrive },
              { title: 'Services Console', desc: 'Background service startup rules', cmd: 'services.msc', icon: Activity },
              { title: 'Event Viewer', desc: 'System error and audit logs', cmd: 'eventvwr.msc', icon: FileText },
              { title: 'Shared Folders', desc: 'Active SMB file shares and sessions', cmd: 'fsmgmt.msc', icon: FolderCog },
              { title: 'Task Scheduler', desc: 'Automated background tasks', cmd: 'taskschd.msc', icon: Calendar },
              { title: 'Performance Monitor', desc: 'Counter logs and traces', cmd: 'perfmon.exe', icon: Activity },
              { title: 'Local Users & Groups', desc: 'Account authorization management', cmd: 'lusrmgr.msc', icon: Users },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.cmd} hover className="p-3.5 flex flex-col justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{item.desc}</p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="xs"
                    icon={ExternalLink}
                    onClick={() => handleLaunchTool(item.cmd, item.title)}
                    className="w-full justify-center"
                  >
                    Open Console
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: DISK & STORAGE MANAGEMENT */}
      {activeTab === 'storage' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50">Storage Volumes & Partitions</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live physical disks, partition styles, filesystem mount points, and safe disk repair utilities
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="xs"
                icon={RefreshCw}
                onClick={() => {
                  setLoading(true);
                  api.getDiskPartitions()
                    .then((res) => { if (res) setPartitions(res); })
                    .finally(() => setLoading(false));
                }}
                loading={loading}
              >
                Refresh Disks
              </Button>
              <Button
                variant="secondary"
                size="xs"
                icon={ExternalLink}
                onClick={() => handleLaunchTool('diskmgmt.msc', 'Disk Management')}
              >
                Open Disk Management
              </Button>
            </div>
          </div>

          {/* Partitions List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {partitions.map((part) => {
              const sizeGb = (part.size_bytes / (1024 * 1024 * 1024)).toFixed(1);
              const driveLabel = part.drive_letter ? `${part.drive_letter}:\\` : `Disk ${part.disk_number} Partition ${part.partition_number}`;
              return (
                <Card key={`${part.disk_number}-${part.partition_number}`} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                        <HardDrive className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">{driveLabel}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Disk {part.disk_number} • Part #{part.partition_number} • {part.partition_style}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {part.is_boot && <Badge variant="primary" size="xs">Boot</Badge>}
                      {part.is_system && <Badge variant="neutral" size="xs">System</Badge>}
                      <Badge variant="success" size="xs">{sizeGb} GB</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-surface-800 border border-slate-100 dark:border-slate-700/60">
                      <span className="text-[10px] text-slate-400 uppercase">Partition Type</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{part.partition_type}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-surface-800 border border-slate-100 dark:border-slate-700/60">
                      <span className="text-[10px] text-slate-400 uppercase">Mount Status</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {part.drive_letter ? 'Mounted in Explorer' : (part.is_hidden ? 'Hidden / Recovery' : 'Unmounted')}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800/80">
                    {part.drive_letter && (
                      <Button
                        variant="secondary"
                        size="xs"
                        icon={ExternalLink}
                        onClick={() => handleOpenDrive(`${part.drive_letter}:\\`)}
                      >
                        Open in Explorer
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="xs"
                      icon={Sparkles}
                      onClick={() => handleLaunchTool('cleanmgr.exe', 'Disk Cleanup')}
                    >
                      Clean Drive
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Guided Disk Repair Documentation */}
          <Card className="p-4 space-y-3 bg-slate-50/70 dark:bg-surface-900/50 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>Safe Storage Operations & Partition Protection Policy</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              To prevent accidental data loss, destructive partition operations (formatting, partition deletion, drive resizing) are intentionally delegated to the official Microsoft Disk Management console with full Windows UAC authorization.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
              <div className="p-2.5 rounded-lg bg-white dark:bg-surface-800 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-800 dark:text-slate-100 block mb-0.5">Filesystem Scan</span>
                <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 block mb-1">chkdsk C: /scan</span>
                <span className="text-slate-500 dark:text-slate-400">Read-only online filesystem metadata check.</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-surface-800 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-800 dark:text-slate-100 block mb-0.5">System File Checker</span>
                <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 block mb-1">sfc /scannow</span>
                <span className="text-slate-500 dark:text-slate-400">Verifies and repairs corrupt Windows system files.</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-surface-800 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-800 dark:text-slate-100 block mb-0.5">Image Health Repair</span>
                <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 block mb-1">DISM /Online /Cleanup-Image /RestoreHealth</span>
                <span className="text-slate-500 dark:text-slate-400">Restores Windows component store integrity.</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: DEVICES & DRIVERS */}
      {activeTab === 'devices' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50">Hardware & Driver Inventory</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Display adapters, processors, storage controllers, network interfaces, and audio peripherals
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="xs"
                icon={ExternalLink}
                onClick={() => handleLaunchTool('devmgmt.msc', 'Device Manager')}
              >
                Open Device Manager
              </Button>
              <Button
                variant="secondary"
                size="xs"
                icon={ExternalLink}
                onClick={() => handleLaunchTool('dxdiag.exe', 'DirectX Diagnostics')}
              >
                Open DxDiag
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {devices.map((dev, idx) => (
              <Card key={`${dev.name}-${idx}`} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">{dev.name}</h4>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">{dev.category}</span>
                  </div>
                  <Badge variant={dev.status === 'OK' || dev.status === 'Connected' ? 'success' : 'neutral'} size="xs">
                    {dev.status}
                  </Badge>
                </div>

                <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vendor:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[180px]">{dev.manufacturer}</span>
                  </div>
                  {dev.driver_version && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Driver Ver:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{dev.driver_version}</span>
                    </div>
                  )}
                  {dev.driver_provider && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Provider:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[180px]">{dev.driver_provider}</span>
                    </div>
                  )}
                </div>

                {dev.device_id && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] font-mono text-slate-400 truncate">
                    ID: {dev.device_id}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: USERS & GROUPS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50">Local User Accounts & Privileges</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Local accounts, administrative groups, and credential security boundaries
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="xs"
                icon={ExternalLink}
                onClick={() => handleLaunchTool('lusrmgr.msc', 'Local Users and Groups')}
              >
                Open Users & Groups Console
              </Button>
              <Button
                variant="secondary"
                size="xs"
                icon={ExternalLink}
                onClick={() => handleLaunchTool('netplwiz.exe', 'User Accounts Control')}
              >
                Open User Accounts
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {users.map((u) => (
              <Card key={u.username} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        {u.username}
                        {u.is_current_user && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 font-semibold">
                            You
                          </span>
                        )}
                      </h4>
                      <span className="text-[10px] text-slate-400">{u.account_type}</span>
                    </div>
                  </div>
                  <Badge variant={u.status === 'Active' ? 'success' : 'neutral'} size="xs">
                    {u.status}
                  </Badge>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-surface-800 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Privilege:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{u.account_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Account Scope:</span>
                    <span className="text-slate-600 dark:text-slate-300">Local Security Authority (SAM)</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-4 space-y-2 bg-slate-50 dark:bg-surface-900/50 border border-slate-200 dark:border-slate-800 text-xs">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-500" />
              Windows Account Management Safety Guidelines
            </h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
              SystemPilot strictly distinguishes local machine accounts from Microsoft Accounts (MSA) and Active Directory Domain Accounts. To guarantee system availability and prevent user lockout, password resets and account modifications require authenticated elevation through official Windows credential managers (`lusrmgr.msc` or `netplwiz.exe`).
            </p>
          </Card>
        </div>
      )}

      {/* TAB 6: SERVICES & SCHEDULED TASKS */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50">Background Services & Scheduled Automation</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Windows Service Control Manager (SCM) background processes and automated Task Scheduler jobs
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="xs"
                icon={ExternalLink}
                onClick={() => handleLaunchTool('services.msc', 'Services Console')}
              >
                Open Services Console
              </Button>
              <Button
                variant="secondary"
                size="xs"
                icon={ExternalLink}
                onClick={() => handleLaunchTool('taskschd.msc', 'Task Scheduler')}
              >
                Open Task Scheduler
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Services List */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-500" />
                  Configured Windows Services ({services.length})
                </h3>
              </div>
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {services.slice(0, 40).map((s) => (
                  <div key={s.name} className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-surface-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">{s.display_name}</p>
                      <span className="text-[10px] text-slate-400 font-mono truncate block">{s.name}</span>
                    </div>
                    <Badge variant={s.startup_type === 'Automatic' ? 'primary' : 'neutral'} size="xs">
                      {s.startup_type}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Scheduled Tasks List */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-violet-500" />
                  Scheduled Maintenance Tasks ({scheduledTasks.length})
                </h3>
              </div>
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {scheduledTasks.map((t, idx) => (
                  <div key={`${t.task_name}-${idx}`} className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-surface-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">{t.task_name}</p>
                      <span className="text-[10px] text-slate-400 font-mono truncate block">{t.task_path}</span>
                    </div>
                    <Badge variant={t.state === 'Ready' || t.state === 'Running' ? 'success' : 'neutral'} size="xs">
                      {t.state}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 7: EVENT VIEWER LOGS */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50">Windows Event Log Diagnostics</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live Windows event logs filtered by severity and channel with privacy redaction
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="xs"
                icon={ExternalLink}
                onClick={() => handleLaunchTool('eventvwr.msc', 'Event Viewer')}
              >
                Open Official Event Viewer
              </Button>
            </div>
          </div>

          {/* Channel and Severity Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {['System', 'Application', 'Security', 'Setup'].map((ch) => (
              <button
                key={ch}
                onClick={() => setSelectedLogChannel(ch)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  selectedLogChannel === ch
                    ? 'bg-brand-500 text-white'
                    : 'bg-slate-200/70 dark:bg-surface-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {ch} Channel
              </button>
            ))}

            <div className="ml-auto flex items-center gap-2">
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-900 text-slate-800 dark:text-slate-100"
              >
                <option value="all">All Severities</option>
                <option value="Error">Errors Only</option>
                <option value="Warning">Warnings Only</option>
                <option value="Information">Information</option>
              </select>
            </div>
          </div>

          {/* Events Table */}
          <Card className="divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            {eventLogs
              .filter((e) => selectedSeverity === 'all' || e.severity.toLowerCase() === selectedSeverity.toLowerCase())
              .map((evt, idx) => (
                <div key={idx} className="p-3.5 space-y-1.5 hover:bg-slate-50/50 dark:hover:bg-surface-800/40 transition">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={evt.severity === 'Error' || evt.severity === 'Critical' ? 'danger' : evt.severity === 'Warning' ? 'warning' : 'neutral'}
                        size="xs"
                      >
                        {evt.severity}
                      </Badge>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{evt.source}</span>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {evt.event_id}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">{evt.time_generated}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                    {evt.message || 'No additional message payload provided by provider.'}
                  </p>
                </div>
              ))}
          </Card>
        </div>
      )}

      {/* TAB 8: MAINTENANCE & DIAGNOSTICS */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50">Maintenance, Recovery & Diagnostics</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                System Restore checkpoints, Windows Memory Diagnostic, UEFI reboot, and diagnostic reports
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="xs"
                icon={FileText}
                onClick={handleGenerateReport}
                loading={loading}
              >
                Compile Diagnostic Report
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">System Restore</h4>
                  <span className="text-[10px] text-slate-400">Revert changes safely</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Restore system files and registry configurations to previous checkpoints without altering personal files.
              </p>
              <Button
                variant="secondary"
                size="xs"
                icon={ExternalLink}
                onClick={() => handleLaunchTool('rstrui.exe', 'System Restore Wizard')}
                className="w-full justify-center"
              >
                Open Restore Wizard
              </Button>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">Memory Diagnostic</h4>
                  <span className="text-[10px] text-slate-400">Hardware RAM test</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Schedule a hardware memory check on next boot to detect RAM read/write defects and parity errors.
              </p>
              <Button
                variant="secondary"
                size="xs"
                icon={ExternalLink}
                onClick={() => handleLaunchTool('mdsched.exe', 'Memory Diagnostic')}
                className="w-full justify-center"
              >
                Schedule Memory Test
              </Button>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">Reboot to UEFI</h4>
                  <span className="text-[10px] text-slate-400">Motherboard BIOS Setup</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Reboot directly into motherboard UEFI firmware without pressing DEL/F2 during startup.
              </p>
              <Button
                variant="secondary"
                size="xs"
                icon={RotateCcw}
                onClick={() => setUefiModalOpen(true)}
                className="w-full justify-center"
              >
                Reboot to Firmware
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Reboot to UEFI */}
      <Modal
        isOpen={uefiModalOpen}
        onClose={() => setUefiModalOpen(false)}
        title="Reboot Directly to UEFI Firmware?"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              Save all open documents before continuing. Your computer will restart immediately into motherboard BIOS/UEFI settings.
            </span>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" size="xs" onClick={() => setUefiModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="xs"
              onClick={handleConfirmUefi}
              loading={uefiLoading}
            >
              Reboot to UEFI
            </Button>
          </div>
        </div>
      </Modal>

      {/* Diagnostic Report Modal */}
      <Modal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title="SystemPilot Diagnostic Report"
        size="lg"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-500 dark:text-slate-400">
            Privacy-sanitized report generated on demand. Zero personal tokens or network passwords included.
          </p>
          <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] max-h-96 overflow-y-auto whitespace-pre-wrap border border-slate-700">
            {diagnosticReport?.report_markdown}
          </div>
          <div className="flex items-center justify-between pt-2">
            <span className="text-[10px] text-slate-400">Timestamp: {diagnosticReport?.timestamp}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="xs"
                icon={Copy}
                onClick={() => {
                  if (diagnosticReport?.report_markdown) {
                    navigator.clipboard.writeText(diagnosticReport.report_markdown);
                    showToast('Report copied to clipboard!');
                  }
                }}
              >
                Copy to Clipboard
              </Button>
              <Button variant="primary" size="xs" onClick={() => setReportModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default WindowsTools;

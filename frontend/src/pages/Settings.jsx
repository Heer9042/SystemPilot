import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Toggle } from '../components/ui/Toggle';
import { Badge } from '../components/ui/Badge';
import { api } from '../services/tauriApi';
import { useUpdater } from '../hooks/useUpdater';
import { UpdatePanel } from '../components/updates';
import {
  Settings as SettingsIcon,
  Shield,
  ShieldCheck,
  Bell,
  ExternalLink,
  Moon,
  Sun,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  Activity,
  Layers,
  Laptop,
  HardDrive,
  Cpu,
  RotateCcw,
  Check,
  Zap,
  Info,
  Clock,
  Download,
  AlertTriangle,
} from 'lucide-react';

// ============================================================================
// 1. APPEARANCE & DISPLAY MODE CARD
// ============================================================================
function SettingsAppearanceCard({ theme, toggleTheme }) {
  return (
    <Card className="p-5 space-y-4 border-slate-200/80 dark:border-slate-800">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-500/20">
            <Moon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Appearance & Theme</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Choose your preferred visual presentation style</p>
          </div>
        </div>
        <Badge variant={theme === 'dark' ? 'brand' : 'neutral'} size="xs">
          {theme === 'dark' ? 'Dark Mode Active' : 'Light Mode Active'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Dark Mode Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (theme !== 'dark') toggleTheme();
          }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && theme !== 'dark') toggleTheme();
          }}
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
            theme === 'dark'
              ? 'border-brand-500 bg-brand-500/5 shadow-md shadow-brand-500/10'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-surface-900/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-brand-400">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Dark Mode</span>
                <span className="text-[10px] text-slate-500">Curated slate OLED theme</span>
              </div>
            </div>
            {theme === 'dark' && (
              <div className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            )}
          </div>
          <div className="h-6 w-full rounded bg-slate-950 border border-slate-800 flex items-center px-2 gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <div className="w-12 h-1.5 rounded-full bg-slate-800 ml-auto" />
          </div>
        </div>

        {/* Light Mode Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (theme !== 'light') toggleTheme();
          }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && theme !== 'light') toggleTheme();
          }}
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
            theme === 'light'
              ? 'border-brand-500 bg-brand-500/5 shadow-md shadow-brand-500/10'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-surface-900/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Light Mode</span>
                <span className="text-[10px] text-slate-500">Crisp high-contrast day theme</span>
              </div>
            </div>
            {theme === 'light' && (
              <div className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            )}
          </div>
          <div className="h-6 w-full rounded bg-slate-100 border border-slate-300 flex items-center px-2 gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rose-400" />
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <div className="w-12 h-1.5 rounded-full bg-slate-300 ml-auto" />
          </div>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// 2. MONITORING TELEMETRY REFRESH INTERVAL CARD
// ============================================================================
function SettingsMonitoringCard({ refreshInterval, onUpdateInterval }) {
  const intervals = [
    { value: '500', label: '500 ms', desc: 'High Precision (Realtime response)', badge: 'Higher CPU' },
    { value: '1000', label: '1000 ms', desc: 'Balanced (Recommended default)', badge: 'Optimal' },
    { value: '2000', label: '2000 ms', desc: 'Low Overhead (Resource friendly)', badge: 'Low CPU' },
    { value: '5000', label: '5000 ms', desc: 'Battery Saver (Background polling)', badge: 'Minimal' },
  ];

  return (
    <Card className="p-5 space-y-4 border-slate-200/80 dark:border-slate-800">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Telemetry Refresh Rate</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Balance sensor responsiveness against CPU cycles</p>
          </div>
        </div>
        <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
          {refreshInterval} ms
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {intervals.map((item) => {
          const isSelected = String(refreshInterval) === item.value;
          return (
            <div
              key={item.value}
              role="button"
              tabIndex={0}
              onClick={() => onUpdateInterval(item.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onUpdateInterval(item.value);
              }}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-1 text-xs ${
                isSelected
                  ? 'border-brand-500 bg-brand-500/10 dark:bg-brand-500/15 text-slate-900 dark:text-slate-100 font-bold shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-900/50 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono">{item.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                  isSelected ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-surface-800 text-slate-500'
                }`}>
                  {item.badge}
                </span>
              </div>
              <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ============================================================================
// 3. SYSTEM TRAY & BOOT INTEGRATION CARD
// ============================================================================
function SettingsSystemTrayCard({ settings, onUpdate }) {
  return (
    <Card className="p-5 space-y-4 border-slate-200/80 dark:border-slate-800">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">System Tray & Boot Integration</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Windows background residency and startup behavior</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800/80">
        <div className="pt-1">
          <Toggle
            enabled={settings.minimize_to_tray === 'true'}
            onChange={(val) => onUpdate('minimize_to_tray', val)}
            label="Minimize to System Tray"
            description="Hide window to notification area while actively monitoring hardware in the background"
          />
        </div>

        <div className="pt-3">
          <Toggle
            enabled={settings.close_to_tray === 'true'}
            onChange={(val) => onUpdate('close_to_tray', val)}
            label="Close Button Minimizes to Tray"
            description="Clicking the window close (X) button sends SystemPilot to the tray rather than terminating"
          />
        </div>

        <div className="pt-3">
          <Toggle
            enabled={settings.start_with_windows === 'true'}
            onChange={(val) => onUpdate('start_with_windows', val)}
            label="Launch Automatically with Windows"
            description="Automatically start SystemPilot in the background when logging into your Windows user account"
          />
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// 4. SMART ALERT THRESHOLDS CARD
// ============================================================================
function SettingsAlertsCard({ settings, onUpdate }) {
  return (
    <Card className="p-5 space-y-4 border-slate-200/80 dark:border-slate-800 lg:col-span-2">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Smart Alert Thresholds</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Configure proactive notifications for critical thermal and resource bottlenecks</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-surface-850 border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between gap-3">
          <Toggle
            enabled={settings.notify_ram_threshold === 'true'}
            onChange={(val) => onUpdate('notify_ram_threshold', val)}
            label="High RAM Warning"
            description="Alert when physical memory consumption exceeds 90%"
          />
          <Badge variant={settings.notify_ram_threshold === 'true' ? 'warning' : 'neutral'} size="xs" className="w-fit">
            Threshold: &gt; 90%
          </Badge>
        </div>

        <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-surface-850 border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between gap-3">
          <Toggle
            enabled={settings.notify_cpu_temp === 'true'}
            onChange={(val) => onUpdate('notify_cpu_temp', val)}
            label="CPU Thermal Alert"
            description="Notify immediately if CPU junction temperature spikes near thermal limits"
          />
          <Badge variant={settings.notify_cpu_temp === 'true' ? 'danger' : 'neutral'} size="xs" className="w-fit">
            Threshold: &gt; 85°C
          </Badge>
        </div>

        <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-surface-850 border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between gap-3">
          <Toggle
            enabled={settings.notify_disk_low === 'true'}
            onChange={(val) => onUpdate('notify_disk_low', val)}
            label="Low Storage Alert"
            description="Warn when primary NVMe/SSD system drive has under 10% capacity left"
          />
          <Badge variant={settings.notify_disk_low === 'true' ? 'warning' : 'neutral'} size="xs" className="w-fit">
            Threshold: &lt; 10% Free
          </Badge>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// 5. WINDOWS PRIVILEGE & PERMISSION SCOPE CARD
// ============================================================================
function SettingsPrivilegeCard({ privilegeInfo, onElevate, onOpenPermissions }) {
  return (
    <Card className="p-5 space-y-4 border-slate-200/80 dark:border-slate-800 lg:col-span-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Windows Permissions & Privilege Scope</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">User Account Control (UAC) boundary & least-privilege enforcement</p>
          </div>
        </div>
        <Badge variant={privilegeInfo?.is_elevated ? 'success' : 'neutral'} size="xs" className="self-start sm:self-auto">
          {privilegeInfo?.is_elevated ? 'UAC Elevated (Admin)' : 'Standard User (Least Privilege)'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-surface-850 border border-slate-200/80 dark:border-slate-800 space-y-1">
          <span className="text-slate-400 font-semibold text-[10px] uppercase">Installation Scope</span>
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            {privilegeInfo?.installation_scope || 'Per-User (%LOCALAPPDATA%)'}
          </p>
          <p className="text-[11px] text-slate-500">
            {privilegeInfo?.installation_scope?.includes('Program Files')
              ? 'Installed machine-wide into Program Files.'
              : 'Installed in user-space without UAC prompts.'}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-surface-850 border border-slate-200/80 dark:border-slate-800 space-y-1">
          <span className="text-slate-400 font-semibold text-[10px] uppercase">Operating Privileges</span>
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            {privilegeInfo?.is_elevated ? 'Administrator Privileges Active' : 'Principle of Least Privilege'}
          </p>
          <p className="text-[11px] text-slate-500">
            {privilegeInfo?.is_elevated
              ? 'Can manage system services, machine startup, and protected processes.'
              : 'Safely runs as standard user. Privileged actions prompt for UAC on demand.'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
        {!privilegeInfo?.is_elevated && (
          <Button
            variant="primary"
            size="sm"
            icon={Shield}
            onClick={onElevate}
            className="text-xs"
          >
            Run as Administrator (Request Elevation)
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          icon={ExternalLink}
          onClick={onOpenPermissions}
          className="text-xs"
        >
          View Permissions Disclosure (PERMISSIONS.txt)
        </Button>
      </div>
    </Card>
  );
}

// ============================================================================
// 6. ABOUT & LEGAL INFORMATION CARD
// ============================================================================
function SettingsAboutCard({ currentVersion, onOpenReleaseNotes }) {
  return (
    <Card className="p-5 space-y-4 border-slate-200/80 dark:border-slate-800 lg:col-span-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              SystemPilot <span className="text-xs font-mono font-normal text-slate-500 dark:text-slate-400">v{currentVersion}</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Universal Windows System Management Platform · React + Rust Architecture
            </p>
          </div>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          © 2026 SystemPilot Contributors
        </span>
      </div>

      <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-2">
        <p>
          SystemPilot is an open-source, local-first Windows performance and management platform distributed under the{' '}
          <strong className="text-slate-900 dark:text-slate-200 font-semibold">MIT License</strong>. All hardware telemetry, diagnostics, and management operations execute strictly on your local PC.
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          <em>Disclaimer: Windows, Windows Defender, and Microsoft Edge are trademarks of Microsoft Corporation. SystemPilot is an independent utility and is not affiliated with or endorsed by Microsoft.</em>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-xs">
        <button
          type="button"
          onClick={() => onOpenReleaseNotes('https://github.com/Heer9042/SystemPilot')}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 dark:bg-surface-850 dark:hover:bg-surface-800 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors font-medium text-xs"
        >
          <ExternalLink className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" /> Project Homepage
        </button>
        <button
          type="button"
          onClick={() => onOpenReleaseNotes('https://github.com/Heer9042/SystemPilot/blob/main/LICENSE')}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 dark:bg-surface-850 dark:hover:bg-surface-800 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors font-medium text-xs"
        >
          <ExternalLink className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> MIT License
        </button>
        <button
          type="button"
          onClick={() => onOpenReleaseNotes('https://github.com/Heer9042/SystemPilot/blob/main/SECURITY.md')}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 dark:bg-surface-850 dark:hover:bg-surface-800 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors font-medium text-xs"
        >
          <ExternalLink className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Security Policy
        </button>
      </div>
    </Card>
  );
}

// ============================================================================
// 7. MAIN SETTINGS VIEW
// ============================================================================
export function Settings({ theme, toggleTheme }) {
  const [activeTab, setActiveTab] = useState('all');
  const [settings, setSettings] = useState({
    theme: 'dark',
    refresh_interval_ms: '1000',
    auto_clean_enabled: 'false',
    auto_clean_threshold: '85',
    auto_clean_cooldown_min: '5',
    notify_ram_threshold: 'true',
    notify_cpu_temp: 'true',
    notify_disk_low: 'true',
    start_minimized: 'false',
    minimize_to_tray: 'true',
    close_to_tray: 'true',
    start_with_windows: 'false',
  });
  const [savedMessage, setSavedMessage] = useState(false);
  const [privilegeInfo, setPrivilegeInfo] = useState(null);

  const {
    status,
    currentVersion,
    latestRelease,
    lastChecked,
    autoCheckEnabled,
    error,
    progress,
    checkForUpdates,
    downloadAndInstallUpdate,
    restartAndApplyUpdate,
    openReleaseNotes,
    setAutoCheck,
    openModal,
  } = useUpdater();

  useEffect(() => {
    async function load() {
      try {
        const [data, priv] = await Promise.all([
          api.getSettings(),
          api.getPrivilegeStatus(),
        ]);
        if (data) setSettings(data);
        if (priv) setPrivilegeInfo(priv);
      } catch (e) {
        console.error('Failed to load settings or privileges:', e);
      }
    }
    load();
  }, []);

  const handleUpdate = async (key, val) => {
    const updated = { ...settings, [key]: String(val) };
    setSettings(updated);
    try {
      await api.setSetting(key, String(val));
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 2200);
    } catch (e) {
      console.error('Failed to persist setting:', e);
    }
  };

  const handleElevate = async () => {
    try {
      await api.requestAdminElevation();
    } catch (e) {
      console.warn('Elevation request not completed:', e);
    }
  };

  const handleOpenPermissions = async () => {
    try {
      await api.openPermissionsDisclosure();
    } catch (e) {
      console.warn('Failed to open permissions file:', e);
    }
  };

  const formattedLastChecked = lastChecked
    ? `${new Date(lastChecked).toLocaleDateString()} at ${new Date(lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Not checked yet this session';

  const tabs = [
    { id: 'all', label: 'All Settings', icon: SlidersHorizontal },
    { id: 'updates', label: 'Updates Channel', icon: Sparkles },
    { id: 'appearance', label: 'Theme & Appearance', icon: Moon },
    { id: 'monitoring', label: 'Telemetry Polling', icon: Activity },
    { id: 'system', label: 'System Tray & Boot', icon: Layers },
    { id: 'alerts', label: 'Alert Thresholds', icon: Bell },
    { id: 'permissions', label: 'Privileges & Scope', icon: Shield },
    { id: 'about', label: 'About SystemPilot', icon: Info },
  ];

  const showSection = (tabId) => activeTab === 'all' || activeTab === tabId;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 animate-fadeIn pb-12 text-slate-800 dark:text-slate-100">
      {/* Top Header & Save Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-500/20 shadow-sm">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  Settings & Preferences
                </h1>
                <Badge variant="neutral" size="xs">
                  v{currentVersion}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Customize appearance, monitoring polling rate, background residency, alerts, and updates
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {savedMessage && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold animate-fadeIn">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Settings Saved</span>
            </div>
          )}

          {/* Direct Update Trigger Button */}
          <Button
            variant="secondary"
            size="sm"
            icon={Sparkles}
            onClick={() => {
              openModal();
              checkForUpdates({ isManual: true });
            }}
            className="text-xs shadow-sm"
          >
            Check for Updates
          </Button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-slate-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors duration-150 ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-850'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Settings Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. UPDATES BOX (Prominent Card that opens Centered Modal on click) */}
        {showSection('updates') && (
          <div
            role="region"
            aria-label="Application Updates"
            className="lg:col-span-2"
          >
            <UpdatePanel
              currentVersion={currentVersion}
              formattedLastChecked={formattedLastChecked}
              status={status}
              latestRelease={latestRelease}
              progress={progress}
              error={error}
              autoCheckEnabled={autoCheckEnabled}
              setAutoCheck={setAutoCheck}
              checkForUpdates={checkForUpdates}
              downloadAndInstallUpdate={downloadAndInstallUpdate}
              restartAndApplyUpdate={restartAndApplyUpdate}
              openReleaseNotes={openReleaseNotes}
              openModal={openModal}
            />
          </div>
        )}

        {/* 2. THEME & APPEARANCE */}
        {showSection('appearance') && (
          <SettingsAppearanceCard
            theme={theme}
            toggleTheme={toggleTheme}
          />
        )}

        {/* 3. TELEMETRY REFRESH RATE */}
        {showSection('monitoring') && (
          <SettingsMonitoringCard
            refreshInterval={settings.refresh_interval_ms}
            onUpdateInterval={(val) => handleUpdate('refresh_interval_ms', val)}
          />
        )}

        {/* 4. SYSTEM TRAY & BOOT */}
        {showSection('system') && (
          <SettingsSystemTrayCard
            settings={settings}
            onUpdate={handleUpdate}
          />
        )}

        {/* 5. PRIVILEGES & PERMISSIONS */}
        {showSection('permissions') && (
          <SettingsPrivilegeCard
            privilegeInfo={privilegeInfo}
            onElevate={handleElevate}
            onOpenPermissions={handleOpenPermissions}
          />
        )}

        {/* 6. ALERTS & THRESHOLDS */}
        {showSection('alerts') && (
          <SettingsAlertsCard
            settings={settings}
            onUpdate={handleUpdate}
          />
        )}

        {/* 7. ABOUT & LEGAL */}
        {showSection('about') && (
          <SettingsAboutCard
            currentVersion={currentVersion}
            onOpenReleaseNotes={openReleaseNotes}
          />
        )}
      </div>
    </div>
  );
}

export default Settings;

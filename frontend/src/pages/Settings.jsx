import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Toggle } from '../components/ui/Toggle';
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
} from 'lucide-react';

function SettingsAppearanceCard({ theme, toggleTheme, refreshInterval, onUpdateInterval }) {
  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <Moon className="w-4 h-4 text-brand-500 dark:text-brand-400" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">Appearance & System Monitoring</h3>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2 border-b border-slate-200 dark:border-slate-800/60">
        <div>
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-200 block">Theme Mode</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Switch between Dark and Light UI styles</span>
        </div>
        <Button variant="secondary" size="sm" onClick={toggleTheme} className="self-start sm:self-auto flex items-center gap-1.5">
          {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-brand-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
          <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2">
        <div>
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-200 block">Monitoring Refresh Interval</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Adjust update frequency to balance responsiveness and system resource usage</span>
        </div>
        <select
          aria-label="Monitoring Refresh Interval"
          value={refreshInterval}
          onChange={(e) => onUpdateInterval(e.target.value)}
          className="bg-white dark:bg-surface-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-brand-500 self-start sm:self-auto w-full sm:w-auto font-mono"
        >
          <option value="500">500 ms (High Precision)</option>
          <option value="1000">1000 ms (Recommended)</option>
          <option value="2000">2000 ms (Low CPU)</option>
          <option value="5000">5000 ms (Battery Saver)</option>
        </select>
      </div>
    </Card>
  );
}

function SettingsSystemTrayCard({ settings, onUpdate }) {
  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">System Tray & Startup</h3>
      </div>

      <Toggle
        enabled={settings.minimize_to_tray === 'true'}
        onChange={(val) => onUpdate('minimize_to_tray', val)}
        label="Minimize to System Tray"
        description="Keep monitoring actively in background when minimized"
      />

      <Toggle
        enabled={settings.close_to_tray === 'true'}
        onChange={(val) => onUpdate('close_to_tray', val)}
        label="Close Window to Tray"
        description="Closing window minimizes rather than terminating"
      />

      <Toggle
        enabled={settings.start_with_windows === 'true'}
        onChange={(val) => onUpdate('start_with_windows', val)}
        label="Start with Windows"
        description="Launch SystemPilot automatically on Windows logon"
      />
    </Card>
  );
}

function SettingsAlertsCard({ settings, onUpdate }) {
  return (
    <Card className="space-y-3 lg:col-span-2">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <Bell className="w-4 h-4 text-amber-500 dark:text-amber-400" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">Smart Alert Thresholds</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-800/40 border border-slate-200 dark:border-slate-800">
          <Toggle
            enabled={settings.notify_ram_threshold === 'true'}
            onChange={(val) => onUpdate('notify_ram_threshold', val)}
            label="High RAM Warning"
            description="Notify when RAM usage exceeds 90%"
          />
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-800/40 border border-slate-200 dark:border-slate-800">
          <Toggle
            enabled={settings.notify_cpu_temp === 'true'}
            onChange={(val) => onUpdate('notify_cpu_temp', val)}
            label="High CPU Temperature"
            description="Notify if CPU thermal limit spikes"
          />
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-800/40 border border-slate-200 dark:border-slate-800 sm:col-span-2 lg:col-span-1">
          <Toggle
            enabled={settings.notify_disk_low === 'true'}
            onChange={(val) => onUpdate('notify_disk_low', val)}
            label="Low Disk Space Alert"
            description="Notify when storage partition < 10% free"
          />
        </div>
      </div>
    </Card>
  );
}

function SettingsPrivilegeCard({ privilegeInfo, onElevate, onOpenPermissions }) {
  return (
    <Card className="space-y-3 lg:col-span-2 border-slate-200 dark:border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-brand-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">Windows Permissions & Privilege Scope</h3>
        </div>
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border self-start sm:self-auto flex items-center gap-1.5 ${
          privilegeInfo?.is_elevated
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
            : 'bg-slate-100 dark:bg-surface-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
        }`}>
          {privilegeInfo?.is_elevated && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
          {privilegeInfo?.execution_level || 'Standard User (asInvoker)'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Installation Scope</span>
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            {privilegeInfo?.installation_scope || 'Per-User (%LOCALAPPDATA%)'}
          </p>
          <p className="text-[11px] text-slate-500">
            {privilegeInfo?.installation_scope?.includes('Program Files')
              ? 'Installed machine-wide into Program Files.'
              : 'Installed in user-space without UAC prompts.'}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Operating Privileges</span>
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            {privilegeInfo?.is_elevated ? 'Administrator Privileges Active' : 'Principle of Least Privilege'}
          </p>
          <p className="text-[11px] text-slate-500">
            {privilegeInfo?.is_elevated
              ? 'Can manage system services, machine startup, and protected processes.'
              : 'Safely runs as standard user. Advanced commands request UAC only on-demand.'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/60">
        {!privilegeInfo?.is_elevated && (
          <Button
            variant="primary"
            size="sm"
            icon={Shield}
            onClick={onElevate}
            className="shadow-sm"
          >
            Run as Administrator (Request Elevation)
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          icon={ExternalLink}
          onClick={onOpenPermissions}
        >
          View Permissions Disclosure (PERMISSIONS.txt)
        </Button>
      </div>
    </Card>
  );
}

function SettingsAboutCard({ currentVersion, onOpenReleaseNotes }) {
  return (
    <Card className="space-y-4 lg:col-span-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-surface-950/60">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400 flex-shrink-0">
            <Shield className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              SystemPilot <span className="text-xs font-mono font-normal text-slate-500 dark:text-slate-400">v{currentVersion}</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Windows System Monitoring & Performance Suite · Native Desktop Utility
            </p>
          </div>
        </div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          © 2026 SystemPilot Contributors
        </span>
      </div>

      <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-2">
        <p>
          SystemPilot is an open-source, local-first Windows performance utility distributed under the{' '}
          <strong className="text-slate-900 dark:text-slate-200 font-semibold">MIT License</strong>. All system diagnostics, process management,
          and memory optimizations remain strictly on your local device.
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          <em>Disclaimer: Windows and Windows Defender are trademarks of Microsoft Corporation. SystemPilot is an independent utility and is not affiliated with or endorsed by Microsoft Corporation.</em>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/60 text-xs">
        <button
          type="button"
          onClick={() => onOpenReleaseNotes('https://github.com/Heer9042/SystemPilot')}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 dark:bg-surface-900 dark:hover:bg-surface-850 border border-slate-200 dark:border-slate-800 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 flex items-center gap-1.5 transition-colors font-medium"
        >
          <ExternalLink className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" /> Project Homepage
        </button>
        <button
          type="button"
          onClick={() => onOpenReleaseNotes('https://github.com/Heer9042/SystemPilot/blob/main/LICENSE')}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 dark:bg-surface-900 dark:hover:bg-surface-850 border border-slate-200 dark:border-slate-800 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 flex items-center gap-1.5 transition-colors font-medium"
        >
          <ExternalLink className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> License (MIT)
        </button>
        <button
          type="button"
          onClick={() => onOpenReleaseNotes('https://github.com/Heer9042/SystemPilot/blob/main/docs/THIRD_PARTY_NOTICES.md')}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 dark:bg-surface-900 dark:hover:bg-surface-850 border border-slate-200 dark:border-slate-800 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 flex items-center gap-1.5 transition-colors font-medium"
        >
          <ExternalLink className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Third-Party Notices
        </button>
        <button
          type="button"
          onClick={() => onOpenReleaseNotes('https://github.com/Heer9042/SystemPilot/blob/main/docs/PRIVACY.md')}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 dark:bg-surface-900 dark:hover:bg-surface-850 border border-slate-200 dark:border-slate-800 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 flex items-center gap-1.5 transition-colors font-medium"
        >
          <ExternalLink className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Privacy Policy
        </button>
        <button
          type="button"
          onClick={() => onOpenReleaseNotes('https://github.com/Heer9042/SystemPilot/blob/main/SECURITY.md')}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 dark:bg-surface-900 dark:hover:bg-surface-850 border border-slate-200 dark:border-slate-800 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 flex items-center gap-1.5 transition-colors font-medium"
        >
          <ExternalLink className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Security Policy
        </button>
      </div>
    </Card>
  );
}

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
        const data = await api.getSettings();
        if (data) setSettings(data);
      } catch (e) {
        console.error(e);
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
      setTimeout(() => setSavedMessage(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const [privilegeInfo, setPrivilegeInfo] = useState(null);

  useEffect(() => {
    async function loadPrivileges() {
      try {
        const priv = await api.getPrivilegeStatus();
        if (priv) setPrivilegeInfo(priv);
      } catch (e) {
        console.error(e);
      }
    }
    loadPrivileges();
  }, []);

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
    { id: 'all', label: 'All Settings' },
    { id: 'general', label: 'Appearance & Polling' },
    { id: 'system', label: 'System Tray & Boot' },
    { id: 'permissions', label: 'Privileges & Scope' },
    { id: 'updates', label: 'Updates & Channel' },
    { id: 'alerts', label: 'Alerts & Thresholds' },
    { id: 'about', label: 'About & Legal' },
  ];

  const showSection = (tabId) => activeTab === 'all' || activeTab === tabId;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 animate-fadeIn pb-6">
      {/* Top Header & Save Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-brand-500 dark:text-brand-400" />
            Preferences & Configuration
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Customize system monitoring interval, system tray behavior, alert thresholds, and updates
          </p>
        </div>

        {savedMessage && (
          <div className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Settings saved successfully</span>
          </div>
        )}
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors duration-150 ${
              activeTab === tab.id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {showSection('updates') && (
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
        )}

        {showSection('general') && (
          <SettingsAppearanceCard
            theme={theme}
            toggleTheme={toggleTheme}
            refreshInterval={settings.refresh_interval_ms}
            onUpdateInterval={(val) => handleUpdate('refresh_interval_ms', val)}
          />
        )}

        {showSection('system') && (
          <SettingsSystemTrayCard
            settings={settings}
            onUpdate={handleUpdate}
          />
        )}

        {showSection('permissions') && (
          <SettingsPrivilegeCard
            privilegeInfo={privilegeInfo}
            onElevate={handleElevate}
            onOpenPermissions={handleOpenPermissions}
          />
        )}

        {showSection('alerts') && (
          <SettingsAlertsCard
            settings={settings}
            onUpdate={handleUpdate}
          />
        )}

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

import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Toggle } from '../components/ui/Toggle';
import { api } from '../services/tauriApi';
import { useUpdater } from '../hooks/useUpdater';
import { UpdateStatus } from '../services/updates/updateTypes';
import {
  Settings as SettingsIcon,
  Save,
  Moon,
  Sun,
  Bell,
  Shield,
  Layers,
  RefreshCw,
  Sparkles,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
} from 'lucide-react';

export function Settings({ theme, toggleTheme }) {
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
    checkForUpdates,
    downloadAndInstallUpdate,
    dismissUpdate,
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

  const formattedLastChecked = lastChecked
    ? `${new Date(lastChecked).toLocaleDateString()} at ${new Date(lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Not checked yet this session';

  return (
    <div className="space-y-4 animate-fadeIn max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-indigo-400" /> Preferences & Configuration
          </h2>
          <p className="text-xs text-slate-400">
            Customize telemetry refresh rates, background tray behavior, and SQLite storage
          </p>
        </div>
        {savedMessage && (
          <span className="text-xs text-emerald-400 font-medium">Settings saved to SQLite</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Updates & Version Control */}
        <Card className="space-y-3 md:col-span-2 border-brand-500/20 bg-gradient-to-br from-surface-900 via-surface-900 to-surface-950">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-bold text-slate-200">SystemPilot Updates & Release Channel</h3>
            </div>
            <span className="text-[11px] font-mono font-bold bg-brand-500/10 border border-brand-500/30 text-brand-300 px-2.5 py-0.5 rounded-full">
              v{currentVersion}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-1">
            <div className="p-3 bg-surface-950/60 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block">Installed Version</span>
              <span className="text-sm font-bold text-slate-200">v{currentVersion}</span>
            </div>
            <div className="p-3 bg-surface-950/60 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block">Release Channel</span>
              <span className="text-sm font-bold text-emerald-400">Stable (GitHub)</span>
            </div>
            <div className="p-3 bg-surface-950/60 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block">Last Update Check</span>
              <span className="text-xs font-semibold text-slate-300 truncate block">
                {formattedLastChecked}
              </span>
            </div>
          </div>

          {/* Update Action and Status Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {status === UpdateStatus.CHECKING && (
                  <span className="text-xs text-brand-400 flex items-center gap-1.5 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking official GitHub releases...
                  </span>
                )}
                {status === UpdateStatus.UP_TO_DATE && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> You are running the latest version.
                  </span>
                )}
                {status === UpdateStatus.AVAILABLE && latestRelease && (
                  <span className="text-xs text-brand-300 flex items-center gap-1.5 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" /> New version available: v{latestRelease.version}
                  </span>
                )}
                {status === UpdateStatus.OFFLINE && (
                  <span className="text-xs text-amber-400 flex items-center gap-1.5 font-medium">
                    <Info className="w-3.5 h-3.5" /> Offline mode: Update check unavailable
                  </span>
                )}
                {status === UpdateStatus.ERROR && (
                  <span className="text-xs text-rose-400 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" /> {error || 'Update check failed'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                SystemPilot checks GitHub Releases for cryptographically verified production builds.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {status === UpdateStatus.AVAILABLE && latestRelease ? (
                <>
                  <Button variant="secondary" size="sm" onClick={() => openReleaseNotes(latestRelease.htmlUrl)}>
                    <ExternalLink className="w-3.5 h-3.5 mr-1" /> Notes
                  </Button>
                  <Button variant="primary" size="sm" onClick={downloadAndInstallUpdate}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Update Now
                  </Button>
                </>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => checkForUpdates({ isManual: true })}
                  disabled={status === UpdateStatus.CHECKING}
                  className="flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${status === UpdateStatus.CHECKING ? 'animate-spin' : ''}`} />
                  Check for Updates
                </Button>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/60">
            <Toggle
              enabled={autoCheckEnabled}
              onChange={(val) => setAutoCheck(val)}
              label="Automatically check for updates on startup"
              description="Performs a lightweight, non-blocking check for new releases in the background"
            />
          </div>
        </Card>

        {/* Appearance & General */}
        <Card className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Moon className="w-4 h-4 text-brand-400" />
            <h3 className="text-sm font-bold text-slate-200">Appearance & General</h3>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">Theme Mode</span>
              <span className="text-[11px] text-slate-400">Switch between Dark and Light UI styles</span>
            </div>
            <Button variant="secondary" size="sm" onClick={toggleTheme}>
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </Button>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">Telemetry Refresh Rate</span>
              <span className="text-[11px] text-slate-400">Adjust polling interval for minimal CPU impact</span>
            </div>
            <select
              value={settings.refresh_interval_ms}
              onChange={(e) => handleUpdate('refresh_interval_ms', e.target.value)}
              className="bg-surface-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200"
            >
              <option value="500">500 ms (Fast)</option>
              <option value="1000">1000 ms (Recommended)</option>
              <option value="2000">2000 ms (Low CPU)</option>
              <option value="5000">5000 ms (Battery Saver)</option>
            </select>
          </div>
        </Card>

        {/* System Tray & Startup */}
        <Card className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-200">System Tray & Startup</h3>
          </div>

          <Toggle
            enabled={settings.minimize_to_tray === 'true'}
            onChange={(val) => handleUpdate('minimize_to_tray', val)}
            label="Minimize to System Tray"
            description="Keep monitoring actively in background when minimized"
          />

          <Toggle
            enabled={settings.close_to_tray === 'true'}
            onChange={(val) => handleUpdate('close_to_tray', val)}
            label="Close Window to Tray"
            description="Closing window minimizes rather than terminating"
          />

          <Toggle
            enabled={settings.start_with_windows === 'true'}
            onChange={(val) => handleUpdate('start_with_windows', val)}
            label="Start with Windows"
            description="Launch SystemPilot automatically on Windows logon"
          />
        </Card>

        {/* Smart Notifications */}
        <Card className="space-y-3 md:col-span-2">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Bell className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-200">Smart Alert Thresholds</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Toggle
              enabled={settings.notify_ram_threshold === 'true'}
              onChange={(val) => handleUpdate('notify_ram_threshold', val)}
              label="High RAM Warning"
              description="Notify when RAM exceeds 90%"
            />

            <Toggle
              enabled={settings.notify_cpu_temp === 'true'}
              onChange={(val) => handleUpdate('notify_cpu_temp', val)}
              label="High CPU Temp"
              description="Notify if CPU temperature spikes"
            />

            <Toggle
              enabled={settings.notify_disk_low === 'true'}
              onChange={(val) => handleUpdate('notify_disk_low', val)}
              label="Low Disk Space"
              description="Notify when storage drive &lt; 10%"
            />
          </div>
        </Card>

        {/* About SystemPilot, Legal & Licensing */}
        <Card className="space-y-4 md:col-span-2 border-slate-800 bg-surface-950/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  SystemPilot <span className="text-xs font-mono font-normal text-slate-400">v{currentVersion}</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Windows System Monitoring & Performance Suite · Built with Tauri 2 & Rust
                </p>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              © 2026 SystemPilot Contributors
            </span>
          </div>

          <div className="text-xs text-slate-400 leading-relaxed space-y-2">
            <p>
              SystemPilot is an open-source, local-first Windows performance utility distributed under the{' '}
              <strong className="text-slate-200 font-semibold">MIT License</strong>. All hardware telemetry, process monitoring,
              and memory optimizations remain strictly on your device.
            </p>
            <p className="text-[11px] text-slate-500">
              <em>Disclaimer: Windows, Windows Defender, and PowerShell are trademarks of Microsoft Corporation. SystemPilot is an independent utility and is not affiliated with or endorsed by Microsoft Corporation.</em>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60 text-xs">
            <button
              type="button"
              onClick={() => openReleaseNotes('https://github.com/Heer9042/SystemPilot')}
              className="px-3 py-1.5 rounded-lg bg-surface-900 hover:bg-surface-850 border border-slate-800 text-slate-300 hover:text-slate-100 flex items-center gap-1.5 transition-colors font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5 text-brand-400" /> GitHub Repository
            </button>
            <button
              type="button"
              onClick={() => openReleaseNotes('https://github.com/Heer9042/SystemPilot/blob/main/LICENSE')}
              className="px-3 py-1.5 rounded-lg bg-surface-900 hover:bg-surface-850 border border-slate-800 text-slate-300 hover:text-slate-100 flex items-center gap-1.5 transition-colors font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" /> License (MIT)
            </button>
            <button
              type="button"
              onClick={() => openReleaseNotes('https://github.com/Heer9042/SystemPilot/blob/main/docs/THIRD_PARTY_NOTICES.md')}
              className="px-3 py-1.5 rounded-lg bg-surface-900 hover:bg-surface-850 border border-slate-800 text-slate-300 hover:text-slate-100 flex items-center gap-1.5 transition-colors font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" /> Third-Party Notices
            </button>
            <button
              type="button"
              onClick={() => openReleaseNotes('https://github.com/Heer9042/SystemPilot/blob/main/docs/PRIVACY.md')}
              className="px-3 py-1.5 rounded-lg bg-surface-900 hover:bg-surface-850 border border-slate-800 text-slate-300 hover:text-slate-100 flex items-center gap-1.5 transition-colors font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" /> Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => openReleaseNotes('https://github.com/Heer9042/SystemPilot/blob/main/SECURITY.md')}
              className="px-3 py-1.5 rounded-lg bg-surface-900 hover:bg-surface-850 border border-slate-800 text-slate-300 hover:text-slate-100 flex items-center gap-1.5 transition-colors font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" /> Security Policy
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}


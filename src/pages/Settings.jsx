import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Toggle } from '../components/ui/Toggle';
import { api } from '../services/tauriApi';
import { Settings as SettingsIcon, Save, Moon, Sun, Bell, Shield, Layers, RefreshCw } from 'lucide-react';

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
      </div>
    </div>
  );
}

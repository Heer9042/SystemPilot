import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { api } from '../../services/tauriApi';
import {
  Gauge,
  Sun,
  Moon,
  Laptop,
  Activity,
  Rocket,
  Bell,
  ShieldCheck,
  ShieldAlert,
  Shield,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Info,
  FolderOpen,
  Cpu,
  HardDrive,
  Wifi,
  Settings,
  Zap,
  Eye,
  AlertTriangle,
  Lock,
  Unlock,
  BarChart2,
  Clock,
  Package,
} from 'lucide-react';

// ── Step metadata ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Welcome',      icon: Sparkles },
  { id: 2, label: 'Information',  icon: Info },
  { id: 3, label: 'Appearance',   icon: Sun },
  { id: 4, label: 'Monitoring',   icon: Activity },
  { id: 5, label: 'Startup',      icon: Rocket },
  { id: 6, label: 'Alerts',       icon: Bell },
  { id: 7, label: 'Permissions',  icon: ShieldCheck },
  { id: 8, label: 'Finish',       icon: CheckCircle2 },
];

// ── Permission row component ───────────────────────────────────────────────────
function PermissionRow({ icon: Icon, title, scope, reason, required, color = 'emerald' }) {
  const colorMap = {
    emerald: { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' },
    amber:   { dot: 'bg-amber-400',   text: 'text-amber-600 dark:text-amber-400',   badge: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200 dark:border-amber-500/30' },
    blue:    { dot: 'bg-blue-500',    text: 'text-blue-600 dark:text-blue-400',    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border-blue-200 dark:border-blue-500/30' },
    slate:   { dot: 'bg-slate-400',   text: 'text-slate-500 dark:text-slate-400',  badge: 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700' },
  };
  const c = colorMap[color] || colorMap.emerald;

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${c.badge.split(' ').slice(0,2).join(' ')} border ${c.badge.split(' ').slice(2).join(' ')}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{title}</span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${c.badge}`}>
            {required ? 'Required' : 'Optional'}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{scope}</p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 italic">{reason}</p>
      </div>
    </div>
  );
}

// ── Info card component ────────────────────────────────────────────────────────
function InfoCard({ icon: Icon, title, value, sub, accent = false }) {
  return (
    <div className={`p-3 rounded-xl border flex items-center gap-3 ${
      accent
        ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/30'
        : 'bg-slate-50 border-slate-200 dark:bg-slate-800/60 dark:border-slate-700'
    }`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        accent
          ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
      }`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">{title}</p>
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 mt-0.5">{value}</p>
        {sub && <p className="text-[10px] text-slate-400 dark:text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

// ── Monitoring mode card ───────────────────────────────────────────────────────
function MonitorModeCard({ id, label, badge, desc, interval, selected, onSelect }) {
  return (
    <label className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between gap-3 transition-all duration-150 ${
      selected
        ? 'bg-indigo-50 border-indigo-400 dark:bg-indigo-600/15 dark:border-indigo-500'
        : 'bg-slate-50 border-slate-200 hover:border-slate-300 dark:bg-slate-800/60 dark:border-slate-700 dark:hover:border-slate-600'
    }`}>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{label}</span>
          {badge && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
              {badge}
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono">Refresh: {interval}</p>
      </div>
      <input
        type="radio"
        name="monitoringMode"
        value={id}
        checked={selected}
        onChange={() => onSelect(id)}
        className="accent-indigo-600 cursor-pointer flex-shrink-0"
        aria-label={label}
      />
    </label>
  );
}

// ── Notification mode card ─────────────────────────────────────────────────────
function NotifCard({ id, label, desc, icon: Icon, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-pressed={selected}
      className={`p-3.5 rounded-xl border text-left flex flex-col gap-2 transition-all duration-150 ${
        selected
          ? 'bg-indigo-50 border-indigo-400 dark:bg-indigo-600/20 dark:border-indigo-500'
          : 'bg-slate-50 border-slate-200 hover:border-slate-300 dark:bg-slate-800/60 dark:border-slate-700 dark:hover:border-slate-600'
      }`}
    >
      <Icon className={`w-5 h-5 ${selected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
      <div>
        <span className="text-xs font-bold block text-slate-800 dark:text-slate-100">{label}</span>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</span>
      </div>
    </button>
  );
}

// ── Toggle row ─────────────────────────────────────────────────────────────────
function ToggleRow({ label, description, enabled, onChange, id }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
      <div>
        <label htmlFor={id} className="text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer">
          {label}
        </label>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
          enabled
            ? 'bg-indigo-600 dark:bg-indigo-500'
            : 'bg-slate-200 dark:bg-slate-600'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

// ── Summary item ───────────────────────────────────────────────────────────────
function SummaryItem({ label, value, valueClass = '' }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/40 last:border-0">
      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{label}</span>
      <span className={`text-[11px] font-semibold text-slate-800 dark:text-slate-100 ${valueClass}`}>{value}</span>
    </div>
  );
}

// =============================================================================
// MAIN WIZARD COMPONENT
// =============================================================================
export function FirstRunWizard({ onComplete, currentTheme, toggleTheme }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [config, setConfig] = useState({
    theme: currentTheme || 'dark',
    monitoringMode: 'standard',
    startWithWindows: false,
    minimizeToTray: true,
    notifications: 'recommended',
    autoCleanRam: false,
  });

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') return; // don't close on Escape
      if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') handleNext();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step, config]);

  const handleNext = () => {
    if (step < STEPS.length) setStep(step + 1);
    else handleFinish();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      localStorage.setItem('first_run_completed', 'true');
      await api.setSetting('first_run_completed', 'true');
      await api.setSetting('theme', config.theme);
      await api.setSetting(
        'refresh_interval_ms',
        config.monitoringMode === 'minimal'  ? '2000' :
        config.monitoringMode === 'advanced' ? '500'  : '1000'
      );
      await api.setSetting('start_with_windows', config.startWithWindows ? 'true' : 'false');
      await api.setSetting('minimize_to_tray',   config.minimizeToTray   ? 'true' : 'false');
      await api.setSetting('notify_ram_threshold', config.notifications !== 'disabled' ? 'true' : 'false');
      await api.setSetting('notify_cpu_temp',      config.notifications !== 'disabled' ? 'true' : 'false');
      await api.setSetting('notify_disk_low',      config.notifications !== 'disabled' ? 'true' : 'false');
      onComplete();
    } catch (e) {
      console.error('[FirstRunWizard] failed to save settings:', e);
      localStorage.setItem('first_run_completed', 'true');
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const monitoringLabel = { minimal: 'Minimal (2 s)', standard: 'Standard (1 s)', advanced: 'High-Refresh (500 ms)' }[config.monitoringMode];
  const notifLabel     = { recommended: 'Recommended alerts', custom: 'Customizable', disabled: 'Silent mode' }[config.notifications];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md select-none"
      role="dialog"
      aria-modal="true"
      aria-label="SystemPilot First-Run Setup Wizard"
    >
      <div className="relative w-full max-w-[580px] rounded-2xl overflow-hidden shadow-2xl border border-slate-200/20 dark:border-slate-700/50 bg-white dark:bg-[#090d16]">

        {/* ── Wizard header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-200/60 dark:border-slate-800">
          {/* Logo + title */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/25">
              <Gauge className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50 leading-none">SystemPilot Setup</h2>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Step {step} of {STEPS.length} — {STEPS[step - 1].label}
              </span>
            </div>
          </div>

          {/* Step progress dots */}
          <div className="flex items-center gap-1" role="tablist" aria-label="Setup steps">
            {STEPS.map((s) => (
              <div
                key={s.id}
                role="tab"
                aria-selected={s.id === step}
                aria-label={`Step ${s.id}: ${s.label}`}
                className={`rounded-full transition-all duration-300 ${
                  s.id === step  ? 'w-5 h-1.5 bg-indigo-500' :
                  s.id < step    ? 'w-1.5 h-1.5 bg-emerald-500' :
                  'w-1.5 h-1.5 bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* ── Step content ──────────────────────────────────────────────────── */}
        <div className="px-6 py-5 min-h-[340px] flex flex-col">

          {/* STEP 1 — WELCOME */}
          {step === 1 && (
            <div className="flex flex-col items-center text-center space-y-4 flex-1 justify-center animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 dark:border-indigo-500/40 flex items-center justify-center shadow-xl shadow-indigo-500/10">
                <Gauge className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
                  Welcome to SystemPilot
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  This short wizard configures SystemPilot for your preferences. It takes about 60 seconds.
                </p>
              </div>

              <div className="w-full max-w-md space-y-2 text-left pt-1">
                {[
                  { icon: BarChart2,  text: 'Real-time CPU, GPU, memory, disk & network monitoring' },
                  { icon: Shield,     text: '100% offline — no accounts, no telemetry, no cloud' },
                  { icon: Settings,   text: 'Configurable monitoring frequency and smart alerts' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                    <Icon className="w-4 h-4 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              <div className="w-full max-w-md p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
                  SystemPilot never modifies kernel files, disables Windows security tools, or silently installs services.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2 — INFORMATION */}
          {step === 2 && (
            <div className="space-y-3 animate-fadeIn">
              <div className="mb-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">Important Information</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Review this before completing setup.</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <InfoCard icon={Package}    title="Version"          value={typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.1'} sub="Release" accent />
                <InfoCard icon={Cpu}        title="Platform"         value="Windows 10/11 (64-bit)"    sub="WebView2 required" />
                <InfoCard icon={HardDrive}  title="Install size"     value="~80 MB"                    sub="Application files" />
                <InfoCard icon={FolderOpen} title="Your data"        value="%LOCALAPPDATA%\SystemPilot" sub="Settings & history" />
                <InfoCard icon={Wifi}       title="Internet"         value="Not required"              sub="Optional for updates" />
                <InfoCard icon={Lock}       title="Elevation"        value="Only on-demand"            sub="Protected ops only" />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 flex items-start gap-2 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                  Some advanced features (adjusting protected process priority, UEFI reboot) trigger a standard Windows UAC prompt. Declining those prompts cancels the specific operation without affecting the rest of the application.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3 — APPEARANCE */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">Choose Your Appearance</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Select your preferred color interface. You can change this anytime in Settings.</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'dark',   label: 'Dark Mode',      icon: Moon,   desc: 'Sleek dark interface' },
                  { id: 'light',  label: 'Light Mode',     icon: Sun,    desc: 'Clean bright layout' },
                  { id: 'system', label: 'Follow Windows', icon: Laptop, desc: 'Matches your OS theme' },
                ].map((t) => {
                  const Icon = t.icon;
                  const selected = config.theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setConfig({ ...config, theme: t.id });
                        if (t.id === 'dark' || t.id === 'light') toggleTheme(t.id);
                      }}
                      className={`p-4 rounded-xl border text-left flex flex-col justify-between gap-3 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        selected
                          ? 'bg-indigo-50 border-indigo-400 dark:bg-indigo-600/20 dark:border-indigo-500'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300 dark:bg-slate-800/60 dark:border-slate-700'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${selected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                      <div>
                        <span className="text-xs font-bold block text-slate-800 dark:text-slate-100">{t.label}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{t.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4 — MONITORING */}
          {step === 4 && (
            <div className="space-y-3 animate-fadeIn">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">Monitoring Behavior</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Choose the update frequency and resource balance. You can change this anytime in Settings.</p>
              </div>
              <div className="space-y-2">
                {[
                  {
                    id: 'standard',
                    label: 'Standard',
                    badge: 'Recommended',
                    desc: 'Balanced 1-second updates with less than 0.2% CPU usage.',
                    interval: '1000 ms',
                  },
                  {
                    id: 'minimal',
                    label: 'Minimal / Battery Saver',
                    badge: null,
                    desc: 'Reduced 2-second updates. Ideal for laptops or low-power systems.',
                    interval: '2000 ms',
                  },
                  {
                    id: 'advanced',
                    label: 'High-Refresh',
                    badge: 'Power user',
                    desc: 'Fast 500 ms updates for diagnostics. Slightly higher CPU usage.',
                    interval: '500 ms',
                  },
                ].map((m) => (
                  <MonitorModeCard
                    key={m.id}
                    {...m}
                    selected={config.monitoringMode === m.id}
                    onSelect={(id) => setConfig((prev) => ({ ...prev, monitoringMode: id }))}
                  />
                ))}
              </div>
            </div>
          )}

          {/* STEP 5 — STARTUP & TRAY */}
          {step === 5 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">Startup & Background</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Configure how SystemPilot launches and runs in the background.</p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden px-4">
                <ToggleRow
                  id="toggle-startup"
                  label="Start with Windows"
                  description="Adds a per-user startup entry (HKCU Run key). SystemPilot starts monitoring automatically when you log in. No administrator access required."
                  enabled={config.startWithWindows}
                  onChange={(val) => setConfig({ ...config, startWithWindows: val })}
                />
                <ToggleRow
                  id="toggle-tray"
                  label="Minimize to system tray"
                  description="When you close the window, SystemPilot continues running in the notification area. You can right-click the tray icon for quick actions."
                  enabled={config.minimizeToTray}
                  onChange={(val) => setConfig({ ...config, minimizeToTray: val })}
                />
                <ToggleRow
                  id="toggle-ram"
                  label="Automatic RAM trim on low memory"
                  description="Quietly trims process working sets when available RAM falls below a threshold. Uses only standard Windows API calls; does not terminate processes."
                  enabled={config.autoCleanRam}
                  onChange={(val) => setConfig({ ...config, autoCleanRam: val })}
                />
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  All three options can be changed at any time in Settings → Startup & Background.
                </p>
              </div>
            </div>
          )}

          {/* STEP 6 — ALERTS */}
          {step === 6 && (
            <div className="space-y-3 animate-fadeIn">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">Smart Notifications</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Choose when SystemPilot alerts you about system conditions.</p>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'recommended', label: 'Recommended', icon: Bell,     desc: 'Alert on critical RAM (>90%) and low disk (<10%)' },
                  { id: 'custom',      label: 'Customizable', icon: Settings, desc: 'Configure thresholds in Settings after setup' },
                  { id: 'disabled',    label: 'Silent Mode',  icon: Eye,      desc: 'No desktop notifications. You can re-enable later.' },
                ].map((n) => (
                  <NotifCard
                    key={n.id}
                    {...n}
                    selected={config.notifications === n.id}
                    onSelect={(id) => setConfig({ ...config, notifications: id })}
                  />
                ))}
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-2">
                <Bell className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Notifications use the standard Windows toast system. You can silence them in Windows Notification Settings at any time.
                </p>
              </div>
            </div>
          )}

          {/* STEP 7 — PERMISSIONS */}
          {step === 7 && (
            <div className="space-y-3 animate-fadeIn">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">Permissions & Windows Security</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">What access SystemPilot has and exactly why — following the Principle of Least Privilege.</p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 overflow-hidden max-h-56 overflow-y-auto">
                <PermissionRow
                  icon={HardDrive}
                  title="Installation directory (R/W)"
                  scope="Application binaries and runtime libraries"
                  reason="Required to run SystemPilot"
                  required={true}
                  color="emerald"
                />
                <PermissionRow
                  icon={Activity}
                  title="Performance counters (PDH)"
                  scope="CPU, GPU, RAM, disk, network, temperature sensors"
                  reason="Powers all monitoring dashboards — standard user API, no elevation"
                  required={true}
                  color="emerald"
                />
                <PermissionRow
                  icon={Cpu}
                  title="Process priority & working set"
                  scope="Running applications you own"
                  reason="Optional — for process manager and RAM trimmer; user-owned processes only"
                  required={false}
                  color="blue"
                />
                <PermissionRow
                  icon={Zap}
                  title="HKCU Run key"
                  scope="Current user startup entry only"
                  reason={`Optional — only if you enabled 'Start with Windows' above`}
                  required={false}
                  color={config.startWithWindows ? 'amber' : 'slate'}
                />
                <PermissionRow
                  icon={Wifi}
                  title="Outbound HTTPS (api.github.com)"
                  scope="Update version check only"
                  reason="Optional — no inbound ports, no firewall changes"
                  required={false}
                  color="slate"
                />
                <PermissionRow
                  icon={Lock}
                  title="UAC elevation (on-demand only)"
                  scope="UEFI reboot, machine-wide operations"
                  reason="Optional — standard Windows consent dialog, only when you trigger it"
                  required={false}
                  color="amber"
                />
              </div>
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/25 flex items-start gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-rose-700 dark:text-rose-400 leading-relaxed">
                  SystemPilot never opens listening ports, never disables Windows Defender or SmartScreen, never collects passwords, and never installs hidden services or scheduled tasks.
                </p>
              </div>
            </div>
          )}

          {/* STEP 8 — FINISH */}
          {step === 8 && (
            <div className="flex flex-col items-center text-center space-y-4 flex-1 justify-center animate-fadeIn">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/40 flex items-center justify-center shadow-xl shadow-emerald-500/10">
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-50">Configuration Complete</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                  Your preferences have been saved. You can adjust any of these settings at any time in the Settings page.
                </p>
              </div>

              {/* Summary */}
              <div className="w-full max-w-sm bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-1">
                <SummaryItem label="Theme"         value={config.theme === 'dark' ? 'Dark mode' : config.theme === 'light' ? 'Light mode' : 'Follow Windows'} />
                <SummaryItem label="Monitoring"    value={monitoringLabel} />
                <SummaryItem label="Start with Windows" value={config.startWithWindows ? 'Enabled' : 'Disabled'} />
                <SummaryItem label="Tray icon"     value={config.minimizeToTray ? 'Enabled' : 'Disabled'} />
                <SummaryItem label="Alerts"        value={notifLabel} />
                <SummaryItem label="RAM auto-trim" value={config.autoCleanRam ? 'Enabled' : 'Disabled'} />
              </div>

              <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed">
                Click <strong>Launch SystemPilot</strong> to open the main dashboard.
              </p>
            </div>
          )}

        </div>

        {/* ── Footer navigation ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200/60 dark:border-slate-800">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 ${
              step === 1
                ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            aria-label="Go back to previous step"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>

          <div className="flex items-center gap-2">
            {step < STEPS.length && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {STEPS.length - step} step{STEPS.length - step !== 1 ? 's' : ''} remaining
              </span>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={saving}
              className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg text-white transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 shadow-md shadow-indigo-500/25 ${
                saving
                  ? 'bg-indigo-400 cursor-wait'
                  : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 active:scale-95'
              }`}
              aria-label={step === STEPS.length ? 'Launch SystemPilot' : 'Continue to next step'}
            >
              {saving ? (
                <>
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  Saving…
                </>
              ) : step === STEPS.length ? (
                <>
                  <Rocket className="w-3.5 h-3.5" />
                  Launch SystemPilot
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FirstRunWizard;

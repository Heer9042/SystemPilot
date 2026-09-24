import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Toggle } from '../ui/Toggle';
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
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export function FirstRunWizard({ onComplete, currentTheme, toggleTheme }) {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState({
    theme: currentTheme || 'dark',
    monitoringMode: 'standard', // 'minimal', 'standard', 'advanced'
    startWithWindows: false,
    minimizeToTray: true,
    notifications: 'recommended', // 'recommended', 'custom', 'disabled'
    autoCleanRam: false,
  });

  const handleNext = () => {
    if (step < 6) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFinish = async () => {
    try {
      localStorage.setItem('first_run_completed', 'true');
      await api.setSetting('first_run_completed', 'true');
      await api.setSetting('theme', config.theme);
      await api.setSetting(
        'refresh_interval_ms',
        config.monitoringMode === 'minimal' ? '2000' : config.monitoringMode === 'advanced' ? '500' : '1000'
      );
      await api.setSetting('start_with_windows', config.startWithWindows ? 'true' : 'false');
      await api.setSetting('minimize_to_tray', config.minimizeToTray ? 'true' : 'false');
      await api.setSetting('notify_ram_threshold', config.notifications !== 'disabled' ? 'true' : 'false');
      await api.setSetting('notify_cpu_temp', config.notifications !== 'disabled' ? 'true' : 'false');
      await api.setSetting('notify_disk_low', config.notifications !== 'disabled' ? 'true' : 'false');
      onComplete();
    } catch (e) {
      console.error(e);
      localStorage.setItem('first_run_completed', 'true');
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="glass-panel w-full max-w-xl rounded-3xl p-8 shadow-2xl border border-brand-500/30 flex flex-col justify-between min-h-[500px]">
        {/* Step Progress Tracker */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-400 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-surface-950 rounded-[10px] flex items-center justify-center">
                <Gauge className="w-4 h-4 text-brand-400" />
              </div>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Setup Wizard</h2>
              <span className="text-[11px] text-slate-400">Step {step} of 6</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <span
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step ? 'w-6 bg-brand-500' : s < step ? 'w-2 bg-emerald-500' : 'w-2 bg-surface-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="py-6 flex-1 flex flex-col justify-center">
          {/* STEP 1: WELCOME */}
          {step === 1 && (
            <div className="space-y-4 text-center animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-500/40 text-brand-400 flex items-center justify-center mx-auto shadow-xl shadow-brand-500/10">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-2xl font-extrabold text-slate-100">Welcome to SystemPilot</h3>
                <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                  SystemPilot helps you monitor, manage, and safely optimize your Windows system resources with high-precision native telemetry.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-900 border border-slate-800/80 max-w-md mx-auto text-left text-xs text-slate-400 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>100% Offline-first. No accounts, no cloud sync, no tracking, and no invasive modifications.</span>
              </div>
            </div>
          )}

          {/* STEP 2: THEME */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Choose Your Appearance</h3>
                <p className="text-xs text-slate-400">Select your preferred color interface.</p>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { id: 'dark', label: 'Dark Mode', icon: Moon, desc: 'Sleek dark theme (Recommended)' },
                  { id: 'light', label: 'Light Mode', icon: Sun, desc: 'Clean bright layout' },
                  { id: 'system', label: 'Follow Windows', icon: Laptop, desc: 'Matches OS theme' },
                ].map((t) => {
                  const Icon = t.icon;
                  const isSelected = config.theme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setConfig({ ...config, theme: t.id });
                        if (t.id === 'dark' || t.id === 'light') toggleTheme(t.id);
                      }}
                      className={`p-4 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all ${
                        isSelected
                          ? 'bg-brand-600/20 border-brand-500 shadow-lg shadow-brand-500/10'
                          : 'bg-surface-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${isSelected ? 'text-brand-400' : 'text-slate-400'}`} />
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">{t.label}</span>
                        <span className="text-[10px] text-slate-400">{t.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: MONITORING BEHAVIOR */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Monitoring Behavior</h3>
                <p className="text-xs text-slate-400">Choose telemetry polling frequency and CPU resource overhead.</p>
              </div>
              <div className="space-y-2.5 pt-2">
                {[
                  { id: 'standard', label: 'Standard (1 second)', badge: 'Recommended', desc: 'Balanced polling interval with negligible CPU usage (<0.2%).' },
                  { id: 'minimal', label: 'Minimal / Battery Saver (2 seconds)', desc: 'Optimized for laptops on battery power to conserve energy.' },
                  { id: 'advanced', label: 'High Refresh (500 ms)', desc: 'Ultra-fast realtime hardware graphs for benchmarking and testing.' },
                ].map((m) => {
                  const isSelected = config.monitoringMode === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setConfig({ ...config, monitoringMode: m.id })}
                      className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                        isSelected
                          ? 'bg-brand-600/15 border-brand-500'
                          : 'bg-surface-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-200">{m.label}</h4>
                          {m.badge && <Badge variant="brand" size="xs">{m.badge}</Badge>}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{m.desc}</p>
                      </div>
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => {}}
                        className="text-brand-600 focus:ring-0 cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: STARTUP & TRAY */}
          {step === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Startup & Background Tray</h3>
                <p className="text-xs text-slate-400">Configure how SystemPilot launches and minimizes.</p>
              </div>
              <div className="space-y-3 pt-2">
                <Toggle
                  enabled={config.startWithWindows}
                  onChange={(val) => setConfig({ ...config, startWithWindows: val })}
                  label="Start SystemPilot with Windows"
                  description="Starts monitoring automatically on user logon."
                />
                <Toggle
                  enabled={config.minimizeToTray}
                  onChange={(val) => setConfig({ ...config, minimizeToTray: val })}
                  label="Run in System Tray"
                  description="Allows quick access to RAM cleaner and power profiles from taskbar."
                />
              </div>
            </div>
          )}

          {/* STEP 5: SMART ALERTS */}
          {step === 5 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Smart Notifications</h3>
                <p className="text-xs text-slate-400">Choose when SystemPilot alerts you about system conditions.</p>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { id: 'recommended', label: 'Recommended', desc: 'Alert only on critical RAM (>90%) and low disk (<10%)' },
                  { id: 'custom', label: 'Customizable', desc: 'Configure exact alert thresholds in Settings' },
                  { id: 'disabled', label: 'Silent Mode', desc: 'No popup desktop notifications' },
                ].map((n) => {
                  const isSelected = config.notifications === n.id;
                  return (
                    <button
                      key={n.id}
                      onClick={() => setConfig({ ...config, notifications: n.id })}
                      className={`p-3.5 rounded-xl border text-left flex flex-col justify-between gap-2 transition ${
                        isSelected
                          ? 'bg-brand-600/20 border-brand-500 shadow-md'
                          : 'bg-surface-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <Bell className={`w-5 h-5 ${isSelected ? 'text-brand-400' : 'text-slate-400'}`} />
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">{n.label}</span>
                        <span className="text-[10px] text-slate-400">{n.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 6: PERMISSION & READY */}
          {step === 6 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Permissions & Ready</h3>
                <p className="text-xs text-slate-400">Understand Windows permissions and finish setup.</p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-900/90 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Administrative Permissions Notice</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Some advanced SystemPilot features (such as adjusting process priority or trimming certain protected service working sets) may prompt for standard Windows Administrator elevation.
                </p>
                <p className="text-slate-400 text-[11px]">
                  SystemPilot never modifies Windows kernel files or security software silently.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-emerald-400 pt-1">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Configuration complete. You are ready to launch SystemPilot.</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            disabled={step === 1}
            icon={ArrowLeft}
            onClick={handleBack}
          >
            Back
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={step === 6 ? CheckCircle2 : ArrowRight}
            onClick={handleNext}
            className="px-6 shadow-lg shadow-brand-600/30"
          >
            {step === 6 ? 'Launch SystemPilot' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
export default FirstRunWizard;

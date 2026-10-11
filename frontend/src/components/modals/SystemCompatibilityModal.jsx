import React, { useState, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Tv,
  Layers,
  HardDrive,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Info,
  Lock,
  RotateCcw,
  Copy,
  Laptop,
  Monitor,
  Server,
  Wind,
  Filter,
} from 'lucide-react';

const STATUS_CONFIG = {
  Supported: {
    badge: 'success',
    label: 'Supported',
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40',
  },
  ReadOnly: {
    badge: 'neutral',
    label: 'Read-Only',
    icon: Info,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40',
  },
  PermissionRequired: {
    badge: 'warning',
    label: 'Permission Required',
    icon: Lock,
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40',
  },
  DependencyRequired: {
    badge: 'brand',
    label: 'Dependency Required',
    icon: Layers,
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/40',
  },
  Unsupported: {
    badge: 'neutral',
    label: 'Unsupported',
    icon: AlertTriangle,
    color: 'text-slate-400',
    bg: 'bg-slate-50 dark:bg-surface-800/50 border-slate-200 dark:border-slate-800',
  },
  TemporarilyUnavailable: {
    badge: 'danger',
    label: 'Unavailable',
    icon: AlertTriangle,
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40',
  },
};

export function SystemCompatibilityModal({ isOpen, onClose, report, onRefresh, loading }) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [copied, setCopied] = useState(false);

  const env = report?.environment;
  const features = report?.features || [];

  const categories = useMemo(() => {
    const set = new Set(features.map((f) => f.category));
    return ['All', ...Array.from(set)];
  }, [features]);

  const filteredFeatures = useMemo(() => {
    return features.filter((f) => {
      if (selectedCategory !== 'All' && f.category !== selectedCategory) return false;
      if (selectedStatus !== 'All' && f.status !== selectedStatus) return false;
      return true;
    });
  }, [features, selectedCategory, selectedStatus]);

  const handleCopyReport = () => {
    if (!report) return;
    const lines = [
      `# SystemPilot Compatibility & Hardware Adaptation Report`,
      `Generated: ${report.last_scanned}`,
      `Rating: ${report.overall_compatibility_rating}`,
      `Supported Features: ${report.supported_features_count} / ${report.total_features_count}`,
      ``,
      `## Environment Profile`,
      `- OS: ${env?.os_name} (${env?.edition} Edition)`,
      `- Build: ${env?.build_number} (${env?.is_supported_windows ? 'Supported' : 'Legacy / Unsupported'})`,
      `- Architecture: ${env?.architecture}`,
      `- Device Type: ${env?.form_factor}`,
      `- Virtual Machine: ${env?.is_virtual_machine ? `Yes (${env?.vm_hypervisor || 'Generic Hypervisor'})` : 'No (Physical Bare-Metal)'}`,
      `- Battery Present: ${env?.has_battery ? 'Yes (Mobile Device)' : 'No (Continuous AC Mains)'}`,
      `- Process Elevation: ${env?.is_elevated ? 'Administrator (High Integrity)' : 'Standard User (Medium Integrity)'}`,
      `- Primary GPU: ${env?.primary_gpu_name} (${env?.primary_gpu_type})`,
      `- Storage Volumes: ${env?.storage_volumes_count}`,
      `- WebView2 Runtime: ${env?.webview2_available ? `Installed (v${env?.webview2_version || 'Active'})` : 'Missing'}`,
      ``,
      `## Feature Capabilities Matrix`,
      ...features.map(
        (f) =>
          `- [${f.status}] ${f.name} (${f.category}): ${f.reason}${f.action_hint ? ` (Hint: ${f.action_hint})` : ''}`
      ),
    ];

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const FormFactorIcon = env?.is_virtual_machine
    ? Server
    : env?.has_battery
    ? Laptop
    : Monitor;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="System Compatibility & Hardware Adaptation"
      className="max-w-4xl"
    >
      <div className="space-y-4 text-xs">
        {/* Top Summary Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-brand-50 to-indigo-50/50 dark:from-brand-950/20 dark:to-surface-800/80 border border-brand-200/60 dark:border-brand-500/20 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-500 text-white shadow-md shadow-brand-500/25">
                <FormFactorIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                    {env?.os_name || 'Windows Environment'}
                  </h3>
                  <Badge variant="brand" size="xs">
                    {env?.architecture || 'x64'}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {env?.computer_manufacturer} • {env?.computer_model} • {env?.form_factor}
                </p>
              </div>
            </div>

            <Badge
              variant={
                report?.overall_compatibility_rating?.includes('Fully')
                  ? 'success'
                  : 'brand'
              }
              size="sm"
            >
              {report?.overall_compatibility_rating || 'Evaluating...'}
            </Badge>
          </div>

          {/* Quick Hardware Environment Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-brand-200/40 dark:border-brand-500/10">
            <div className="p-2 rounded-lg bg-white/70 dark:bg-surface-900/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">OS Build</span>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {env?.build_number} {env?.is_supported_windows ? '✓ Supported' : '⚠ Unsupported'}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-white/70 dark:bg-surface-900/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Elevation Level</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {env?.is_elevated ? 'Administrator (Elevated)' : 'Standard User (Safe)'}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-white/70 dark:bg-surface-900/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Primary Display</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate" title={env?.primary_gpu_name}>
                {env?.primary_gpu_type}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-white/70 dark:bg-surface-900/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Supported Features</span>
              <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {report?.supported_features_count} / {report?.total_features_count} Active
              </p>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] text-slate-400">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-900 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="All">All States ({features.length})</option>
              <option value="Supported">Supported</option>
              <option value="ReadOnly">Read-Only</option>
              <option value="PermissionRequired">Permission Required</option>
              <option value="Unsupported">Unsupported</option>
            </select>
          </div>
        </div>

        {/* Feature Capabilities Grid */}
        <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
          {filteredFeatures.map((feat) => {
            const conf = STATUS_CONFIG[feat.status] || STATUS_CONFIG.Unsupported;
            const Icon = conf.icon;
            return (
              <div
                key={feat.id}
                className={`p-3 rounded-xl border ${conf.bg} flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 transition`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${conf.color} shrink-0`} />
                    <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {feat.name}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      • {feat.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    {feat.reason}
                  </p>
                  {feat.action_hint && (
                    <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1 mt-0.5">
                      <Info className="w-3 h-3 shrink-0" />
                      <span>{feat.action_hint}</span>
                    </div>
                  )}
                </div>

                <div className="shrink-0 self-start sm:self-center">
                  <Badge variant={conf.badge} size="xs">
                    {conf.label}
                  </Badge>
                </div>
              </div>
            );
          })}

          {filteredFeatures.length === 0 && (
            <div className="p-8 text-center text-slate-400 space-y-1">
              <CheckCircle2 className="w-6 h-6 mx-auto opacity-40 text-brand-500" />
              <p>No features match the selected filter.</p>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-mono text-slate-400">
            Last Telemetry Scan: {report?.last_scanned || 'Active session'}
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="xs"
              icon={RotateCcw}
              onClick={onRefresh}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="xs"
              icon={Copy}
              onClick={handleCopyReport}
            >
              {copied ? 'Copied Diagnostic Data!' : 'Copy Compatibility Info'}
            </Button>
            <Button variant="primary" size="xs" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

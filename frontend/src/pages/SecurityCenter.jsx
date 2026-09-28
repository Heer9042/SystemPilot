import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { api } from '../services/tauriApi';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Lock,
  Unlock,
  Key,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  ExternalLink,
  Cpu,
  Server,
  Globe,
  Home,
  Building,
  Info,
  Copy,
  Check,
} from 'lucide-react';

function openWindowsSecurity() {
  if (window.__TAURI_INTERNALS__ || window.__TAURI__) {
    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke('open_release_notes', { url: 'ms-settings:windowsdefender' }).catch(() => {});
    });
  }
}

function openFirewallSettings() {
  if (window.__TAURI_INTERNALS__ || window.__TAURI__) {
    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke('open_release_notes', { url: 'ms-settings:windowsdefender' }).catch(() => {});
    });
  }
}

export function SecurityCenter() {
  const [security, setSecurity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchSecurity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSecurityStatus();
      setSecurity(data);
    } catch (e) {
      console.error('Security status fetch failed:', e);
      setError('Unable to retrieve security status. Some information may require standard administrator permissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSecurity();
  }, [fetchSecurity]);

  const warningCount = security?.warnings_count ?? 0;
  const overallBadgeVariant = warningCount === 0 ? 'success' : warningCount <= 2 ? 'warning' : 'danger';
  const overallText =
    warningCount === 0
      ? 'Active Protection'
      : warningCount === 1
      ? '1 Security Notice'
      : `${warningCount} Security Notices`;

  const handleCopyReport = () => {
    if (!security) return;
    const report = `
=== SystemPilot Windows Security Assessment ===
Antivirus Provider: ${security.antivirus_provider || 'Microsoft Defender Antivirus'}
Real-Time Protection: ${security.defender_enabled ? 'Active' : 'Disabled / Suspended'}
Firewall Overall: ${security.firewall_enabled ? 'Enabled' : 'Disabled'}
Firewall Profiles: Domain=${security.firewall_domain ? 'ON' : 'OFF'}, Private=${security.firewall_private ? 'ON' : 'OFF'}, Public=${security.firewall_public ? 'ON' : 'OFF'}
User Account Control (UAC): ${security.uac_enabled ? 'Active (Standard)' : 'Disabled'}
Secure Boot: ${security.secure_boot_status}
TPM Security Processor: ${security.tpm_status}
Security Notices: ${security.warnings_count}
Note: SystemPilot is a diagnostic utility and does not replace dedicated antivirus software.
==============================================
    `.trim();

    navigator.clipboard?.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-500 dark:text-brand-400" />
            Windows Security & Diagnostics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real Windows Defender status, multi-profile firewall states, Secure Boot, and hardware TPM telemetry
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && security && (
            <Badge variant={overallBadgeVariant} size="md">
              {overallText}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            icon={copied ? Check : Copy}
            onClick={handleCopyReport}
            className={copied ? 'text-emerald-600 border-emerald-500' : ''}
          >
            {copied ? 'Report Copied!' : 'Copy Security Report'}
          </Button>
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={fetchSecurity} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Safety Notice Banner */}
      <Card className="p-3.5 bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-500/20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs text-blue-900 dark:text-blue-200">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <span>
            SystemPilot provides read-only Windows security telemetry. It never modifies security policies or disables protections.
          </span>
        </div>
        <Button variant="ghost" size="xs" icon={ExternalLink} onClick={openWindowsSecurity} className="text-blue-600 dark:text-blue-400 flex-shrink-0">
          Open Windows Security
        </Button>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Antivirus & Real-Time Monitoring */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className={`w-5 h-5 ${security?.defender_enabled ? 'text-emerald-500' : 'text-red-500'}`} />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Antivirus Provider</h3>
            </div>
            <Badge variant={security?.defender_enabled ? 'success' : 'danger'} size="xs">
              {security?.defender_enabled ? 'Protected' : 'Action Required'}
            </Badge>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="font-semibold text-slate-900 dark:text-slate-200">
              {security?.antivirus_provider || 'Microsoft Defender Antivirus'}
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
              {security?.defender_enabled
                ? 'Real-time background scanning is active and defending against file threats and scripts.'
                : 'Real-time protection is currently reported inactive or turned off. Verify active antivirus software.'}
            </p>
          </div>

          {!security?.defender_enabled && (
            <Button variant="outline" size="xs" icon={ExternalLink} onClick={openWindowsSecurity} fullWidth>
              Review Antivirus in Windows Security
            </Button>
          )}
        </Card>

        {/* Windows Firewall */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Lock className={`w-5 h-5 ${security?.firewall_enabled ? 'text-emerald-500' : 'text-amber-500'}`} />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Network Firewall</h3>
            </div>
            <Badge variant={security?.firewall_enabled ? 'success' : 'warning'} size="xs">
              {security?.firewall_enabled ? 'Enabled' : 'Warning'}
            </Badge>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 text-[11px]">
            Monitors incoming and outgoing network packet connections across network profiles:
          </p>

          <div className="space-y-1.5 pt-1 text-xs font-mono">
            <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-surface-800/40">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Globe className="w-3.5 h-3.5 text-cyan-500" /> Public Profile:
              </span>
              <Badge variant={security?.firewall_public ? 'success' : 'danger'} size="xs">
                {security?.firewall_public ? 'ON' : 'OFF'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-surface-800/40">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Home className="w-3.5 h-3.5 text-indigo-500" /> Private Profile:
              </span>
              <Badge variant={security?.firewall_private ? 'success' : 'danger'} size="xs">
                {security?.firewall_private ? 'ON' : 'OFF'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-surface-800/40">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Building className="w-3.5 h-3.5 text-purple-500" /> Domain Profile:
              </span>
              <Badge variant={security?.firewall_domain ? 'success' : 'danger'} size="xs">
                {security?.firewall_domain ? 'ON' : 'OFF'}
              </Badge>
            </div>
          </div>
        </Card>

        {/* User Account Control (UAC) */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Key className={`w-5 h-5 ${security?.uac_enabled ? 'text-indigo-500' : 'text-amber-500'}`} />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">User Account Control</h3>
            </div>
            <Badge variant={security?.uac_enabled ? 'success' : 'warning'} size="xs">
              {security?.uac_enabled ? 'Active' : 'Disabled'}
            </Badge>
          </div>

          <div className="space-y-2 text-xs">
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
              {security?.uac_enabled
                ? 'UAC consent prompts prevent untrusted applications from executing unauthorized administrative system modifications.'
                : 'UAC is turned off. Software can make system changes without prompting for user permission.'}
            </p>
            <div className="p-2.5 rounded bg-slate-50 dark:bg-surface-800/40 text-[11px] font-mono text-slate-600 dark:text-slate-300">
              Status: {security?.uac_enabled ? 'Standard Protection Level' : 'Unrestricted Execution'}
            </div>
          </div>
        </Card>

        {/* Secure Boot Firmware */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-5 h-5 text-brand-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Secure Boot</h3>
            </div>
            <Badge
              variant={
                security?.secure_boot_status === 'Enabled'
                  ? 'success'
                  : security?.secure_boot_status === 'Disabled'
                  ? 'danger'
                  : 'neutral'
              }
              size="xs"
            >
              {security?.secure_boot_status || 'Unknown'}
            </Badge>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
            {security?.secure_boot_status === 'Enabled' ? (
              <p>Secure Boot is active. Only cryptographically signed bootloaders and kernel drivers can execute at startup.</p>
            ) : security?.secure_boot_status === 'Disabled' ? (
              <p>Secure Boot is currently disabled in system UEFI firmware settings.</p>
            ) : (
              <p>Secure Boot is not supported or the system is operating in legacy BIOS compatibility mode.</p>
            )}
          </div>
        </Card>

        {/* TPM Security Processor */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Server className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">TPM Module</h3>
            </div>
            <Badge
              variant={security?.tpm_status && !security.tpm_status.includes('Not') ? 'success' : 'neutral'}
              size="xs"
            >
              {security?.tpm_status && !security.tpm_status.includes('Not') ? 'Hardware Chip' : 'Not Exposed'}
            </Badge>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="font-semibold text-slate-900 dark:text-slate-200">
              {security?.tpm_status || 'Trusted Platform Module'}
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              Provides hardware-rooted cryptographic measurement, platform integrity attestation, and Windows Hello credentials isolation.
            </p>
          </div>
        </Card>

        {/* Security Recommendations & Action Center */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Diagnostics Summary</h3>
            </div>
            <Badge variant="neutral" size="xs">Local Diagnostics</Badge>
          </div>

          <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
            {warningCount === 0 ? (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                No active security warnings detected across inspected Windows settings.
              </p>
            ) : (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                {warningCount} security settings require your review in Windows Settings.
              </p>
            )}
          </div>

          <Button variant="primary" size="xs" icon={ExternalLink} onClick={openWindowsSecurity} fullWidth>
            Launch Windows Security App
          </Button>
        </Card>
      </div>
    </div>
  );
}
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
} from 'lucide-react';

function SecurityStatusCard({ icon: Icon, iconColor, title, statusBadge, description, actionLabel, onAction }) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">{title}</h3>
        </div>
        {statusBadge}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button variant="ghost" size="xs" icon={ExternalLink} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}

function getDefenderBadge(enabled) {
  if (enabled) return <Badge variant="success" size="xs">Protected</Badge>;
  return <Badge variant="danger" size="xs">Disabled</Badge>;
}

function getFirewallBadge(enabled) {
  if (enabled) return <Badge variant="success" size="xs">Enabled</Badge>;
  return <Badge variant="danger" size="xs">Disabled</Badge>;
}

function getUacBadge(enabled) {
  if (enabled) return <Badge variant="success" size="xs">Active</Badge>;
  return <Badge variant="warning" size="xs">Disabled</Badge>;
}

function getSecureBootBadge(status) {
  if (!status || status === 'Unknown') return <Badge variant="neutral" size="xs">Unknown</Badge>;
  if (status === 'Enabled') return <Badge variant="success" size="xs">Enabled</Badge>;
  if (status === 'Disabled') return <Badge variant="danger" size="xs">Disabled</Badge>;
  // "Not supported on this system"
  return <Badge variant="neutral" size="xs">Not supported</Badge>;
}

function openWindowsSecurity() {
  // Navigate user to Windows Security center — we never modify security settings ourselves
  if (window.__TAURI_INTERNALS__ || window.__TAURI__) {
    import('@tauri-apps/api/core').then(({ invoke }) => {
      // Use shell open or direct command — safe, no modification
      invoke('open_release_notes', { url: 'ms-settings:windowsdefender' }).catch(() => {
        // Fallback: nothing — user can open it manually
      });
    });
  }
}

export function SecurityCenter() {
  const [security, setSecurity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSecurity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSecurityStatus();
      setSecurity(data);
    } catch (e) {
      console.error('Security status fetch failed:', e);
      setError('Unable to retrieve security status. Some information may require administrator privileges.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSecurity();
  }, [fetchSecurity]);

  const warningCount = security?.warnings_count ?? 0;
  const overallStatus = warningCount === 0
    ? 'Protected'
    : warningCount === 1
    ? '1 Warning'
    : `${warningCount} Warnings`;

  const overallColor = warningCount === 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-amber-600 dark:text-amber-400';

  const OverallIcon = warningCount === 0 ? ShieldCheck : ShieldAlert;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <OverallIcon className={`w-5 h-5 ${overallColor}`} />
            System Security Status
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Windows security features detected on this computer
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && security && (
            <Badge variant={warningCount === 0 ? 'success' : 'warning'} size="md">
              {overallStatus}
            </Badge>
          )}
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={fetchSecurity} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <SecurityContent loading={loading} error={error} security={security} />
    </div>
  );
}

function SecurityOverviewCards({ security }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Windows Defender / Antivirus */}
      <SecurityStatusCard
        icon={security.defender_enabled ? ShieldCheck : ShieldOff}
        iconColor={security.defender_enabled
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-red-500 dark:text-red-400'}
        title="Antivirus Protection"
        statusBadge={getDefenderBadge(security.defender_enabled)}
        description={
          security.defender_enabled
            ? 'Windows Defender real-time protection is active and monitoring for threats.'
            : 'Windows Defender real-time protection appears to be disabled. Ensure a compatible antivirus is running.'
        }
        actionLabel={security.defender_enabled ? undefined : 'Open Windows Security'}
        onAction={security.defender_enabled ? undefined : openWindowsSecurity}
      />

      {/* Windows Firewall */}
      <SecurityStatusCard
        icon={security.firewall_enabled ? Lock : Unlock}
        iconColor={security.firewall_enabled
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-red-500 dark:text-red-400'}
        title="Windows Firewall"
        statusBadge={getFirewallBadge(security.firewall_enabled)}
        description={
          security.firewall_enabled
            ? 'Network firewall is protecting this computer on active network profiles.'
            : 'Windows Firewall is not enabled on one or more network profiles. This may expose the system to network threats.'
        }
        actionLabel={security.firewall_enabled ? undefined : 'Open Firewall Settings'}
        onAction={security.firewall_enabled ? undefined : openWindowsSecurity}
      />

      {/* User Account Control */}
      <SecurityStatusCard
        icon={Key}
        iconColor={security.uac_enabled
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-amber-500 dark:text-amber-400'}
        title="User Account Control"
        statusBadge={getUacBadge(security.uac_enabled)}
        description={
          security.uac_enabled
            ? 'User Account Control is active. Applications must request permission for elevated actions.'
            : 'User Account Control is disabled. Applications can make system changes without prompts, which reduces protection.'
        }
      />
    </div>
  );
}

function SecurityFirmwareCards({ security }) {
  const secureBootColor =
    security.secure_boot_status === 'Enabled'
      ? 'text-emerald-600 dark:text-emerald-400'
      : security.secure_boot_status === 'Disabled'
      ? 'text-red-500 dark:text-red-400'
      : 'text-slate-400 dark:text-slate-500';

  const secureBootDesc =
    security.secure_boot_status === 'Enabled'
      ? 'Secure Boot is enabled. Only trusted firmware and bootloaders are permitted at startup.'
      : security.secure_boot_status === 'Disabled'
      ? 'Secure Boot is disabled. Consider enabling it in firmware settings if supported.'
      : security.secure_boot_status === 'Not supported on this system'
      ? 'Secure Boot is not supported on this system firmware, or this computer uses legacy BIOS mode.'
      : 'Secure Boot status could not be determined on this system.';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Secure Boot */}
      <SecurityStatusCard
        icon={Cpu}
        iconColor={secureBootColor}
        title="Secure Boot"
        statusBadge={getSecureBootBadge(security.secure_boot_status)}
        description={secureBootDesc}
      />

      {/* Informational — what SystemPilot can and cannot do */}
      <Card className="p-4 space-y-2 border-blue-200 dark:border-blue-500/20 bg-blue-50/40 dark:bg-blue-950/20">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">About Security Information</h3>
        </div>
        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 leading-relaxed list-disc list-inside">
          <li>Security status is read directly from Windows registry</li>
          <li>SystemPilot never modifies security settings</li>
          <li>Use Windows Security app to change protection settings</li>
          <li>Some enterprise environments may restrict security visibility</li>
        </ul>
        <Button
          variant="ghost"
          size="xs"
          icon={ExternalLink}
          onClick={openWindowsSecurity}
          className="text-blue-600 dark:text-blue-400 mt-1"
        >
          Open Windows Security
        </Button>
      </Card>
    </div>
  );
}

function SecurityContent({ loading, error, security }) {
  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Reading Windows security status...
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Security status partially unavailable</p>
            <p className="text-xs text-amber-700 dark:text-amber-300">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  if (!security) {
    return (
      <Card className="p-8 text-center space-y-2">
        <ShieldAlert className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Security information unavailable</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Windows security status could not be read on this system.
        </p>
      </Card>
    );
  }

  return (
    <>
      <SecurityOverviewCards security={security} />
      <SecurityFirmwareCards security={security} />
    </>
  );
}
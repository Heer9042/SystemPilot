import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { api } from '../services/tauriApi';
import {
  CircuitBoard,
  Cpu,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Layers,
  HardDrive,
  Lock,
  Info,
  Server,
  HelpCircle,
} from 'lucide-react';

function BiosHeader({ onRefresh, onOpenRestartModal }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-500/20">
            <CircuitBoard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">BIOS / UEFI Diagnostics</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Firmware architecture, Secure Boot state, SMBIOS version & UEFI boot configuration
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={RefreshCw}
          onClick={onRefresh}
        >
          Refresh
        </Button>

        <Button
          variant="danger"
          size="sm"
          icon={RotateCcw}
          onClick={onOpenRestartModal}
        >
          Restart to UEFI
        </Button>
      </div>
    </div>
  );
}

function BiosOverviewCards({ bios, isUefi, isSecureBootOn }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Firmware Architecture</span>
          <CircuitBoard className="w-4 h-4 text-brand-500" />
        </div>
        <div className="my-2">
          <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">
            {bios?.firmware_type || 'UEFI'}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isUefi ? '64-bit Unified Extensible Firmware' : 'Legacy Compatibility Mode'}
          </p>
        </div>
        <Badge variant={isUefi ? 'success' : 'warning'} size="xs" className="w-fit">
          {bios?.uefi_boot_status || 'UEFI Native'}
        </Badge>
      </Card>

      <Card className="flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Secure Boot</span>
          <Lock className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="my-2">
          <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">
            {bios?.secure_boot_status || 'Enabled'}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Hardware integrity verification</p>
        </div>
        <Badge variant={isSecureBootOn ? 'success' : 'neutral'} size="xs" className="w-fit">
          {isSecureBootOn ? 'Protection Active' : 'Unenforced'}
        </Badge>
      </Card>

      <Card className="flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Security Processor (TPM)</span>
          <ShieldCheck className="w-4 h-4 text-indigo-500" />
        </div>
        <div className="my-2">
          <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">
            {bios?.tpm_present ? 'TPM 2.0' : 'Unavailable'}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Hardware cryptographic module</p>
        </div>
        <Badge variant={bios?.tpm_present ? 'success' : 'warning'} size="xs" className="w-fit">
          {bios?.tpm_version || 'Not Detected'}
        </Badge>
      </Card>

      <Card className="flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>SMBIOS Standard</span>
          <Server className="w-4 h-4 text-cyan-500" />
        </div>
        <div className="my-2">
          <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">
            {bios?.smbios_version || 'v3.0'}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">System Management BIOS spec</p>
        </div>
        <Badge variant="neutral" size="xs" className="w-fit">
          Industry Standard
        </Badge>
      </Card>
    </div>
  );
}

function BiosDetailedSpecs({ bios }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="p-4 space-y-3">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
          <CircuitBoard className="w-3.5 h-3.5 text-brand-500" /> Firmware Identification
        </h3>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          <div className="py-2 flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">BIOS Vendor</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{bios?.bios_vendor || 'Unknown'}</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Firmware Version</span>
            <span className="font-mono font-semibold text-brand-600 dark:text-brand-400">{bios?.bios_version || 'Unknown'}</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Release Date</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{bios?.bios_release_date || 'Unknown'}</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Boot Manager</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{bios?.boot_mode || 'Windows Boot Manager'}</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">UEFI Restart Supported</span>
            <Badge variant={bios?.restart_to_uefi_supported ? 'success' : 'neutral'} size="xs">
              {bios?.restart_to_uefi_supported ? 'Supported' : 'Not supported in Legacy'}
            </Badge>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-indigo-500" /> Host System & Virtualization
        </h3>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          <div className="py-2 flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">System Manufacturer</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{bios?.system_manufacturer || 'Unavailable'}</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Model Name</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{bios?.system_model || 'Unavailable'}</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">CPU Virtualization</span>
            <Badge variant={bios?.virtualization_enabled ? 'success' : 'warning'} size="xs">
              {bios?.virtualization_enabled ? 'Active / Supported' : 'Disabled in BIOS'}
            </Badge>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Virtualization Technology</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{bios?.cpu_virtualization_type || 'Unknown'}</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Hyper-V / Virtual Machine Platform</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">Supported by CPU</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function BiosSafetyNotice() {
  return (
    <Card className="p-4 space-y-3">
      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5 text-brand-500" /> Firmware Management & Safety Notice
      </h3>
      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        Motherboard and system firmware (BIOS/UEFI) settings are strictly controlled at the hardware level by the computer manufacturer. Modern Windows security architectures deliberately isolate firmware configuration from standard user-space applications to prevent unauthorized low-level tampering.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-surface-900/40 text-xs space-y-1">
          <span className="font-bold text-slate-700 dark:text-slate-200">Firmware Updates</span>
          <p className="text-[11px] text-slate-500">
            Always download BIOS/UEFI updates directly from your computer manufacturer&apos;s verified support portal.
          </p>
        </div>
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-surface-900/40 text-xs space-y-1">
          <span className="font-bold text-slate-700 dark:text-slate-200">Secure Boot Keys</span>
          <p className="text-[11px] text-slate-500">
            Secure Boot validates cryptographic signatures on bootloaders, preventing unauthorized pre-boot malware.
          </p>
        </div>
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-surface-900/40 text-xs space-y-1">
          <span className="font-bold text-slate-700 dark:text-slate-200">Hardware Access</span>
          <p className="text-[11px] text-slate-500">
            Use &apos;Restart to UEFI&apos; to safely enter the manufacturer&apos;s setup utility during the next reboot.
          </p>
        </div>
      </div>
    </Card>
  );
}

function BiosRestartModal({
  isOpen,
  onClose,
  restarting,
  restartMessage,
  restartError,
  onConfirmRestart,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Restart to UEFI Firmware Settings"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Important: Save All Unsaved Work Now</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              Triggering a firmware reboot will restart your computer immediately and launch your motherboard&apos;s UEFI setup menu. Any open documents or unsaved progress will be lost.
            </p>
          </div>
        </div>

        {restartError && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 text-xs">
            {restartError}
          </div>
        )}

        {restartMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs">
            {restartMessage}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={RotateCcw}
            disabled={restarting}
            onClick={onConfirmRestart}
          >
            {restarting ? 'Executing...' : 'Confirm & Restart to UEFI'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function BiosUefi() {
  const [bios, setBios] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [restartMessage, setRestartMessage] = useState(null);
  const [restartError, setRestartError] = useState(null);

  const fetchBiosInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBiosFirmwareInfo();
      setBios(data);
    } catch (e) {
      console.error('Failed to fetch BIOS info:', e);
      setError('Unable to read BIOS/UEFI firmware information from system registry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBiosInfo();
  }, [fetchBiosInfo]);

  const handleRestartToUefi = async () => {
    setRestarting(true);
    setRestartError(null);
    try {
      const res = await api.restartToUefiFirmware();
      setRestartMessage(res || 'Reboot scheduled. Computer will restart into UEFI in 1 second.');
    } catch (e) {
      setRestartError(e.message || 'Failed to trigger UEFI restart. Administrator privileges may be required.');
    } finally {
      setRestarting(false);
    }
  };

  if (loading && !bios) {
    return (
      <div className="space-y-4 animate-fadeIn">
        <Card className="p-8 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Reading System Firmware & BIOS / UEFI Configuration...
          </p>
        </Card>
      </div>
    );
  }

  const isUefi = bios?.firmware_type?.toLowerCase().includes('uefi') ?? true;
  const isSecureBootOn = bios?.secure_boot_status === 'Enabled';

  return (
    <div className="space-y-5 animate-fadeIn text-slate-800 dark:text-slate-100 pb-12">
      <BiosHeader
        onRefresh={fetchBiosInfo}
        onOpenRestartModal={() => setShowRestartModal(true)}
      />

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <BiosOverviewCards
        bios={bios}
        isUefi={isUefi}
        isSecureBootOn={isSecureBootOn}
      />

      <BiosDetailedSpecs bios={bios} />

      <BiosSafetyNotice />

      <BiosRestartModal
        isOpen={showRestartModal}
        onClose={() => {
          setShowRestartModal(false);
          setRestartMessage(null);
          setRestartError(null);
        }}
        restarting={restarting}
        restartMessage={restartMessage}
        restartError={restartError}
        onConfirmRestart={handleRestartToUefi}
      />
    </div>
  );
}

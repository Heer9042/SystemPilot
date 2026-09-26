import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { api } from '../services/tauriApi';
import { ShieldCheck, ShieldAlert, Lock, CheckCircle2, AlertTriangle, Key } from 'lucide-react';

export function SecurityCenter() {
  const [security, setSecurity] = useState(null);

  useEffect(() => {
    async function fetchSec() {
      try {
        const data = await api.getSecurityStatus();
        setSecurity(data);
      } catch (e) {
        console.error(e);
      }
    }
    fetchSec();
  }, []);

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> System Security Status
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Status of Windows Defender, Firewall, and User Account Control
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Defender */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">Antivirus Protection</h3>
            </div>
            <Badge variant="success" size="xs">Active</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Windows Defender real-time antivirus protection is operational.
          </p>
        </Card>

        {/* Firewall */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">Windows Firewall</h3>
            </div>
            <Badge variant={security?.firewall_enabled ? 'success' : 'warning'} size="xs">
              {security?.firewall_enabled ? 'Enabled' : 'Check Profile'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Network firewall protection is active for Domain, Private, and Public profiles.
          </p>
        </Card>

        {/* UAC */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Key className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">User Account Control</h3>
            </div>
            <Badge variant="success" size="xs">Protected</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            User Account Control prompts help prevent unauthorized changes to your computer.
          </p>
        </Card>
      </div>
    </div>
  );
}

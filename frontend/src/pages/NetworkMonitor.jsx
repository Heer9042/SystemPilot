import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { AreaChartLive } from '../components/charts/AreaChartLive';
import { api } from '../services/tauriApi';
import { formatBytes, formatSpeed } from '../utils/formatters';
import { Wifi, ArrowDownRight, ArrowUpRight, Globe, ShieldCheck } from 'lucide-react';

export function NetworkMonitor({ stats, history }) {
  const [interfaces, setInterfaces] = useState([]);
  const isFetchingRef = React.useRef(false);

  const fetchNet = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const list = await api.getNetworkDetails();
      setInterfaces(list || []);
    } catch (e) {
      console.error(e);
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchNet();
    const interval = setInterval(fetchNet, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Live Download & Upload Speed Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Real-time Download Throughput</h3>
            </div>
            <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {formatSpeed(stats?.net_download_bytes_sec || 0)}
            </span>
          </div>
          <AreaChartLive data={history.netDown} color="#10b981" unit="KB/s" height={100} domain={[0, 'auto']} />
        </Card>

        <Card className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Real-time Upload Throughput</h3>
            </div>
            <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {formatSpeed(stats?.net_upload_bytes_sec || 0)}
            </span>
          </div>
          <AreaChartLive data={history.netUp} color="#6366f1" unit="KB/s" height={100} domain={[0, 'auto']} />
        </Card>
      </div>

      {/* Network Adapters List */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-brand-500 dark:text-brand-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Network Interfaces & IP Configuration</h3>
          </div>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
          {interfaces.map((iface, idx) => (
            <div key={idx} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900 dark:text-slate-200 text-xs">{iface.name}</span>
                  <Badge variant={iface.is_up ? 'success' : 'neutral'} size="xs">
                    {iface.is_up ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>MAC: {iface.mac_address || 'N/A'}</span>
                  <span>IP: {iface.ip_addresses?.join(', ') || 'No IPv4/IPv6 assigned'}</span>
                </div>
              </div>

              <div className="text-right text-xs font-mono">
                <div className="text-slate-800 dark:text-slate-300">↓ {formatBytes(iface.total_received_bytes)}</div>
                <div className="text-slate-500 dark:text-slate-400">↑ {formatBytes(iface.total_transmitted_bytes)}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

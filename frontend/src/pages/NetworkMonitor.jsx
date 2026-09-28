import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { ExpandableSectionHeader } from '../components/ui/ExpandableSectionHeader';
import { ProcessTableHead } from '../components/ui/ProcessTableHead';
import { api } from '../services/tauriApi';
import { formatBytes, formatSpeed } from '../utils/formatters';
import {
  Wifi,
  Radio,
  Network,
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Globe,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Pause,
  Play,
  Download,
  Copy,
  Check,
  Search,
  RefreshCw,
  Clock,
  Info,
  Server,
  Terminal,
  Send,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
const NetworkTimelineChart = lazy(() =>
  import('recharts').then((m) => ({
    default: ({ filteredHistory }) => (
      <m.ResponsiveContainer width="100%" height="100%">
        <m.AreaChart data={filteredHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="downGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="upGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <m.XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} minTickGap={30} />
          <m.YAxis tick={{ fontSize: 10, fill: '#64748b' }} domain={[0, 'auto']} />
          <m.Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
            }}
          />
          <m.Area
            type="monotone"
            dataKey="downMb"
            name="Download (MB/s)"
            stroke="#10b981"
            fill="url(#downGrad)"
            strokeWidth={2}
            isAnimationActive={false}
          />
          <m.Area
            type="monotone"
            dataKey="upMb"
            name="Upload (MB/s)"
            stroke="#6366f1"
            fill="url(#upGrad)"
            strokeWidth={2}
            isAnimationActive={false}
          />
        </m.AreaChart>
      </m.ResponsiveContainer>
    ),
  }))
);

function NetworkDiagnosticsBanner({ diagnostics }) {
  if (!diagnostics) return null;
  const isConstrained =
    !diagnostics.internet_connected ||
    !diagnostics.gateway_reachable ||
    !diagnostics.dns_configured ||
    diagnostics.weak_wifi_signal;

  return (
    <Card
      className={`p-3.5 border transition-all ${
        isConstrained
          ? 'border-amber-500/40 bg-amber-500/5'
          : 'border-emerald-500/30 bg-emerald-500/5'
      }`}
    >
      <div className="flex items-start gap-3">
        {isConstrained ? (
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
        )}
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {diagnostics.internet_connected
                ? `Connected via ${diagnostics.active_adapter_name || 'Network'} (${diagnostics.active_adapter_type || 'Active'})`
                : 'No Active Network Connection'}
            </span>
            <Badge
              variant={
                diagnostics.internet_connected &&
                diagnostics.gateway_reachable &&
                diagnostics.dns_configured
                  ? 'success'
                  : 'warning'
              }
              size="xs"
            >
              {diagnostics.internet_connected ? 'Online' : 'Offline'}
            </Badge>
          </div>

          {diagnostics.diagnostic_notices.length > 0 ? (
            <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-300">
              {diagnostics.diagnostic_notices.map((notice) => (
                <li key={notice}>{notice}</li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 dark:text-slate-400">
              Default gateway reachable, DNS server responds, and physical link negotiated normally.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function NetworkOverviewMetricsCards({ snapshot, historyStats, activeAdapter }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* Card 1: Live Download Throughput */}
      <Card className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ArrowDownRight className="w-3.5 h-3.5 text-emerald-500" />
            Download Rate
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            Peak: {historyStats.peakDown} MB/s
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatSpeed(snapshot?.total_rx_bytes_sec || 0)}
          </span>
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
          <span>Avg: {historyStats.avgDown} MB/s</span>
          <span>Total: {formatBytes(activeAdapter?.total_rx_bytes || 0)}</span>
        </div>
      </Card>

      {/* Card 2: Live Upload Throughput */}
      <Card className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500" />
            Upload Rate
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            Peak: {historyStats.peakUp} MB/s
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
            {formatSpeed(snapshot?.total_tx_bytes_sec || 0)}
          </span>
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
          <span>Avg: {historyStats.avgUp} MB/s</span>
          <span>Total: {formatBytes(activeAdapter?.total_tx_bytes || 0)}</span>
        </div>
      </Card>

      {/* Card 3: Physical Link Speed */}
      <Card className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-blue-500" />
            Negotiated Link Speed
          </span>
          <span className="text-[10px] font-mono text-slate-400" title="Negotiated link speed between adapter and local router/switch. Not identical to ISP internet subscription speed.">
            Hardware Link
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {activeAdapter?.link_speed_bps
              ? activeAdapter.link_speed_bps >= 1e9
                ? `${(activeAdapter.link_speed_bps / 1e9).toFixed(1)} Gbps`
                : `${(activeAdapter.link_speed_bps / 1e6).toFixed(0)} Mbps`
              : 'Unavailable'}
          </span>
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
          <span>Adapter: {activeAdapter?.name || 'N/A'}</span>
          <span>{activeAdapter?.adapter_type || 'Unknown'}</span>
        </div>
      </Card>

      {/* Card 4: Wi-Fi Signal / Connection Quality */}
      <Card className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-brand-500" />
            Wi-Fi Signal / Quality
          </span>
          {activeAdapter?.wifi_details && (
            <Badge
              variant={
                activeAdapter.wifi_details.signal_quality_percent > 70
                  ? 'success'
                  : activeAdapter.wifi_details.signal_quality_percent > 40
                  ? 'warning'
                  : 'danger'
              }
              size="xs"
            >
              {activeAdapter.wifi_details.signal_quality_percent}% Quality
            </Badge>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {activeAdapter?.wifi_details
              ? activeAdapter.wifi_details.ssid
              : activeAdapter?.adapter_type === 'Ethernet'
              ? 'Wired (Ethernet)'
              : 'Not Connected'}
          </span>
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
          <span>
            {activeAdapter?.wifi_details
              ? `${activeAdapter.wifi_details.frequency_band} • Ch ${activeAdapter.wifi_details.channel || 'Auto'}`
              : activeAdapter?.adapter_type === 'Ethernet'
              ? 'Direct LAN Cable'
              : 'No Wireless AP'}
          </span>
          <span>{activeAdapter?.wifi_details?.phy_type || 'Standard'}</span>
        </div>
      </Card>
    </div>
  );
}

function AdaptersTab({ adapters }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      {adapters?.map((adapter) => {
        const isConnected = adapter.status === 'Connected';
        return (
          <Card
            key={adapter.id}
            className={`p-4 space-y-3 border transition-all ${
              isConnected ? 'border-slate-300 dark:border-slate-700' : 'opacity-70 bg-slate-50/50 dark:bg-surface-900/40'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {adapter.name}
                  </span>
                  <Badge
                    variant={isConnected ? 'success' : 'neutral'}
                    size="xs"
                  >
                    {adapter.status}
                  </Badge>
                  <Badge variant="neutral" size="xs">
                    {adapter.adapter_type}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-mono truncate max-w-sm">
                  {adapter.description}
                </p>
              </div>
            </div>

            {/* Network & IP Configuration */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs font-mono">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span className="text-slate-400">IPv4 Address:</span>
                <span>{adapter.ipv4_addresses.join(', ') || 'No IPv4 assigned'}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span className="text-slate-400">Default Gateway:</span>
                <span>{adapter.gateways.join(', ') || 'None'}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span className="text-slate-400">DNS Servers:</span>
                <span>{adapter.dns_servers.join(', ') || 'Not configured'}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span className="text-slate-400">MAC Address:</span>
                <span>{adapter.mac_address || 'Unavailable'}</span>
              </div>
            </div>

            {/* Wi-Fi specifics if present */}
            {adapter.wifi_details && (
              <div className="p-2.5 rounded-lg bg-brand-500/5 border border-brand-500/20 text-xs space-y-1">
                <div className="flex justify-between font-semibold text-brand-600 dark:text-brand-400">
                  <span>SSID: {adapter.wifi_details.ssid}</span>
                  <span>Signal: {adapter.wifi_details.signal_quality_percent}%</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px] font-mono">
                  <span>{adapter.wifi_details.phy_type} • {adapter.wifi_details.frequency_band}</span>
                  <span>BSSID: {adapter.wifi_details.bssid}</span>
                </div>
              </div>
            )}

            {/* Adapter I/O throughput counters */}
            <div className="flex justify-between items-center text-xs font-mono pt-1 text-slate-500 dark:text-slate-400">
              <span>↓ {formatSpeed(adapter.rx_bytes_sec)} ({formatBytes(adapter.total_rx_bytes)})</span>
              <span>↑ {formatSpeed(adapter.tx_bytes_sec)} ({formatBytes(adapter.total_tx_bytes)})</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function NetworkProcessesTab({
  filteredProcesses,
  processSearch,
  setProcessSearch,
  processSort,
  setProcessSort,
}) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Network Processes
          </h3>
          <span className="text-xs text-slate-400">
            (Real-time network consumption by process)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <label htmlFor="network-process-search" className="sr-only">
              Filter process
            </label>
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              id="network-process-search"
              type="text"
              aria-label="Filter process"
              value={processSearch}
              onChange={(e) => setProcessSearch(e.target.value)}
              placeholder="Filter process..."
              className="pl-8 pr-3 py-1 text-xs rounded-lg bg-slate-100 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-surface-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setProcessSort('total')}
              className={`px-2 py-1 rounded font-medium ${
                processSort === 'total' ? 'bg-brand-500 text-white' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Total
            </button>
            <button
              onClick={() => setProcessSort('down')}
              className={`px-2 py-1 rounded font-medium ${
                processSort === 'down' ? 'bg-brand-500 text-white' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Down
            </button>
            <button
              onClick={() => setProcessSort('up')}
              className={`px-2 py-1 rounded font-medium ${
                processSort === 'up' ? 'bg-brand-500 text-white' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Up
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <ProcessTableHead
            columns={[
              { label: 'Process Name' },
              { label: 'PID' },
              { label: 'Download Rate', align: 'right' },
              { label: 'Upload Rate', align: 'right' },
              { label: 'Total Bandwidth', align: 'right' },
            ]}
          />
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredProcesses.length > 0 ? (
              filteredProcesses.map((proc) => (
                <tr key={proc.pid} className="hover:bg-slate-50 dark:hover:bg-surface-800/50 transition-colors">
                  <td className="py-2 font-sans font-medium text-slate-800 dark:text-slate-200">
                    {proc.name}
                  </td>
                  <td className="py-2 text-slate-500">{proc.pid}</td>
                  <td className="py-2 text-right text-emerald-600 dark:text-emerald-400">
                    {formatSpeed(proc.rx_bytes_sec)}
                  </td>
                  <td className="py-2 text-right text-indigo-600 dark:text-indigo-400">
                    {formatSpeed(proc.tx_bytes_sec)}
                  </td>
                  <td className="py-2 text-right font-bold text-slate-900 dark:text-slate-100">
                    {formatSpeed(proc.total_bytes_sec)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400 italic font-sans">
                  No active processes transmitting network traffic.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ActiveConnectionsTab({
  filteredConnections,
  connectionSearch,
  setConnectionSearch,
  connectionStateFilter,
  setConnectionStateFilter,
}) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-brand-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Active TCP Socket Connections
          </h3>
          <span className="text-xs text-slate-400">
            (Extracted via native GetExtendedTcpTable)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <label htmlFor="network-connection-search" className="sr-only">
              Filter connections
            </label>
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              id="network-connection-search"
              type="text"
              aria-label="Filter connections"
              value={connectionSearch}
              onChange={(e) => setConnectionSearch(e.target.value)}
              placeholder="Filter host, port or app..."
              className="pl-8 pr-3 py-1 text-xs rounded-lg bg-slate-100 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <select
            aria-label="Filter connection state"
            value={connectionStateFilter}
            onChange={(e) => setConnectionStateFilter(e.target.value)}
            className="text-xs rounded-lg bg-slate-100 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 px-2 py-1 text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <option value="ALL">All States</option>
            <option value="ESTABLISHED">ESTABLISHED</option>
            <option value="LISTENING">LISTENING</option>
            <option value="TIME_WAIT">TIME_WAIT</option>
            <option value="CLOSE_WAIT">CLOSE_WAIT</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto max-h-96">
        <table className="w-full text-left text-xs font-mono">
          <thead className="sticky top-0 bg-slate-50 dark:bg-surface-900 z-10">
            <tr className="text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
              <th className="py-1.5 font-medium">Process</th>
              <th className="py-1.5 font-medium">PID</th>
              <th className="py-1.5 font-medium">Proto</th>
              <th className="py-1.5 font-medium">Local Address:Port</th>
              <th className="py-1.5 font-medium">Remote Address:Port</th>
              <th className="py-1.5 font-medium text-right">State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredConnections.length > 0 ? (
              filteredConnections.map((conn) => (
                <tr key={`${conn.pid}-${conn.protocol}-${conn.local_address}:${conn.local_port}->${conn.remote_address}:${conn.remote_port}`} className="hover:bg-slate-50 dark:hover:bg-surface-800/50">
                  <td className="py-1.5 font-sans font-medium text-slate-800 dark:text-slate-200">
                    {conn.process_name}
                  </td>
                  <td className="py-1.5 text-slate-500">{conn.pid}</td>
                  <td className="py-1.5 text-slate-400">{conn.protocol}</td>
                  <td className="py-1.5 text-slate-700 dark:text-slate-300">
                    {conn.local_address}:{conn.local_port}
                  </td>
                  <td className="py-1.5 text-slate-700 dark:text-slate-300">
                    {conn.remote_address}:{conn.remote_port}
                  </td>
                  <td className="py-1.5 text-right">
                    <Badge
                      variant={
                        conn.state === 'ESTABLISHED'
                          ? 'success'
                          : conn.state === 'LISTENING'
                          ? 'neutral'
                          : 'warning'
                      }
                      size="xs"
                    >
                      {conn.state}
                    </Badge>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400 italic font-sans">
                  No matching connections found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function IcmpPingTab({
  pingTarget,
  setPingTarget,
  pingRunning,
  pingResult,
  onRunPing,
  activeAdapter,
}) {
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-brand-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Safe Native ICMP Ping Diagnostic
          </h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          (Zero terminal windows • Direct Windows IP Helper API)
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <label htmlFor="network-ping-target" className="sr-only">
            Ping target host or IP
          </label>
          <input
            id="network-ping-target"
            type="text"
            aria-label="Ping target host or IP"
            value={pingTarget}
            onChange={(e) => setPingTarget(e.target.value)}
            placeholder="Enter host or IP (e.g. 1.1.1.1, google.com, gateway)..."
            className="w-full pl-3 pr-4 py-2 text-xs rounded-xl bg-slate-100 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
          />
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={onRunPing}
          disabled={pingRunning}
          icon={pingRunning ? RefreshCw : Send}
          className={pingRunning ? 'animate-pulse' : ''}
        >
          {pingRunning ? 'Testing...' : 'Test Latency'}
        </Button>
      </div>

      {/* Quick presets */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400">Quick Targets:</span>
        {['1.1.1.1', '8.8.8.8', 'google.com', activeAdapter?.gateways[0] || '127.0.0.1'].map((preset) => (
          <button
            key={preset}
            onClick={() => setPingTarget(preset)}
            className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-surface-800 hover:bg-slate-200 dark:hover:bg-surface-700 text-slate-700 dark:text-slate-300 font-mono transition-colors"
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Ping Probe Output */}
      {pingResult && (
        <div className="p-4 rounded-xl bg-slate-900 text-white font-mono text-xs space-y-2 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800">
            <span>Target: {pingResult.target} {pingResult.resolved_ip ? `(${pingResult.resolved_ip})` : ''}</span>
            <span>{new Date(pingResult.timestamp_ms).toLocaleTimeString()}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1">
            <div>
              <span className="text-[10px] text-slate-400 block">Packets Sent</span>
              <span className="text-base font-bold text-slate-200">{pingResult.packets_sent}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Packets Received</span>
              <span className="text-base font-bold text-emerald-400">{pingResult.packets_received}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Packet Loss</span>
              <span className={`text-base font-bold ${pingResult.packet_loss_percent > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {pingResult.packet_loss_percent.toFixed(0)}%
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Average Latency</span>
              <span className="text-base font-bold text-cyan-400">
                {pingResult.avg_latency_ms !== null ? `${pingResult.avg_latency_ms.toFixed(1)} ms` : 'N/A'}
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800 text-slate-300">
            {pingResult.status_message}
            {pingResult.min_latency_ms !== null && (
              <span className="text-slate-500 ml-2">
                (Min = {pingResult.min_latency_ms} ms, Max = {pingResult.max_latency_ms} ms)
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function NetworkAdvancedDrawer({ showAdvanced, onToggleAdvanced }) {
  return (
    <Card className="p-3.5">
      <ExpandableSectionHeader
        isOpen={showAdvanced}
        onToggle={onToggleAdvanced}
        title="Advanced Network Hardware Details & Local Privacy Guarantee"
        icon={SlidersHorizontal}
        iconColor="text-slate-500"
      />

      {showAdvanced && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 space-y-1.5 font-mono">
              <span className="font-sans font-bold text-slate-800 dark:text-slate-200 block">
                Native Windows APIs Utilized
              </span>
              <div className="flex justify-between text-slate-500">
                <span>GetAdaptersAddresses:</span>
                <span className="text-emerald-500">Active (iphlpapi.dll)</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>WlanQueryInterface:</span>
                <span className="text-emerald-500">Active (wlanapi.dll)</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>GetExtendedTcpTable:</span>
                <span className="text-emerald-500">Active (iphlpapi.dll)</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>IcmpSendEcho:</span>
                <span className="text-emerald-500">Active (Zero Terminal)</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 space-y-1.5 text-slate-600 dark:text-slate-400">
              <span className="font-sans font-bold text-slate-800 dark:text-slate-200 block">
                Privacy & Security Standard
              </span>
              <p className="leading-relaxed">
                All IP addresses, MAC addresses, connection sockets, SSIDs, and network diagnostics remain 100% strictly local to this machine. SystemPilot never captures packet payloads, performs no invasive inspection, and executes no unvalidated shell commands.
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export function NetworkMonitor() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [refreshIntervalMs, setRefreshIntervalMs] = useState(2000);
  const [selectedAdapterId, setSelectedAdapterId] = useState('ALL');
  const isFetchingRef = useRef(false);

  // Bounded timeline history in memory (Max 180 points)
  const [netHistory, setNetHistory] = useState([]);
  const [selectedDuration, setSelectedDuration] = useState('1m'); // '1m' | '5m' | '15m' | '30m' | '1h'

  // Sub-tabs / views
  const [activeTab, setActiveTab] = useState('adapters'); // 'adapters' | 'processes' | 'connections' | 'ping'

  // Search & filter states
  const [processSearch, setProcessSearch] = useState('');
  const [processSort, setProcessSort] = useState('total'); // 'total' | 'down' | 'up' | 'name'

  const [connectionSearch, setConnectionSearch] = useState('');
  const [connectionStateFilter, setConnectionStateFilter] = useState('ALL');

  // Ping Diagnostic Tool state
  const [pingTarget, setPingTarget] = useState('1.1.1.1');
  const [pingRunning, setPingRunning] = useState(false);
  const [pingResult, setPingResult] = useState(null);

  // Clipboard & drawer states
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch telemetry
  const fetchTelemetry = useCallback(async () => {
    if (isFetchingRef.current || isPaused) return;
    isFetchingRef.current = true;
    try {
      const adapterArg = selectedAdapterId === 'ALL' ? null : selectedAdapterId;
      const data = await api.getNetworkSystemSnapshot(adapterArg);
      if (data) {
        setSnapshot(data);
        setError(null);

        const now = new Date();
        const timeLabel = now.toTimeString().split(' ')[0];

        const downMb = data.total_rx_bytes_sec
          ? parseFloat((data.total_rx_bytes_sec / (1024 * 1024)).toFixed(2))
          : 0;
        const upMb = data.total_tx_bytes_sec
          ? parseFloat((data.total_tx_bytes_sec / (1024 * 1024)).toFixed(2))
          : 0;

        const newPoint = {
          time: timeLabel,
          timestamp: Date.now(),
          downMb,
          upMb,
          totalMb: parseFloat((downMb + upMb).toFixed(2)),
        };

        setNetHistory((prev) => {
          const next = [...prev, newPoint];
          return next.slice(-180); // Strict memory bound: 180 points
        });
      }
    } catch (err) {
      console.error('Failed to fetch network snapshot:', err);
      setError('Network telemetry is temporarily unavailable.');
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [isPaused, selectedAdapterId]);

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [fetchTelemetry, refreshIntervalMs]);

  // Primary active connected adapter
  const activeAdapter = useMemo(() => {
    if (!snapshot?.adapters?.length) return null;
    return (
      snapshot.adapters.find((a) => a.status === 'Connected' && a.ipv4_addresses.length > 0) ||
      snapshot.adapters.find((a) => a.status === 'Connected') ||
      snapshot.adapters[0]
    );
  }, [snapshot]);

  // Filtered timeline history
  const filteredHistory = useMemo(() => {
    if (!netHistory.length) return [];
    const now = Date.now();
    const durationMap = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
    };
    const windowMs = durationMap[selectedDuration] || durationMap['1m'];
    return netHistory.filter((pt) => now - pt.timestamp <= windowMs);
  }, [netHistory, selectedDuration]);

  // Peak throughput stats
  const historyStats = useMemo(() => {
    if (!filteredHistory.length) return { avgDown: 0, peakDown: 0, avgUp: 0, peakUp: 0 };
    let sumDown = 0;
    let peakDown = 0;
    let sumUp = 0;
    let peakUp = 0;

    for (const pt of filteredHistory) {
      sumDown += pt.downMb;
      if (pt.downMb > peakDown) peakDown = pt.downMb;
      sumUp += pt.upMb;
      if (pt.upMb > peakUp) peakUp = pt.upMb;
    }

    return {
      avgDown: (sumDown / filteredHistory.length).toFixed(2),
      peakDown: peakDown.toFixed(2),
      avgUp: (sumUp / filteredHistory.length).toFixed(2),
      peakUp: peakUp.toFixed(2),
    };
  }, [filteredHistory]);

  // Filtered processes
  const filteredProcesses = useMemo(() => {
    if (!snapshot?.top_processes) return [];
    let list = snapshot.top_processes.filter((p) =>
      p.name.toLowerCase().includes(processSearch.toLowerCase())
    );

    list.sort((a, b) => {
      if (processSort === 'down') return b.rx_bytes_sec - a.rx_bytes_sec;
      if (processSort === 'up') return b.tx_bytes_sec - a.tx_bytes_sec;
      if (processSort === 'name') return a.name.localeCompare(b.name);
      return b.total_bytes_sec - a.total_bytes_sec;
    });

    return list;
  }, [snapshot, processSearch, processSort]);

  // Filtered connections
  const filteredConnections = useMemo(() => {
    if (!snapshot?.active_connections) return [];
    return snapshot.active_connections.filter((conn) => {
      const matchSearch =
        conn.process_name.toLowerCase().includes(connectionSearch.toLowerCase()) ||
        conn.remote_address.includes(connectionSearch) ||
        conn.local_address.includes(connectionSearch) ||
        conn.remote_port.toString().includes(connectionSearch);

      const matchState =
        connectionStateFilter === 'ALL' || conn.state === connectionStateFilter;

      return matchSearch && matchState;
    });
  }, [snapshot, connectionSearch, connectionStateFilter]);

  // Run ping test
  const handleRunPing = async () => {
    if (pingRunning || !pingTarget.trim()) return;
    setPingRunning(true);
    setPingResult(null);
    try {
      const res = await api.runNetworkPingTest(pingTarget.trim());
      setPingResult(res);
    } catch (err) {
      setPingResult({
        target: pingTarget,
        resolved_ip: null,
        packets_sent: 0,
        packets_received: 0,
        packet_loss_percent: 100,
        min_latency_ms: null,
        avg_latency_ms: null,
        max_latency_ms: null,
        status_message: err?.message || 'Ping probe execution failed.',
        timestamp_ms: Date.now(),
      });
    } finally {
      setPingRunning(false);
    }
  };

  // Copy details
  const handleCopyDetails = async () => {
    if (!snapshot) return;
    try {
      const summary = {
        timestamp: new Date().toISOString(),
        active_adapter: activeAdapter?.name || 'None',
        adapter_type: activeAdapter?.adapter_type || 'Unknown',
        status: activeAdapter?.status || 'Unknown',
        ipv4: activeAdapter?.ipv4_addresses || [],
        gateway: activeAdapter?.gateways || [],
        dns: activeAdapter?.dns_servers || [],
        link_speed: activeAdapter?.link_speed_bps
          ? `${(activeAdapter.link_speed_bps / 1e6).toFixed(0)} Mbps`
          : 'Unavailable',
        current_download_rate: formatSpeed(snapshot.total_rx_bytes_sec),
        current_upload_rate: formatSpeed(snapshot.total_tx_bytes_sec),
        wifi: activeAdapter?.wifi_details || null,
        diagnostics: snapshot.diagnostics,
      };
      await navigator.clipboard.writeText(JSON.stringify(summary, null, 2));
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2000);
    } catch (e) {
      console.error('Failed to copy network details:', e);
    }
  };

  // Export report
  const handleExportReport = () => {
    if (!snapshot) return;
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `systempilot-network-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !snapshot) {
    return (
      <div className="space-y-4 animate-fadeIn">
        <Card className="p-8 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-brand-500" />
          <span>Collecting network adapters, Wi-Fi telemetry and connection tables...</span>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fadeIn text-slate-900 dark:text-slate-100">
      {/* 1. HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Network & Connectivity Center
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live throughput, Wi-Fi & Ethernet hardware telemetry, TCP connections & native ICMP ping
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Adapter Filter Dropdown */}
          {snapshot?.adapters && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-surface-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <select
                aria-label="Filter network adapter"
                value={selectedAdapterId}
                onChange={(e) => setSelectedAdapterId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none pr-2 py-0.5 cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-white">
                  All Adapters (Aggregated)
                </option>
                {snapshot.adapters.map((a) => (
                  <option key={a.id} value={a.id} className="bg-slate-900 text-white">
                    {a.name} ({a.adapter_type}) - {a.status}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Refresh Intervals */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-surface-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
            <Clock className="w-3.5 h-3.5 text-slate-400 ml-1" />
            <button
              onClick={() => setRefreshIntervalMs(1000)}
              className={`px-2 py-0.5 rounded-lg font-medium transition-all ${
                refreshIntervalMs === 1000
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              1s
            </button>
            <button
              onClick={() => setRefreshIntervalMs(2000)}
              className={`px-2 py-0.5 rounded-lg font-medium transition-all ${
                refreshIntervalMs === 2000
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              2s
            </button>
            <button
              onClick={() => setRefreshIntervalMs(5000)}
              className={`px-2 py-0.5 rounded-lg font-medium transition-all ${
                refreshIntervalMs === 5000
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              5s
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
            icon={isPaused ? Play : Pause}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyDetails}
            icon={copiedNotice ? Check : Copy}
          >
            {copiedNotice ? 'Copied' : 'Copy'}
          </Button>

          <Button variant="secondary" size="sm" onClick={handleExportReport} icon={Download}>
            Export
          </Button>

          <Button variant="secondary" size="sm" onClick={fetchTelemetry} disabled={loading} icon={RefreshCw} />
        </div>
      </div>

      {/* 2. EVIDENCE-BASED DIAGNOSTICS BANNER */}
      <NetworkDiagnosticsBanner diagnostics={snapshot?.diagnostics} />

      {/* 3. PRIMARY NETWORK OVERVIEW METRICS */}
      <NetworkOverviewMetricsCards
        snapshot={snapshot}
        historyStats={historyStats}
        activeAdapter={activeAdapter}
      />


      {/* 4. REAL-TIME THROUGHPUT TIMELINE CHART */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Live Network Throughput History
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              ({selectedAdapterId === 'ALL' ? 'Aggregated Traffic' : selectedAdapterId})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 dark:bg-surface-800 p-0.5 rounded-lg text-xs">
              {['1m', '5m', '15m', '30m', '1h'].map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDuration(d)}
                  className={`px-1.5 py-0.5 rounded font-mono transition-all ${
                    selectedDuration === d
                      ? 'bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-900 font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="h-44 w-full">
          <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-xs text-slate-500">Loading chart...</div>}>
            <NetworkTimelineChart filteredHistory={filteredHistory} />
          </Suspense>
        </div>

        <div className="flex items-center justify-center gap-6 text-xs font-mono text-slate-500 pt-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Download (MB/s)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            Upload (MB/s)
          </span>
        </div>
      </Card>

      {/* 5. SUB-VIEWS NAVIGATION BAR */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('adapters')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'adapters'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          Network Adapters ({snapshot?.adapters?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('processes')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'processes'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Network Processes ({snapshot?.top_processes?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('connections')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'connections'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          Active Connections ({snapshot?.active_connections?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('ping')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'ping'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          ICMP Ping Diagnostic Tool
        </button>
      </div>

      {/* 6. TAB 1: ADAPTERS LIST */}
      {activeTab === 'adapters' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {snapshot?.adapters?.map((adapter) => {
            const isConnected = adapter.status === 'Connected';
            return (
              <Card
                key={adapter.id}
                className={`p-4 space-y-3 border transition-all ${
                  isConnected ? 'border-slate-300 dark:border-slate-700' : 'opacity-70 bg-slate-50/50 dark:bg-surface-900/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {adapter.name}
                      </span>
                      <Badge
                        variant={isConnected ? 'success' : 'neutral'}
                        size="xs"
                      >
                        {adapter.status}
                      </Badge>
                      <Badge variant="neutral" size="xs">
                        {adapter.adapter_type}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 font-mono truncate max-w-sm">
                      {adapter.description}
                    </p>
                  </div>
                </div>

                {/* Network & IP Configuration */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs font-mono">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span className="text-slate-400">IPv4 Address:</span>
                    <span>{adapter.ipv4_addresses.join(', ') || 'No IPv4 assigned'}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span className="text-slate-400">Default Gateway:</span>
                    <span>{adapter.gateways.join(', ') || 'None'}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span className="text-slate-400">DNS Servers:</span>
                    <span>{adapter.dns_servers.join(', ') || 'Not configured'}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span className="text-slate-400">MAC Address:</span>
                    <span>{adapter.mac_address || 'Unavailable'}</span>
                  </div>
                </div>

                {/* Wi-Fi specifics if present */}
                {adapter.wifi_details && (
                  <div className="p-2.5 rounded-lg bg-brand-500/5 border border-brand-500/20 text-xs space-y-1">
                    <div className="flex justify-between font-semibold text-brand-600 dark:text-brand-400">
                      <span>SSID: {adapter.wifi_details.ssid}</span>
                      <span>Signal: {adapter.wifi_details.signal_quality_percent}%</span>
                    </div>
                    <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px] font-mono">
                      <span>{adapter.wifi_details.phy_type} • {adapter.wifi_details.frequency_band}</span>
                      <span>BSSID: {adapter.wifi_details.bssid}</span>
                    </div>
                  </div>
                )}

                {/* Adapter I/O throughput counters */}
                <div className="flex justify-between items-center text-xs font-mono pt-1 text-slate-500 dark:text-slate-400">
                  <span>↓ {formatSpeed(adapter.rx_bytes_sec)} ({formatBytes(adapter.total_rx_bytes)})</span>
                  <span>↑ {formatSpeed(adapter.tx_bytes_sec)} ({formatBytes(adapter.total_tx_bytes)})</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 7. TAB 2: NETWORK PROCESSES */}
      {activeTab === 'processes' && (
        <Card className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Network Processes
              </h3>
              <span className="text-xs text-slate-400">
                (Real-time network consumption by process)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <label htmlFor="network-process-search" className="sr-only">
                  Filter process
                </label>
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  id="network-process-search"
                  type="text"
                  aria-label="Filter process"
                  value={processSearch}
                  onChange={(e) => setProcessSearch(e.target.value)}
                  placeholder="Filter process..."
                  className="pl-8 pr-3 py-1 text-xs rounded-lg bg-slate-100 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center bg-slate-100 dark:bg-surface-800 p-0.5 rounded-lg text-xs">
                <button
                  onClick={() => setProcessSort('total')}
                  className={`px-2 py-1 rounded font-medium ${
                    processSort === 'total' ? 'bg-brand-500 text-white' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Total
                </button>
                <button
                  onClick={() => setProcessSort('down')}
                  className={`px-2 py-1 rounded font-medium ${
                    processSort === 'down' ? 'bg-brand-500 text-white' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Down
                </button>
                <button
                  onClick={() => setProcessSort('up')}
                  className={`px-2 py-1 rounded font-medium ${
                    processSort === 'up' ? 'bg-brand-500 text-white' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Up
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <ProcessTableHead
                columns={[
                  { label: 'Process Name' },
                  { label: 'PID' },
                  { label: 'Download Rate', align: 'right' },
                  { label: 'Upload Rate', align: 'right' },
                  { label: 'Total Bandwidth', align: 'right' },
                ]}
              />
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredProcesses.length > 0 ? (
                  filteredProcesses.map((proc) => (
                    <tr key={proc.pid} className="hover:bg-slate-50 dark:hover:bg-surface-800/50 transition-colors">
                      <td className="py-2 font-sans font-medium text-slate-800 dark:text-slate-200">
                        {proc.name}
                      </td>
                      <td className="py-2 text-slate-500">{proc.pid}</td>
                      <td className="py-2 text-right text-emerald-600 dark:text-emerald-400">
                        {formatSpeed(proc.rx_bytes_sec)}
                      </td>
                      <td className="py-2 text-right text-indigo-600 dark:text-indigo-400">
                        {formatSpeed(proc.tx_bytes_sec)}
                      </td>
                      <td className="py-2 text-right font-bold text-slate-900 dark:text-slate-100">
                        {formatSpeed(proc.total_bytes_sec)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 italic font-sans">
                      No active processes transmitting network traffic.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 8. TAB 3: ACTIVE CONNECTIONS TABLE */}
      {activeTab === 'connections' && (
        <Card className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-brand-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Active TCP Socket Connections
              </h3>
              <span className="text-xs text-slate-400">
                (Extracted via native GetExtendedTcpTable)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <label htmlFor="network-connection-search" className="sr-only">
                  Filter connections
                </label>
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  id="network-connection-search"
                  type="text"
                  aria-label="Filter connections"
                  value={connectionSearch}
                  onChange={(e) => setConnectionSearch(e.target.value)}
                  placeholder="Filter host, port or app..."
                  className="pl-8 pr-3 py-1 text-xs rounded-lg bg-slate-100 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <select
                aria-label="Filter connection state"
                value={connectionStateFilter}
                onChange={(e) => setConnectionStateFilter(e.target.value)}
                className="text-xs rounded-lg bg-slate-100 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 px-2 py-1 text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="ALL">All States</option>
                <option value="ESTABLISHED">ESTABLISHED</option>
                <option value="LISTENING">LISTENING</option>
                <option value="TIME_WAIT">TIME_WAIT</option>
                <option value="CLOSE_WAIT">CLOSE_WAIT</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs font-mono">
              <thead className="sticky top-0 bg-slate-50 dark:bg-surface-900 z-10">
                <tr className="text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <th className="py-1.5 font-medium">Process</th>
                  <th className="py-1.5 font-medium">PID</th>
                  <th className="py-1.5 font-medium">Proto</th>
                  <th className="py-1.5 font-medium">Local Address:Port</th>
                  <th className="py-1.5 font-medium">Remote Address:Port</th>
                  <th className="py-1.5 font-medium text-right">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredConnections.length > 0 ? (
                  filteredConnections.map((conn) => (
                    <tr key={`${conn.pid}-${conn.protocol}-${conn.local_address}:${conn.local_port}->${conn.remote_address}:${conn.remote_port}`} className="hover:bg-slate-50 dark:hover:bg-surface-800/50">
                      <td className="py-1.5 font-sans font-medium text-slate-800 dark:text-slate-200">
                        {conn.process_name}
                      </td>
                      <td className="py-1.5 text-slate-500">{conn.pid}</td>
                      <td className="py-1.5 text-slate-400">{conn.protocol}</td>
                      <td className="py-1.5 text-slate-700 dark:text-slate-300">
                        {conn.local_address}:{conn.local_port}
                      </td>
                      <td className="py-1.5 text-slate-700 dark:text-slate-300">
                        {conn.remote_address}:{conn.remote_port}
                      </td>
                      <td className="py-1.5 text-right">
                        <Badge
                          variant={
                            conn.state === 'ESTABLISHED'
                              ? 'success'
                              : conn.state === 'LISTENING'
                              ? 'neutral'
                              : 'warning'
                          }
                          size="xs"
                        >
                          {conn.state}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400 italic font-sans">
                      No matching connections found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 9. TAB 4: ICMP PING DIAGNOSTIC TOOL */}
      {activeTab === 'ping' && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-brand-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Safe Native ICMP Ping Diagnostic
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              (Zero terminal windows • Direct Windows IP Helper API)
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <label htmlFor="network-ping-target" className="sr-only">
                Ping target host or IP
              </label>
              <input
                id="network-ping-target"
                type="text"
                aria-label="Ping target host or IP"
                value={pingTarget}
                onChange={(e) => setPingTarget(e.target.value)}
                placeholder="Enter host or IP (e.g. 1.1.1.1, google.com, gateway)..."
                className="w-full pl-3 pr-4 py-2 text-xs rounded-xl bg-slate-100 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRunPing}
              disabled={pingRunning}
              icon={pingRunning ? RefreshCw : Send}
              className={pingRunning ? 'animate-pulse' : ''}
            >
              {pingRunning ? 'Testing...' : 'Test Latency'}
            </Button>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Quick Targets:</span>
            {['1.1.1.1', '8.8.8.8', 'google.com', activeAdapter?.gateways[0] || '127.0.0.1'].map((preset) => (
              <button
                key={preset}
                onClick={() => setPingTarget(preset)}
                className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-surface-800 hover:bg-slate-200 dark:hover:bg-surface-700 text-slate-700 dark:text-slate-300 font-mono transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Ping Probe Output */}
          {pingResult && (
            <div className="p-4 rounded-xl bg-slate-900 text-white font-mono text-xs space-y-2 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800">
                <span>Target: {pingResult.target} {pingResult.resolved_ip ? `(${pingResult.resolved_ip})` : ''}</span>
                <span>{new Date(pingResult.timestamp_ms).toLocaleTimeString()}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1">
                <div>
                  <span className="text-[10px] text-slate-400 block">Packets Sent</span>
                  <span className="text-base font-bold text-slate-200">{pingResult.packets_sent}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Packets Received</span>
                  <span className="text-base font-bold text-emerald-400">{pingResult.packets_received}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Packet Loss</span>
                  <span className={`text-base font-bold ${pingResult.packet_loss_percent > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {pingResult.packet_loss_percent.toFixed(0)}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Average Latency</span>
                  <span className="text-base font-bold text-cyan-400">
                    {pingResult.avg_latency_ms !== null ? `${pingResult.avg_latency_ms.toFixed(1)} ms` : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800 text-slate-300">
                {pingResult.status_message}
                {pingResult.min_latency_ms !== null && (
                  <span className="text-slate-500 ml-2">
                    (Min = {pingResult.min_latency_ms} ms, Max = {pingResult.max_latency_ms} ms)
                  </span>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* 10. ADVANCED ADAPTER ARCHITECTURE & PRIVACY DRAWER */}
      <Card className="p-3.5">
        <ExpandableSectionHeader
          isOpen={showAdvanced}
          onToggle={() => setShowAdvanced(!showAdvanced)}
          title="Advanced Network Hardware Details & Local Privacy Guarantee"
          icon={SlidersHorizontal}
          iconColor="text-slate-500"
        />

        {showAdvanced && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 space-y-1.5 font-mono">
                <span className="font-sans font-bold text-slate-800 dark:text-slate-200 block">
                  Native Windows APIs Utilized
                </span>
                <div className="flex justify-between text-slate-500">
                  <span>GetAdaptersAddresses:</span>
                  <span className="text-emerald-500">Active (iphlpapi.dll)</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>WlanQueryInterface:</span>
                  <span className="text-emerald-500">Active (wlanapi.dll)</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>GetExtendedTcpTable:</span>
                  <span className="text-emerald-500">Active (iphlpapi.dll)</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>IcmpSendEcho:</span>
                  <span className="text-emerald-500">Active (Zero Terminal)</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 space-y-1.5 text-slate-600 dark:text-slate-400">
                <span className="font-sans font-bold text-slate-800 dark:text-slate-200 block">
                  Privacy & Security Standard
                </span>
                <p className="leading-relaxed">
                  All IP addresses, MAC addresses, connection sockets, SSIDs, and network diagnostics remain 100% strictly local to this machine. SystemPilot never captures packet payloads, performs no invasive inspection, and executes no unvalidated shell commands.
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

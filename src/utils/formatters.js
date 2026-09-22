export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec === 0) return '0 KB/s';
  const k = 1024;
  if (bytesPerSec < k * k) {
    return `${(bytesPerSec / k).toFixed(1)} KB/s`;
  }
  return `${(bytesPerSec / (k * k)).toFixed(1)} MB/s`;
}

export function formatUptime(seconds) {
  if (!seconds) return '0m';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatFrequency(mhz) {
  if (!mhz) return '0 GHz';
  if (mhz >= 1000) {
    return `${(mhz / 1000).toFixed(2)} GHz`;
  }
  return `${mhz} MHz`;
}

export function getStatusColor(percent) {
  if (percent >= 90) return 'text-status-danger';
  if (percent >= 75) return 'text-status-warning';
  return 'text-status-success';
}

export function getProgressColor(percent) {
  if (percent >= 90) return 'bg-status-danger';
  if (percent >= 75) return 'bg-status-warning';
  return 'bg-brand-500';
}

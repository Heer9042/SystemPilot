export function formatBytes(bytes, decimals = 1) {
  const num = Number(bytes);
  if (!Number.isFinite(num) || num <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(Math.floor(Math.log(num) / Math.log(k)), sizes.length - 1);
  if (i < 0) return '0 B';
  return `${parseFloat((num / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSec) {
  const num = Number(bytesPerSec);
  if (!Number.isFinite(num) || num <= 0) return '0 KB/s';
  const k = 1024;
  if (num < k * k) {
    return `${(num / k).toFixed(1)} KB/s`;
  }
  return `${(num / (k * k)).toFixed(1)} MB/s`;
}

export function formatUptime(seconds) {
  const num = Math.floor(Number(seconds));
  if (!Number.isFinite(num) || num <= 0) return '0m';
  const days = Math.floor(num / 86400);
  const hours = Math.floor((num % 86400) / 3600);
  const minutes = Math.floor((num % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatFrequency(mhz) {
  const num = Number(mhz);
  if (!Number.isFinite(num) || num <= 0) return '0 GHz';
  if (num >= 1000) {
    return `${(num / 1000).toFixed(2)} GHz`;
  }
  return `${Math.round(num)} MHz`;
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

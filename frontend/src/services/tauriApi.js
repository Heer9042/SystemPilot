// SystemPilot Tauri API Service Wrapper
// Communicates with native Rust backend commands

let isTauriEnv = false;
let invoke = null;

try {
  if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
    isTauriEnv = true;
  }
} catch (e) {
  isTauriEnv = false;
}

// Lazy loader for invoke
async function getInvoke() {
  if (!invoke) {
    try {
      const core = await import('@tauri-apps/api/core');
      invoke = core.invoke;
      isTauriEnv = true;
    } catch (e) {
      isTauriEnv = false;
    }
  }
  return invoke;
}

export const api = {
  isNative: () => isTauriEnv,

  async getSystemStats() {
    const inv = await getInvoke();
    if (inv) return await inv('get_system_stats');
    return null;
  },

  async getDetailedMemoryStats() {
    const inv = await getInvoke();
    if (inv) return await inv('get_detailed_memory_stats');
    return null;
  },

  async cleanMemory() {
    const inv = await getInvoke();
    if (inv) return await inv('clean_memory');
    throw new Error('Tauri backend unavailable');
  },

  async getProcesses() {
    const inv = await getInvoke();
    if (inv) return await inv('get_processes');
    return [];
  },

  async terminateProcess(pid) {
    const inv = await getInvoke();
    if (inv) return await inv('terminate_process', { pid });
    throw new Error('Tauri backend unavailable');
  },

  async setProcessPriority(pid, priority) {
    const inv = await getInvoke();
    if (inv) return await inv('set_process_priority', { pid, priority });
    throw new Error('Tauri backend unavailable');
  },

  async setProcessAffinity(pid, affinityMask) {
    const inv = await getInvoke();
    if (inv) return await inv('set_process_affinity', { pid, affinityMask });
    throw new Error('Tauri backend unavailable');
  },

  async suspendProcess(pid) {
    const inv = await getInvoke();
    if (inv) return await inv('suspend_process', { pid });
    throw new Error('Tauri backend unavailable');
  },

  async resumeProcess(pid) {
    const inv = await getInvoke();
    if (inv) return await inv('resume_process', { pid });
    throw new Error('Tauri backend unavailable');
  },

  async getCpuDetailedInfo() {
    const inv = await getInvoke();
    if (inv) return await inv('get_cpu_detailed_info');
    return null;
  },

  async getGpuInfo() {
    const inv = await getInvoke();
    if (inv) return await inv('get_gpu_info');
    return [];
  },

  async getDiskDetails() {
    const inv = await getInvoke();
    if (inv) return await inv('get_disk_details');
    return [];
  },

  async getNetworkDetails() {
    const inv = await getInvoke();
    if (inv) return await inv('get_network_details');
    return [];
  },

  async getPowerPlans() {
    const inv = await getInvoke();
    if (inv) return await inv('get_power_plans');
    return [];
  },

  async setPowerPlan(guid) {
    const inv = await getInvoke();
    if (inv) return await inv('set_power_plan', { guid });
    throw new Error('Tauri backend unavailable');
  },

  async getStartupItems() {
    const inv = await getInvoke();
    if (inv) return await inv('get_startup_items');
    return [];
  },

  async scanCleanableItems() {
    const inv = await getInvoke();
    if (inv) return await inv('scan_cleanable_items');
    return { categories: [], total_bytes: 0, total_files: 0 };
  },

  async executeCleanup(categoryIds, emptyRecycleBin = false) {
    const inv = await getInvoke();
    if (inv) return await inv('execute_cleanup', { categoryIds, emptyRecycleBin });
    throw new Error('Tauri backend unavailable');
  },

  async getCleanupHistory() {
    const inv = await getInvoke();
    if (inv) return await inv('get_cleanup_history');
    return [];
  },

  async getHardwareSummary() {
    const inv = await getInvoke();
    if (inv) return await inv('get_hardware_summary');
    return null;
  },

  async getSecurityStatus() {
    const inv = await getInvoke();
    if (inv) return await inv('get_security_status');
    return null;
  },

  async runCpuBenchmark() {
    const inv = await getInvoke();
    if (inv) return await inv('run_cpu_benchmark');
    throw new Error('Tauri backend unavailable');
  },

  async runMemoryBenchmark() {
    const inv = await getInvoke();
    if (inv) return await inv('run_memory_benchmark');
    throw new Error('Tauri backend unavailable');
  },

  async runDiskBenchmark() {
    const inv = await getInvoke();
    if (inv) return await inv('run_disk_benchmark');
    throw new Error('Tauri backend unavailable');
  },

  async startCpuStress(durationSeconds = 30) {
    const inv = await getInvoke();
    if (inv) return await inv('start_cpu_stress', { durationSeconds });
    throw new Error('Tauri backend unavailable');
  },

  async stopCpuStress() {
    const inv = await getInvoke();
    if (inv) return await inv('stop_cpu_stress');
    throw new Error('Tauri backend unavailable');
  },

  async getBenchmarkHistory() {
    const inv = await getInvoke();
    if (inv) return await inv('get_benchmark_history');
    return [];
  },

  async getSettings() {
    const inv = await getInvoke();
    if (inv) return await inv('get_settings');
    return {};
  },

  async setSetting(key, value) {
    const inv = await getInvoke();
    if (inv) return await inv('set_setting', { key, value: String(value) });
    throw new Error('Tauri backend unavailable');
  },

  async minimizeWindow() {
    const inv = await getInvoke();
    if (inv) return await inv('window_minimize');
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      return await getCurrentWindow().minimize();
    } catch (e) {
      console.warn('Window minimize fallback failed:', e);
    }
  },

  async toggleMaximizeWindow() {
    const inv = await getInvoke();
    if (inv) return await inv('window_toggle_maximize');
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      return await getCurrentWindow().toggleMaximize();
    } catch (e) {
      console.warn('Window toggle maximize fallback failed:', e);
    }
  },

  async closeWindow() {
    const inv = await getInvoke();
    if (inv) return await inv('window_close');
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      return await getCurrentWindow().close();
    } catch (e) {
      console.warn('Window close fallback failed:', e);
    }
  },

  async getAppVersion() {
    const inv = await getInvoke();
    if (inv) return await inv('get_app_version');
    return {
      name: 'SystemPilot',
      version: '0.0.2',
      target_arch: 'x64',
      target_os: 'windows',
      git_repository: 'Heer9042/SystemPilot',
      release_url: 'https://github.com/Heer9042/SystemPilot/releases',
    };
  },

  async openReleaseNotes(url) {
    const inv = await getInvoke();
    if (inv) return await inv('open_release_notes', { url });
    if (typeof window !== 'undefined' && url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  },
};

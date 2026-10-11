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
  if (typeof window === 'undefined') return null;
  if (!window.__TAURI_INTERNALS__ && !window.__TAURI__) {
    // In a regular web browser, Tauri native IPC bridge is not present
    return null;
  }
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
  isNative: () => {
    if (isTauriEnv) return true;
    if (typeof window !== 'undefined' && (window.__TAURI_INTERNALS__ || window.__TAURI__)) {
      isTauriEnv = true;
      return true;
    }
    return false;
  },

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
    throw new Error('System service is temporarily unavailable');
  },

  async getProcesses() {
    const inv = await getInvoke();
    if (inv) return await inv('get_processes');
    return [];
  },

  async terminateProcess(pid, expectedName = null) {
    const inv = await getInvoke();
    if (inv) return await inv('terminate_process', { pid, expectedName });
    throw new Error('System service is temporarily unavailable');
  },

  async terminateProcessTree(pid, expectedName = null) {
    const inv = await getInvoke();
    if (inv) return await inv('terminate_process_tree', { pid, expectedName });
    throw new Error('System service is temporarily unavailable');
  },

  async openProcessLocation(exePath) {
    const inv = await getInvoke();
    if (inv) return await inv('open_process_location', { exePath });
    throw new Error('System service is temporarily unavailable');
  },

  async getProcessProperties(pid) {
    const inv = await getInvoke();
    if (inv) return await inv('get_process_properties', { pid });
    throw new Error('System service is temporarily unavailable');
  },

  async setProcessPriority(pid, priority) {
    const inv = await getInvoke();
    if (inv) return await inv('set_process_priority', { pid, priority });
    throw new Error('System service is temporarily unavailable');
  },

  async setProcessAffinity(pid, affinityMask) {
    const inv = await getInvoke();
    if (inv) return await inv('set_process_affinity', { pid, affinityMask });
    throw new Error('System service is temporarily unavailable');
  },

  async suspendProcess(pid) {
    const inv = await getInvoke();
    if (inv) return await inv('suspend_process', { pid });
    throw new Error('System service is temporarily unavailable');
  },

  async resumeProcess(pid) {
    const inv = await getInvoke();
    if (inv) return await inv('resume_process', { pid });
    throw new Error('System service is temporarily unavailable');
  },

  async getCpuSnapshot() {
    const inv = await getInvoke();
    if (inv) return await inv('get_cpu_snapshot');
    return null;
  },

  async getCpuDetailedInfo() {
    const inv = await getInvoke();
    if (inv) return await inv('get_cpu_detailed_info');
    return null;
  },

  async getGpuSystemSnapshot(selectedIndex = 0) {
    const inv = await getInvoke();
    if (inv) return await inv('get_gpu_system_snapshot', { selectedIndex });
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

  async getDiskSystemSnapshot(selectedDisk = 0) {
    const inv = await getInvoke();
    if (inv) return await inv('get_disk_system_snapshot', { selectedDisk });
    return null;
  },

  async getNetworkDetails() {
    const inv = await getInvoke();
    if (inv) return await inv('get_network_details');
    return [];
  },

  async getNetworkSystemSnapshot(selectedAdapter = null) {
    const inv = await getInvoke();
    if (inv) return await inv('get_network_system_snapshot', { selectedAdapter });
    return null;
  },

  async runNetworkPingTest(target) {
    const inv = await getInvoke();
    if (inv) return await inv('run_network_ping_test', { target });
    throw new Error('Native networking service unavailable');
  },

  async getPerformanceSnapshot() {
    const inv = await getInvoke();
    if (inv) return await inv('get_performance_snapshot');
    return null;
  },

  async getPowerPlans() {
    const inv = await getInvoke();
    if (inv) return await inv('get_power_plans');
    return [];
  },

  async setPowerPlan(guid) {
    const inv = await getInvoke();
    if (inv) return await inv('set_power_plan', { guid });
    throw new Error('System service is temporarily unavailable');
  },

  async getStartupItems() {
    const inv = await getInvoke();
    if (inv) return await inv('get_startup_items');
    return [];
  },

  async getStartupChangeHistory() {
    const inv = await getInvoke();
    if (inv) return await inv('get_startup_change_history');
    return [];
  },

  async restoreStartupItem(itemId) {
    const inv = await getInvoke();
    if (inv) return await inv('restore_startup_item', { itemId });
    throw new Error('System service is temporarily unavailable');
  },

  async toggleStartupItem(itemId, enable) {
    const inv = await getInvoke();
    if (inv) return await inv('toggle_startup_item', { itemId, enable });
    throw new Error('System service is temporarily unavailable');
  },

  async scanCleanableItems() {
    const inv = await getInvoke();
    if (inv) return await inv('scan_cleanable_items');
    return { categories: [], total_bytes: 0, total_files: 0 };
  },

  async scanLargeFiles() {
    const inv = await getInvoke();
    if (inv) return await inv('scan_large_files');
    return [];
  },

  async executeCleanup(categoryIds, emptyRecycleBin = false) {
    const inv = await getInvoke();
    if (inv) return await inv('execute_cleanup', { categoryIds, emptyRecycleBin });
    throw new Error('System service is temporarily unavailable');
  },

  async listenCleanupProgress(callback) {
    try {
      const { listen } = await import('@tauri-apps/api/event');
      return await listen('cleanup-progress', (event) => {
        if (callback && event && event.payload) {
          callback(event.payload);
        }
      });
    } catch (e) {
      console.warn('Tauri event listen not available:', e);
      return null;
    }
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
    throw new Error('System service is temporarily unavailable');
  },

  async runMemoryBenchmark() {
    const inv = await getInvoke();
    if (inv) return await inv('run_memory_benchmark');
    throw new Error('System service is temporarily unavailable');
  },

  async runDiskBenchmark() {
    const inv = await getInvoke();
    if (inv) return await inv('run_disk_benchmark');
    throw new Error('System service is temporarily unavailable');
  },

  async runGpuBenchmark() {
    const inv = await getInvoke();
    if (inv) return await inv('run_gpu_benchmark');
    throw new Error('System service is temporarily unavailable');
  },

  async runCombinedBenchmark() {
    const inv = await getInvoke();
    if (inv) return await inv('run_combined_benchmark');
    throw new Error('System service is temporarily unavailable');
  },

  async startCpuStress(durationSeconds = 30) {
    const inv = await getInvoke();
    if (inv) return await inv('start_cpu_stress', { durationSeconds });
    throw new Error('System service is temporarily unavailable');
  },

  async stopCpuStress() {
    const inv = await getInvoke();
    if (inv) return await inv('stop_cpu_stress');
    throw new Error('System service is temporarily unavailable');
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
    throw new Error('System service is temporarily unavailable');
  },

  async minimizeWindow() {
    const inv = await getInvoke();
    if (inv) {
      try {
        return await inv('window_minimize');
      } catch (err) {
        console.warn('Backend window_minimize failed, falling back:', err);
      }
    }
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      return await getCurrentWindow().minimize();
    } catch (e) {
      console.warn('Window minimize fallback failed:', e);
    }
  },

  async toggleMaximizeWindow() {
    const inv = await getInvoke();
    if (inv) {
      try {
        return await inv('window_toggle_maximize');
      } catch (err) {
        console.warn('Backend window_toggle_maximize failed, falling back:', err);
      }
    }
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();
      const isMax = await win.isMaximized();
      if (isMax) {
        await win.unmaximize();
        return false;
      } else {
        await win.maximize();
        return true;
      }
    } catch (e) {
      console.warn('Window toggle maximize fallback failed:', e);
    }
  },

  async isWindowMaximized() {
    const inv = await getInvoke();
    if (inv) {
      try {
        return await inv('window_is_maximized');
      } catch (err) {
        // fallback to client API
      }
    }
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      return await getCurrentWindow().isMaximized();
    } catch (e) {
      return false;
    }
  },

  async closeWindow() {
    const inv = await getInvoke();
    if (inv) {
      try {
        return await inv('window_close');
      } catch (err) {
        console.warn('Backend window_close failed, falling back:', err);
      }
    }
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
      version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0',
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

  async downloadAndVerifyUpdate(downloadUrl, expectedSha256 = null) {
    const inv = await getInvoke();
    if (inv) return await inv('download_and_verify_update', { downloadUrl, expectedSha256 });
    throw new Error('System service is temporarily unavailable');
  },

  async installUpdateAndRestart(installerPath) {
    const inv = await getInvoke();
    if (inv) return await inv('install_update_and_restart', { installerPath });
    throw new Error('System service is temporarily unavailable');
  },

  async listenUpdateProgress(callback) {
    try {
      const { listen } = await import('@tauri-apps/api/event');
      return await listen('update-progress', (event) => {
        if (callback && event && event.payload) {
          callback(event.payload);
        }
      });
    } catch (e) {
      console.warn('Tauri update progress listener not available:', e);
      return null;
    }
  },

  async logClientMessage(level, message) {
    try {
      const inv = await getInvoke();
      if (inv) await inv('log_client_message', { level, message: String(message) });
    } catch (e) {
      // Ignored in non-native fallback
    }
  },

  // Windows System Control, Activation, BIOS & Native Tools
  async getWindowsSystemInfo() {
    const inv = await getInvoke();
    if (inv) return await inv('get_windows_system_info');
    return null;
  },

  async getWindowsActivationStatus() {
    const inv = await getInvoke();
    if (inv) return await inv('get_windows_activation_status');
    return null;
  },

  async getBiosFirmwareInfo() {
    const inv = await getInvoke();
    if (inv) return await inv('get_bios_firmware_info');
    return null;
  },

  async restartToUefiFirmware() {
    const inv = await getInvoke();
    if (inv) return await inv('restart_to_uefi_firmware');
    throw new Error('System service is temporarily unavailable');
  },

  async getCoolingInfo() {
    const inv = await getInvoke();
    if (inv) return await inv('get_cooling_info');
    return null;
  },

  async getWindowsServices() {
    const inv = await getInvoke();
    if (inv) return await inv('get_windows_services');
    return [];
  },

  async getFirewallStatus() {
    const inv = await getInvoke();
    if (inv) return await inv('get_firewall_status');
    return null;
  },

  async getLocalUsers() {
    const inv = await getInvoke();
    if (inv) return await inv('get_local_users');
    return [];
  },

  async getSystemRestoreStatus() {
    const inv = await getInvoke();
    if (inv) return await inv('get_system_restore_status');
    return null;
  },

  async launchWindowsTool(toolId) {
    const inv = await getInvoke();
    if (inv) return await inv('launch_windows_tool', { toolId });
    throw new Error('System service is temporarily unavailable');
  },

  async getSystemEventLogs(logName = 'System', maxEntries = 25) {
    const inv = await getInvoke();
    if (inv) return await inv('get_system_event_logs', { logName, maxEntries });
    return [];
  },

  async getDiskPartitions() {
    const inv = await getInvoke();
    if (inv) return await inv('get_disk_partitions_info');
    return [];
  },

  async getPrivilegeStatus() {
    const inv = await getInvoke();
    if (inv) return await inv('get_privilege_status');
    return {
      is_elevated: false,
      execution_level: 'Standard User (asInvoker)',
      installation_scope: 'Per-User (%LOCALAPPDATA%)',
      can_manage_machine_startup: false,
      can_reboot_uefi: true,
    };
  },

  async requestAdminElevation() {
    const inv = await getInvoke();
    if (inv) return await inv('request_admin_elevation');
    return false;
  },

  async openPermissionsDisclosure() {
    const inv = await getInvoke();
    if (inv) return await inv('open_permissions_disclosure');
    return false;
  },

  async getWindowsToolsDirectory() {
    const inv = await getInvoke();
    if (inv) return await inv('get_windows_tools_directory');
    return [];
  },

  async getDeviceInventory() {
    const inv = await getInvoke();
    if (inv) return await inv('get_device_inventory');
    return [];
  },

  async getScheduledTasks() {
    const inv = await getInvoke();
    if (inv) return await inv('get_scheduled_tasks');
    return [];
  },

  async openDriveLocation(drivePath) {
    const inv = await getInvoke();
    if (inv) return await inv('open_drive_location', { drivePath });
    throw new Error('System service is temporarily unavailable');
  },

  async exportDiagnosticReport() {
    const inv = await getInvoke();
    if (inv) return await inv('export_diagnostic_report');
    return null;
  },

  // Fan Speed & Smart Cooling Management
  async getFanCoolingDetails() {
    const inv = await getInvoke();
    if (inv) return await inv('get_fan_cooling_details');
    return null;
  },

  async setCoolingPolicy(policy) {
    const inv = await getInvoke();
    if (inv) return await inv('set_cooling_policy', { policy });
    throw new Error('System service is temporarily unavailable');
  },

  async setManualFanSpeed(fanId, speedPercent) {
    const inv = await getInvoke();
    if (inv) return await inv('set_manual_fan_speed', { fanId, speedPercent });
    throw new Error('System service is temporarily unavailable');
  },

  async restoreAutomaticCooling() {
    const inv = await getInvoke();
    if (inv) return await inv('restore_automatic_cooling');
    throw new Error('System service is temporarily unavailable');
  },

  // Centralized System Compatibility & Hardware Capability Engine
  async getSystemCapabilities() {
    const inv = await getInvoke();
    if (inv) return await inv('get_system_capabilities');
    return null;
  },
};


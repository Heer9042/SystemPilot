// SystemPilot Tauri API Service Wrapper
// Communicates with native Rust backend commands with robust fallback handling

let isTauriEnv = false;
let invoke = null;

try {
  // Check if @tauri-apps/api is available in window
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
      console.warn('Running outside Tauri container, falling back to mock provider');
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
    return {
      cpu_usage: 24.5,
      cpu_cores: [22.0, 26.0, 18.0, 30.0],
      cpu_freq_mhz: 3200,
      ram_total_bytes: 16 * 1024 * 1024 * 1024,
      ram_used_bytes: 8.4 * 1024 * 1024 * 1024,
      ram_free_bytes: 4.2 * 1024 * 1024 * 1024,
      ram_available_bytes: 7.6 * 1024 * 1024 * 1024,
      ram_usage_percent: 52.5,
      swap_total_bytes: 4 * 1024 * 1024 * 1024,
      swap_used_bytes: 1.2 * 1024 * 1024 * 1024,
      disk_total_bytes: 512 * 1024 * 1024 * 1024,
      disk_free_bytes: 280 * 1024 * 1024 * 1024,
      disk_read_bytes_sec: 1024 * 500,
      disk_write_bytes_sec: 1024 * 800,
      net_download_bytes_sec: 1024 * 1024 * 2.5,
      net_upload_bytes_sec: 1024 * 350,
      net_total_received_bytes: 1024 * 1024 * 1024 * 45,
      net_total_transmitted_bytes: 1024 * 1024 * 1024 * 12,
      process_count: 184,
      uptime_seconds: 43200,
      battery_percent: 85,
      is_charging: true,
      os_name: 'Windows 11 Pro',
      os_version: '23H2 (Build 22631.4317)',
      host_name: 'WORKSTATION-PC',
      cpu_name: '13th Gen Intel(R) Core(TM) i7-13700H',
    };
  },

  async getDetailedMemoryStats() {
    const inv = await getInvoke();
    if (inv) return await inv('get_detailed_memory_stats');
    return {
      total_ram: 17179869184,
      used_ram: 9019431321,
      free_ram: 4294967296,
      available_ram: 8160437863,
      cached_ram: 4500000000,
      standby_ram: 3800000000,
      committed_ram: 11000000000,
      commit_limit: 21000000000,
      paged_pool: 680000000,
      non_paged_pool: 450000000,
      page_file_total: 4294967296,
      page_file_used: 1200000000,
      usage_percentage: 52.5,
    };
  },

  async cleanMemory() {
    const inv = await getInvoke();
    if (inv) return await inv('clean_memory');
    return {
      ram_before: 9019431321,
      ram_after: 6819431321,
      ram_released: 2200000000,
      processes_trimmed: 42,
      timestamp: new Date().toISOString(),
      success: true,
      message: 'Trimmed 42 processes. Released 2.05 GB of working set memory.',
    };
  },

  async getProcesses() {
    const inv = await getInvoke();
    if (inv) return await inv('get_processes');
    return [
      { pid: 1420, name: 'SystemPilot.exe', exe_path: 'C:\\Program Files\\SystemPilot\\SystemPilot.exe', cpu_usage: 0.4, memory_bytes: 48000000, virtual_memory_bytes: 120000000, disk_read_bytes: 0, disk_written_bytes: 0, status: 'Running', start_time: 170000, priority: 'Normal', is_critical: true },
      { pid: 4, name: 'System', exe_path: 'ntoskrnl.exe', cpu_usage: 1.2, memory_bytes: 120000, virtual_memory_bytes: 4000000, disk_read_bytes: 512, disk_written_bytes: 1024, status: 'Running', start_time: 0, priority: 'Normal', is_critical: true },
      { pid: 512, name: 'dwm.exe', exe_path: 'C:\\Windows\\System32\\dwm.exe', cpu_usage: 2.1, memory_bytes: 180000000, virtual_memory_bytes: 500000000, disk_read_bytes: 0, disk_written_bytes: 0, status: 'Running', start_time: 100, priority: 'High', is_critical: true },
      { pid: 1084, name: 'explorer.exe', exe_path: 'C:\\Windows\\explorer.exe', cpu_usage: 0.8, memory_bytes: 220000000, virtual_memory_bytes: 600000000, disk_read_bytes: 2048, disk_written_bytes: 1024, status: 'Running', start_time: 150, priority: 'Normal', is_critical: true },
      { pid: 4892, name: 'chrome.exe', exe_path: 'C:\\Program Files\\Google\\Chrome\\chrome.exe', cpu_usage: 8.5, memory_bytes: 850000000, virtual_memory_bytes: 1800000000, disk_read_bytes: 4096, disk_written_bytes: 8192, status: 'Running', start_time: 1200, priority: 'Normal', is_critical: false },
    ];
  },

  async terminateProcess(pid) {
    const inv = await getInvoke();
    if (inv) return await inv('terminate_process', { pid });
    return true;
  },

  async setProcessPriority(pid, priority) {
    const inv = await getInvoke();
    if (inv) return await inv('set_process_priority', { pid, priority });
    return true;
  },

  async setProcessAffinity(pid, affinityMask) {
    const inv = await getInvoke();
    if (inv) return await inv('set_process_affinity', { pid, affinityMask });
    return true;
  },

  async suspendProcess(pid) {
    const inv = await getInvoke();
    if (inv) return await inv('suspend_process', { pid });
    return true;
  },

  async resumeProcess(pid) {
    const inv = await getInvoke();
    if (inv) return await inv('resume_process', { pid });
    return true;
  },

  async getCpuDetailedInfo() {
    const inv = await getInvoke();
    if (inv) return await inv('get_cpu_detailed_info');
    return {
      brand: '13th Gen Intel(R) Core(TM) i7-13700H',
      vendor_id: 'GenuineIntel',
      physical_cores: 14,
      logical_cores: 20,
      base_frequency_mhz: 2400,
      current_frequency_mhz: 3400,
      global_usage: 24.5,
      core_usages: [20, 28, 15, 35, 12, 18, 40, 22, 10, 8, 14, 19, 25, 30],
      temperature_celsius: null,
      package_power_watts: null,
    };
  },

  async getGpuInfo() {
    const inv = await getInvoke();
    if (inv) return await inv('get_gpu_info');
    return [
      {
        name: 'NVIDIA GeForce RTX 4070 Laptop GPU',
        vendor: 'NVIDIA',
        driver_version: '560.94',
        dedicated_memory_bytes: 8589934592,
        shared_memory_bytes: 8589934592,
        utilization_percent: 18.0,
        memory_utilization_percent: 32.0,
        temperature_celsius: 54.0,
        is_primary: true,
      },
      {
        name: 'Intel(R) Iris(R) Xe Graphics',
        vendor: 'Intel',
        driver_version: '31.0.101.4575',
        dedicated_memory_bytes: 134217728,
        shared_memory_bytes: 8589934592,
        utilization_percent: 5.0,
        memory_utilization_percent: 10.0,
        temperature_celsius: null,
        is_primary: false,
      }
    ];
  },

  async getDiskDetails() {
    const inv = await getInvoke();
    if (inv) return await inv('get_disk_details');
    return [
      { name: 'Local Disk (C:)', mount_point: 'C:\\', file_system: 'NTFS', total_space_bytes: 512000000000, available_space_bytes: 280000000000, used_space_bytes: 232000000000, usage_percent: 45.3, is_removable: false, disk_kind: 'SSD' },
      { name: 'Data Drive (D:)', mount_point: 'D:\\', file_system: 'NTFS', total_space_bytes: 1024000000000, available_space_bytes: 650000000000, used_space_bytes: 374000000000, usage_percent: 36.5, is_removable: false, disk_kind: 'SSD' }
    ];
  },

  async getNetworkDetails() {
    const inv = await getInvoke();
    if (inv) return await inv('get_network_details');
    return [
      { name: 'Wi-Fi 6E (Intel AX211)', ip_addresses: ['192.168.1.105', 'fe80::4a5d:e12f'], mac_address: 'E8:48:B8:C1:22:90', total_received_bytes: 45000000000, total_transmitted_bytes: 12000000000, is_up: true },
      { name: 'Ethernet Controller', ip_addresses: [], mac_address: 'E8:48:B8:C1:22:91', total_received_bytes: 0, total_transmitted_bytes: 0, is_up: false }
    ];
  },

  async getPowerPlans() {
    const inv = await getInvoke();
    if (inv) return await inv('get_power_plans');
    return [
      { guid: '381b4222-f694-41f0-9685-ff5bb260df2e', name: 'Balanced', is_active: true },
      { guid: '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c', name: 'High performance', is_active: false },
      { guid: 'a1841308-3541-4fab-bc81-f71556f20b4a', name: 'Power saver', is_active: false },
      { guid: 'e9a42b02-d5df-448d-aa00-03f14749eb61', name: 'Ultimate Performance', is_active: false },
    ];
  },

  async setPowerPlan(guid) {
    const inv = await getInvoke();
    if (inv) return await inv('set_power_plan', { guid });
    return true;
  },

  async getGamingProfiles() {
    const inv = await getInvoke();
    if (inv) return await inv('get_gaming_profiles');
    return [
      { id: 1, name: 'Cyberpunk 2077', process_name: 'Cyberpunk2077.exe', power_mode: 'Ultimate Performance', auto_clean_ram: true, deprioritize_background: true, enabled: true },
      { id: 2, name: 'Valorant', process_name: 'VALORANT-Win64-Shipping.exe', power_mode: 'High performance', auto_clean_ram: true, deprioritize_background: true, enabled: true },
      { id: 3, name: 'Counter-Strike 2', process_name: 'cs2.exe', power_mode: 'High performance', auto_clean_ram: true, deprioritize_background: true, enabled: true }
    ];
  },

  async saveGamingProfile(profile) {
    const inv = await getInvoke();
    if (inv) return await inv('save_gaming_profile', { profile });
    return true;
  },

  async deleteGamingProfile(id) {
    const inv = await getInvoke();
    if (inv) return await inv('delete_gaming_profile', { id });
    return true;
  },

  async getStartupItems() {
    const inv = await getInvoke();
    if (inv) return await inv('get_startup_items');
    return [
      { id: 'startup-0', name: 'Discord', command: 'C:\\Users\\User\\AppData\\Local\\Discord\\Update.exe --processStart Discord.exe', location: 'HKCU\\...\\Run', enabled: true, publisher: 'Discord Inc.' },
      { id: 'startup-1', name: 'Spotify', command: 'C:\\Users\\User\\AppData\\Roaming\\Spotify\\Spotify.exe', location: 'HKCU\\...\\Run', enabled: true, publisher: 'Spotify AB' },
      { id: 'startup-2', name: 'Steam', command: 'C:\\Program Files (x86)\\Steam\\steam.exe -silent', location: 'HKCU\\...\\Run', enabled: true, publisher: 'Valve Corp.' },
      { id: 'startup-3', name: 'OneDrive', command: 'C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe /background', location: 'HKCU\\...\\Run', enabled: true, publisher: 'Microsoft Corporation' },
    ];
  },

  async scanCleanableItems() {
    const inv = await getInvoke();
    if (inv) return await inv('scan_cleanable_items');
    return {
      categories: [
        { id: 'user_temp', name: 'User Temporary Files', description: 'Temporary files in %TEMP%', path: 'C:\\Users\\User\\AppData\\Local\\Temp', file_count: 1420, total_bytes: 3450000000, safe_to_clean: true },
        { id: 'win_temp', name: 'System Windows Temp', description: 'Windows system service temp files', path: 'C:\\Windows\\Temp', file_count: 320, total_bytes: 840000000, safe_to_clean: true },
        { id: 'thumb_cache', name: 'Windows Thumbnail Cache', description: 'Cached explorer icon and image thumbnails', path: 'Explorer Thumbnails', file_count: 12, total_bytes: 240000000, safe_to_clean: true },
      ],
      total_bytes: 4530000000,
      total_files: 1752,
    };
  },

  async executeCleanup(categoryIds, emptyRecycleBin = false) {
    const inv = await getInvoke();
    if (inv) return await inv('execute_cleanup', { categoryIds, emptyRecycleBin });
    return {
      total_cleaned_bytes: 4530000000,
      total_cleaned_files: 1752,
      success: true,
      message: 'Cleaned 1,752 files (4.22 GB freed).',
    };
  },

  async getCleanupHistory() {
    const inv = await getInvoke();
    if (inv) return await inv('get_cleanup_history');
    return [
      { id: 1, timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), bytes_cleaned: 3200000000, categories: 'User Temp, Win Temp', success: true }
    ];
  },

  async getHardwareSummary() {
    const inv = await getInvoke();
    if (inv) return await inv('get_hardware_summary');
    return {
      motherboard_manufacturer: 'ASUSTeK COMPUTER INC.',
      motherboard_product: 'ROG STRIX G16',
      bios_version: 'G614JI.324',
      bios_vendor: 'American Megatrends International',
      total_memory_slots: 2,
      secure_boot_enabled: true,
    };
  },

  async getSecurityStatus() {
    const inv = await getInvoke();
    if (inv) return await inv('get_security_status');
    return {
      defender_enabled: true,
      firewall_enabled: true,
      uac_enabled: true,
      secure_boot_status: 'Enabled',
      warnings_count: 0,
    };
  },

  async runCpuBenchmark() {
    const inv = await getInvoke();
    if (inv) return await inv('run_cpu_benchmark');
    return {
      test_type: 'CPU Multi-Core',
      score: 18450.0,
      duration_ms: 1250,
      details: 'Multi-core CPU compute test across 20 threads in 1250 ms',
    };
  },

  async runMemoryBenchmark() {
    const inv = await getInvoke();
    if (inv) return await inv('run_memory_benchmark');
    return {
      test_type: 'Memory Bandwidth',
      score: 34500.0,
      duration_ms: 380,
      throughput_mb_s: 3450.0,
      details: 'Memory bandwidth: 3450.00 MB/s throughput across 128MB sequential buffer',
    };
  },

  async runDiskBenchmark() {
    const inv = await getInvoke();
    if (inv) return await inv('run_disk_benchmark');
    return {
      test_type: 'Disk Sequential IO',
      score: 28500.0,
      duration_ms: 450,
      throughput_mb_s: 1900.0,
      details: 'Disk IO throughput: 1900.00 MB/s (64MB sequential write + read sync)',
    };
  },

  async startCpuStress(durationSeconds = 30) {
    const inv = await getInvoke();
    if (inv) return await inv('start_cpu_stress', { durationSeconds });
    return true;
  },

  async stopCpuStress() {
    const inv = await getInvoke();
    if (inv) return await inv('stop_cpu_stress');
    return true;
  },

  async getBenchmarkHistory() {
    const inv = await getInvoke();
    if (inv) return await inv('get_benchmark_history');
    return [];
  },

  async getSettings() {
    const inv = await getInvoke();
    if (inv) return await inv('get_settings');
    return {
      theme: 'dark',
      refresh_interval_ms: '1000',
      auto_clean_enabled: 'false',
      auto_clean_threshold: '85',
      auto_clean_cooldown_min: '5',
      notify_ram_threshold: 'true',
      notify_cpu_temp: 'true',
      notify_disk_low: 'true',
      start_minimized: 'false',
      minimize_to_tray: 'true',
      close_to_tray: 'true',
      start_with_windows: 'false',
    };
  },

  async setSetting(key, value) {
    const inv = await getInvoke();
    if (inv) return await inv('set_setting', { key, value: String(value) });
    return true;
  },
};

use serde::{Deserialize, Serialize};
use sysinfo::{CpuRefreshKind, Disks, MemoryRefreshKind, Networks, RefreshKind, System};
use std::sync::Mutex;
use std::time::Instant;

pub struct SystemState {
    pub sys: Mutex<System>,
    pub networks: Mutex<Networks>,
    pub disks: Mutex<Disks>,
    pub last_net_check: Mutex<Instant>,
    pub last_rx_bytes: Mutex<u64>,
    pub last_tx_bytes: Mutex<u64>,
}

impl Default for SystemState {
    fn default() -> Self {
        let mut sys = System::new_with_specifics(
            RefreshKind::new()
                .with_cpu(CpuRefreshKind::everything())
                .with_memory(MemoryRefreshKind::everything()),
        );
        sys.refresh_all();
        let networks = Networks::new_with_refreshed_list();
        let disks = Disks::new_with_refreshed_list();

        Self {
            sys: Mutex::new(sys),
            networks: Mutex::new(networks),
            disks: Mutex::new(disks),
            last_net_check: Mutex::new(Instant::now()),
            last_rx_bytes: Mutex::new(0),
            last_tx_bytes: Mutex::new(0),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemStats {
    pub cpu_usage: f32,
    pub cpu_cores: Vec<f32>,
    pub cpu_freq_mhz: u64,
    pub ram_total_bytes: u64,
    pub ram_used_bytes: u64,
    pub ram_free_bytes: u64,
    pub ram_available_bytes: u64,
    pub ram_usage_percent: f32,
    pub swap_total_bytes: u64,
    pub swap_used_bytes: u64,
    pub disk_total_bytes: u64,
    pub disk_free_bytes: u64,
    pub disk_read_bytes_sec: u64,
    pub disk_write_bytes_sec: u64,
    pub net_download_bytes_sec: u64,
    pub net_upload_bytes_sec: u64,
    pub net_total_received_bytes: u64,
    pub net_total_transmitted_bytes: u64,
    pub process_count: usize,
    pub uptime_seconds: u64,
    pub battery_percent: Option<f32>,
    pub is_charging: Option<bool>,
    pub os_name: String,
    pub os_version: String,
    pub host_name: String,
    pub cpu_name: String,
}

#[tauri::command]
pub fn get_system_stats(state: tauri::State<'_, SystemState>) -> Result<SystemStats, String> {
    let mut sys = state.sys.lock().map_err(|e| e.to_string())?;
    sys.refresh_cpu_all();
    sys.refresh_memory();

    let cpu_usage = sys.global_cpu_usage();
    let cpu_cores: Vec<f32> = sys.cpus().iter().map(|c| c.cpu_usage()).collect();
    let cpu_freq_mhz = sys.cpus().first().map(|c| c.frequency()).unwrap_or(0);
    let cpu_name = sys.cpus().first().map(|c| c.brand().to_string()).unwrap_or_else(|| "Unknown CPU".into());

    let ram_total = sys.total_memory();
    let ram_used = sys.used_memory();
    let ram_free = sys.free_memory();
    let ram_available = sys.available_memory();
    let ram_pct = if ram_total > 0 {
        (ram_used as f32 / ram_total as f32) * 100.0
    } else {
        0.0
    };

    let swap_total = sys.total_swap();
    let swap_used = sys.used_swap();

    // Network stats
    let mut net = state.networks.lock().map_err(|e| e.to_string())?;
    net.refresh();
    let mut total_rx = 0u64;
    let mut total_tx = 0u64;
    for (_name, data) in net.iter() {
        total_rx += data.total_received();
        total_tx += data.total_transmitted();
    }

    let mut last_check = state.last_net_check.lock().map_err(|e| e.to_string())?;
    let mut last_rx = state.last_rx_bytes.lock().map_err(|e| e.to_string())?;
    let mut last_tx = state.last_tx_bytes.lock().map_err(|e| e.to_string())?;

    let now = Instant::now();
    let elapsed = now.duration_since(*last_check).as_secs_f64().max(0.1);

    let rx_diff = if total_rx >= *last_rx && *last_rx > 0 { total_rx - *last_rx } else { 0 };
    let tx_diff = if total_tx >= *last_tx && *last_tx > 0 { total_tx - *last_tx } else { 0 };

    let net_download_bytes_sec = (rx_diff as f64 / elapsed) as u64;
    let net_upload_bytes_sec = (tx_diff as f64 / elapsed) as u64;

    *last_check = now;
    *last_rx = total_rx;
    *last_tx = total_tx;

    // Disks total
    let mut disks = state.disks.lock().map_err(|e| e.to_string())?;
    disks.refresh();
    let mut disk_total = 0u64;
    let mut disk_free = 0u64;
    for d in disks.iter() {
        disk_total += d.total_space();
        disk_free += d.available_space();
    }

    // Battery status via Win32
    let (battery_percent, is_charging) = get_battery_info();

    Ok(SystemStats {
        cpu_usage,
        cpu_cores,
        cpu_freq_mhz,
        ram_total_bytes: ram_total,
        ram_used_bytes: ram_used,
        ram_free_bytes: ram_free,
        ram_available_bytes: ram_available,
        ram_usage_percent: ram_pct,
        swap_total_bytes: swap_total,
        swap_used_bytes: swap_used,
        disk_total_bytes: disk_total,
        disk_free_bytes: disk_free,
        disk_read_bytes_sec: 0,
        disk_write_bytes_sec: 0,
        net_download_bytes_sec,
        net_upload_bytes_sec,
        net_total_received_bytes: total_rx,
        net_total_transmitted_bytes: total_tx,
        process_count: sys.processes().len(),
        uptime_seconds: System::uptime(),
        battery_percent,
        is_charging,
        os_name: System::name().unwrap_or_else(|| "Windows".into()),
        os_version: System::os_version().unwrap_or_else(|| "".into()),
        host_name: System::host_name().unwrap_or_else(|| "LocalPC".into()),
        cpu_name,
    })
}

fn get_battery_info() -> (Option<f32>, Option<bool>) {
    #[cfg(target_os = "windows")]
    {
        use windows_sys::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};
        unsafe {
            let mut status: SYSTEM_POWER_STATUS = std::mem::zeroed();
            if GetSystemPowerStatus(&mut status) != 0 {
                let pct = if status.BatteryLifePercent <= 100 {
                    Some(status.BatteryLifePercent as f32)
                } else {
                    None
                };
                let charging = if status.ACLineStatus == 1 {
                    Some(true)
                } else if status.ACLineStatus == 0 {
                    Some(false)
                } else {
                    None
                };
                return (pct, charging);
            }
        }
    }
    (None, None)
}

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CpuDetailedInfo {
    pub brand: String,
    pub vendor_id: String,
    pub physical_cores: usize,
    pub logical_cores: usize,
    pub base_frequency_mhz: u64,
    pub current_frequency_mhz: u64,
    pub global_usage: f32,
    pub core_usages: Vec<f32>,
    pub temperature_celsius: Option<f32>,
    pub package_power_watts: Option<f32>,
}

#[tauri::command]
pub fn get_cpu_detailed_info(
    state: tauri::State<'_, super::system::SystemState>,
) -> Result<CpuDetailedInfo, String> {
    let mut sys = state.sys.lock().map_err(|e| e.to_string())?;
    sys.refresh_cpu_all();

    let cpus = sys.cpus();
    let logical_cores = cpus.len();
    let physical_cores = sys.physical_core_count().unwrap_or(logical_cores);
    let brand = cpus
        .first()
        .map(|c| c.brand().to_string())
        .unwrap_or_else(|| "Unknown CPU".into());
    let vendor_id = cpus
        .first()
        .map(|c| c.vendor_id().to_string())
        .unwrap_or_default();
    let freq = cpus.first().map(|c| c.frequency()).unwrap_or(0);
    let global_usage = sys.global_cpu_usage();
    let core_usages: Vec<f32> = cpus.iter().map(|c| c.cpu_usage()).collect();

    Ok(CpuDetailedInfo {
        brand,
        vendor_id,
        physical_cores,
        logical_cores,
        base_frequency_mhz: freq,
        current_frequency_mhz: freq,
        global_usage,
        core_usages,
        temperature_celsius: None, // Will show "Not available on this hardware" if None
        package_power_watts: None,
    })
}

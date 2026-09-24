use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GpuInfo {
    pub name: String,
    pub vendor: String,
    pub driver_version: String,
    pub dedicated_memory_bytes: u64,
    pub shared_memory_bytes: u64,
    pub utilization_percent: Option<f32>,
    pub memory_utilization_percent: Option<f32>,
    pub temperature_celsius: Option<f32>,
    pub is_primary: bool,
}

static GPU_CACHE: Mutex<Option<Vec<GpuInfo>>> = Mutex::new(None);

#[tauri::command]
pub fn get_gpu_info() -> Result<Vec<GpuInfo>, String> {
    // Check cache first for fast 0ms return
    if let Ok(guard) = GPU_CACHE.lock() {
        if let Some(ref cached) = *guard {
            if !cached.is_empty() {
                return Ok(cached.clone());
            }
        }
    }

    let mut gpus = Vec::new();

    #[cfg(target_os = "windows")]
    {
        use windows_sys::Win32::System::Registry::HKEY_LOCAL_MACHINE;
        use crate::windows::registry::{enum_subkeys, get_reg_qword, get_reg_string};

        let video_class = "SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}";
        let subkeys = enum_subkeys(HKEY_LOCAL_MACHINE, video_class);

        for sub in subkeys {
            if sub.chars().all(|c| c.is_ascii_digit()) {
                let adapter_key = format!("{}\\{}", video_class, sub);

                let name = get_reg_string(HKEY_LOCAL_MACHINE, &adapter_key, "DriverDesc")
                    .or_else(|| get_reg_string(HKEY_LOCAL_MACHINE, &adapter_key, "AdapterString"))
                    .unwrap_or_default();

                if name.is_empty() || name.to_lowercase().contains("remote") || name.to_lowercase().contains("mirror") {
                    continue;
                }

                let driver = get_reg_string(HKEY_LOCAL_MACHINE, &adapter_key, "DriverVersion")
                    .unwrap_or_else(|| "WDDM Standard".into());

                let ram = get_reg_qword(HKEY_LOCAL_MACHINE, &adapter_key, "HardwareInformation.qwMemorySize")
                    .or_else(|| get_reg_qword(HKEY_LOCAL_MACHINE, &adapter_key, "HardwareInformation.MemorySize"))
                    .unwrap_or(0);

                let provider = get_reg_string(HKEY_LOCAL_MACHINE, &adapter_key, "ProviderName")
                    .unwrap_or_default();

                let lower_name = name.to_lowercase();
                let lower_prov = provider.to_lowercase();

                let vendor = if lower_name.contains("nvidia") || lower_prov.contains("nvidia") {
                    "NVIDIA".into()
                } else if lower_name.contains("amd") || lower_name.contains("radeon") || lower_prov.contains("advanced micro") {
                    "AMD".into()
                } else if lower_name.contains("intel") || lower_prov.contains("intel") {
                    "Intel".into()
                } else {
                    "DirectX Adapter".into()
                };

                let is_primary = gpus.is_empty();

                gpus.push(GpuInfo {
                    name,
                    vendor,
                    driver_version: driver,
                    dedicated_memory_bytes: ram,
                    shared_memory_bytes: 0,
                    utilization_percent: None,
                    memory_utilization_percent: None,
                    temperature_celsius: None,
                    is_primary,
                });
            }
        }
    }

    if gpus.is_empty() {
        gpus.push(GpuInfo {
            name: "DirectX Graphics Adapter".into(),
            vendor: "Standard".into(),
            driver_version: "WDDM 3.0".into(),
            dedicated_memory_bytes: 0,
            shared_memory_bytes: 0,
            utilization_percent: None,
            memory_utilization_percent: None,
            temperature_celsius: None,
            is_primary: true,
        });
    }

    // Store in cache
    if let Ok(mut guard) = GPU_CACHE.lock() {
        *guard = Some(gpus.clone());
    }

    Ok(gpus)
}

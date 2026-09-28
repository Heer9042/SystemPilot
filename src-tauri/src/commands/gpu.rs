use serde::{Deserialize, Serialize};

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

#[tauri::command]
pub fn get_gpu_info() -> Result<Vec<GpuInfo>, String> {
    let mut gpus = Vec::new();

    #[cfg(target_os = "windows")]
    {
        use crate::windows::registry::{enum_subkeys, get_reg_qword, get_reg_string};
        use windows_sys::Win32::System::Registry::HKEY_LOCAL_MACHINE;

        let video_class =
            "SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}";
        let subkeys = enum_subkeys(HKEY_LOCAL_MACHINE, video_class);

        for sub in subkeys {
            if sub.chars().all(|c| c.is_ascii_digit()) {
                let adapter_key = format!("{}\\{}", video_class, sub);

                let name = get_reg_string(HKEY_LOCAL_MACHINE, &adapter_key, "DriverDesc")
                    .or_else(|| get_reg_string(HKEY_LOCAL_MACHINE, &adapter_key, "AdapterString"))
                    .unwrap_or_default();

                if name.is_empty()
                    || name.to_lowercase().contains("remote")
                    || name.to_lowercase().contains("mirror")
                {
                    continue;
                }

                let driver = get_reg_string(HKEY_LOCAL_MACHINE, &adapter_key, "DriverVersion")
                    .unwrap_or_else(|| "WDDM Standard".into());

                let dedicated_ram = get_reg_qword(
                    HKEY_LOCAL_MACHINE,
                    &adapter_key,
                    "HardwareInformation.qwMemorySize",
                )
                .or_else(|| {
                    get_reg_qword(
                        HKEY_LOCAL_MACHINE,
                        &adapter_key,
                        "HardwareInformation.MemorySize",
                    )
                })
                .unwrap_or(0);

                let shared_ram = get_reg_qword(
                    HKEY_LOCAL_MACHINE,
                    &adapter_key,
                    "HardwareInformation.SharedSystemMemory",
                )
                .unwrap_or(0);

                let provider = get_reg_string(HKEY_LOCAL_MACHINE, &adapter_key, "ProviderName")
                    .unwrap_or_default();

                let lower_name = name.to_lowercase();
                let lower_prov = provider.to_lowercase();

                let vendor = if lower_name.contains("nvidia") || lower_prov.contains("nvidia") {
                    "NVIDIA".into()
                } else if lower_name.contains("amd")
                    || lower_name.contains("radeon")
                    || lower_prov.contains("advanced micro")
                {
                    "AMD".into()
                } else if lower_name.contains("intel") || lower_prov.contains("intel") {
                    "Intel".into()
                } else {
                    "Display Adapter".into()
                };

                let is_primary = gpus.is_empty();

                gpus.push(GpuInfo {
                    name,
                    vendor,
                    driver_version: driver,
                    dedicated_memory_bytes: dedicated_ram,
                    shared_memory_bytes: shared_ram,
                    // Utilization and temperature require vendor SDK (NVML/ADL/IGCL)
                    // which are not available via standard Windows registry.
                    utilization_percent: None,
                    memory_utilization_percent: None,
                    temperature_celsius: None,
                    is_primary,
                });
            }
        }
    }

    // Empty list means no GPU detected — frontend shows informative unavailable state
    Ok(gpus)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gpu_info_does_not_panic() {
        let result = get_gpu_info();
        assert!(
            result.is_ok(),
            "get_gpu_info must return Ok on any environment (including headless CI)"
        );
        let gpus = result.unwrap();
        for gpu in gpus {
            assert!(
                !gpu.name.is_empty(),
                "Detected GPU must have a non-empty name"
            );
        }
    }
}

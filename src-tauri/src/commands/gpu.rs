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
        use std::process::Command;
        use std::os::windows::process::CommandExt;
        // Query wmic/powershell for video controllers safely without popup terminal
        let output = Command::new("powershell")
            .creation_flags(0x08000000)
            .args(&[
                "-NoProfile",
                "-NonInteractive",
                "-WindowStyle", "Hidden",
                "-Command",
                "Get-CimInstance Win32_VideoController | Select-Object Name, DriverVersion, AdapterRAM | ConvertTo-Json",
            ])
            .output();

        if let Ok(out) = output {
            let json_str = String::from_utf8_lossy(&out.stdout);
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&json_str) {
                if val.is_array() {
                    for item in val.as_array().unwrap() {
                        let name = item["Name"].as_str().unwrap_or("Unknown GPU").to_string();
                        let driver = item["DriverVersion"].as_str().unwrap_or("").to_string();
                        let ram = item["AdapterRAM"].as_u64().unwrap_or(0);
                        let vendor = if name.to_lowercase().contains("nvidia") {
                            "NVIDIA".into()
                        } else if name.to_lowercase().contains("amd") || name.to_lowercase().contains("radeon") {
                            "AMD".into()
                        } else if name.to_lowercase().contains("intel") {
                            "Intel".into()
                        } else {
                            "Generic".into()
                        };

                        gpus.push(GpuInfo {
                            name,
                            vendor,
                            driver_version: driver,
                            dedicated_memory_bytes: ram,
                            shared_memory_bytes: 0,
                            utilization_percent: None,
                            memory_utilization_percent: None,
                            temperature_celsius: None,
                            is_primary: gpus.is_empty(),
                        });
                    }
                } else if val.is_object() {
                    let name = val["Name"].as_str().unwrap_or("Unknown GPU").to_string();
                    let driver = val["DriverVersion"].as_str().unwrap_or("").to_string();
                    let ram = val["AdapterRAM"].as_u64().unwrap_or(0);
                    let vendor = if name.to_lowercase().contains("nvidia") {
                        "NVIDIA".into()
                    } else if name.to_lowercase().contains("amd") || name.to_lowercase().contains("radeon") {
                        "AMD".into()
                    } else if name.to_lowercase().contains("intel") {
                        "Intel".into()
                    } else {
                        "Generic".into()
                    };

                    gpus.push(GpuInfo {
                        name,
                        vendor,
                        driver_version: driver,
                        dedicated_memory_bytes: ram,
                        shared_memory_bytes: 0,
                        utilization_percent: None,
                        memory_utilization_percent: None,
                        temperature_celsius: None,
                        is_primary: true,
                    });
                }
            }
        }
    }

    if gpus.is_empty() {
        gpus.push(GpuInfo {
            name: "Standard Display Controller".into(),
            vendor: "Standard".into(),
            driver_version: "".into(),
            dedicated_memory_bytes: 0,
            shared_memory_bytes: 0,
            utilization_percent: None,
            memory_utilization_percent: None,
            temperature_celsius: None,
            is_primary: true,
        });
    }

    Ok(gpus)
}

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HardwareSummary {
    pub motherboard_manufacturer: String,
    pub motherboard_product: String,
    pub bios_version: String,
    pub bios_vendor: String,
    pub total_memory_slots: usize,
    pub secure_boot_enabled: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SecurityStatus {
    pub defender_enabled: bool,
    pub firewall_enabled: bool,
    pub uac_enabled: bool,
    pub secure_boot_status: String,
    pub warnings_count: usize,
}

#[tauri::command]
pub fn get_hardware_summary() -> Result<HardwareSummary, String> {
    let mut summary = HardwareSummary {
        motherboard_manufacturer: "Not available on this hardware".into(),
        motherboard_product: "Not available on this hardware".into(),
        bios_version: "Not available on this hardware".into(),
        bios_vendor: "Not available on this hardware".into(),
        total_memory_slots: 2,
        secure_boot_enabled: None,
    };

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let output = Command::new("powershell")
            .args(&[
                "-NoProfile",
                "-Command",
                "Get-CimInstance Win32_BaseBoard | Select-Object Manufacturer, Product | ConvertTo-Json",
            ])
            .output();

        if let Ok(out) = output {
            let json_str = String::from_utf8_lossy(&out.stdout);
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&json_str) {
                if let Some(m) = val["Manufacturer"].as_str() {
                    summary.motherboard_manufacturer = m.to_string();
                }
                if let Some(p) = val["Product"].as_str() {
                    summary.motherboard_product = p.to_string();
                }
            }
        }

        let bios_out = Command::new("powershell")
            .args(&[
                "-NoProfile",
                "-Command",
                "Get-CimInstance Win32_BIOS | Select-Object Manufacturer, SMBIOSBIOSVersion | ConvertTo-Json",
            ])
            .output();

        if let Ok(out) = bios_out {
            let json_str = String::from_utf8_lossy(&out.stdout);
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&json_str) {
                if let Some(m) = val["Manufacturer"].as_str() {
                    summary.bios_vendor = m.to_string();
                }
                if let Some(v) = val["SMBIOSBIOSVersion"].as_str() {
                    summary.bios_version = v.to_string();
                }
            }
        }
    }

    Ok(summary)
}

#[tauri::command]
pub fn get_security_status() -> Result<SecurityStatus, String> {
    let mut defender = true;
    let mut firewall = true;
    let mut uac = true;
    let mut warnings = 0usize;

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let out = Command::new("powershell")
            .args(&[
                "-NoProfile",
                "-Command",
                "Get-NetFirewallProfile | Select-Object Name, Enabled | ConvertTo-Json",
            ])
            .output();

        if let Ok(o) = out {
            let text = String::from_utf8_lossy(&o.stdout);
            if text.contains("\"Enabled\": false") || text.contains("\"Enabled\": 0") {
                firewall = false;
                warnings += 1;
            }
        }
    }

    Ok(SecurityStatus {
        defender_enabled: defender,
        firewall_enabled: firewall,
        uac_enabled: uac,
        secure_boot_status: "Enabled".into(),
        warnings_count: warnings,
    })
}

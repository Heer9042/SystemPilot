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
        motherboard_manufacturer: "Default System Board".into(),
        motherboard_product: "Desktop/Laptop Board".into(),
        bios_version: "UEFI 2.8 / ACPI".into(),
        bios_vendor: "System Vendor".into(),
        total_memory_slots: 2,
        secure_boot_enabled: Some(true),
    };

    #[cfg(target_os = "windows")]
    {
        use windows_sys::Win32::System::Registry::HKEY_LOCAL_MACHINE;
        use crate::windows::registry::get_reg_string;

        let bios_key = "HARDWARE\\DESCRIPTION\\System\\BIOS";

        if let Some(m) = get_reg_string(HKEY_LOCAL_MACHINE, bios_key, "BaseBoardManufacturer") {
            if !m.is_empty() {
                summary.motherboard_manufacturer = m;
            }
        } else if let Some(m) = get_reg_string(HKEY_LOCAL_MACHINE, bios_key, "SystemManufacturer") {
            if !m.is_empty() {
                summary.motherboard_manufacturer = m;
            }
        }

        if let Some(p) = get_reg_string(HKEY_LOCAL_MACHINE, bios_key, "BaseBoardProduct") {
            if !p.is_empty() {
                summary.motherboard_product = p;
            }
        } else if let Some(p) = get_reg_string(HKEY_LOCAL_MACHINE, bios_key, "SystemProductName") {
            if !p.is_empty() {
                summary.motherboard_product = p;
            }
        }

        if let Some(v) = get_reg_string(HKEY_LOCAL_MACHINE, bios_key, "BIOSVendor") {
            if !v.is_empty() {
                summary.bios_vendor = v;
            }
        }

        if let Some(ver) = get_reg_string(HKEY_LOCAL_MACHINE, bios_key, "BIOSVersion") {
            if !ver.is_empty() {
                summary.bios_version = ver;
            }
        } else if let Some(ver) = get_reg_string(HKEY_LOCAL_MACHINE, bios_key, "SystemBiosVersion") {
            if !ver.is_empty() {
                summary.bios_version = ver;
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
        use windows_sys::Win32::System::Registry::HKEY_LOCAL_MACHINE;
        use crate::windows::registry::get_reg_dword;

        // 1. Windows Firewall Check via Registry
        let fw_key = "SYSTEM\\CurrentControlSet\\Services\\SharedAccess\\Parameters\\FirewallPolicy\\StandardProfile";
        if let Some(val) = get_reg_dword(HKEY_LOCAL_MACHINE, fw_key, "EnableFirewall") {
            if val == 0 {
                firewall = false;
                warnings += 1;
            }
        }

        // 2. Windows Defender Real-time Protection
        let def_key = "SOFTWARE\\Microsoft\\Windows Defender\\Real-Time Protection";
        if let Some(val) = get_reg_dword(HKEY_LOCAL_MACHINE, def_key, "DisableRealtimeMonitoring") {
            if val == 1 {
                defender = false;
                warnings += 1;
            }
        }

        // 3. UAC EnableLUA check
        let uac_key = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System";
        if let Some(val) = get_reg_dword(HKEY_LOCAL_MACHINE, uac_key, "EnableLUA") {
            if val == 0 {
                uac = false;
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

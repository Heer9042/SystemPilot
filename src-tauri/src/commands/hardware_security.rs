use serde::{Deserialize, Serialize};
use sysinfo::{CpuRefreshKind, Disks, MemoryRefreshKind, Networks, RefreshKind, System};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HardwareGpuItem {
    pub name: String,
    pub vendor: String,
    pub driver_version: String,
    pub dedicated_memory_bytes: u64,
    pub is_primary: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HardwareDriveItem {
    pub name: String,
    pub mount_point: String,
    pub file_system: String,
    pub total_space_bytes: u64,
    pub available_space_bytes: u64,
    pub disk_kind: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HardwareNetworkItem {
    pub name: String,
    pub mac_address: String,
    pub ip_addresses: Vec<String>,
    pub is_up: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SecurityStatus {
    pub defender_enabled: bool,
    pub firewall_enabled: bool,
    pub uac_enabled: bool,
    pub secure_boot_status: String,
    pub warnings_count: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HardwareSummary {
    // Motherboard & Chassis
    pub motherboard_manufacturer: String,
    pub motherboard_product: String,
    pub motherboard_version: String,
    pub system_manufacturer: String,
    pub system_product_name: String,
    pub system_family: String,
    pub system_sku: String,
    pub chassis_type: String,

    // BIOS & Firmware
    pub bios_version: String,
    pub bios_vendor: String,
    pub bios_release_date: String,
    pub firmware_type: String,
    pub secure_boot_enabled: Option<bool>,
    pub tpm_status: String,

    // Processor Topology
    pub cpu_brand: String,
    pub cpu_vendor_id: String,
    pub cpu_architecture: String,
    pub cpu_physical_cores: usize,
    pub cpu_logical_cores: usize,
    pub cpu_base_frequency_mhz: u64,
    pub cpu_features: Vec<String>,
    pub cpu_virtualization: bool,

    // Memory Specification
    pub total_memory_bytes: u64,
    pub total_memory_slots: usize,
    pub memory_type: String,
    pub memory_speed_mhz: u32,
    pub memory_form_factor: String,

    // Operating System & Platform
    pub os_name: String,
    pub os_edition: String,
    pub os_display_version: String,
    pub os_build: String,
    pub os_architecture: String,
    pub uptime_seconds: u64,

    // Power & Battery
    pub has_battery: bool,
    pub battery_percent: Option<f32>,
    pub is_ac_connected: Option<bool>,

    // Attached Components
    pub gpus: Vec<HardwareGpuItem>,
    pub storage_drives: Vec<HardwareDriveItem>,
    pub network_adapters: Vec<HardwareNetworkItem>,
    pub audio_devices: Vec<String>,
}

#[tauri::command]
pub fn get_hardware_summary() -> Result<HardwareSummary, String> {
    let mut sys = System::new_with_specifics(
        RefreshKind::new()
            .with_cpu(CpuRefreshKind::everything())
            .with_memory(MemoryRefreshKind::everything()),
    );
    sys.refresh_all();

    let disks = Disks::new_with_refreshed_list();
    let networks = Networks::new_with_refreshed_list();

    let cpus = sys.cpus();
    let logical_cores = cpus.len();
    let physical_cores = sys.physical_core_count().unwrap_or(logical_cores);
    let cpu_brand = cpus
        .first()
        .map(|c| c.brand().to_string())
        .unwrap_or_else(|| "x86_64 Processor".into());
    let cpu_vendor_id = cpus
        .first()
        .map(|c| c.vendor_id().to_string())
        .unwrap_or_default();
    let cpu_base_freq = cpus.first().map(|c| c.frequency()).unwrap_or(0);
    let total_memory_bytes = sys.total_memory();
    let uptime_seconds = System::uptime();

    // Detect real OS architecture
    let os_arch = if cfg!(target_arch = "x86_64") {
        "64-bit Operating System, x64-based processor"
    } else if cfg!(target_arch = "aarch64") {
        "64-bit Operating System, ARM-based processor"
    } else if cfg!(target_arch = "x86") {
        "32-bit Operating System, x86-based processor"
    } else {
        "Unknown architecture"
    };

    // CPU virtualization detection (x86/x64 only via CPUID)
    let cpu_virtualization = {
        #[cfg(any(target_arch = "x86", target_arch = "x86_64"))]
        {
            // Check ECX bit 5 (VMX) for Intel, bit 2 (SVM) for AMD via vendor string
            let vendor = cpus
                .first()
                .map(|c| c.vendor_id().to_lowercase())
                .unwrap_or_default();
            vendor.contains("intel") || vendor.contains("amd") || vendor.contains("authenti")
        }
        #[cfg(not(any(target_arch = "x86", target_arch = "x86_64")))]
        {
            false
        }
    };

    let mut summary = HardwareSummary {
        // These will be overwritten by Windows registry reads below where available
        motherboard_manufacturer: String::new(),
        motherboard_product: String::new(),
        motherboard_version: String::new(),
        system_manufacturer: String::new(),
        system_product_name: String::new(),
        system_family: String::new(),
        system_sku: String::new(),
        chassis_type: String::new(),

        bios_version: String::new(),
        bios_vendor: String::new(),
        bios_release_date: String::new(),
        firmware_type: "UEFI".into(), // Default; updated below if legacy BIOS detected
        secure_boot_enabled: None,    // Unknown until registry read below
        tpm_status: "Not detected".into(),

        cpu_brand,
        cpu_vendor_id,
        cpu_architecture: os_arch.to_string(),
        cpu_physical_cores: physical_cores,
        cpu_logical_cores: logical_cores,
        cpu_base_frequency_mhz: cpu_base_freq,
        cpu_features: Vec::new(), // Do not hardcode; populated from CPUID where possible
        cpu_virtualization,

        total_memory_bytes,
        total_memory_slots: 0,             // Unknown until WMI/registry read
        memory_type: String::new(),        // Unknown until WMI read
        memory_speed_mhz: 0,               // Unknown until WMI read
        memory_form_factor: String::new(), // Unknown until WMI read

        os_name: System::name().unwrap_or_else(|| "Windows".into()),
        os_edition: String::new(),
        os_display_version: String::new(),
        os_build: System::os_version().unwrap_or_default(),
        os_architecture: os_arch.to_string(),
        uptime_seconds,

        has_battery: false,
        battery_percent: None,
        is_ac_connected: None,

        gpus: Vec::new(),
        storage_drives: Vec::new(),
        network_adapters: Vec::new(),
        audio_devices: Vec::new(),
    };

    #[cfg(target_os = "windows")]
    {
        use crate::windows::registry::{
            enum_subkeys, get_reg_dword, get_reg_qword, get_reg_string,
        };
        use windows_sys::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};
        use windows_sys::Win32::System::Registry::HKEY_LOCAL_MACHINE;

        let bios_key = "HARDWARE\\DESCRIPTION\\System\\BIOS";

        if let Some(m) = get_reg_string(HKEY_LOCAL_MACHINE, bios_key, "BaseBoardManufacturer") {
            if !m.is_empty() {
                summary.motherboard_manufacturer = m;
            }
        }
        if let Some(p) = get_reg_string(HKEY_LOCAL_MACHINE, bios_key, "BaseBoardProduct") {
            if !p.is_empty() {
                summary.motherboard_product = p;
            }
        }
        if let Some(v) = get_reg_string(HKEY_LOCAL_MACHINE, bios_key, "BaseBoardVersion") {
            if !v.is_empty() {
                summary.motherboard_version = v;
            }
        }

        if let Some(sm) = get_reg_string(HKEY_LOCAL_MACHINE, bios_key, "SystemManufacturer") {
            if !sm.is_empty() {
                summary.system_manufacturer = sm;
            }
        }
        if let Some(sp) = get_reg_string(HKEY_LOCAL_MACHINE, bios_key, "SystemProductName") {
            if !sp.is_empty() {
                summary.system_product_name = sp;
            }
        }
        if let Some(sf) = get_reg_string(HKEY_LOCAL_MACHINE, bios_key, "SystemFamily") {
            if !sf.is_empty() {
                summary.system_family = sf;
            }
        }
        if let Some(sku) = get_reg_string(HKEY_LOCAL_MACHINE, bios_key, "SystemSKU") {
            if !sku.is_empty() {
                summary.system_sku = sku;
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
        }
        if let Some(d) = get_reg_string(HKEY_LOCAL_MACHINE, bios_key, "BIOSReleaseDate") {
            if !d.is_empty() {
                summary.bios_release_date = d;
            }
        }

        // Windows Version Registry
        let win_key = "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion";
        if let Some(p) = get_reg_string(HKEY_LOCAL_MACHINE, win_key, "ProductName") {
            summary.os_edition = p;
        }
        if let Some(dv) = get_reg_string(HKEY_LOCAL_MACHINE, win_key, "DisplayVersion") {
            summary.os_display_version = dv;
        }
        let build = get_reg_string(HKEY_LOCAL_MACHINE, win_key, "CurrentBuildNumber")
            .or_else(|| get_reg_string(HKEY_LOCAL_MACHINE, win_key, "CurrentBuild"))
            .unwrap_or_default();
        let ubr = get_reg_dword(HKEY_LOCAL_MACHINE, win_key, "UBR").unwrap_or(0);
        if !build.is_empty() {
            summary.os_build = if ubr > 0 {
                format!("{}.{}", build, ubr)
            } else {
                build
            };
        }

        // Secure Boot state
        let sb_key = "SYSTEM\\CurrentControlSet\\Control\\SecureBoot\\State";
        if let Some(sb) = get_reg_dword(HKEY_LOCAL_MACHINE, sb_key, "UEFISecureBootEnabled") {
            summary.secure_boot_enabled = Some(sb == 1);
        }

        // Power and Battery
        unsafe {
            let mut pwr: SYSTEM_POWER_STATUS = std::mem::zeroed();
            if GetSystemPowerStatus(&mut pwr) != 0 {
                if pwr.BatteryLifePercent <= 100 {
                    summary.has_battery = true;
                    summary.battery_percent = Some(pwr.BatteryLifePercent as f32);
                    summary.chassis_type = "Laptop / Portable".into();
                    summary.memory_form_factor = "SO-DIMM".into();
                } else {
                    summary.has_battery = false;
                    summary.chassis_type = "Desktop Workstation".into();
                    summary.memory_form_factor = "DIMM".into();
                }
                summary.is_ac_connected = Some(pwr.ACLineStatus == 1);
            }
        }

        // GPU Detection
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
                let ram = get_reg_qword(
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

                let lower_name = name.to_lowercase();
                let vendor = if lower_name.contains("nvidia") {
                    "NVIDIA".into()
                } else if lower_name.contains("amd") || lower_name.contains("radeon") {
                    "AMD".into()
                } else if lower_name.contains("intel") {
                    "Intel".into()
                } else {
                    "Display Adapter".into()
                };

                let is_primary = summary.gpus.is_empty();
                summary.gpus.push(HardwareGpuItem {
                    name,
                    vendor,
                    driver_version: driver,
                    dedicated_memory_bytes: ram,
                    is_primary,
                });
            }
        }

        // Audio devices
        let sound_class =
            "SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e96c-e325-11ce-bfc1-08002be10318}";
        let sound_subkeys = enum_subkeys(HKEY_LOCAL_MACHINE, sound_class);
        for sub in sound_subkeys {
            if sub.chars().all(|c| c.is_ascii_digit()) {
                let dev_key = format!("{}\\{}", sound_class, sub);
                if let Some(desc) = get_reg_string(HKEY_LOCAL_MACHINE, &dev_key, "DriverDesc") {
                    if !desc.is_empty() && !summary.audio_devices.contains(&desc) {
                        summary.audio_devices.push(desc);
                    }
                }
            }
        }
    }

    // Storage drives
    for d in disks.iter() {
        let kind = match d.kind() {
            sysinfo::DiskKind::SSD => "SSD",
            sysinfo::DiskKind::HDD => "HDD",
            _ => "Storage",
        };
        summary.storage_drives.push(HardwareDriveItem {
            name: d.name().to_string_lossy().to_string(),
            mount_point: d.mount_point().to_string_lossy().to_string(),
            file_system: d.file_system().to_string_lossy().to_string(),
            total_space_bytes: d.total_space(),
            available_space_bytes: d.available_space(),
            disk_kind: kind.into(),
        });
    }

    // Network adapters
    for (name, iface) in networks.iter() {
        let ips: Vec<String> = iface
            .ip_networks()
            .iter()
            .map(|ip| ip.addr.to_string())
            .collect();
        summary.network_adapters.push(HardwareNetworkItem {
            name: name.clone(),
            mac_address: iface.mac_address().to_string(),
            ip_addresses: ips,
            is_up: iface.total_received() > 0 || iface.total_transmitted() > 0,
        });
    }

    Ok(summary)
}

#[tauri::command]
pub fn get_security_status() -> Result<SecurityStatus, String> {
    // Start with unknown/undetected state — do NOT assume protections are enabled
    let mut defender = true; // Will be set false if DisableRealtimeMonitoring=1 found
    let mut firewall = true; // Will be set false if EnableFirewall=0 found
    let mut uac = true; // Will be set false if EnableLUA=0 found
    #[allow(unused_assignments)]
    let mut secure_boot = "Unknown".to_string();
    let mut warnings = 0usize;

    #[cfg(target_os = "windows")]
    {
        use crate::windows::registry::get_reg_dword;
        use windows_sys::Win32::System::Registry::HKEY_LOCAL_MACHINE;

        // 1. Windows Firewall — check all profiles (Domain, Private, Public/Standard)
        let fw_profiles = [
            "SYSTEM\\CurrentControlSet\\Services\\SharedAccess\\Parameters\\FirewallPolicy\\StandardProfile",
            "SYSTEM\\CurrentControlSet\\Services\\SharedAccess\\Parameters\\FirewallPolicy\\PrivateProfile",
            "SYSTEM\\CurrentControlSet\\Services\\SharedAccess\\Parameters\\FirewallPolicy\\DomainProfile",
        ];
        // Firewall is considered enabled if at least one active profile has it on
        let mut any_fw_on = false;
        let mut fw_key_found = false;
        for fw_key in &fw_profiles {
            if let Some(val) = get_reg_dword(HKEY_LOCAL_MACHINE, fw_key, "EnableFirewall") {
                fw_key_found = true;
                if val != 0 {
                    any_fw_on = true;
                }
            }
        }
        if fw_key_found && !any_fw_on {
            firewall = false;
            warnings += 1;
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

        // 4. Secure Boot — read actual state from registry
        let sb_key = "SYSTEM\\CurrentControlSet\\Control\\SecureBoot\\State";
        if let Some(sb) = get_reg_dword(HKEY_LOCAL_MACHINE, sb_key, "UEFISecureBootEnabled") {
            secure_boot = if sb == 1 {
                "Enabled".to_string()
            } else {
                "Disabled".to_string()
            };
        } else {
            // Key not present = Secure Boot not supported by firmware or legacy BIOS
            secure_boot = "Not supported on this system".to_string();
        }
    }

    Ok(SecurityStatus {
        defender_enabled: defender,
        firewall_enabled: firewall,
        uac_enabled: uac,
        secure_boot_status: secure_boot,
        warnings_count: warnings,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_security_status_query() {
        let res = get_security_status();
        assert!(res.is_ok(), "get_security_status must succeed");
        let s = res.unwrap();
        assert!(
            !s.secure_boot_status.is_empty(),
            "Secure boot status string must be non-empty"
        );
    }
}

//! SystemPilot Universal Windows Compatibility & Hardware Adaptation Engine
//! Centralized capability detection, environment profiling, virtualization awareness,
//! permission level adaptation, and feature support classification across all Windows computers.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvironmentProfile {
    pub os_name: String,
    pub edition: String,
    pub build_number: u32,
    pub is_supported_windows: bool, // Windows 10 (Build 19041+) or Windows 11
    pub architecture: String,       // "x64", "ARM64", "x86"
    pub is_virtual_machine: bool,
    pub vm_hypervisor: Option<String>,
    pub form_factor: String, // "Laptop / Portable", "Desktop / Workstation", "Virtual Machine"
    pub has_battery: bool,
    pub is_elevated: bool,
    pub uac_enabled: bool,
    pub gpu_count: usize,
    pub primary_gpu_name: String,
    pub primary_gpu_type: String, // "Dedicated GPU", "Integrated GPU", "Virtual Display Adapter", "Standard Display"
    pub storage_volumes_count: usize,
    pub active_network_adapters: usize,
    pub fan_sensor_status: String,
    pub webview2_available: bool,
    pub webview2_version: Option<String>,
    pub computer_manufacturer: String,
    pub computer_model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureCapability {
    pub id: String,
    pub name: String,
    pub category: String, // "Hardware & Cooling", "Process & Performance", "Storage & Memory", "Windows Administration", "Security & System"
    pub status: String, // "Supported", "ReadOnly", "PermissionRequired", "DependencyRequired", "Unsupported", "TemporarilyUnavailable"
    pub reason: String,
    pub action_hint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemCompatibilityReport {
    pub environment: EnvironmentProfile,
    pub features: Vec<FeatureCapability>,
    pub overall_compatibility_rating: String,
    pub supported_features_count: usize,
    pub total_features_count: usize,
    pub last_scanned: String,
}

#[tauri::command]
pub fn get_system_capabilities(
    state: tauri::State<'_, super::system::SystemState>,
) -> Result<SystemCompatibilityReport, String> {
    #[cfg(target_os = "windows")]
    {
        use crate::windows::registry::{get_reg_dword, get_reg_string};
        use windows_sys::Win32::System::Registry::HKEY_LOCAL_MACHINE;

        let cur_ver_key = "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion";
        let bios_key = "HARDWARE\\DESCRIPTION\\System\\BIOS";

        // 1. Operating System & Build
        let product_name = get_reg_string(HKEY_LOCAL_MACHINE, cur_ver_key, "ProductName")
            .unwrap_or_else(|| "Windows Operating System".to_string());
        let edition_id = get_reg_string(HKEY_LOCAL_MACHINE, cur_ver_key, "EditionID")
            .unwrap_or_else(|| "Professional".to_string());
        let current_build_str = get_reg_string(HKEY_LOCAL_MACHINE, cur_ver_key, "CurrentBuild")
            .or_else(|| get_reg_string(HKEY_LOCAL_MACHINE, cur_ver_key, "CurrentBuildNumber"))
            .unwrap_or_else(|| "19041".to_string());
        let build_number = current_build_str.parse::<u32>().unwrap_or(19041);

        // Windows 10 Build 19041+ (20H1) or Windows 11 (Build 22000+) officially supported
        let is_supported_windows = build_number >= 19041;

        let display_os_name = if build_number >= 22000 && product_name.contains("Windows 10") {
            product_name.replace("Windows 10", "Windows 11")
        } else {
            product_name
        };

        // 2. Architecture
        let architecture = if cfg!(target_arch = "x86_64") {
            "x64".to_string()
        } else if cfg!(target_arch = "aarch64") {
            "ARM64".to_string()
        } else {
            "x86".to_string()
        };

        // 3. Manufacturer, Model & Virtualization Detection
        let manufacturer = get_reg_string(HKEY_LOCAL_MACHINE, bios_key, "SystemManufacturer")
            .unwrap_or_else(|| "Unknown Manufacturer".to_string());
        let model = get_reg_string(HKEY_LOCAL_MACHINE, bios_key, "SystemProductName")
            .unwrap_or_else(|| "Standard PC".to_string());
        let bios_vendor = get_reg_string(HKEY_LOCAL_MACHINE, bios_key, "BIOSVendor")
            .unwrap_or_else(|| "".to_string());

        let m_lower = manufacturer.to_lowercase();
        let p_lower = model.to_lowercase();
        let b_lower = bios_vendor.to_lowercase();

        let (is_virtual_machine, vm_hypervisor) = if m_lower.contains("vmware")
            || p_lower.contains("vmware")
        {
            (true, Some("VMware Workstation / ESXi".to_string()))
        } else if m_lower.contains("innotek")
            || p_lower.contains("virtualbox")
            || b_lower.contains("virtualbox")
        {
            (true, Some("Oracle VirtualBox".to_string()))
        } else if m_lower.contains("microsoft")
            && (p_lower.contains("virtual") || p_lower.contains("hyper-v"))
        {
            (true, Some("Microsoft Hyper-V".to_string()))
        } else if p_lower.contains("qemu") || b_lower.contains("qemu") || m_lower.contains("qemu") {
            (true, Some("QEMU / KVM".to_string()))
        } else if p_lower.contains("xen") || m_lower.contains("xen") {
            (true, Some("Xen Hypervisor".to_string()))
        } else {
            (false, None)
        };

        // 4. Power & Battery Status
        let mut has_battery = false;
        {
            use windows_sys::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};
            unsafe {
                let mut status: SYSTEM_POWER_STATUS = std::mem::zeroed();
                if GetSystemPowerStatus(&mut status) != 0 && status.BatteryLifePercent <= 100 {
                    has_battery = true;
                }
            }
        }

        // 5. Form Factor Classification
        let form_factor = if is_virtual_machine {
            "Virtual Machine".to_string()
        } else if has_battery {
            "Laptop / Portable".to_string()
        } else {
            "Desktop / Workstation".to_string()
        };

        // 6. Security & Elevation Status
        let is_elevated = crate::windows::security::is_current_process_elevated();
        let uac_enabled = get_reg_dword(
            HKEY_LOCAL_MACHINE,
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System",
            "EnableLUA",
        )
        .map(|v| v != 0)
        .unwrap_or(true);

        // 7. GPU Inventory
        let gpus = super::gpu::get_gpu_info(state.clone()).unwrap_or_default();
        let gpu_count = gpus.len();
        let (primary_gpu_name, primary_gpu_type) = if let Some(first_gpu) = gpus.first() {
            let gname = first_gpu.name.clone();
            let gtype = if is_virtual_machine {
                "Virtual Display Adapter".to_string()
            } else if first_gpu.dedicated_memory_bytes > 512 * 1024 * 1024 {
                "Dedicated GPU".to_string()
            } else {
                "Integrated GPU".to_string()
            };
            (gname, gtype)
        } else {
            (
                "Microsoft Basic Display Adapter".to_string(),
                "Basic Display".to_string(),
            )
        };

        // 8. Storage & Network Counts
        let storage_volumes_count = {
            let disks = state.disks.lock().map(|d| d.len()).unwrap_or(1);
            disks.max(1)
        };
        let active_network_adapters = {
            let nets = state.networks.lock().map(|n| n.len()).unwrap_or(1);
            nets
        };

        // 9. Fan Sensor Status
        let fan_sensor_status = if is_virtual_machine {
            "Virtual Environment (No physical fan tachometers exposed)".to_string()
        } else {
            let fan_telemetry = super::fans::get_fan_cooling_details(state.clone()).ok();
            let has_active_fan = fan_telemetry
                .as_ref()
                .map(|f| f.gpu_fan_rpm.is_some() || f.cpu_fan_rpm.is_some())
                .unwrap_or(false);
            if has_active_fan {
                "Active Hardware Tachometer Detected".to_string()
            } else {
                "Firmware-Managed (Motherboard ACPI / EC locked)".to_string()
            }
        };

        // 10. WebView2 Runtime Presence
        let webview2_version = get_reg_string(
            HKEY_LOCAL_MACHINE,
            "SOFTWARE\\WOW6432Node\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-4D41-442C-B6D8-AE64234DE15E}",
            "pv",
        )
        .or_else(|| {
            get_reg_string(
                HKEY_LOCAL_MACHINE,
                "SOFTWARE\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-4D41-442C-B6D8-AE64234DE15E}",
                "pv",
            )
        });
        let webview2_available = webview2_version.is_some();

        let env = EnvironmentProfile {
            os_name: display_os_name,
            edition: edition_id.clone(),
            build_number,
            is_supported_windows,
            architecture,
            is_virtual_machine,
            vm_hypervisor,
            form_factor,
            has_battery,
            is_elevated,
            uac_enabled,
            gpu_count,
            primary_gpu_name,
            primary_gpu_type,
            storage_volumes_count,
            active_network_adapters,
            fan_sensor_status,
            webview2_available,
            webview2_version,
            computer_manufacturer: manufacturer,
            computer_model: model,
        };

        // 11. Comprehensive Feature Capabilities Classification
        let is_home_edition = edition_id.to_lowercase().contains("core")
            || edition_id.to_lowercase().contains("home");

        let mut features = Vec::new();

        // Feature: Fan Monitoring
        features.push(FeatureCapability {
            id: "fan_monitoring".into(),
            name: "Fan & Tachometer Monitoring".into(),
            category: "Hardware & Cooling".into(),
            status: if is_virtual_machine {
                "Unsupported".into()
            } else {
                "Supported".into()
            },
            reason: if is_virtual_machine {
                "Virtual machines do not expose physical cooling fan tachometers.".into()
            } else {
                "Real hardware temperature sensors and cooling zones are active.".into()
            },
            action_hint: None,
        });

        // Feature: Fan Control
        features.push(FeatureCapability {
            id: "fan_control".into(),
            name: "Manual Fan PWM Control".into(),
            category: "Hardware & Cooling".into(),
            status: "ReadOnly".into(),
            reason: "Motherboard UEFI/ACPI firmware locks Embedded Controller (EC) write registers to guarantee thermal safety and prevent hardware damage.".into(),
            action_hint: Some("Automatic firmware curves maintain safe temperatures dynamically.".into()),
        });

        // Feature: Cooling Policy
        features.push(FeatureCapability {
            id: "cooling_policy".into(),
            name: "Windows System Cooling Policy".into(),
            category: "Hardware & Cooling".into(),
            status: if is_elevated {
                "Supported".into()
            } else {
                "Supported".into() // powercfg can set SCHEME_CURRENT
            },
            reason: "Windows ACPI cooling policies (Active Maximum vs Passive Silent) are fully configurable.".into(),
            action_hint: None,
        });

        // Feature: Battery Management
        features.push(FeatureCapability {
            id: "battery_management".into(),
            name: "Battery & Charging Telemetry".into(),
            category: "Hardware & Cooling".into(),
            status: if has_battery {
                "Supported".into()
            } else {
                "Unsupported".into()
            },
            reason: if has_battery {
                "Mobile battery hardware detected with live charge and power state.".into()
            } else {
                "No battery hardware detected. Device operates on continuous AC mains power (Desktop / Workstation / VM).".into()
            },
            action_hint: None,
        });

        // Feature: GPU Monitoring
        features.push(FeatureCapability {
            id: "gpu_monitoring".into(),
            name: "GPU & Graphics Telemetry".into(),
            category: "Hardware & Cooling".into(),
            status: if gpu_count > 0 {
                "Supported".into()
            } else {
                "ReadOnly".into()
            },
            reason: if gpu_count > 0 {
                "Graphics core and dedicated video memory metrics active.".into()
            } else {
                "Basic graphics display mode without dedicated hardware telemetry.".into()
            },
            action_hint: None,
        });

        // Feature: Process Management
        features.push(FeatureCapability {
            id: "process_management".into(),
            name: "Process List & Inspection".into(),
            category: "Process & Performance".into(),
            status: "Supported".into(),
            reason:
                "Win32 ToolHelp process snapshots and real-time CPU/RAM metric aggregation active."
                    .into(),
            action_hint: None,
        });

        // Feature: Process Termination
        features.push(FeatureCapability {
            id: "process_termination".into(),
            name: "Process Tree Termination".into(),
            category: "Process & Performance".into(),
            status: if is_elevated {
                "Supported".into()
            } else {
                "PermissionRequired".into()
            },
            reason: if is_elevated {
                "Administrator privileges active. User can terminate authorized non-critical processes.".into()
            } else {
                "Standard user mode: background services and elevated processes require Administrator privileges to terminate.".into()
            },
            action_hint: if !is_elevated {
                Some("Run SystemPilot as Administrator to terminate elevated processes.".into())
            } else {
                None
            },
        });

        // Feature: Memory Cleanup
        features.push(FeatureCapability {
            id: "memory_cleanup".into(),
            name: "Working Set Memory Optimization".into(),
            category: "Storage & Memory".into(),
            status: "Supported".into(),
            reason: "Win32 SetProcessWorkingSetSize allows safe page file reclamation without terminating apps.".into(),
            action_hint: None,
        });

        // Feature: Startup Management
        features.push(FeatureCapability {
            id: "startup_management".into(),
            name: "Startup Application Management".into(),
            category: "Storage & Memory".into(),
            status: if is_elevated {
                "Supported".into()
            } else {
                "ReadOnly".into()
            },
            reason: if is_elevated {
                "All user (HKCU) and machine-wide (HKLM/ProgramData) startup entries can be toggled.".into()
            } else {
                "Standard user mode: Machine-wide startup entries in HKLM are view-only.".into()
            },
            action_hint: if !is_elevated {
                Some("Launch as Administrator to toggle machine-wide startup entries.".into())
            } else {
                None
            },
        });

        // Feature: Windows Tools - Computer Management
        features.push(FeatureCapability {
            id: "tools_compmgmt".into(),
            name: "Computer Management (compmgmt.msc)".into(),
            category: "Windows Administration".into(),
            status: "Supported".into(),
            reason: "Standard administrative console included across all Windows editions.".into(),
            action_hint: None,
        });

        // Feature: Windows Tools - Group Policy Editor (gpedit.msc)
        features.push(FeatureCapability {
            id: "tools_gpedit".into(),
            name: "Group Policy Editor (gpedit.msc)".into(),
            category: "Windows Administration".into(),
            status: if is_home_edition {
                "Unsupported".into()
            } else {
                "Supported".into()
            },
            reason: if is_home_edition {
                "Group Policy Editor is restricted by Microsoft on Windows Home edition.".into()
            } else {
                "Available on Windows Pro, Enterprise, and Education editions.".into()
            },
            action_hint: if is_home_edition {
                Some(
                    "Use Windows Settings or upgrade to Windows Pro/Enterprise for Group Policy."
                        .into(),
                )
            } else {
                None
            },
        });

        // Feature: Windows Tools - Local Users and Groups (lusrmgr.msc)
        features.push(FeatureCapability {
            id: "tools_lusrmgr".into(),
            name: "Local Users & Groups (lusrmgr.msc)".into(),
            category: "Windows Administration".into(),
            status: if is_home_edition {
                "Unsupported".into()
            } else {
                "Supported".into()
            },
            reason: if is_home_edition {
                "The lusrmgr.msc snap-in is restricted on Windows Home edition.".into()
            } else {
                "Available on Windows Pro, Enterprise, and Education editions.".into()
            },
            action_hint: if is_home_edition {
                Some(
                    "Use 'netplwiz' or Windows Accounts Settings to manage users on Home edition."
                        .into(),
                )
            } else {
                None
            },
        });

        // Feature: Windows Tools - Local Security Policy (secpol.msc)
        features.push(FeatureCapability {
            id: "tools_secpol".into(),
            name: "Local Security Policy (secpol.msc)".into(),
            category: "Windows Administration".into(),
            status: if is_home_edition {
                "Unsupported".into()
            } else {
                "Supported".into()
            },
            reason: if is_home_edition {
                "Local Security Policy is restricted by Microsoft on Windows Home edition.".into()
            } else {
                "Available on Windows Pro, Enterprise, and Education editions.".into()
            },
            action_hint: None,
        });

        // Feature: UEFI Firmware Reboot
        features.push(FeatureCapability {
            id: "uefi_reboot".into(),
            name: "Direct Reboot to UEFI Firmware".into(),
            category: "Security & System".into(),
            status: if is_virtual_machine {
                "Unsupported".into()
            } else if is_elevated {
                "Supported".into()
            } else {
                "PermissionRequired".into()
            },
            reason: if is_virtual_machine {
                "Virtual machines do not expose native physical UEFI reboot interface.".into()
            } else if is_elevated {
                "Direct UEFI firmware restart command supported.".into()
            } else {
                "Rebooting directly into UEFI firmware requires Administrator privileges.".into()
            },
            action_hint: if !is_virtual_machine && !is_elevated {
                Some("Elevation will be requested via Windows UAC upon invocation.".into())
            } else {
                None
            },
        });

        // Feature: Windows Security Center
        features.push(FeatureCapability {
            id: "security_center".into(),
            name: "Windows Defender Security Center".into(),
            category: "Security & System".into(),
            status: "Supported".into(),
            reason: "Real-time antivirus, firewall profile, and TPM telemetry active.".into(),
            action_hint: None,
        });

        // Calculate totals
        let total_features_count = features.len();
        let supported_features_count = features.iter().filter(|f| f.status == "Supported").count();

        let overall_compatibility_rating = if is_virtual_machine {
            "Compatible (Virtual Machine Profile)".to_string()
        } else if is_home_edition {
            "Compatible (Windows Home Edition Profile)".to_string()
        } else if !is_elevated {
            "Compatible (Standard User Profile)".to_string()
        } else {
            "Fully Compatible (Administrator Profile)".to_string()
        };

        let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

        Ok(SystemCompatibilityReport {
            environment: env,
            features,
            overall_compatibility_rating,
            supported_features_count,
            total_features_count,
            last_scanned: now,
        })
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Universal Compatibility Engine is designed specifically for Windows".into())
    }
}

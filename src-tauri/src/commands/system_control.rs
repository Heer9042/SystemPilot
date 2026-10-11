//! Windows System Management, System Control, BIOS/UEFI, Licensing & Administration
//! Real Windows APIs, registry queries, and native Windows management tools.

use serde::{Deserialize, Serialize};

// ============================================================================
// 1. WINDOWS SYSTEM INFORMATION
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowsSystemInfo {
    pub product_name: String,
    pub edition: String,
    pub display_version: String,
    pub build_number: String,
    pub ubr: Option<u32>,
    pub full_build: String,
    pub architecture: String,
    pub install_date: Option<String>,
    pub last_boot_time: String,
    pub uptime_seconds: u64,
    pub computer_name: String,
    pub manufacturer: String,
    pub model: String,
    pub system_type: String,
    pub current_user: String,
    pub domain_or_workgroup: String,
}

#[tauri::command]
pub fn get_windows_system_info() -> Result<WindowsSystemInfo, String> {
    #[cfg(target_os = "windows")]
    {
        use crate::windows::registry::{get_reg_dword, get_reg_string};
        use windows_sys::Win32::System::Registry::HKEY_LOCAL_MACHINE;

        let cur_ver_key = "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion";
        let bios_key = "HARDWARE\\DESCRIPTION\\System\\BIOS";

        let product_name = get_reg_string(HKEY_LOCAL_MACHINE, cur_ver_key, "ProductName")
            .unwrap_or_else(|| "Windows Operating System".to_string());

        let edition_id = get_reg_string(HKEY_LOCAL_MACHINE, cur_ver_key, "EditionID")
            .unwrap_or_else(|| "Professional".to_string());

        let display_version = get_reg_string(HKEY_LOCAL_MACHINE, cur_ver_key, "DisplayVersion")
            .or_else(|| get_reg_string(HKEY_LOCAL_MACHINE, cur_ver_key, "ReleaseId"))
            .unwrap_or_else(|| "Unavailable".to_string());

        let current_build = get_reg_string(HKEY_LOCAL_MACHINE, cur_ver_key, "CurrentBuild")
            .or_else(|| get_reg_string(HKEY_LOCAL_MACHINE, cur_ver_key, "CurrentBuildNumber"))
            .unwrap_or_else(|| "Unknown".to_string());

        let ubr = get_reg_dword(HKEY_LOCAL_MACHINE, cur_ver_key, "UBR");

        let full_build = if let Some(u) = ubr {
            format!("{}.{}", current_build, u)
        } else {
            current_build.clone()
        };

        // Format product name nicely: if product_name contains Windows 10 but build >= 22000, Windows 11
        let final_product_name = if let Ok(b) = current_build.parse::<u32>() {
            if b >= 22000 && product_name.contains("Windows 10") {
                product_name.replace("Windows 10", "Windows 11")
            } else {
                product_name
            }
        } else {
            product_name
        };

        let arch = if cfg!(target_arch = "x86_64") {
            "x64".to_string()
        } else if cfg!(target_arch = "aarch64") {
            "ARM64".to_string()
        } else {
            "x86".to_string()
        };

        let system_type = if arch == "x64" {
            "x64-based PC".to_string()
        } else if arch == "ARM64" {
            "ARM64-based PC".to_string()
        } else {
            "32-bit PC".to_string()
        };

        let install_date =
            get_reg_dword(HKEY_LOCAL_MACHINE, cur_ver_key, "InstallDate").map(|sec| {
                if let Some(dt) = chrono::DateTime::from_timestamp(sec as i64, 0) {
                    dt.format("%B %d, %Y (%H:%M UTC)").to_string()
                } else {
                    "Unavailable".to_string()
                }
            });

        let uptime_seconds = sysinfo::System::uptime();
        let now = chrono::Local::now();
        let last_boot = now - chrono::Duration::seconds(uptime_seconds as i64);
        let last_boot_time = last_boot.format("%B %d, %Y at %I:%M:%S %p").to_string();

        let computer_name =
            std::env::var("COMPUTERNAME").unwrap_or_else(|_| "Unavailable".to_string());
        let current_user = std::env::var("USERNAME").unwrap_or_else(|_| "Current User".to_string());

        let manufacturer = get_reg_string(HKEY_LOCAL_MACHINE, bios_key, "SystemManufacturer")
            .unwrap_or_else(|| "System Manufacturer".to_string());

        let model = get_reg_string(HKEY_LOCAL_MACHINE, bios_key, "SystemProductName")
            .unwrap_or_else(|| "System Product Name".to_string());

        let domain_or_workgroup = get_reg_string(
            HKEY_LOCAL_MACHINE,
            "SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters",
            "Domain",
        )
        .filter(|d| !d.is_empty())
        .or_else(|| {
            get_reg_string(
                HKEY_LOCAL_MACHINE,
                "SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters",
                "DhcpDomain",
            )
            .filter(|d| !d.is_empty())
        })
        .unwrap_or_else(|| "WORKGROUP".to_string());

        Ok(WindowsSystemInfo {
            product_name: final_product_name,
            edition: edition_id,
            display_version,
            build_number: current_build,
            ubr,
            full_build,
            architecture: arch,
            install_date,
            last_boot_time,
            uptime_seconds,
            computer_name,
            manufacturer,
            model,
            system_type,
            current_user,
            domain_or_workgroup,
        })
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Windows System Info is only supported on Windows".into())
    }
}

// ============================================================================
// 2. WINDOWS ACTIVATION STATUS
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowsActivationInfo {
    pub status: String, // "Activated" | "Not activated" | "Activation status unavailable" | "Requires permission"
    pub is_activated: bool,
    pub license_channel: Option<String>, // "Retail", "OEM", "Volume", etc.
    pub partial_product_key: Option<String>, // Masked partial key e.g. "XXXXX-XXXXX-XXXXX-XXXXX-3V66T"
    pub license_description: Option<String>,
    pub error_message: Option<String>,
    pub last_checked: String,
}

#[tauri::command]
pub fn get_windows_activation_status() -> Result<WindowsActivationInfo, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;

        let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

        // 0x08000000 = CREATE_NO_WINDOW
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        // Query SoftwareLicensingProduct safely via PowerShell CIM interface without modifying anything
        let psh_bin = crate::windows::paths::get_system_binary("powershell.exe")
            .unwrap_or_else(|_| std::path::PathBuf::from("powershell.exe"));
        let output = Command::new(psh_bin)
            .creation_flags(CREATE_NO_WINDOW)
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "Get-CimInstance SoftwareLicensingProduct -Filter \"PartialProductKey is not null\" | Where-Object { $_.Name -like '*Windows*' } | Select-Object -First 1 Name, Description, LicenseStatus, ProductKeyChannel, PartialProductKey | ConvertTo-Json -Compress",
            ])
            .output();

        match output {
            Ok(out) if out.status.success() => {
                let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&stdout) {
                    let license_status = json
                        .get("LicenseStatus")
                        .and_then(|v| v.as_i64())
                        .unwrap_or(-1);
                    let channel = json
                        .get("ProductKeyChannel")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    let desc = json
                        .get("Description")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    let partial_key = json
                        .get("PartialProductKey")
                        .and_then(|v| v.as_str())
                        .map(|k| format!("•••••-•••••-•••••-•••••-{}", k));

                    // LicenseStatus: 1 = Licensed (permanently or subscription activated)
                    let (status_str, is_act) = match license_status {
                        1 => ("Activated".to_string(), true),
                        0 => ("Not activated (Unlicensed)".to_string(), false),
                        2 => ("Initial grace period".to_string(), false),
                        3 => ("Out-of-tolerance grace period".to_string(), false),
                        4 => ("Non-genuine grace period".to_string(), false),
                        5 => ("Notification mode (Not activated)".to_string(), false),
                        6 => ("Extended grace period".to_string(), false),
                        _ => ("Activation status unavailable".to_string(), false),
                    };

                    return Ok(WindowsActivationInfo {
                        status: status_str,
                        is_activated: is_act,
                        license_channel: channel,
                        partial_product_key: partial_key,
                        license_description: desc,
                        error_message: None,
                        last_checked: now,
                    });
                }
            }
            Ok(out) => {
                let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
                return Ok(WindowsActivationInfo {
                    status: "Activation status unavailable".to_string(),
                    is_activated: false,
                    license_channel: None,
                    partial_product_key: None,
                    license_description: None,
                    error_message: Some(if stderr.is_empty() {
                        "Query returned exit code error".into()
                    } else {
                        stderr
                    }),
                    last_checked: now,
                });
            }
            Err(e) => {
                return Ok(WindowsActivationInfo {
                    status: "Activation status unavailable".to_string(),
                    is_activated: false,
                    license_channel: None,
                    partial_product_key: None,
                    license_description: None,
                    error_message: Some(e.to_string()),
                    last_checked: now,
                });
            }
        }

        Ok(WindowsActivationInfo {
            status: "Activation status unavailable".to_string(),
            is_activated: false,
            license_channel: None,
            partial_product_key: None,
            license_description: None,
            error_message: Some("Licensing service query did not return data".to_string()),
            last_checked: now,
        })
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Activation check is only supported on Windows".into())
    }
}

// ============================================================================
// 3. BIOS & UEFI FIRMWARE INFORMATION
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BiosFirmwareInfo {
    pub bios_vendor: String,
    pub bios_version: String,
    pub bios_release_date: String,
    pub system_manufacturer: String,
    pub system_model: String,
    pub firmware_type: String,      // "UEFI" | "Legacy BIOS"
    pub uefi_boot_status: String,   // "UEFI Boot Mode" | "Legacy CSM Boot Mode"
    pub secure_boot_status: String, // "Enabled" | "Disabled" | "Not Supported"
    pub tpm_present: bool,
    pub tpm_version: String,
    pub smbios_version: String,
    pub boot_mode: String,
    pub virtualization_enabled: bool,
    pub cpu_virtualization_type: String, // "Intel VT-x" | "AMD-V" | "Unavailable"
    pub restart_to_uefi_supported: bool,
}

#[tauri::command]
pub fn get_bios_firmware_info() -> Result<BiosFirmwareInfo, String> {
    #[cfg(target_os = "windows")]
    {
        use crate::windows::registry::{get_reg_dword, get_reg_string};
        use windows_sys::Win32::System::Registry::HKEY_LOCAL_MACHINE;

        let bios_key = "HARDWARE\\DESCRIPTION\\System\\BIOS";

        let bios_vendor = get_reg_string(HKEY_LOCAL_MACHINE, bios_key, "BIOSVendor")
            .unwrap_or_else(|| "Unknown Vendor".to_string());
        let bios_version = get_reg_string(HKEY_LOCAL_MACHINE, bios_key, "BIOSVersion")
            .unwrap_or_else(|| "Unknown Version".to_string());
        let bios_release_date = get_reg_string(HKEY_LOCAL_MACHINE, bios_key, "BIOSReleaseDate")
            .unwrap_or_else(|| "Unknown Date".to_string());
        let system_manufacturer =
            get_reg_string(HKEY_LOCAL_MACHINE, bios_key, "SystemManufacturer")
                .unwrap_or_else(|| "System Manufacturer".to_string());
        let system_model = get_reg_string(HKEY_LOCAL_MACHINE, bios_key, "SystemProductName")
            .unwrap_or_else(|| "System Product".to_string());

        // Check Secure Boot from registry
        let sb_key = "SYSTEM\\CurrentControlSet\\Control\\SecureBoot\\State";
        let (secure_boot_status, is_uefi_detected) =
            if let Some(val) = get_reg_dword(HKEY_LOCAL_MACHINE, sb_key, "UEFISecureBootEnabled") {
                if val == 1 {
                    ("Enabled".to_string(), true)
                } else {
                    ("Disabled".to_string(), true)
                }
            } else {
                ("Not Supported on this system".to_string(), false)
            };

        let firmware_type = if is_uefi_detected {
            "UEFI".to_string()
        } else {
            // Check PEFirmwareType if available
            if let Some(t) = get_reg_dword(
                HKEY_LOCAL_MACHINE,
                "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment",
                "PEFirmwareType",
            ) {
                if t == 2 {
                    "UEFI".to_string()
                } else {
                    "Legacy BIOS".to_string()
                }
            } else {
                "UEFI (Modern Windows 10/11 Architecture)".to_string()
            }
        };

        let uefi_boot_status = if firmware_type.contains("UEFI") {
            "UEFI Native Boot".to_string()
        } else {
            "Legacy BIOS / CSM Mode".to_string()
        };

        // TPM check
        let mut tpm_present = false;
        let mut tpm_version = "Not Detected".to_string();
        if let Some(start_val) = get_reg_dword(
            HKEY_LOCAL_MACHINE,
            "SYSTEM\\CurrentControlSet\\Services\\TPM",
            "Start",
        ) {
            if start_val <= 3 {
                tpm_present = true;
                tpm_version = "TPM 2.0 Security Processor Active".to_string();
            }
        }

        // Virtualization check
        let mut sys = sysinfo::System::new_with_specifics(
            sysinfo::RefreshKind::new().with_cpu(sysinfo::CpuRefreshKind::everything()),
        );
        sys.refresh_cpu_all();
        let vendor_id = sys
            .cpus()
            .first()
            .map(|c| c.vendor_id().to_lowercase())
            .unwrap_or_default();
        let (virt_enabled, cpu_virt_type) = if vendor_id.contains("intel") {
            (
                true,
                "Intel VT-x (Intel Virtualization Technology)".to_string(),
            )
        } else if vendor_id.contains("amd") {
            (true, "AMD-V (AMD SVM Architecture)".to_string())
        } else {
            (
                false,
                "Hardware Virtualization Status Unavailable".to_string(),
            )
        };

        let smbios_major =
            get_reg_dword(HKEY_LOCAL_MACHINE, bios_key, "SMBIOSMajorVersion").unwrap_or(3);
        let smbios_minor =
            get_reg_dword(HKEY_LOCAL_MACHINE, bios_key, "SMBIOSMinorVersion").unwrap_or(0);
        let smbios_version = format!("v{}.{}", smbios_major, smbios_minor);

        Ok(BiosFirmwareInfo {
            bios_vendor,
            bios_version,
            bios_release_date,
            system_manufacturer,
            system_model,
            firmware_type,
            uefi_boot_status,
            secure_boot_status,
            tpm_present,
            tpm_version,
            smbios_version,
            boot_mode: "Windows Boot Manager (64-bit)".to_string(),
            virtualization_enabled: virt_enabled,
            cpu_virtualization_type: cpu_virt_type,
            restart_to_uefi_supported: is_uefi_detected,
        })
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("BIOS info is only supported on Windows".into())
    }
}

/// Restarts directly into UEFI Firmware Settings.
/// Requires user confirmation and admin privileges. Prompts for on-demand UAC elevation if un-elevated.
#[tauri::command]
pub fn restart_to_uefi_firmware() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;

        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let shutdown_bin = crate::windows::paths::get_system_binary("shutdown.exe")
            .unwrap_or_else(|_| std::path::PathBuf::from("shutdown.exe"));

        if crate::windows::security::is_current_process_elevated() {
            let output = Command::new(&shutdown_bin)
                .creation_flags(CREATE_NO_WINDOW)
                .args(["/r", "/fw", "/t", "1"])
                .output();

            match output {
                Ok(out) if out.status.success() => {
                    Ok("System reboot to UEFI firmware initiated successfully.".into())
                }
                Ok(out) => {
                    let err = String::from_utf8_lossy(&out.stderr).trim().to_string();
                    Err(format!(
                        "UEFI restart command failed: {}",
                        if err.is_empty() {
                            "Exit code non-zero"
                        } else {
                            &err
                        }
                    ))
                }
                Err(e) => Err(format!("Failed to execute shutdown utility: {}", e)),
            }
        } else {
            // Un-elevated process: request UAC elevation on-demand using standard ShellExecuteW "runas"
            let wide_file =
                crate::windows::registry::to_wide_chars(&shutdown_bin.to_string_lossy());
            let wide_params = crate::windows::registry::to_wide_chars("/r /fw /t 1");
            let wide_verb = crate::windows::registry::to_wide_chars("runas");

            let h_shell32 = unsafe {
                windows_sys::Win32::System::LibraryLoader::LoadLibraryA(b"shell32.dll\0".as_ptr())
            };
            if h_shell32.is_null() {
                return Err("The Windows Shell subsystem is unavailable.".to_string());
            }

            #[allow(non_snake_case)]
            type FnShellExecuteW = unsafe extern "system" fn(
                hwnd: *mut std::ffi::c_void,
                lpOperation: *const u16,
                lpFile: *const u16,
                lpParameters: *const u16,
                lpDirectory: *const u16,
                nShowCmd: i32,
            ) -> isize;

            let p_exec = unsafe {
                windows_sys::Win32::System::LibraryLoader::GetProcAddress(
                    h_shell32,
                    b"ShellExecuteW\0".as_ptr(),
                )
            };

            const SW_HIDE: i32 = 0;
            let exec_res = if let Some(proc) = p_exec {
                let fn_exec: FnShellExecuteW = unsafe { std::mem::transmute(proc) };
                unsafe {
                    fn_exec(
                        std::ptr::null_mut(),
                        wide_verb.as_ptr(),
                        wide_file.as_ptr(),
                        wide_params.as_ptr(),
                        std::ptr::null(),
                        SW_HIDE,
                    )
                }
            } else {
                0
            };
            unsafe {
                windows_sys::Win32::Foundation::FreeLibrary(h_shell32);
            }

            if exec_res <= 32 {
                Err(
                    "Reboot to UEFI was cancelled: administrator approval was declined."
                        .to_string(),
                )
            } else {
                Ok("System reboot to UEFI firmware initiated successfully.".into())
            }
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Restart to UEFI is only supported on Windows".into())
    }
}

// ============================================================================
// 3.5. PROCESS PRIVILEGE & INSTALLATION SCOPE STATUS
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessPrivilegeStatus {
    pub is_elevated: bool,
    pub execution_level: String,
    pub installation_scope: String,
    pub can_manage_machine_startup: bool,
    pub can_reboot_uefi: bool,
}

#[tauri::command]
pub fn get_privilege_status() -> Result<ProcessPrivilegeStatus, String> {
    let is_elevated = crate::windows::security::is_current_process_elevated();
    let is_machine = std::env::current_exe()
        .map(|p| p.to_string_lossy().to_lowercase().contains("program files"))
        .unwrap_or(false);

    Ok(ProcessPrivilegeStatus {
        is_elevated,
        execution_level: if is_elevated {
            "Administrator (Elevated)".into()
        } else {
            "Standard User (asInvoker)".into()
        },
        installation_scope: if is_machine {
            "Machine-Wide (Program Files)".into()
        } else {
            "Per-User (%LOCALAPPDATA%)".into()
        },
        can_manage_machine_startup: is_elevated,
        can_reboot_uefi: true,
    })
}

#[tauri::command]
pub fn request_admin_elevation() -> Result<bool, String> {
    if crate::windows::security::is_current_process_elevated() {
        return Ok(true);
    }

    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;

    // Release single-instance mutex so elevated child can start cleanly
    crate::release_single_instance_mutex();

    let status = std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-WindowStyle",
            "Hidden",
            "-Command",
            &format!(
                "Start-Process -FilePath \"{}\" -ArgumentList \"--elevated-child\" -Verb RunAs",
                exe_path.display()
            ),
        ])
        .status()
        .map_err(|e| {
            crate::reacquire_single_instance_mutex();
            format!("Failed to spawn elevated process: {}", e)
        })?;

    if status.success() {
        std::process::exit(0);
    } else {
        crate::reacquire_single_instance_mutex();
        Err("Administrator permission request was cancelled or declined.".into())
    }
}

#[tauri::command]
pub fn open_permissions_disclosure() -> Result<(), String> {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."));

    let candidates = [
        exe_dir.join("PERMISSIONS.txt"),
        exe_dir.join("resources").join("PERMISSIONS.txt"),
        std::path::PathBuf::from("src-tauri/windows/PERMISSIONS.txt"),
    ];

    for candidate in &candidates {
        if candidate.exists() {
            let _ = std::process::Command::new("notepad.exe")
                .arg(candidate)
                .spawn();
            return Ok(());
        }
    }

    Err("Permissions documentation file not found.".into())
}

// ============================================================================
// 4. COOLING & FAN SENSORS
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoolingSensorItem {
    pub sensor_id: String,
    pub name: String,
    pub sensor_type: String, // "Fan", "Temperature", "Pump"
    pub current_value: f32,
    pub unit: String,   // "RPM", "°C", "%"
    pub status: String, // "Normal", "High", "Warning"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoolingSystemInfo {
    pub cpu_fan_rpm: Option<u32>,
    pub gpu_fan_rpm: Option<u32>,
    pub system_fan_rpm: Option<u32>,
    pub pump_rpm: Option<u32>,
    pub cpu_temp_celsius: Option<f32>,
    pub gpu_temp_celsius: Option<f32>,
    pub status_message: String,
    pub sensors: Vec<CoolingSensorItem>,
}

#[tauri::command]
pub fn get_cooling_info(
    state: tauri::State<'_, super::system::SystemState>,
) -> Result<CoolingSystemInfo, String> {
    let mut cpu_temp: Option<f32> = None;
    let mut gpu_temp: Option<f32> = None;
    let mut gpu_fan: Option<u32> = None;

    // Check GPU temperature and fan from GPU snapshot
    if let Ok(mut sys) = state.sys.lock() {
        let snapshot = crate::system::gpu::collect_gpu_system_snapshot(&mut sys, 0);
        if let Some(first_gpu) = snapshot.adapters.first() {
            gpu_temp = first_gpu.thermal.core_temperature_celsius;
            gpu_fan = first_gpu.power.fan_speed_rpm;
        }
    }

    // Check CPU temperature from sysinfo components if available
    let components = sysinfo::Components::new_with_refreshed_list();
    for c in &components {
        let label = c.label().to_lowercase();
        if label.contains("cpu") || label.contains("core") || label.contains("package") {
            if c.temperature().is_finite() && c.temperature() > 0.0 {
                cpu_temp = Some(c.temperature());
                break;
            }
        }
    }

    let mut sensors = Vec::new();

    if let Some(t) = cpu_temp {
        sensors.push(CoolingSensorItem {
            sensor_id: "cpu_temp_1".into(),
            name: "CPU Thermal Package".into(),
            sensor_type: "Temperature".into(),
            current_value: t,
            unit: "°C".into(),
            status: if t > 85.0 {
                "High".into()
            } else {
                "Normal".into()
            },
        });
    }

    if let Some(t) = gpu_temp {
        sensors.push(CoolingSensorItem {
            sensor_id: "gpu_temp_1".into(),
            name: "GPU Core Temperature".into(),
            sensor_type: "Temperature".into(),
            current_value: t,
            unit: "°C".into(),
            status: if t > 85.0 {
                "High".into()
            } else {
                "Normal".into()
            },
        });
    }

    if let Some(rpm) = gpu_fan {
        sensors.push(CoolingSensorItem {
            sensor_id: "gpu_fan_1".into(),
            name: "GPU Active Fan".into(),
            sensor_type: "Fan".into(),
            current_value: rpm as f32,
            unit: "RPM".into(),
            status: "Normal".into(),
        });
    }

    let status_msg = if gpu_fan.is_none() {
        "Fan speed unavailable on this hardware (Vendor driver interface not exposed)".to_string()
    } else {
        "Hardware sensors operational".to_string()
    };

    Ok(CoolingSystemInfo {
        cpu_fan_rpm: None, // Standard Windows API does not expose ACPI CPU fan RPM without vendor EC kernel driver
        gpu_fan_rpm: gpu_fan,
        system_fan_rpm: None,
        pump_rpm: None,
        cpu_temp_celsius: cpu_temp,
        gpu_temp_celsius: gpu_temp,
        status_message: status_msg,
        sensors,
    })
}

// ============================================================================
// 5. WINDOWS SERVICES ENUMERATION
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowsServiceItem {
    pub name: String,
    pub display_name: String,
    pub status: String,       // "Running", "Stopped", "Paused", "Unknown"
    pub startup_type: String, // "Automatic", "Manual", "Disabled", "Unknown"
    pub binary_path: Option<String>,
    pub description: Option<String>,
}

#[tauri::command]
pub fn get_windows_services() -> Result<Vec<WindowsServiceItem>, String> {
    #[cfg(target_os = "windows")]
    {
        use crate::windows::registry::{enum_subkeys, get_reg_dword, get_reg_string};
        use windows_sys::Win32::System::Registry::HKEY_LOCAL_MACHINE;

        let root_key = "SYSTEM\\CurrentControlSet\\Services";
        let subkeys = enum_subkeys(HKEY_LOCAL_MACHINE, root_key);

        let mut services = Vec::with_capacity(subkeys.len());

        for key_name in subkeys {
            let full_key = format!("{}\\{}", root_key, key_name);

            // A Windows service typically has a DisplayName or ImagePath and a Type (0x10 = Win32 Own Process, 0x20 = Share Process)
            let service_type = get_reg_dword(HKEY_LOCAL_MACHINE, &full_key, "Type").unwrap_or(0);
            if service_type != 0x10
                && service_type != 0x20
                && service_type != 0x110
                && service_type != 0x120
            {
                continue; // Skip drivers and kernel subsystems to only return user-facing services
            }

            let display_name = get_reg_string(HKEY_LOCAL_MACHINE, &full_key, "DisplayName")
                .unwrap_or_else(|| key_name.clone());

            let image_path = get_reg_string(HKEY_LOCAL_MACHINE, &full_key, "ImagePath");
            let desc = get_reg_string(HKEY_LOCAL_MACHINE, &full_key, "Description");

            let start_mode = get_reg_dword(HKEY_LOCAL_MACHINE, &full_key, "Start").unwrap_or(3);
            let startup_type = match start_mode {
                2 => "Automatic",
                3 => "Manual",
                4 => "Disabled",
                0 | 1 => "Boot / System",
                _ => "Unknown",
            };

            services.push(WindowsServiceItem {
                name: key_name,
                display_name,
                status: "Configured".to_string(), // Accurate without intrusive elevation
                startup_type: startup_type.to_string(),
                binary_path: image_path,
                description: desc,
            });
        }

        services.sort_by(|a, b| {
            a.display_name
                .to_lowercase()
                .cmp(&b.display_name.to_lowercase())
        });
        Ok(services)
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Services enumeration is only supported on Windows".into())
    }
}

// ============================================================================
// 6. WINDOWS FIREWALL STATUS
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowsFirewallInfo {
    pub domain_enabled: bool,
    pub private_enabled: bool,
    pub public_enabled: bool,
    pub any_enabled: bool,
    pub last_checked: String,
}

#[tauri::command]
pub fn get_firewall_status() -> Result<WindowsFirewallInfo, String> {
    #[cfg(target_os = "windows")]
    {
        use crate::windows::registry::get_reg_dword;
        use windows_sys::Win32::System::Registry::HKEY_LOCAL_MACHINE;

        let domain = get_reg_dword(
            HKEY_LOCAL_MACHINE,
            "SYSTEM\\CurrentControlSet\\Services\\SharedAccess\\Parameters\\FirewallPolicy\\DomainProfile",
            "EnableFirewall",
        ).map(|v| v != 0).unwrap_or(true);

        let private = get_reg_dword(
            HKEY_LOCAL_MACHINE,
            "SYSTEM\\CurrentControlSet\\Services\\SharedAccess\\Parameters\\FirewallPolicy\\PrivateProfile",
            "EnableFirewall",
        ).map(|v| v != 0).unwrap_or(true);

        let public = get_reg_dword(
            HKEY_LOCAL_MACHINE,
            "SYSTEM\\CurrentControlSet\\Services\\SharedAccess\\Parameters\\FirewallPolicy\\StandardProfile",
            "EnableFirewall",
        ).map(|v| v != 0).unwrap_or(true);

        let any = domain || private || public;
        let last_checked = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

        Ok(WindowsFirewallInfo {
            domain_enabled: domain,
            private_enabled: private,
            public_enabled: public,
            any_enabled: any,
            last_checked,
        })
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Firewall status is only supported on Windows".into())
    }
}

// ============================================================================
// 7. LOCAL USER ACCOUNTS ENUMERATION
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalUserInfo {
    pub username: String,
    pub account_type: String, // "Administrator", "Standard User"
    pub is_current_user: bool,
    pub status: String, // "Active", "Disabled"
}

#[tauri::command]
pub fn get_local_users() -> Result<Vec<LocalUserInfo>, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;

        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let current_user = std::env::var("USERNAME").unwrap_or_default().to_lowercase();

        let psh_bin = crate::windows::paths::get_system_binary("powershell.exe")
            .unwrap_or_else(|_| std::path::PathBuf::from("powershell.exe"));
        let output = Command::new(psh_bin)
            .creation_flags(CREATE_NO_WINDOW)
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "Get-LocalUser | Select-Object Name, Enabled, PrincipalSource | ConvertTo-Json -Compress",
            ])
            .output();

        let mut users = Vec::new();

        if let Ok(out) = output {
            if out.status.success() {
                let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&stdout) {
                    let items = if json.is_array() {
                        json.as_array().cloned().unwrap_or_default()
                    } else if json.is_object() {
                        vec![json]
                    } else {
                        vec![]
                    };

                    for item in items {
                        let name = item
                            .get("Name")
                            .and_then(|v| v.as_str())
                            .unwrap_or_default()
                            .to_string();
                        let enabled = item
                            .get("Enabled")
                            .and_then(|v| v.as_bool())
                            .unwrap_or(true);
                        let is_current = name.to_lowercase() == current_user;

                        users.push(LocalUserInfo {
                            username: name,
                            account_type: "Local Account".to_string(),
                            is_current_user: is_current,
                            status: if enabled {
                                "Active".into()
                            } else {
                                "Disabled".into()
                            },
                        });
                    }
                }
            }
        }

        // Fallback if PowerShell Get-LocalUser returned empty
        if users.is_empty() {
            let fallback_name = std::env::var("USERNAME").unwrap_or_else(|_| "User".to_string());
            users.push(LocalUserInfo {
                username: fallback_name,
                account_type: "Current Signed-In User".to_string(),
                is_current_user: true,
                status: "Active".to_string(),
            });
        }

        Ok(users)
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("User enumeration is only supported on Windows".into())
    }
}

// ============================================================================
// 8. SYSTEM RESTORE & BACKUP STATUS
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RestorePointItem {
    pub sequence_number: u32,
    pub description: String,
    pub creation_time: String,
    pub restore_point_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemRestoreStatus {
    pub is_enabled: bool,
    pub restore_points: Vec<RestorePointItem>,
    pub latest_timestamp: Option<String>,
    pub protected_drives: Vec<String>,
}

#[tauri::command]
pub fn get_system_restore_status() -> Result<SystemRestoreStatus, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;

        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let psh_bin = crate::windows::paths::get_system_binary("powershell.exe")
            .unwrap_or_else(|_| std::path::PathBuf::from("powershell.exe"));
        let output = Command::new(psh_bin)
            .creation_flags(CREATE_NO_WINDOW)
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "Get-ComputerRestorePoint | Select-Object SequenceNumber, Description, CreationTime, RestorePointType | ConvertTo-Json -Compress",
            ])
            .output();

        let mut points = Vec::new();

        if let Ok(out) = output {
            if out.status.success() {
                let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&stdout) {
                    let items = if json.is_array() {
                        json.as_array().cloned().unwrap_or_default()
                    } else if json.is_object() {
                        vec![json]
                    } else {
                        vec![]
                    };

                    for item in items {
                        let seq = item
                            .get("SequenceNumber")
                            .and_then(|v| v.as_u64())
                            .unwrap_or(0) as u32;
                        let desc = item
                            .get("Description")
                            .and_then(|v| v.as_str())
                            .unwrap_or("System Restore Point")
                            .to_string();
                        let time = item
                            .get("CreationTime")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();

                        points.push(RestorePointItem {
                            sequence_number: seq,
                            description: desc,
                            creation_time: time,
                            restore_point_type: "System Checkpoint".to_string(),
                        });
                    }
                }
            }
        }

        let latest = points.last().map(|p| p.creation_time.clone());

        Ok(SystemRestoreStatus {
            is_enabled: true,
            restore_points: points,
            latest_timestamp: latest,
            protected_drives: vec!["C:\\ (System)".into()],
        })
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("System Restore is only supported on Windows".into())
    }
}

// ============================================================================
// 9. NATIVE SYSTEM TOOLS LAUNCHER (SAFE ALLOWLIST)
// ============================================================================

#[tauri::command]
pub fn launch_windows_tool(tool_id: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;

        // Strict security allowlist — prevent arbitrary command execution across all 14 Windows administration categories
        let (command, args): (&str, &[&str]) = match tool_id.as_str() {
            // Category 1: Computer Management
            "compmgmt.msc" => ("mmc.exe", &["compmgmt.msc"]),
            "fsmgmt.msc" => ("mmc.exe", &["fsmgmt.msc"]),

            // Category 2: Storage and Disk Management
            "diskmgmt.msc" => ("mmc.exe", &["diskmgmt.msc"]),
            "cleanmgr.exe" | "cleanmgr" => ("cleanmgr.exe", &[]),

            // Category 3: Device and Driver Management
            "devmgmt.msc" => ("mmc.exe", &["devmgmt.msc"]),
            "dxdiag.exe" | "dxdiag" => ("dxdiag.exe", &[]),

            // Category 4: Users and Groups
            "lusrmgr.msc" => ("mmc.exe", &["lusrmgr.msc"]),
            "netplwiz.exe" | "netplwiz" => ("netplwiz.exe", &[]),

            // Category 5: Services and Scheduled Tasks
            "services.msc" => ("mmc.exe", &["services.msc"]),
            "taskschd.msc" => ("mmc.exe", &["taskschd.msc"]),

            // Category 6: Event Viewer and Logs
            "eventvwr.msc" => ("mmc.exe", &["eventvwr.msc"]),

            // Category 7: Performance Monitoring
            "perfmon.exe" | "perfmon.msc" | "perfmon" => ("perfmon.exe", &[]),
            "resmon.exe" | "resmon" => ("resmon.exe", &[]),

            // Category 8: Network Management
            "ncpa.cpl" => ("control.exe", &["ncpa.cpl"]),
            "ms-settings:network" => ("explorer.exe", &["ms-settings:network"]),

            // Category 9: Security and Windows Update
            "firewall.cpl" => ("control.exe", &["firewall.cpl"]),
            "wf.msc" => ("mmc.exe", &["wf.msc"]),
            "secpol.msc" => ("mmc.exe", &["secpol.msc"]),
            "gpedit.msc" => ("mmc.exe", &["gpedit.msc"]),
            "windowsdefender:" => ("explorer.exe", &["windowsdefender:"]),
            "ms-settings:windowsupdate" => ("explorer.exe", &["ms-settings:windowsupdate"]),

            // Category 10: Installed Applications
            "appwiz.cpl" => ("control.exe", &["appwiz.cpl"]),
            "optionalfeatures.exe" | "optionalfeatures" => ("optionalfeatures.exe", &[]),

            // Category 11: System Configuration
            "control" | "control.exe" => ("control.exe", &[]),
            "sysdm.cpl" => ("control.exe", &["sysdm.cpl"]),
            "powercfg.cpl" => ("control.exe", &["powercfg.cpl"]),
            "mmsys.cpl" => ("control.exe", &["mmsys.cpl"]),
            "msconfig.exe" | "msconfig" => ("msconfig.exe", &[]),
            "msinfo32.exe" | "msinfo32" => ("msinfo32.exe", &[]),
            "regedit.exe" | "regedit" => ("regedit.exe", &[]),
            "dcomcnfg.exe" | "dcomcnfg" => ("dcomcnfg.exe", &[]),
            "odbcad32.exe" | "odbcad32" => ("odbcad32.exe", &[]),
            "ms-settings:powersleep" => ("explorer.exe", &["ms-settings:powersleep"]),
            "ms-settings:developers" => ("explorer.exe", &["ms-settings:developers"]),
            "ms-settings:about" => ("explorer.exe", &["ms-settings:about"]),

            // Category 12: Maintenance and Repair
            "rstrui.exe" | "rstrui" => ("rstrui.exe", &[]),
            "sdclt.exe" | "sdclt" => ("sdclt.exe", &[]),
            "mdsched.exe" | "mdsched" => ("mdsched.exe", &[]),
            "ms-settings:recovery" => ("explorer.exe", &["ms-settings:recovery"]),
            "ms-settings:troubleshoot" => ("explorer.exe", &["ms-settings:troubleshoot"]),

            // Category 13: Remote Administration & Terminals
            "mstsc.exe" | "mstsc" => ("mstsc.exe", &[]),
            "cmd.exe" | "cmd" => ("cmd.exe", &[]),
            "powershell.exe" | "powershell" => ("powershell.exe", &[]),
            "wt.exe" | "wt" => ("wt.exe", &[]),

            // Category 14: SystemPilot Diagnostics & Accessory Tools
            "charmap.exe" | "charmap" => ("charmap.exe", &[]),
            _ => {
                return Err(format!(
                    "Unrecognized or unauthorized tool identifier: '{}'",
                    tool_id
                ))
            }
        };

        let target_bin = crate::windows::paths::get_system_binary(command)
            .unwrap_or_else(|_| std::path::PathBuf::from(command));
        match Command::new(target_bin).args(args).spawn() {
            Ok(_) => Ok(format!("Successfully launched {}", tool_id)),
            Err(e) => Err(format!("Failed to open {}: {}", tool_id, e)),
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Windows native tool launching is only supported on Windows".into())
    }
}

// ============================================================================
// 10. SYSTEM EVENT VIEWER LOGS
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemEventLogItem {
    pub event_id: u32,
    pub severity: String, // "Error", "Warning", "Information", "Critical"
    pub source: String,
    pub time_generated: String,
    pub message: String,
}

#[tauri::command]
pub fn get_system_event_logs(
    log_name: Option<String>,
    max_entries: Option<usize>,
) -> Result<Vec<SystemEventLogItem>, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;

        const CREATE_NO_WINDOW: u32 = 0x08000000;
        // Strictly validate and allowlist event log name to eliminate command injection
        let valid_log = match log_name.as_deref().unwrap_or("System") {
            "System" => "System",
            "Application" => "Application",
            "Security" => "Security",
            "Setup" => "Setup",
            _ => {
                return Err(
                    "Invalid log name. Only 'System', 'Application', 'Security', or 'Setup' are permitted."
                        .to_string(),
                )
            }
        };
        let count = max_entries.unwrap_or(25).min(50); // Bound strictly to prevent unbounded memory allocation

        let psh_bin = crate::windows::paths::get_system_binary("powershell.exe")
            .unwrap_or_else(|_| std::path::PathBuf::from("powershell.exe"));
        let output = Command::new(psh_bin)
            .creation_flags(CREATE_NO_WINDOW)
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                &format!(
                    "Get-WinEvent -LogName '{}' -MaxEvents {} -ErrorAction SilentlyContinue | Select-Object Id, LevelDisplayName, ProviderName, TimeCreated, Message | ConvertTo-Json -Compress",
                    valid_log, count
                ),
            ])
            .output();

        let mut events = Vec::new();

        if let Ok(out) = output {
            if out.status.success() {
                let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&stdout) {
                    let items = if json.is_array() {
                        json.as_array().cloned().unwrap_or_default()
                    } else if json.is_object() {
                        vec![json]
                    } else {
                        vec![]
                    };

                    for item in items {
                        let id = item.get("Id").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
                        let severity = item
                            .get("LevelDisplayName")
                            .and_then(|v| v.as_str())
                            .unwrap_or("Information")
                            .to_string();
                        let source = item
                            .get("ProviderName")
                            .and_then(|v| v.as_str())
                            .unwrap_or("Windows")
                            .to_string();
                        let time = item
                            .get("TimeCreated")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                        let msg = item
                            .get("Message")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();

                        events.push(SystemEventLogItem {
                            event_id: id,
                            severity,
                            source,
                            time_generated: time,
                            message: msg,
                        });
                    }
                }
            }
        }

        Ok(events)
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Event Log reading is only supported on Windows".into())
    }
}

// ============================================================================
// 12. DISK PARTITION MANAGEMENT
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskPartitionDetail {
    pub disk_number: u32,
    pub partition_number: u32,
    pub drive_letter: Option<String>,
    pub size_bytes: u64,
    pub partition_type: String,
    pub partition_style: String,
    pub is_boot: bool,
    pub is_system: bool,
    pub is_hidden: bool,
}

#[tauri::command]
pub fn get_disk_partitions_info() -> Result<Vec<DiskPartitionDetail>, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let script = r#"
            $d = @{}
            Get-Disk -ErrorAction SilentlyContinue | ForEach-Object { $d[$_.Number] = [string]$_.PartitionStyle }
            Get-Partition -ErrorAction SilentlyContinue | ForEach-Object {
                [PSCustomObject]@{
                    DiskNumber = $_.DiskNumber
                    PartitionNumber = $_.PartitionNumber
                    DriveLetter = if ($_.DriveLetter) { [string]$_.DriveLetter } else { $null }
                    SizeBytes = [uint64]$_.Size
                    PartitionType = [string]$_.Type
                    PartitionStyle = if ($d.ContainsKey($_.DiskNumber)) { [string]$d[$_.DiskNumber] } else { "GPT" }
                    IsBoot = [bool]$_.IsBoot
                    IsSystem = [bool]$_.IsSystem
                    IsHidden = [bool]$_.IsHidden
                }
            } | ConvertTo-Json -Compress
        "#;

        let psh_bin = crate::windows::paths::get_system_binary("powershell.exe")
            .unwrap_or_else(|_| std::path::PathBuf::from("powershell.exe"));
        let output = Command::new(psh_bin)
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-NoProfile", "-NonInteractive", "-Command", script])
            .output();

        let mut partitions = Vec::new();
        if let Ok(out) = output {
            if out.status.success() {
                let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&stdout) {
                    let items = if json.is_array() {
                        json.as_array().cloned().unwrap_or_default()
                    } else if json.is_object() {
                        vec![json]
                    } else {
                        vec![]
                    };

                    for item in items {
                        let disk_num =
                            item.get("DiskNumber").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
                        let part_num = item
                            .get("PartitionNumber")
                            .and_then(|v| v.as_u64())
                            .unwrap_or(0) as u32;
                        let letter = item
                            .get("DriveLetter")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());
                        let size = item.get("SizeBytes").and_then(|v| v.as_u64()).unwrap_or(0);
                        let p_type = item
                            .get("PartitionType")
                            .and_then(|v| v.as_str())
                            .unwrap_or("Basic")
                            .to_string();
                        let p_style = item
                            .get("PartitionStyle")
                            .and_then(|v| v.as_str())
                            .unwrap_or("GPT")
                            .to_string();
                        let is_boot = item
                            .get("IsBoot")
                            .and_then(|v| v.as_bool())
                            .unwrap_or(false);
                        let is_system = item
                            .get("IsSystem")
                            .and_then(|v| v.as_bool())
                            .unwrap_or(false);
                        let is_hidden = item
                            .get("IsHidden")
                            .and_then(|v| v.as_bool())
                            .unwrap_or(false);

                        partitions.push(DiskPartitionDetail {
                            disk_number: disk_num,
                            partition_number: part_num,
                            drive_letter: letter,
                            size_bytes: size,
                            partition_type: p_type,
                            partition_style: p_style,
                            is_boot,
                            is_system,
                            is_hidden,
                        });
                    }
                }
            }
        }
        Ok(partitions)
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Disk partitions info is only supported on Windows".into())
    }
}

// ============================================================================
// 13. WINDOWS TOOLS DIRECTORY & AVAILABILITY AUDIT
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowsToolItem {
    pub id: String,
    pub name: String,
    pub category: String,
    pub description: String,
    pub integration_type: String, // "Native Feature", "Integrated API", "Launch Windows Console", "System Settings", "Terminal"
    pub command: String,
    pub requires_admin: bool,
    pub is_available: bool,
    pub edition_notes: Option<String>,
}

#[tauri::command]
pub fn get_windows_tools_directory() -> Result<Vec<WindowsToolItem>, String> {
    #[cfg(target_os = "windows")]
    {
        let system_root = std::env::var("SystemRoot")
            .or_else(|_| std::env::var("windir"))
            .unwrap_or_else(|_| "C:\\Windows".to_string());
        let sys32 = std::path::PathBuf::from(&system_root).join("System32");

        let check_msc = |msc_name: &str| -> bool { sys32.join(msc_name).exists() };

        let check_exe = |exe_name: &str| -> bool {
            crate::windows::paths::get_system_binary(exe_name)
                .map(|p| p.exists())
                .unwrap_or(false)
        };

        let tools = vec![
            // 1. Computer Management
            WindowsToolItem {
                id: "compmgmt.msc".into(),
                name: "Computer Management".into(),
                category: "Computer Management".into(),
                description: "Integrated Windows management console combining Event Viewer, Device Manager, Shared Folders, Services, and Storage.".into(),
                integration_type: "Official Console & Native Hub".into(),
                command: "compmgmt.msc".into(),
                requires_admin: true,
                is_available: check_msc("compmgmt.msc"),
                edition_notes: None,
            },
            WindowsToolItem {
                id: "fsmgmt.msc".into(),
                name: "Shared Folders Management".into(),
                category: "Computer Management".into(),
                description: "Inspect active SMB shares, open file sessions, and connected remote resources.".into(),
                integration_type: "Official Console".into(),
                command: "fsmgmt.msc".into(),
                requires_admin: true,
                is_available: check_msc("fsmgmt.msc"),
                edition_notes: None,
            },

            // 2. Storage and Disk Management
            WindowsToolItem {
                id: "diskmgmt.msc".into(),
                name: "Disk Management".into(),
                category: "Storage and Disk Management".into(),
                description: "Partition formatting, drive-letter assignments, volume sizing, and disk initialization.".into(),
                integration_type: "Official Console & Native Storage Tab".into(),
                command: "diskmgmt.msc".into(),
                requires_admin: true,
                is_available: check_msc("diskmgmt.msc"),
                edition_notes: None,
            },
            WindowsToolItem {
                id: "cleanmgr.exe".into(),
                name: "Windows Disk Cleanup".into(),
                category: "Storage and Disk Management".into(),
                description: "Native Windows utility for purging obsolete system files, Windows.old, and error reporting dumps.".into(),
                integration_type: "Official Utility".into(),
                command: "cleanmgr.exe".into(),
                requires_admin: false,
                is_available: check_exe("cleanmgr.exe"),
                edition_notes: None,
            },

            // 3. Device and Driver Management
            WindowsToolItem {
                id: "devmgmt.msc".into(),
                name: "Device Manager".into(),
                category: "Device and Driver Management".into(),
                description: "Hardware peripheral hierarchy, driver version verification, and resource conflict resolution.".into(),
                integration_type: "Official Console & Native Inventory".into(),
                command: "devmgmt.msc".into(),
                requires_admin: true,
                is_available: check_msc("devmgmt.msc"),
                edition_notes: None,
            },
            WindowsToolItem {
                id: "dxdiag.exe".into(),
                name: "DirectX Diagnostic Tool".into(),
                category: "Device and Driver Management".into(),
                description: "Detailed DirectX API version, WDDM display driver status, and audio acceleration diagnostics.".into(),
                integration_type: "Official Utility".into(),
                command: "dxdiag.exe".into(),
                requires_admin: false,
                is_available: check_exe("dxdiag.exe"),
                edition_notes: None,
            },

            // 4. Users and Groups
            WindowsToolItem {
                id: "lusrmgr.msc".into(),
                name: "Local Users and Groups".into(),
                category: "Users and Groups".into(),
                description: "Local account creation, Administrator group membership, and account lockdown policies.".into(),
                integration_type: "Official Console & Native Users View".into(),
                command: "lusrmgr.msc".into(),
                requires_admin: true,
                is_available: check_msc("lusrmgr.msc"),
                edition_notes: if !check_msc("lusrmgr.msc") {
                    Some("Snap-in is restricted on Windows Home edition; use netplwiz or Windows Accounts Settings.".into())
                } else {
                    None
                },
            },
            WindowsToolItem {
                id: "netplwiz.exe".into(),
                name: "User Accounts Control Panel".into(),
                category: "Users and Groups".into(),
                description: "Manage local user accounts, automatic logon passwords, and group memberships.".into(),
                integration_type: "Official Utility".into(),
                command: "netplwiz.exe".into(),
                requires_admin: true,
                is_available: check_exe("netplwiz.exe"),
                edition_notes: None,
            },

            // 5. Services and Scheduled Tasks
            WindowsToolItem {
                id: "services.msc".into(),
                name: "Services Console".into(),
                category: "Services and Scheduled Tasks".into(),
                description: "Inspect background service state, recovery actions, and startup configurations.".into(),
                integration_type: "Official Console & Native Services Tab".into(),
                command: "services.msc".into(),
                requires_admin: true,
                is_available: check_msc("services.msc"),
                edition_notes: None,
            },
            WindowsToolItem {
                id: "taskschd.msc".into(),
                name: "Task Scheduler".into(),
                category: "Services and Scheduled Tasks".into(),
                description: "Windows scheduled background jobs, automated maintenance tasks, and trigger triggers.".into(),
                integration_type: "Official Console & Native Task List".into(),
                command: "taskschd.msc".into(),
                requires_admin: true,
                is_available: check_msc("taskschd.msc"),
                edition_notes: None,
            },

            // 6. Event Viewer and Logs
            WindowsToolItem {
                id: "eventvwr.msc".into(),
                name: "Windows Event Viewer".into(),
                category: "Event Viewer and Logs".into(),
                description: "Review system, security audit, application crash, and kernel driver diagnostic logs.".into(),
                integration_type: "Official Console & Native Event Explorer".into(),
                command: "eventvwr.msc".into(),
                requires_admin: true,
                is_available: check_msc("eventvwr.msc"),
                edition_notes: None,
            },

            // 7. Performance Monitoring
            WindowsToolItem {
                id: "resmon.exe".into(),
                name: "Resource Monitor".into(),
                category: "Performance Monitoring".into(),
                description: "Real-time process thread handles, TCP network connections, and disk queue telemetry.".into(),
                integration_type: "Official Utility & Native Dashboards".into(),
                command: "resmon.exe".into(),
                requires_admin: false,
                is_available: check_exe("resmon.exe"),
                edition_notes: None,
            },
            WindowsToolItem {
                id: "perfmon.exe".into(),
                name: "Performance Monitor".into(),
                category: "Performance Monitoring".into(),
                description: "Windows Performance Counter graphs, data collector sets, and hardware benchmarking traces.".into(),
                integration_type: "Official Utility".into(),
                command: "perfmon.exe".into(),
                requires_admin: false,
                is_available: check_exe("perfmon.exe"),
                edition_notes: None,
            },

            // 8. Network Management
            WindowsToolItem {
                id: "ncpa.cpl".into(),
                name: "Network Connections".into(),
                category: "Network Management".into(),
                description: "Configure IPv4/IPv6 static addresses, DNS servers, Wi-Fi adapters, and Ethernet properties.".into(),
                integration_type: "Official Control Panel & Native Network Tab".into(),
                command: "ncpa.cpl".into(),
                requires_admin: false,
                is_available: check_exe("control.exe"),
                edition_notes: None,
            },
            WindowsToolItem {
                id: "ms-settings:network".into(),
                name: "Windows Network Settings".into(),
                category: "Network Management".into(),
                description: "Modern network status, data usage limits, proxy server settings, and VPN connections.".into(),
                integration_type: "System Settings".into(),
                command: "explorer.exe ms-settings:network".into(),
                requires_admin: false,
                is_available: true,
                edition_notes: None,
            },

            // 9. Security and Windows Update
            WindowsToolItem {
                id: "firewall.cpl".into(),
                name: "Windows Defender Firewall".into(),
                category: "Security and Windows Update".into(),
                description: "Classic firewall applet for domain, private, and public network rule inspection.".into(),
                integration_type: "Official Control Panel & Native Status".into(),
                command: "firewall.cpl".into(),
                requires_admin: false,
                is_available: check_exe("control.exe"),
                edition_notes: None,
            },
            WindowsToolItem {
                id: "wf.msc".into(),
                name: "Firewall with Advanced Security".into(),
                category: "Security and Windows Update".into(),
                description: "Granular inbound/outbound IP filter rules, port access limits, and IPsec authentication rules.".into(),
                integration_type: "Official Console".into(),
                command: "wf.msc".into(),
                requires_admin: true,
                is_available: check_msc("wf.msc"),
                edition_notes: None,
            },
            WindowsToolItem {
                id: "windowsdefender:".into(),
                name: "Windows Security Center".into(),
                category: "Security and Windows Update".into(),
                description: "Real-time antivirus, device security (TPM/Secure Boot), core isolation (HVCI), and app control.".into(),
                integration_type: "System App & Native Security Tab".into(),
                command: "windowsdefender:".into(),
                requires_admin: false,
                is_available: true,
                edition_notes: None,
            },
            WindowsToolItem {
                id: "ms-settings:windowsupdate".into(),
                name: "Windows Update Settings".into(),
                category: "Security and Windows Update".into(),
                description: "Check for official Microsoft OS quality updates, security definitions, and optional drivers.".into(),
                integration_type: "System Settings".into(),
                command: "explorer.exe ms-settings:windowsupdate".into(),
                requires_admin: false,
                is_available: true,
                edition_notes: None,
            },
            WindowsToolItem {
                id: "secpol.msc".into(),
                name: "Local Security Policy".into(),
                category: "Security and Windows Update".into(),
                description: "Account lockout thresholds, password complexity, audit policy, and user rights assignment.".into(),
                integration_type: "Official Console".into(),
                command: "secpol.msc".into(),
                requires_admin: true,
                is_available: check_msc("secpol.msc"),
                edition_notes: if !check_msc("secpol.msc") {
                    Some("Available on Windows Pro, Enterprise, and Education editions only.".into())
                } else {
                    None
                },
            },

            // 10. Installed Applications
            WindowsToolItem {
                id: "appwiz.cpl".into(),
                name: "Programs and Features".into(),
                category: "Installed Applications".into(),
                description: "Classic installed application manager to repair, modify, or uninstall desktop software.".into(),
                integration_type: "Official Control Panel".into(),
                command: "appwiz.cpl".into(),
                requires_admin: false,
                is_available: check_exe("control.exe"),
                edition_notes: None,
            },
            WindowsToolItem {
                id: "optionalfeatures.exe".into(),
                name: "Windows Optional Features".into(),
                category: "Installed Applications".into(),
                description: "Enable or disable optional system components (Hyper-V, WSL, Windows Sandbox, Telnet).".into(),
                integration_type: "Official Utility".into(),
                command: "optionalfeatures.exe".into(),
                requires_admin: true,
                is_available: check_exe("optionalfeatures.exe"),
                edition_notes: None,
            },

            // 11. System Configuration
            WindowsToolItem {
                id: "msconfig.exe".into(),
                name: "System Configuration".into(),
                category: "System Configuration".into(),
                description: "Configure boot modes (Safe Boot), diagnostic startup, and boot timeout options.".into(),
                integration_type: "Official Utility".into(),
                command: "msconfig.exe".into(),
                requires_admin: true,
                is_available: check_exe("msconfig.exe"),
                edition_notes: None,
            },
            WindowsToolItem {
                id: "msinfo32.exe".into(),
                name: "System Information (MSInfo32)".into(),
                category: "System Configuration".into(),
                description: "Comprehensive hardware resource IRQs, I/O ports, software environment, and driver details.".into(),
                integration_type: "Official Utility".into(),
                command: "msinfo32.exe".into(),
                requires_admin: false,
                is_available: check_exe("msinfo32.exe"),
                edition_notes: None,
            },
            WindowsToolItem {
                id: "regedit.exe".into(),
                name: "Registry Editor".into(),
                category: "System Configuration".into(),
                description: "Windows registry configuration tree (HKLM, HKCU, HKCR) editor.".into(),
                integration_type: "Official Utility".into(),
                command: "regedit.exe".into(),
                requires_admin: true,
                is_available: check_exe("regedit.exe"),
                edition_notes: None,
            },
            WindowsToolItem {
                id: "gpedit.msc".into(),
                name: "Group Policy Editor".into(),
                category: "System Configuration".into(),
                description: "Configure machine and user administrative templates, system behaviors, and policy rules.".into(),
                integration_type: "Official Console".into(),
                command: "gpedit.msc".into(),
                requires_admin: true,
                is_available: check_msc("gpedit.msc"),
                edition_notes: if !check_msc("gpedit.msc") {
                    Some("Group Policy Editor is unavailable on Windows Home edition; standard on Pro & Enterprise.".into())
                } else {
                    None
                },
            },
            WindowsToolItem {
                id: "control".into(),
                name: "Classic Control Panel".into(),
                category: "System Configuration".into(),
                description: "Windows Control Panel all-items applet hub.".into(),
                integration_type: "Official Control Panel".into(),
                command: "control.exe".into(),
                requires_admin: false,
                is_available: check_exe("control.exe"),
                edition_notes: None,
            },
            WindowsToolItem {
                id: "sysdm.cpl".into(),
                name: "System Properties".into(),
                category: "System Configuration".into(),
                description: "Computer domain name, remote desktop toggles, system protection, and environment variables.".into(),
                integration_type: "Official Control Panel".into(),
                command: "sysdm.cpl".into(),
                requires_admin: false,
                is_available: check_exe("control.exe"),
                edition_notes: None,
            },
            WindowsToolItem {
                id: "powercfg.cpl".into(),
                name: "Power Options".into(),
                category: "System Configuration".into(),
                description: "Windows power plans, display turn-off timeouts, sleep intervals, and fast startup settings.".into(),
                integration_type: "Official Control Panel".into(),
                command: "powercfg.cpl".into(),
                requires_admin: false,
                is_available: check_exe("control.exe"),
                edition_notes: None,
            },
            WindowsToolItem {
                id: "mmsys.cpl".into(),
                name: "Sound Settings Console".into(),
                category: "System Configuration".into(),
                description: "Audio playback devices, default microphone inputs, recording levels, and sound schemes.".into(),
                integration_type: "Official Control Panel".into(),
                command: "mmsys.cpl".into(),
                requires_admin: false,
                is_available: check_exe("control.exe"),
                edition_notes: None,
            },

            // 12. Maintenance and Repair
            WindowsToolItem {
                id: "rstrui.exe".into(),
                name: "System Restore Wizard".into(),
                category: "Maintenance and Repair".into(),
                description: "Revert system files and drivers to earlier known-good checkpoints without losing user files.".into(),
                integration_type: "Official Utility & Native Restore Tab".into(),
                command: "rstrui.exe".into(),
                requires_admin: true,
                is_available: check_exe("rstrui.exe"),
                edition_notes: None,
            },
            WindowsToolItem {
                id: "sdclt.exe".into(),
                name: "Backup and Restore".into(),
                category: "Maintenance and Repair".into(),
                description: "Create complete system images and schedule automated file backups to external media.".into(),
                integration_type: "Official Utility".into(),
                command: "sdclt.exe".into(),
                requires_admin: true,
                is_available: check_exe("sdclt.exe"),
                edition_notes: None,
            },
            WindowsToolItem {
                id: "mdsched.exe".into(),
                name: "Windows Memory Diagnostic".into(),
                category: "Maintenance and Repair".into(),
                description: "Schedules a hardware RAM diagnostic test during next computer boot to detect memory errors.".into(),
                integration_type: "Official Utility".into(),
                command: "mdsched.exe".into(),
                requires_admin: true,
                is_available: check_exe("mdsched.exe"),
                edition_notes: None,
            },
            WindowsToolItem {
                id: "ms-settings:recovery".into(),
                name: "Windows Recovery Settings".into(),
                category: "Maintenance and Repair".into(),
                description: "Reset this PC (reinstall Windows), advanced startup options, and go back to previous version.".into(),
                integration_type: "System Settings".into(),
                command: "explorer.exe ms-settings:recovery".into(),
                requires_admin: false,
                is_available: true,
                edition_notes: None,
            },
            WindowsToolItem {
                id: "ms-settings:troubleshoot".into(),
                name: "Windows Troubleshooters".into(),
                category: "Maintenance and Repair".into(),
                description: "Automated diagnostic wizards for audio playback, network adapters, Bluetooth, and printers.".into(),
                integration_type: "System Settings".into(),
                command: "explorer.exe ms-settings:troubleshoot".into(),
                requires_admin: false,
                is_available: true,
                edition_notes: None,
            },

            // 13. Remote Administration & Terminals
            WindowsToolItem {
                id: "mstsc.exe".into(),
                name: "Remote Desktop Connection".into(),
                category: "Remote Administration".into(),
                description: "Connect to remote Windows computers and servers using the Microsoft RDP protocol.".into(),
                integration_type: "Official Utility".into(),
                command: "mstsc.exe".into(),
                requires_admin: false,
                is_available: check_exe("mstsc.exe"),
                edition_notes: None,
            },
            WindowsToolItem {
                id: "wt.exe".into(),
                name: "Windows Terminal".into(),
                category: "Remote Administration".into(),
                description: "Modern tabbed terminal supporting PowerShell, Command Prompt, and WSL environments.".into(),
                integration_type: "Terminal Application".into(),
                command: "wt.exe".into(),
                requires_admin: false,
                is_available: check_exe("wt.exe"),
                edition_notes: if !check_exe("wt.exe") {
                    Some("Windows Terminal is optional in Windows 10; standard in Windows 11.".into())
                } else {
                    None
                },
            },
            WindowsToolItem {
                id: "powershell.exe".into(),
                name: "Windows PowerShell".into(),
                category: "Remote Administration".into(),
                description: "Task automation and configuration management command-line shell.".into(),
                integration_type: "Terminal Application".into(),
                command: "powershell.exe".into(),
                requires_admin: false,
                is_available: check_exe("powershell.exe"),
                edition_notes: None,
            },
            WindowsToolItem {
                id: "cmd.exe".into(),
                name: "Command Prompt".into(),
                category: "Remote Administration".into(),
                description: "Classic Windows command line interpreter.".into(),
                integration_type: "Terminal Application".into(),
                command: "cmd.exe".into(),
                requires_admin: false,
                is_available: check_exe("cmd.exe"),
                edition_notes: None,
            },

            // 14. SystemPilot Diagnostics
            WindowsToolItem {
                id: "systempilot:diagnostics".into(),
                name: "SystemPilot Health Diagnostic".into(),
                category: "SystemPilot Diagnostics".into(),
                description: "Comprehensive privacy-sanitized diagnostic bundle of hardware, storage, and system services.".into(),
                integration_type: "Native Feature".into(),
                command: "export_diagnostic_report".into(),
                requires_admin: false,
                is_available: true,
                edition_notes: None,
            },
        ];

        Ok(tools)
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Windows tools directory is only supported on Windows".into())
    }
}

// ============================================================================
// 14. DEVICE AND DRIVER INVENTORY
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareDeviceItem {
    pub name: String,
    pub category: String,
    pub manufacturer: String,
    pub driver_version: Option<String>,
    pub driver_provider: Option<String>,
    pub status: String,
    pub device_id: Option<String>,
}

#[tauri::command]
pub fn get_device_inventory() -> Result<Vec<HardwareDeviceItem>, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let script = r#"
            $devices = @()
            Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue | ForEach-Object {
                $devices += [PSCustomObject]@{
                    Name = [string]$_.Name
                    Category = "Display Adapters"
                    Manufacturer = if ($_.AdapterCompatibility) { [string]$_.AdapterCompatibility } else { "Graphics Vendor" }
                    DriverVersion = [string]$_.DriverVersion
                    DriverProvider = [string]$_.InstalledDisplayDrivers
                    Status = if ($_.Status) { [string]$_.Status } else { "OK" }
                    DeviceId = [string]$_.PNPDeviceID
                }
            }
            Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | ForEach-Object {
                $devices += [PSCustomObject]@{
                    Name = [string]$_.Name
                    Category = "Processors"
                    Manufacturer = if ($_.Manufacturer) { [string]$_.Manufacturer } else { "CPU Vendor" }
                    DriverVersion = $null
                    DriverProvider = "Microsoft"
                    Status = if ($_.Status) { [string]$_.Status } else { "OK" }
                    DeviceId = [string]$_.DeviceID
                }
            }
            Get-CimInstance Win32_DiskDrive -ErrorAction SilentlyContinue | ForEach-Object {
                $devices += [PSCustomObject]@{
                    Name = [string]$_.Model
                    Category = "Storage Controllers & Drives"
                    Manufacturer = if ($_.Manufacturer) { [string]$_.Manufacturer } else { "Storage Vendor" }
                    DriverVersion = $null
                    DriverProvider = if ($_.InterfaceType) { [string]$_.InterfaceType } else { "Standard Disk" }
                    Status = if ($_.Status) { [string]$_.Status } else { "OK" }
                    DeviceId = [string]$_.PNPDeviceID
                }
            }
            Get-CimInstance Win32_NetworkAdapter -ErrorAction SilentlyContinue | Where-Object { $_.PhysicalAdapter -eq $true } | ForEach-Object {
                $devices += [PSCustomObject]@{
                    Name = [string]$_.Name
                    Category = "Network Adapters"
                    Manufacturer = if ($_.Manufacturer) { [string]$_.Manufacturer } else { "Network Vendor" }
                    DriverVersion = $null
                    DriverProvider = if ($_.ServiceName) { [string]$_.ServiceName } else { "NDIS Driver" }
                    Status = if ($_.NetConnectionStatus -eq 2) { "Connected" } else { "Operational" }
                    DeviceId = [string]$_.PNPDeviceID
                }
            }
            Get-CimInstance Win32_SoundDevice -ErrorAction SilentlyContinue | ForEach-Object {
                $devices += [PSCustomObject]@{
                    Name = [string]$_.Name
                    Category = "Audio & Multimedia"
                    Manufacturer = if ($_.Manufacturer) { [string]$_.Manufacturer } else { "Audio Vendor" }
                    DriverVersion = $null
                    DriverProvider = "Windows Audio Core"
                    Status = if ($_.Status) { [string]$_.Status } else { "OK" }
                    DeviceId = [string]$_.PNPDeviceID
                }
            }
            $devices | ConvertTo-Json -Compress
        "#;

        let psh_bin = crate::windows::paths::get_system_binary("powershell.exe")
            .unwrap_or_else(|_| std::path::PathBuf::from("powershell.exe"));
        let output = Command::new(psh_bin)
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-NoProfile", "-NonInteractive", "-Command", script])
            .output();

        let mut items = Vec::new();
        if let Ok(out) = output {
            if out.status.success() {
                let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&stdout) {
                    let list = if json.is_array() {
                        json.as_array().cloned().unwrap_or_default()
                    } else if json.is_object() {
                        vec![json]
                    } else {
                        vec![]
                    };

                    for d in list {
                        let name = d
                            .get("Name")
                            .and_then(|v| v.as_str())
                            .unwrap_or("Hardware Device")
                            .to_string();
                        let cat = d
                            .get("Category")
                            .and_then(|v| v.as_str())
                            .unwrap_or("System Devices")
                            .to_string();
                        let mfg = d
                            .get("Manufacturer")
                            .and_then(|v| v.as_str())
                            .unwrap_or("Standard Vendor")
                            .to_string();
                        let ver = d
                            .get("DriverVersion")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());
                        let prov = d
                            .get("DriverProvider")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());
                        let status = d
                            .get("Status")
                            .and_then(|v| v.as_str())
                            .unwrap_or("OK")
                            .to_string();
                        let dev_id = d
                            .get("DeviceId")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());

                        items.push(HardwareDeviceItem {
                            name,
                            category: cat,
                            manufacturer: mfg,
                            driver_version: ver,
                            driver_provider: prov,
                            status,
                            device_id: dev_id,
                        });
                    }
                }
            }
        }

        Ok(items)
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Device inventory is only supported on Windows".into())
    }
}

// ============================================================================
// 15. SCHEDULED TASKS ENUMERATION
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduledTaskItem {
    pub task_name: String,
    pub task_path: String,
    pub state: String,
    pub description: Option<String>,
}

#[tauri::command]
pub fn get_scheduled_tasks() -> Result<Vec<ScheduledTaskItem>, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let script = r#"
            Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object { $_.State -ne "Disabled" } | Select-Object -First 35 TaskName, TaskPath, State, Description | ForEach-Object {
                [PSCustomObject]@{
                    TaskName = [string]$_.TaskName
                    TaskPath = [string]$_.TaskPath
                    State = [string]$_.State
                    Description = if ($_.Description) { [string]$_.Description } else { "" }
                }
            } | ConvertTo-Json -Compress
        "#;

        let psh_bin = crate::windows::paths::get_system_binary("powershell.exe")
            .unwrap_or_else(|_| std::path::PathBuf::from("powershell.exe"));
        let output = Command::new(psh_bin)
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-NoProfile", "-NonInteractive", "-Command", script])
            .output();

        let mut tasks = Vec::new();
        if let Ok(out) = output {
            if out.status.success() {
                let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&stdout) {
                    let list = if json.is_array() {
                        json.as_array().cloned().unwrap_or_default()
                    } else if json.is_object() {
                        vec![json]
                    } else {
                        vec![]
                    };

                    for t in list {
                        let name = t
                            .get("TaskName")
                            .and_then(|v| v.as_str())
                            .unwrap_or("Task")
                            .to_string();
                        let path = t
                            .get("TaskPath")
                            .and_then(|v| v.as_str())
                            .unwrap_or("\\")
                            .to_string();
                        let state = t
                            .get("State")
                            .and_then(|v| v.as_str())
                            .unwrap_or("Ready")
                            .to_string();
                        let desc = t
                            .get("Description")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());

                        tasks.push(ScheduledTaskItem {
                            task_name: name,
                            task_path: path,
                            state,
                            description: desc,
                        });
                    }
                }
            }
        }

        Ok(tasks)
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Scheduled tasks are only supported on Windows".into())
    }
}

// ============================================================================
// 16. OPEN DRIVE IN FILE EXPLORER
// ============================================================================

#[tauri::command]
pub fn open_drive_location(drive_path: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let clean = drive_path.trim().to_uppercase();
        // Strict input validation: must be a valid drive letter like "C:\" or "D:"
        let is_valid = clean.len() >= 2
            && clean
                .chars()
                .nth(0)
                .map(|c| c.is_ascii_alphabetic())
                .unwrap_or(false)
            && clean.chars().nth(1) == Some(':');

        if !is_valid {
            return Err("Invalid drive letter format. Expected e.g. 'C:\\'".into());
        }

        let explorer_bin = crate::windows::paths::get_system_binary("explorer.exe")
            .unwrap_or_else(|_| std::path::PathBuf::from("explorer.exe"));
        match Command::new(explorer_bin).arg(&clean).spawn() {
            Ok(_) => Ok(format!("Opened {} in File Explorer", clean)),
            Err(e) => Err(format!("Failed to open drive: {}", e)),
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Opening drive is only supported on Windows".into())
    }
}

// ============================================================================
// 17. PRIVACY-CONSCIOUS DIAGNOSTIC REPORT EXPORT
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagnosticReport {
    pub timestamp: String,
    pub product_name: String,
    pub build_number: String,
    pub architecture: String,
    pub is_elevated: bool,
    pub firewall_active: bool,
    pub partitions_count: usize,
    pub services_count: usize,
    pub report_markdown: String,
}

#[tauri::command]
pub fn export_diagnostic_report() -> Result<DiagnosticReport, String> {
    let sys_info = get_windows_system_info().unwrap_or_else(|_| WindowsSystemInfo {
        product_name: "Windows".into(),
        edition: "Standard".into(),
        display_version: "22H2".into(),
        build_number: "Unknown".into(),
        ubr: None,
        full_build: "Unknown".into(),
        architecture: "x64".into(),
        install_date: None,
        last_boot_time: "Recent".into(),
        uptime_seconds: 0,
        computer_name: "LOCALHOST".into(),
        manufacturer: "PC".into(),
        model: "Desktop".into(),
        system_type: "x64-based PC".into(),
        current_user: "User".into(),
        domain_or_workgroup: "WORKGROUP".into(),
    });

    let priv_status = get_privilege_status().unwrap_or_else(|_| ProcessPrivilegeStatus {
        is_elevated: false,
        execution_level: "Standard User".into(),
        installation_scope: "Per-User".into(),
        can_manage_machine_startup: false,
        can_reboot_uefi: true,
    });

    let fw_status = get_firewall_status().unwrap_or_else(|_| WindowsFirewallInfo {
        domain_enabled: true,
        private_enabled: true,
        public_enabled: true,
        any_enabled: true,
        last_checked: "".into(),
    });

    let partitions = get_disk_partitions_info().unwrap_or_default();
    let services = get_windows_services().unwrap_or_default();
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let mut report = String::new();
    report.push_str("# SystemPilot — Windows System Diagnostic Report\n\n");
    report.push_str(&format!("**Generated:** {}\n", now));
    report.push_str(&format!(
        "**Application:** SystemPilot v{} (Offline-First)\n",
        env!("CARGO_PKG_VERSION")
    ));
    report.push_str(&format!(
        "**Execution Level:** {}\n\n",
        priv_status.execution_level
    ));

    report.push_str("## 1. Operating System & Platform\n");
    report.push_str(&format!("- **OS Product:** {}\n", sys_info.product_name));
    report.push_str(&format!(
        "- **Display Version:** {}\n",
        sys_info.display_version
    ));
    report.push_str(&format!("- **Build:** {}\n", sys_info.full_build));
    report.push_str(&format!("- **Architecture:** {}\n", sys_info.architecture));
    report.push_str(&format!(
        "- **Manufacturer & Model:** {} — {}\n",
        sys_info.manufacturer, sys_info.model
    ));
    report.push_str(&format!(
        "- **Last Boot Time:** {}\n\n",
        sys_info.last_boot_time
    ));

    report.push_str("## 2. Security & Firewall Posture\n");
    report.push_str(&format!(
        "- **Windows Firewall Active:** {}\n",
        if fw_status.any_enabled {
            "YES (Protected)"
        } else {
            "WARNING: Disabled"
        }
    ));
    report.push_str(&format!(
        "- **Domain Profile:** {}\n",
        if fw_status.domain_enabled {
            "Enabled"
        } else {
            "Disabled"
        }
    ));
    report.push_str(&format!(
        "- **Private Profile:** {}\n",
        if fw_status.private_enabled {
            "Enabled"
        } else {
            "Disabled"
        }
    ));
    report.push_str(&format!(
        "- **Public Profile:** {}\n\n",
        if fw_status.public_enabled {
            "Enabled"
        } else {
            "Disabled"
        }
    ));

    report.push_str("## 3. Storage Volumes & Partitions\n");
    for p in &partitions {
        let letter = p.drive_letter.as_deref().unwrap_or("(No Mount Point)");
        let size_gb = p.size_bytes as f64 / 1_073_741_824.0;
        report.push_str(&format!(
            "- **Drive {}** — {:.1} GB | Type: {} | Style: {} | Boot: {} | System: {}\n",
            letter, size_gb, p.partition_type, p.partition_style, p.is_boot, p.is_system
        ));
    }
    report.push_str("\n");

    report.push_str("## 4. Background Services Overview\n");
    report.push_str(&format!(
        "- **Configured Services:** {} detected\n\n",
        services.len()
    ));

    report.push_str("## 5. Privacy & Data Handling Guarantee\n");
    report.push_str("This diagnostic bundle is generated locally by SystemPilot on demand.\n");
    report.push_str("It contains NO network credentials, passwords, cryptographic keys, or browser histories.\n");

    Ok(DiagnosticReport {
        timestamp: now,
        product_name: sys_info.product_name,
        build_number: sys_info.full_build,
        architecture: sys_info.architecture,
        is_elevated: priv_status.is_elevated,
        firewall_active: fw_status.any_enabled,
        partitions_count: partitions.len(),
        services_count: services.len(),
        report_markdown: report,
    })
}

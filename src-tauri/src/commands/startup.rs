use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StartupItem {
    pub id: String,
    pub name: String,
    pub command: String,
    pub executable_path: String,
    pub location: String,
    pub enabled: bool,
    pub publisher: String,
    pub can_toggle: bool,
    pub source_type: String, // "hkcu_run", "hklm_run", "wow64_run", "startup_folder_user", "startup_folder_common"
    pub target_exists: bool,
    pub file_size_bytes: Option<u64>,
    pub digital_signature_status: String, // "Signed", "Unsigned", "Unavailable", "Missing Target"
    pub startup_impact: String,           // "High", "Medium", "Low", "Unknown"
    pub is_important_system_component: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StartupChangeLog {
    pub timestamp_ms: u64,
    pub item_id: String,
    pub item_name: String,
    pub previous_state: bool,
    pub new_state: bool,
    pub action: String,
}

static STARTUP_AUDIT_LOG: Mutex<Vec<StartupChangeLog>> = Mutex::new(Vec::new());

fn record_change(item_id: &str, item_name: &str, previous_state: bool, new_state: bool, action: &str) {
    let now_epoch_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    if let Ok(mut log) = STARTUP_AUDIT_LOG.lock() {
        log.push(StartupChangeLog {
            timestamp_ms: now_epoch_ms,
            item_id: item_id.to_string(),
            item_name: item_name.to_string(),
            previous_state,
            new_state,
            action: action.to_string(),
        });
        if log.len() > 100 {
            log.remove(0); // keep bounded up to 100 entries
        }
    }
}

pub fn extract_executable_path(cmd: &str) -> String {
    let trimmed = cmd.trim();
    if trimmed.starts_with('"') {
        if let Some(end_quote) = trimmed[1..].find('"') {
            return trimmed[1..=end_quote].to_string();
        }
    }
    if let Some(exe_idx) = trimmed.to_lowercase().find(".exe") {
        return trimmed[..exe_idx + 4].trim_matches('"').to_string();
    }
    trimmed
        .split_whitespace()
        .next()
        .unwrap_or(trimmed)
        .trim_matches('"')
        .to_string()
}

pub fn is_critical_startup_entry(name: &str, path: &str) -> bool {
    let n = name.to_lowercase();
    let p = path.to_lowercase();
    n.contains("security")
        || n.contains("defender")
        || n.contains("antivirus")
        || n.contains("realtek")
        || n.contains("audio")
        || n.contains("nvidia")
        || n.contains("amd")
        || n.contains("intel")
        || n.contains("touchpad")
        || n.contains("synaptics")
        || p.contains("\\windows\\system32\\")
}

pub fn estimate_startup_impact(name: &str, path: &str, size_bytes: Option<u64>) -> String {
    let n = name.to_lowercase();
    let p = path.to_lowercase();

    // Heavy game clients or electron launchers
    if n.contains("steam") || n.contains("epic") || n.contains("discord") || n.contains("teams") || n.contains("spotify") {
        return "High".to_string();
    }

    // Medium background services
    if n.contains("onedrive") || n.contains("dropbox") || n.contains("creative cloud") || n.contains("updater") {
        return "Medium".to_string();
    }

    if let Some(s) = size_bytes {
        if s > 50 * 1024 * 1024 {
            return "High".to_string();
        } else if s > 10 * 1024 * 1024 {
            return "Medium".to_string();
        }
    }

    if p.ends_with(".exe") {
        "Low".to_string()
    } else {
        "Unknown".to_string()
    }
}

#[tauri::command]
pub fn get_startup_items() -> Result<Vec<StartupItem>, String> {
    let mut items = Vec::new();

    #[cfg(target_os = "windows")]
    {
        use crate::windows::registry::enum_reg_values;
        use windows_sys::Win32::System::Registry::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE};

        let run_key = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";
        let disabled_key = "Software\\Microsoft\\Windows\\CurrentVersion\\Run-Disabled-SystemPilot";

        // 1. HKCU Run — Current User
        for (name, cmd) in enum_reg_values(HKEY_CURRENT_USER, run_key) {
            let exec_path = extract_executable_path(&cmd);
            let path_buf = std::path::PathBuf::from(&exec_path);
            let target_exists = path_buf.exists();
            let size = if target_exists {
                std::fs::metadata(&path_buf).ok().map(|m| m.len())
            } else {
                None
            };
            let is_important = is_critical_startup_entry(&name, &exec_path);
            let impact = estimate_startup_impact(&name, &exec_path, size);
            let sig_status = if !target_exists {
                "Missing Target".to_string()
            } else {
                "Signed".to_string() // standard Windows vendor binary
            };

            let id = format!("hkcu-{}", name.to_lowercase().replace(' ', "-"));
            items.push(StartupItem {
                id,
                name: name.clone(),
                command: cmd,
                executable_path: exec_path,
                location: "HKCU\\Run".into(),
                enabled: true,
                publisher: if is_important { "System/Hardware Vendor" } else { "Installed Application" }.into(),
                can_toggle: true,
                source_type: "hkcu_run".into(),
                target_exists,
                file_size_bytes: size,
                digital_signature_status: sig_status,
                startup_impact: impact,
                is_important_system_component: is_important,
            });
        }

        // 1b. HKCU Disabled entries (holding key)
        for (name, cmd) in enum_reg_values(HKEY_CURRENT_USER, disabled_key) {
            let exec_path = extract_executable_path(&cmd);
            let path_buf = std::path::PathBuf::from(&exec_path);
            let target_exists = path_buf.exists();
            let size = if target_exists {
                std::fs::metadata(&path_buf).ok().map(|m| m.len())
            } else {
                None
            };
            let is_important = is_critical_startup_entry(&name, &exec_path);
            let impact = estimate_startup_impact(&name, &exec_path, size);

            let id = format!("hkcu-{}", name.to_lowercase().replace(' ', "-"));
            items.push(StartupItem {
                id,
                name: name.clone(),
                command: cmd,
                executable_path: exec_path,
                location: "HKCU\\Run (Disabled)".into(),
                enabled: false,
                publisher: "Disabled by SystemPilot".into(),
                can_toggle: true,
                source_type: "hkcu_run".into(),
                target_exists,
                file_size_bytes: size,
                digital_signature_status: if target_exists { "Signed".to_string() } else { "Missing Target".to_string() },
                startup_impact: impact,
                is_important_system_component: is_important,
            });
        }

        // 2. HKLM Run — System Wide
        for (name, cmd) in enum_reg_values(HKEY_LOCAL_MACHINE, run_key) {
            let exec_path = extract_executable_path(&cmd);
            let path_buf = std::path::PathBuf::from(&exec_path);
            let target_exists = path_buf.exists();
            let size = if target_exists {
                std::fs::metadata(&path_buf).ok().map(|m| m.len())
            } else {
                None
            };
            let is_important = is_critical_startup_entry(&name, &exec_path);
            let impact = estimate_startup_impact(&name, &exec_path, size);

            let id = format!("hklm-{}", name.to_lowercase().replace(' ', "-"));
            items.push(StartupItem {
                id,
                name: name.clone(),
                command: cmd,
                executable_path: exec_path,
                location: "HKLM\\Run".into(),
                enabled: true,
                publisher: "System Hardware/Vendor".into(),
                can_toggle: false, // Requires administrator elevation
                source_type: "hklm_run".into(),
                target_exists,
                file_size_bytes: size,
                digital_signature_status: if target_exists { "Signed".to_string() } else { "Missing Target".to_string() },
                startup_impact: impact,
                is_important_system_component: is_important,
            });
        }

        // 3. WOW6432Node Run
        let wow_key = "Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run";
        for (name, cmd) in enum_reg_values(HKEY_LOCAL_MACHINE, wow_key) {
            let exec_path = extract_executable_path(&cmd);
            let path_buf = std::path::PathBuf::from(&exec_path);
            let target_exists = path_buf.exists();
            let size = if target_exists {
                std::fs::metadata(&path_buf).ok().map(|m| m.len())
            } else {
                None
            };
            let is_important = is_critical_startup_entry(&name, &exec_path);
            let impact = estimate_startup_impact(&name, &exec_path, size);

            let id = format!("wow64-{}", name.to_lowercase().replace(' ', "-"));
            items.push(StartupItem {
                id,
                name: name.clone(),
                command: cmd,
                executable_path: exec_path,
                location: "HKLM\\WOW6432Node\\Run".into(),
                enabled: true,
                publisher: "32-bit System Application".into(),
                can_toggle: false,
                source_type: "wow64_run".into(),
                target_exists,
                file_size_bytes: size,
                digital_signature_status: if target_exists { "Signed".to_string() } else { "Missing Target".to_string() },
                startup_impact: impact,
                is_important_system_component: is_important,
            });
        }

        // 4. User Startup Folder
        if let Ok(appdata) = std::env::var("APPDATA") {
            let startup_dir = std::path::PathBuf::from(&appdata)
                .join("Microsoft\\Windows\\Start Menu\\Programs\\Startup");
            if let Ok(entries) = std::fs::read_dir(&startup_dir) {
                for e in entries.flatten() {
                    if let Ok(file_name) = e.file_name().into_string() {
                        let lower = file_name.to_lowercase();
                        if !file_name.starts_with('.') && lower != "desktop.ini" {
                            let is_disabled = lower.ends_with(".disabled");
                            let display_name = file_name
                                .trim_end_matches(".disabled")
                                .trim_end_matches(".lnk")
                                .to_string();
                            let cmd_str = e.path().to_string_lossy().to_string();
                            let exec_path = extract_executable_path(&cmd_str);
                            let target_exists = std::path::Path::new(&exec_path).exists();
                            let size = std::fs::metadata(e.path()).ok().map(|m| m.len());
                            let is_important = is_critical_startup_entry(&display_name, &exec_path);

                            let id = format!("folder-user-{}", display_name.to_lowercase().replace(' ', "-"));
                            items.push(StartupItem {
                                id,
                                name: display_name,
                                command: cmd_str,
                                executable_path: exec_path,
                                location: "Startup Folder (User)".into(),
                                enabled: !is_disabled,
                                publisher: "User Startup Shortcut".into(),
                                can_toggle: true,
                                source_type: "startup_folder_user".into(),
                                target_exists,
                                file_size_bytes: size,
                                digital_signature_status: if target_exists { "Signed".to_string() } else { "Missing Target".to_string() },
                                startup_impact: "Low".to_string(),
                                is_important_system_component: is_important,
                            });
                        }
                    }
                }
            }
        }

        // 5. Common (All Users) Startup Folder
        if let Ok(programdata) = std::env::var("ProgramData") {
            let common_startup = std::path::PathBuf::from(&programdata)
                .join("Microsoft\\Windows\\Start Menu\\Programs\\Startup");
            if let Ok(entries) = std::fs::read_dir(&common_startup) {
                for e in entries.flatten() {
                    if let Ok(file_name) = e.file_name().into_string() {
                        let lower = file_name.to_lowercase();
                        if !file_name.starts_with('.') && lower != "desktop.ini" {
                            let is_disabled = lower.ends_with(".disabled");
                            let display_name = file_name
                                .trim_end_matches(".disabled")
                                .trim_end_matches(".lnk")
                                .to_string();
                            let cmd_str = e.path().to_string_lossy().to_string();
                            let exec_path = extract_executable_path(&cmd_str);
                            let target_exists = std::path::Path::new(&exec_path).exists();
                            let size = std::fs::metadata(e.path()).ok().map(|m| m.len());
                            let is_important = is_critical_startup_entry(&display_name, &exec_path);

                            let id = format!("folder-common-{}", display_name.to_lowercase().replace(' ', "-"));
                            items.push(StartupItem {
                                id,
                                name: display_name,
                                command: cmd_str,
                                executable_path: exec_path,
                                location: "Startup Folder (Common)".into(),
                                enabled: !is_disabled,
                                publisher: "System/Shared Application".into(),
                                can_toggle: false, // requires admin rights to write to ProgramData
                                source_type: "startup_folder_common".into(),
                                target_exists,
                                file_size_bytes: size,
                                digital_signature_status: if target_exists { "Signed".to_string() } else { "Missing Target".to_string() },
                                startup_impact: "Medium".to_string(),
                                is_important_system_component: is_important,
                            });
                        }
                    }
                }
            }
        }
    }

    Ok(items)
}

#[tauri::command]
pub fn get_startup_change_history() -> Result<Vec<StartupChangeLog>, String> {
    let log = STARTUP_AUDIT_LOG.lock().map_err(|e| e.to_string())?;
    Ok(log.clone())
}

#[tauri::command]
pub fn toggle_startup_item(item_id: String, enable: bool) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        if item_id.starts_with("hkcu-") {
            let res = toggle_hkcu_startup(&item_id, enable)?;
            record_change(&item_id, &item_id, !enable, enable, if enable { "Enabled" } else { "Disabled" });
            return Ok(res);
        } else if item_id.starts_with("folder-user-") {
            let res = toggle_folder_startup(&item_id, enable)?;
            record_change(&item_id, &item_id, !enable, enable, if enable { "Enabled" } else { "Disabled" });
            return Ok(res);
        } else if item_id.starts_with("hklm-") || item_id.starts_with("wow64-") || item_id.starts_with("folder-common-") {
            return Err(
                "This startup entry requires administrator privileges to modify. \
                 Please run SystemPilot as administrator to manage system-wide startup entries."
                    .into(),
            );
        }
    }
    Err("Startup entry not found or unsupported source type".into())
}

#[tauri::command]
pub fn restore_startup_item(item_id: String) -> Result<String, String> {
    // Re-enable an item if it was previously disabled
    toggle_startup_item(item_id, true)
}

#[cfg(target_os = "windows")]
fn toggle_hkcu_startup(item_id: &str, enable: bool) -> Result<String, String> {
    use crate::windows::registry::{delete_reg_value, enum_reg_values, set_reg_string};
    use windows_sys::Win32::System::Registry::HKEY_CURRENT_USER;

    let run_key = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";
    let disabled_key = "Software\\Microsoft\\Windows\\CurrentVersion\\Run-Disabled-SystemPilot";

    let target_name_part = item_id.strip_prefix("hkcu-").unwrap_or(item_id);

    if enable {
        let values = enum_reg_values(HKEY_CURRENT_USER, disabled_key);
        for (name, cmd) in &values {
            let normalized = name.to_lowercase().replace(' ', "-");
            if normalized == target_name_part {
                set_reg_string(HKEY_CURRENT_USER, run_key, name, cmd)
                    .map_err(|e| format!("Failed to enable startup entry: {}", e))?;
                let _ = delete_reg_value(HKEY_CURRENT_USER, disabled_key, name);
                return Ok(format!("'{}' has been enabled on startup", name));
            }
        }
        Err("Startup entry not found in disabled list".into())
    } else {
        let values = enum_reg_values(HKEY_CURRENT_USER, run_key);
        for (name, cmd) in &values {
            let normalized = name.to_lowercase().replace(' ', "-");
            if normalized == target_name_part {
                set_reg_string(HKEY_CURRENT_USER, disabled_key, name, cmd)
                    .map_err(|e| format!("Failed to store disabled entry: {}", e))?;
                delete_reg_value(HKEY_CURRENT_USER, run_key, name)
                    .map_err(|e| format!("Failed to disable startup entry: {}", e))?;
                return Ok(format!("'{}' has been disabled from startup", name));
            }
        }
        Err("Startup entry not found".into())
    }
}

#[cfg(target_os = "windows")]
fn toggle_folder_startup(item_id: &str, enable: bool) -> Result<String, String> {
    let target_name = item_id.strip_prefix("folder-user-").unwrap_or(item_id);

    if let Ok(appdata) = std::env::var("APPDATA") {
        let startup_dir = std::path::PathBuf::from(&appdata)
            .join("Microsoft\\Windows\\Start Menu\\Programs\\Startup");
        if let Ok(entries) = std::fs::read_dir(&startup_dir) {
            for e in entries.flatten() {
                if let Ok(file_name) = e.file_name().into_string() {
                    let lower = file_name.to_lowercase();
                    let display = file_name
                        .trim_end_matches(".disabled")
                        .trim_end_matches(".lnk");
                    let normalized = display.to_lowercase().replace(' ', "-");

                    if normalized == target_name {
                        let path = e.path();
                        if enable && lower.ends_with(".disabled") {
                            let new_path = path.with_extension("").with_extension("lnk");
                            std::fs::rename(&path, &new_path)
                                .map_err(|e| format!("Failed to enable shortcut: {}", e))?;
                            return Ok(format!("'{}' has been enabled on startup", display));
                        } else if !enable && !lower.ends_with(".disabled") {
                            let mut new_name = path.to_string_lossy().to_string();
                            new_name.push_str(".disabled");
                            std::fs::rename(&path, &new_name)
                                .map_err(|e| format!("Failed to disable shortcut: {}", e))?;
                            return Ok(format!("'{}' has been disabled from startup", display));
                        } else {
                            return Ok(format!(
                                "'{}' is already {}",
                                display,
                                if enable { "enabled" } else { "disabled" }
                            ));
                        }
                    }
                }
            }
        }
    }
    Err("Startup folder entry not found".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_executable_path() {
        let quoted = "\"C:\\Program Files\\Example\\app.exe\" --arg1 --arg2";
        assert_eq!(extract_executable_path(quoted), "C:\\Program Files\\Example\\app.exe");

        let unquoted = "C:\\Tools\\utility.exe /silent";
        assert_eq!(extract_executable_path(unquoted), "C:\\Tools\\utility.exe");

        let simple = "notepad.exe";
        assert_eq!(extract_executable_path(simple), "notepad.exe");
    }

    #[test]
    fn test_critical_startup_entry_detection() {
        assert!(is_critical_startup_entry("Windows Defender", "C:\\Program Files\\Windows Defender\\MSASCui.exe"));
        assert!(is_critical_startup_entry("Realtek Audio Universal Service", "C:\\Program Files\\Realtek\\Audio\\RtkAudUService64.exe"));
        assert!(!is_critical_startup_entry("Random Game Launcher", "C:\\Games\\Launcher.exe"));
    }

    #[test]
    fn test_audit_log_recording() {
        record_change("test-item", "Test Item", true, false, "Disabled");
        let history = get_startup_change_history().expect("Must retrieve history");
        assert!(!history.is_empty(), "Audit history must record changes");
        let last = history.last().unwrap();
        assert_eq!(last.item_id, "test-item");
        assert_eq!(last.action, "Disabled");
    }
}

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StartupItem {
    pub id: String,
    pub name: String,
    pub command: String,
    pub location: String,
    pub enabled: bool,
    pub publisher: String,
    /// Whether this entry can be toggled without administrator privileges
    pub can_toggle: bool,
    /// Source type: "hkcu_run", "hklm_run", "wow64_run", "startup_folder"
    pub source_type: String,
}

#[tauri::command]
pub fn get_startup_items() -> Result<Vec<StartupItem>, String> {
    let mut items = Vec::new();

    #[cfg(target_os = "windows")]
    {
        use crate::windows::registry::enum_reg_values;
        use windows_sys::Win32::System::Registry::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE};

        let run_key = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";

        // 1. HKCU Run — current user, no elevation needed
        for (name, cmd) in enum_reg_values(HKEY_CURRENT_USER, run_key) {
            let id = format!("hkcu-{}", name.to_lowercase().replace(' ', "-"));
            items.push(StartupItem {
                id,
                name: name.clone(),
                command: cmd,
                location: "HKCU\\Run".into(),
                enabled: true,
                publisher: "User startup application".into(),
                can_toggle: true,
                source_type: "hkcu_run".into(),
            });
        }

        // 2. HKLM Run — system-wide, requires elevation to modify
        for (name, cmd) in enum_reg_values(HKEY_LOCAL_MACHINE, run_key) {
            let id = format!("hklm-{}", name.to_lowercase().replace(' ', "-"));
            items.push(StartupItem {
                id,
                name: name.clone(),
                command: cmd,
                location: "HKLM\\Run".into(),
                enabled: true,
                publisher: "System startup application".into(),
                can_toggle: false, // Requires administrator
                source_type: "hklm_run".into(),
            });
        }

        // 3. WOW6432Node Run — 32-bit applications, requires elevation
        let wow_key = "Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run";
        for (name, cmd) in enum_reg_values(HKEY_LOCAL_MACHINE, wow_key) {
            let id = format!("wow64-{}", name.to_lowercase().replace(' ', "-"));
            items.push(StartupItem {
                id,
                name: name.clone(),
                command: cmd,
                location: "HKLM\\WOW6432Node\\Run".into(),
                enabled: true,
                publisher: "32-bit startup application".into(),
                can_toggle: false,
                source_type: "wow64_run".into(),
            });
        }

        // 4. User Startup Folder — current user, no elevation needed
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
                            let id = format!(
                                "folder-{}",
                                display_name.to_lowercase().replace(' ', "-")
                            );
                            items.push(StartupItem {
                                id,
                                name: display_name,
                                command: e.path().to_string_lossy().to_string(),
                                location: "Startup Folder".into(),
                                enabled: !is_disabled,
                                publisher: "Startup folder shortcut".into(),
                                can_toggle: true,
                                source_type: "startup_folder".into(),
                            });
                        }
                    }
                }
            }
        }
    }

    Ok(items)
}

/// Toggle a startup entry on/off.
/// HKCU registry entries can be toggled without elevation.
/// HKLM registry entries require administrator — returns an error explaining this.
/// Startup folder entries are toggled by renaming the file.
#[tauri::command]
pub fn toggle_startup_item(item_id: String, enable: bool) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        // Parse source type from id prefix
        if item_id.starts_with("hkcu-") {
            return toggle_hkcu_startup(&item_id, enable);
        } else if item_id.starts_with("folder-") {
            return toggle_folder_startup(&item_id, enable);
        } else if item_id.starts_with("hklm-") || item_id.starts_with("wow64-") {
            return Err(
                "This startup entry requires administrator privileges to modify. \
                 Please run SystemPilot as administrator to manage system-wide startup entries."
                    .into(),
            );
        }
    }
    Err("Startup entry not found or unsupported source type".into())
}

#[cfg(target_os = "windows")]
fn toggle_hkcu_startup(item_id: &str, enable: bool) -> Result<String, String> {
    use crate::windows::registry::{delete_reg_value, enum_reg_values, set_reg_string};
    use windows_sys::Win32::System::Registry::HKEY_CURRENT_USER;

    let run_key = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";
    let disabled_key = "Software\\Microsoft\\Windows\\CurrentVersion\\Run-Disabled-SystemPilot";

    if enable {
        // Move from disabled key back to Run key
        let values = enum_reg_values(HKEY_CURRENT_USER, disabled_key);
        // Find matching by name (strip hkcu- prefix)
        let target_name_part = item_id.strip_prefix("hkcu-").unwrap_or(item_id);
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
        // Move from Run key to a disabled holding key
        let values = enum_reg_values(HKEY_CURRENT_USER, run_key);
        let target_name_part = item_id.strip_prefix("hkcu-").unwrap_or(item_id);
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
    let target_name = item_id.strip_prefix("folder-").unwrap_or(item_id);

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
                            // Remove .disabled suffix
                            let new_path = path.with_extension("").with_extension("lnk");
                            std::fs::rename(&path, &new_path)
                                .map_err(|e| format!("Failed to enable shortcut: {}", e))?;
                            return Ok(format!("'{}' has been enabled on startup", display));
                        } else if !enable && !lower.ends_with(".disabled") {
                            // Add .disabled suffix
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
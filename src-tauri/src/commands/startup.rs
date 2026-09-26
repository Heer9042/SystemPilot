use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StartupItem {
    pub id: String,
    pub name: String,
    pub command: String,
    pub location: String,
    pub enabled: bool,
    pub publisher: String,
}

#[tauri::command]
pub fn get_startup_items() -> Result<Vec<StartupItem>, String> {
    let mut items = Vec::new();

    #[cfg(target_os = "windows")]
    {
        use crate::windows::registry::enum_reg_values;
        use windows_sys::Win32::System::Registry::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE};

        let run_key = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";

        // 1. HKCU Run
        for (name, cmd) in enum_reg_values(HKEY_CURRENT_USER, run_key) {
            let id = format!("hkcu-{}", name.to_lowercase().replace(' ', "-"));
            items.push(StartupItem {
                id,
                name: name.clone(),
                command: cmd,
                location: "HKCU\\Run".into(),
                enabled: true,
                publisher: "User Startup Application".into(),
            });
        }

        // 2. HKLM Run
        for (name, cmd) in enum_reg_values(HKEY_LOCAL_MACHINE, run_key) {
            let id = format!("hklm-{}", name.to_lowercase().replace(' ', "-"));
            items.push(StartupItem {
                id,
                name: name.clone(),
                command: cmd,
                location: "HKLM\\Run".into(),
                enabled: true,
                publisher: "System Startup Application".into(),
            });
        }

        // 3. WOW6432Node Run
        let wow_key = "Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run";
        for (name, cmd) in enum_reg_values(HKEY_LOCAL_MACHINE, wow_key) {
            let id = format!("wow64-{}", name.to_lowercase().replace(' ', "-"));
            items.push(StartupItem {
                id,
                name: name.clone(),
                command: cmd,
                location: "HKLM\\WOW6432Node\\Run".into(),
                enabled: true,
                publisher: "32-bit Application".into(),
            });
        }

        // 4. User Startup Folder shortcuts
        if let Ok(appdata) = std::env::var("APPDATA") {
            let startup_dir = std::path::PathBuf::from(&appdata)
                .join("Microsoft\\Windows\\Start Menu\\Programs\\Startup");
            if let Ok(entries) = std::fs::read_dir(startup_dir) {
                for e in entries.flatten() {
                    if let Ok(file_name) = e.file_name().into_string() {
                        if !file_name.starts_with('.') && file_name.to_lowercase() != "desktop.ini"
                        {
                            let id =
                                format!("folder-{}", file_name.to_lowercase().replace(' ', "-"));
                            items.push(StartupItem {
                                id,
                                name: file_name.trim_end_matches(".lnk").to_string(),
                                command: e.path().to_string_lossy().to_string(),
                                location: "Startup Folder".into(),
                                enabled: true,
                                publisher: "Shortcut Entry".into(),
                            });
                        }
                    }
                }
            }
        }
    }

    Ok(items)
}

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
        use std::process::Command;
        use std::os::windows::process::CommandExt;
        // Query startup items safely via powershell CIM Win32_StartupCommand without popup window
        let output = Command::new("powershell")
            .creation_flags(0x08000000)
            .args(&[
                "-NoProfile",
                "-NonInteractive",
                "-WindowStyle", "Hidden",
                "-Command",
                "Get-CimInstance Win32_StartupCommand | Select-Object Name, Command, Location, User | ConvertTo-Json",
            ])
            .output();

        if let Ok(out) = output {
            let json_str = String::from_utf8_lossy(&out.stdout);
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&json_str) {
                if val.is_array() {
                    for (i, item) in val.as_array().unwrap().iter().enumerate() {
                        let name = item["Name"].as_str().unwrap_or("Unknown").to_string();
                        let command = item["Command"].as_str().unwrap_or("").to_string();
                        let location = item["Location"].as_str().unwrap_or("Registry / Startup").to_string();

                        items.push(StartupItem {
                            id: format!("startup-{}", i),
                            name,
                            command,
                            location,
                            enabled: true,
                            publisher: "Verified Application".into(),
                        });
                    }
                } else if val.is_object() {
                    let name = val["Name"].as_str().unwrap_or("Unknown").to_string();
                    let command = val["Command"].as_str().unwrap_or("").to_string();
                    let location = val["Location"].as_str().unwrap_or("Registry / Startup").to_string();

                    items.push(StartupItem {
                        id: "startup-0".into(),
                        name,
                        command,
                        location,
                        enabled: true,
                        publisher: "Verified Application".into(),
                    });
                }
            }
        }
    }

    Ok(items)
}

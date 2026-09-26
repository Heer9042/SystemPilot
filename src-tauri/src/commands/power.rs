use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PowerPlanInfo {
    pub guid: String,
    pub name: String,
    pub is_active: bool,
}

#[tauri::command]
pub fn get_power_plans() -> Result<Vec<PowerPlanInfo>, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;
        let output = Command::new("powercfg")
            .creation_flags(0x08000000)
            .args(&["/list"])
            .output()
            .map_err(|e| e.to_string())?;

        let text = String::from_utf8_lossy(&output.stdout);
        let mut plans = Vec::new();

        for line in text.lines() {
            if line.contains("Power Scheme GUID:") {
                let parts: Vec<&str> = line.split(':').collect();
                if parts.len() >= 2 {
                    let rest = parts[1].trim();
                    let is_active = rest.contains('*');
                    let clean_rest = rest.replace('*', "");

                    // Extract GUID and Name, e.g. "381b4222-f694-41f0-9685-ff5bb260df2e  (Balanced)"
                    let subparts: Vec<&str> = clean_rest.split('(').collect();
                    let guid = subparts[0].trim().to_string();
                    let name = if subparts.len() > 1 {
                        subparts[1].trim().trim_end_matches(')').to_string()
                    } else {
                        "Custom Plan".to_string()
                    };

                    plans.push(PowerPlanInfo {
                        guid,
                        name,
                        is_active,
                    });
                }
            }
        }

        if !plans.is_empty() {
            return Ok(plans);
        }
    }

    // Default fallback
    Ok(vec![
        PowerPlanInfo {
            guid: "381b4222-f694-41f0-9685-ff5bb260df2e".into(),
            name: "Balanced".into(),
            is_active: true,
        },
        PowerPlanInfo {
            guid: "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c".into(),
            name: "High performance".into(),
            is_active: false,
        },
        PowerPlanInfo {
            guid: "a1841308-3541-4fab-bc81-f71556f20b4a".into(),
            name: "Power saver".into(),
            is_active: false,
        },
        PowerPlanInfo {
            guid: "e9a42b02-d5df-448d-aa00-03f14749eb61".into(),
            name: "Ultimate Performance".into(),
            is_active: false,
        },
    ])
}

pub fn is_valid_power_guid(guid: &str) -> bool {
    let clean = guid.trim();
    !clean.is_empty()
        && clean.len() <= 64
        && clean
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '{' || c == '}')
}

#[tauri::command]
pub fn set_power_plan(guid: String) -> Result<bool, String> {
    let clean_guid = guid.trim();
    if !is_valid_power_guid(clean_guid) {
        return Err("Invalid power scheme GUID format".into());
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;
        let status = Command::new("powercfg")
            .creation_flags(0x08000000)
            .args(&["/setactive", clean_guid])
            .status()
            .map_err(|e| e.to_string())?;

        return Ok(status.success());
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_power_guid_validation() {
        assert!(is_valid_power_guid("381b4222-f694-41f0-9685-ff5bb260df2e"));
        assert!(is_valid_power_guid(
            "{8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c}"
        ));
        assert!(is_valid_power_guid("a1841308-3541-4fab-bc81-f71556f20b4a"));
        // Rejections
        assert!(!is_valid_power_guid(""));
        assert!(!is_valid_power_guid("381b4222 & echo hacked"));
        assert!(!is_valid_power_guid("381b4222; rm -rf /"));
        assert!(!is_valid_power_guid("381b4222`whoami`"));
    }
}

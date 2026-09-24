use serde::{Deserialize, Serialize};

const APP_NAME: &str = "SystemPilot";
const APP_VERSION: &str = env!("CARGO_PKG_VERSION");
const GITHUB_REPO: &str = "Heer9042/SystemPilot";
const OFFICIAL_RELEASE_URL: &str = "https://github.com/Heer9042/SystemPilot/releases";

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AppVersionInfo {
    pub name: String,
    pub version: String,
    pub target_arch: String,
    pub target_os: String,
    pub git_repository: String,
    pub release_url: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ReleaseAssetInfo {
    pub name: String,
    pub browser_download_url: String,
    pub size: u64,
    pub content_type: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RemoteReleaseInfo {
    pub tag_name: String,
    pub name: String,
    pub published_at: String,
    pub html_url: String,
    pub body: String,
    pub is_newer: bool,
    pub current_version: String,
    pub latest_version: String,
    pub assets: Vec<ReleaseAssetInfo>,
}

#[tauri::command]
pub fn get_app_version() -> Result<AppVersionInfo, String> {
    Ok(AppVersionInfo {
        name: APP_NAME.to_string(),
        version: APP_VERSION.to_string(),
        target_arch: std::env::consts::ARCH.to_string(),
        target_os: std::env::consts::OS.to_string(),
        git_repository: GITHUB_REPO.to_string(),
        release_url: OFFICIAL_RELEASE_URL.to_string(),
    })
}

#[tauri::command]
pub fn open_release_notes(url: Option<String>) -> Result<(), String> {
    let target_url = match url {
        Some(u) => {
            // Security verification: Only permit official repository releases and documentation
            if u.starts_with("https://github.com/Heer9042/SystemPilot") {
                u
            } else {
                return Err("Security Violation: Disallowed external URL scheme".to_string());
            }
        }
        None => OFFICIAL_RELEASE_URL.to_string(),
    };

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        let mut cmd = std::process::Command::new("rundll32");
        cmd.arg("url.dll,FileProtocolHandler");
        cmd.arg(&target_url);
        cmd.creation_flags(CREATE_NO_WINDOW);
        
        cmd.spawn().map_err(|e| format!("Failed to open browser: {}", e))?;
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Unsupported operating system for native URL opening".to_string())
    }
}

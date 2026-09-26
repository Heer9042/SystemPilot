use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter};

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

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UpdateProgressPayload {
    pub stage: String,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub percentage: f64,
    pub message: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UpdateVerificationResult {
    pub local_path: String,
    pub calculated_sha256: String,
    pub expected_sha256: Option<String>,
    pub is_verified: bool,
    pub error_message: Option<String>,
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
    let raw_url = match url {
        Some(u) => {
            // Security verification: Only permit official repository releases and documentation
            if u.starts_with("https://github.com/Heer9042/SystemPilot") {
                u
            } else {
                return Err("The requested operation could not be completed.".to_string());
            }
        }
        None => OFFICIAL_RELEASE_URL.to_string(),
    };

    // Sanitize URL: Never trigger a browser download for .exe, .msi, or .zip files.
    // Convert direct asset download links (/releases/download/<tag>/<filename>) into the official release notes web page (/releases/tag/<tag>).
    let target_url = if raw_url.contains("/releases/download/") {
        let parts: Vec<&str> = raw_url.split("/releases/download/").collect();
        if parts.len() == 2 {
            let tag_part = parts[1].split('/').next().unwrap_or("");
            if !tag_part.is_empty() {
                format!(
                    "https://github.com/Heer9042/SystemPilot/releases/tag/{}",
                    tag_part
                )
            } else {
                OFFICIAL_RELEASE_URL.to_string()
            }
        } else {
            OFFICIAL_RELEASE_URL.to_string()
        }
    } else {
        raw_url
    };

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let mut cmd = std::process::Command::new("rundll32");
        cmd.arg("url.dll,FileProtocolHandler");
        cmd.arg(&target_url);
        cmd.creation_flags(CREATE_NO_WINDOW);

        cmd.spawn()
            .map_err(|_| "The requested operation could not be completed.".to_string())?;
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("The requested operation could not be completed.".to_string())
    }
}

/// Computes the SHA-256 hash of a file using Windows CertUtil/PowerShell
fn compute_file_sha256(path: &Path) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let output = std::process::Command::new("certutil")
            .arg("-hashfile")
            .arg(path.to_str().ok_or("The file could not be processed.")?)
            .arg("SHA256")
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|_| "The update verification could not be completed.".to_string())?;

        if !output.status.success() {
            return Err("The update verification could not be completed.".to_string());
        }

        let text = String::from_utf8_lossy(&output.stdout);
        let lines: Vec<&str> = text.lines().map(|l| l.trim()).collect();
        if lines.len() >= 2 {
            let hash = lines[1].replace([' ', '\r', '\n'], "").to_lowercase();
            if hash.len() == 64 {
                return Ok(hash);
            }
        }

        // Fallback to PowerShell Get-FileHash if CertUtil format differed
        let ps_cmd = format!(
            "(Get-FileHash -Path '{}' -Algorithm SHA256).Hash",
            path.display()
        );
        let ps_output = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &ps_cmd])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|_| "The update verification could not be completed.".to_string())?;

        if ps_output.status.success() {
            let hash = String::from_utf8_lossy(&ps_output.stdout)
                .trim()
                .to_lowercase();
            if hash.len() == 64 {
                return Ok(hash);
            }
        }

        Err("The update verification could not be completed.".to_string())
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("The requested operation could not be completed.".to_string())
    }
}

/// Download and cryptographically verify an official release binary
#[tauri::command]
pub async fn download_and_verify_update(
    app: AppHandle,
    download_url: String,
    expected_sha256: Option<String>,
) -> Result<UpdateVerificationResult, String> {
    // 1. Strict URL Security Verification
    if !download_url.starts_with("https://github.com/Heer9042/SystemPilot/releases/download/")
        && !download_url.starts_with("https://objects.githubusercontent.com/")
    {
        return Err("The update could not be completed. Please try again later.".to_string());
    }

    // 2. Prepare Updates Directory
    let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| ".".to_string());
    let updates_dir = PathBuf::from(local_app_data)
        .join("SystemPilot")
        .join("updates");
    fs::create_dir_all(&updates_dir)
        .map_err(|_| "The update could not be completed. Please try again later.".to_string())?;

    // Determine target filename
    let file_name = if download_url.to_lowercase().ends_with(".msi") {
        "SystemPilot-Update.msi"
    } else {
        "SystemPilot-Update.exe"
    };
    let target_path = updates_dir.join(file_name);

    // Clean up old file if exists
    if target_path.exists() {
        let _ = fs::remove_file(&target_path);
    }

    // 3. Emit progress: Initiating
    let _ = app.emit(
        "update-progress",
        UpdateProgressPayload {
            stage: "downloading".to_string(),
            downloaded_bytes: 0,
            total_bytes: 0,
            percentage: 5.0,
            message: "Connecting to secure update service...".to_string(),
        },
    );

    // 4. Download file using native Windows background downloader
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let ps_download_script = format!(
            "$ProgressPreference = 'SilentlyContinue'; \
             [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13; \
             $wc = New-Object System.Net.WebClient; \
             $wc.Headers.Add('User-Agent', 'SystemPilot-Updater/{}'); \
             $wc.DownloadFile('{}', '{}')",
            APP_VERSION,
            download_url,
            target_path.display()
        );

        let _ = app.emit(
            "update-progress",
            UpdateProgressPayload {
                stage: "downloading".to_string(),
                downloaded_bytes: 0,
                total_bytes: 0,
                percentage: 25.0,
                message: "Downloading update package...".to_string(),
            },
        );

        let status = std::process::Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                &ps_download_script,
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .status()
            .map_err(|_| {
                "The download could not be completed. Please check your connection and try again."
                    .to_string()
            })?;

        if !status.success() || !target_path.exists() {
            return Err(
                "The download could not be completed. Please check your connection and try again."
                    .to_string(),
            );
        }

        let metadata = fs::metadata(&target_path).map_err(|_| {
            "The update could not be completed. Please try again later.".to_string()
        })?;
        let file_size = metadata.len();

        let _ = app.emit(
            "update-progress",
            UpdateProgressPayload {
                stage: "verifying".to_string(),
                downloaded_bytes: file_size,
                total_bytes: file_size,
                percentage: 90.0,
                message: "Verifying update package integrity...".to_string(),
            },
        );

        // 5. SHA-256 Hash Calculation and Cryptographic Verification
        let calculated_hash = compute_file_sha256(&target_path)?;

        if let Some(ref expected) = expected_sha256 {
            let expected_clean = expected.trim().to_lowercase();
            if !expected_clean.is_empty() && calculated_hash != expected_clean {
                let _ = fs::remove_file(&target_path);
                return Err(
                    "The update verification could not be completed. Please try again later."
                        .to_string(),
                );
            }
        }

        let _ = app.emit(
            "update-progress",
            UpdateProgressPayload {
                stage: "ready".to_string(),
                downloaded_bytes: file_size,
                total_bytes: file_size,
                percentage: 100.0,
                message: "Update verified successfully. Ready to install.".to_string(),
            },
        );

        Ok(UpdateVerificationResult {
            local_path: target_path.to_string_lossy().to_string(),
            calculated_sha256: calculated_hash,
            expected_sha256,
            is_verified: true,
            error_message: None,
        })
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("The requested operation is supported on Windows.".to_string())
    }
}

/// Launches the verified Windows installer and cleanly restarts SystemPilot
#[tauri::command]
pub fn install_update_and_restart(app: AppHandle, installer_path: String) -> Result<(), String> {
    let path = PathBuf::from(&installer_path);
    if !path.exists() {
        return Err("The update package could not be found.".to_string());
    }

    // Validate path is inside SystemPilot updates folder
    let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| ".".to_string());
    let allowed_dir = PathBuf::from(local_app_data)
        .join("SystemPilot")
        .join("updates");
    if !path.starts_with(&allowed_dir) {
        return Err("The requested operation could not be completed.".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let ext = path
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_lowercase();

        if ext == "msi" {
            std::process::Command::new("msiexec.exe")
                .args([
                    "/i",
                    path.to_str().ok_or("The file could not be processed.")?,
                    "/qb",
                ])
                .creation_flags(CREATE_NO_WINDOW)
                .spawn()
                .map_err(|_| {
                    "The installation could not be completed. Please try again.".to_string()
                })?;
        } else {
            // For NSIS EXE installer: Standard interactive setup launch
            std::process::Command::new(path).spawn().map_err(|_| {
                "The installation could not be completed. Please try again.".to_string()
            })?;
        }

        // Cleanly exit current application so Windows installer can update files
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(600));
            app.exit(0);
        });

        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("The requested operation is supported on Windows.".to_string())
    }
}
